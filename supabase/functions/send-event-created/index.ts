// dayli — send-event-created
//
// Called by the notify_event_created() Postgres trigger (via pg_net) right
// after a new event row is inserted — independent of whether anyone ever
// sets a reminder on it. Notifies every OTHER family member (never the
// creator's own devices, via created_by) with a real push, so "Domenico hat
// einen Termin angelegt" reaches Elisabeth's phone within seconds. Auth
// follows the same shared-secret pattern as the other trigger-invoked
// functions since this, too, is called without a user session.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { getSecrets } from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

// Germany runs on Europe/Berlin, not UTC — "heute"/"morgen" has to be judged
// against the calendar day there, not the edge function's UTC clock.
function berlinTodayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function relativeDayPhrase(dateISO: string): string {
  const diffDays = Math.round(
    (new Date(`${dateISO}T00:00:00Z`).getTime() - new Date(`${berlinTodayISO()}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "heute";
  if (diffDays === 1) return "morgen";
  if (diffDays === -1) return "gestern";
  if (diffDays > 1 && diffDays < 7) {
    return `am ${WEEKDAYS[new Date(`${dateISO}T00:00:00Z`).getUTCDay()]}`;
  }
  const d = new Date(`${dateISO}T00:00:00Z`);
  return `am ${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.`;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const secrets = await getSecrets(supabase);
  if (!secrets) {
    return new Response(JSON.stringify({ error: "secrets unavailable" }), { status: 500 });
  }

  const provided = req.headers.get("x-reminder-secret");
  if (!provided || provided !== secrets.reminder_cron_secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    event_id?: string;
    family_id?: string;
    title?: string;
    date?: string;
    start_time?: string | null;
    all_day?: boolean;
    assignee?: string | null;
    created_by?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const { event_id, family_id, title, date, start_time, all_day, assignee, created_by } = body;
  if (!event_id || !family_id || !title || !date) {
    return new Response("Bad request", { status: 400 });
  }

  webpush.setVapidDetails("mailto:dayli-reminders@example.com", secrets.vapid_public_key, secrets.vapid_private_key);

  let creatorName = "Jemand aus der Familie";
  if (created_by) {
    const { data: creator } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", created_by)
      .maybeSingle();
    if (creator?.display_name) creatorName = creator.display_name;
  }

  const when = relativeDayPhrase(date);
  const time = !all_day && start_time ? ` um ${start_time.slice(0, 5)} Uhr` : "";
  const notificationTitle = "📅 Neuer Termin";
  const notificationBody = `${creatorName} hat „${title}“ ${when}${time} eingetragen.`;

  // In-app bell first — visible immediately regardless of whether any
  // device has push enabled at all.
  await supabase.from("notifications").insert({
    family_id,
    profile_id: null,
    title: notificationTitle,
    body: notificationBody,
    type: "event",
    assignee: assignee ?? null,
  });

  const { data: members } = await supabase.from("family_members").select("profile_id").eq("family_id", family_id);
  const targetProfileIds = (members ?? [])
    .map((m: { profile_id: string }) => m.profile_id)
    .filter((id: string) => id !== created_by);

  if (targetProfileIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("profile_id", targetProfileIds);

  let sent = 0;
  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: notificationTitle, body: notificationBody, tag: `event-created-${event_id}` }),
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
