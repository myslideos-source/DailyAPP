// dayli — send-due-reminders
//
// Scheduled every minute by pg_cron (see the cron.schedule call run once
// via SQL, not tracked as a migration since it references this function's
// deployed URL). Finds reminders whose remind_at has passed, and delivers
// a real Web Push notification to every device subscribed by a member of
// that reminder's family — this is what lets a reminder reach Domenico or
// Elisabeth even with dayli fully closed.
//
// Auth: verify_jwt is disabled for this function (see deploy config) and
// replaced with a custom shared-secret header, since pg_net calls it
// without a user session. The secret and the VAPID keypair both live in
// Supabase Vault, fetched here via the public.get_reminder_secrets() RPC
// (service_role only) rather than embedded in source.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: secretRows, error: secretsError } = await supabase.rpc("get_reminder_secrets");
  if (secretsError || !secretRows) {
    return new Response(JSON.stringify({ error: "secrets unavailable" }), { status: 500 });
  }
  const secrets = Object.fromEntries(secretRows.map((r: { name: string; secret: string }) => [r.name, r.secret]));

  const provided = req.headers.get("x-reminder-secret");
  if (!provided || provided !== secrets.reminder_cron_secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!secrets.vapid_public_key || !secrets.vapid_private_key) {
    return new Response(JSON.stringify({ error: "VAPID keys missing" }), { status: 500 });
  }

  webpush.setVapidDetails(
    "mailto:dayli-reminders@example.com",
    secrets.vapid_public_key,
    secrets.vapid_private_key,
  );

  const { data: dueReminders, error: remindersError } = await supabase
    .from("reminders")
    .select("id, family_id, event_id, task_id, message")
    .eq("sent", false)
    .lte("remind_at", new Date().toISOString())
    .limit(100);

  if (remindersError) {
    return new Response(JSON.stringify({ error: remindersError.message }), { status: 500 });
  }
  if (!dueReminders || dueReminders.length === 0) {
    return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;

  for (const reminder of dueReminders) {
    let title = "dayli Erinnerung";
    let body = reminder.message ?? "";

    if (reminder.event_id) {
      const { data: event } = await supabase
        .from("events")
        .select("title, start_time, location")
        .eq("id", reminder.event_id)
        .maybeSingle();
      if (event) {
        title = `Erinnerung: ${event.title}`;
        body = event.start_time
          ? `${String(event.start_time).slice(0, 5)} Uhr${event.location ? " · " + event.location : ""}`
          : (reminder.message ?? "");
      }
    } else if (reminder.task_id) {
      const { data: task } = await supabase.from("tasks").select("title").eq("id", reminder.task_id).maybeSingle();
      if (task) title = `Erinnerung: ${task.title}`;
    }

    const { data: members } = await supabase
      .from("family_members")
      .select("profile_id")
      .eq("family_id", reminder.family_id);
    const profileIds = (members ?? []).map((m: { profile_id: string }) => m.profile_id);

    const { data: subscriptions } = profileIds.length
      ? await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .in("profile_id", profileIds)
      : { data: [] };

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, tag: reminder.id }),
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await supabase.from("reminders").update({ sent: true }).eq("id", reminder.id);
  }

  return new Response(JSON.stringify({ processed: dueReminders.length, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
