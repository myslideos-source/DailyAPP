// dayli — send-weekly-overview
//
// Scheduled every Sunday evening by pg_cron (see
// 20250101001000_milestones_and_weekly_overview.sql). Sends every family a
// short push with how many events/open tasks the coming week holds.
//
// Simplification: counts base `events` rows whose own `date` falls in the
// window, it does not expand recurring events (daily/weekly/monthly/yearly)
// into their occurrences — that logic only exists client-side today
// (lib/recurrence.ts). Good enough for a heads-up nudge, not exact.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { getSecrets, sendPushToFamily } from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  webpush.setVapidDetails("mailto:dayli-reminders@example.com", secrets.vapid_public_key, secrets.vapid_private_key);

  const { data: families, error: familiesError } = await supabase.from("families").select("id");
  if (familiesError) {
    return new Response(JSON.stringify({ error: familiesError.message }), { status: 500 });
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const weekEndISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let totalSent = 0;

  for (const family of families ?? []) {
    const { count: eventCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("family_id", family.id)
      .gte("date", todayISO)
      .lte("date", weekEndISO);

    const { count: taskCount } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("family_id", family.id)
      .eq("done", false);

    const body =
      (eventCount ?? 0) === 0 && (taskCount ?? 0) === 0
        ? "Eine ruhige Woche ohne offene Termine oder Aufgaben."
        : `${eventCount ?? 0} Termin(e) diese Woche · ${taskCount ?? 0} offene Aufgabe(n).`;

    totalSent += await sendPushToFamily(supabase, family.id, {
      title: "Euer Wochenüberblick",
      body,
      tag: `weekly-${family.id}`,
    });
  }

  return new Response(JSON.stringify({ sent: totalSent }), { headers: { "Content-Type": "application/json" } });
});
