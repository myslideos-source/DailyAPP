// dayli — send-goal-milestone
//
// Called by the notify_savings_milestone() Postgres trigger (via pg_net)
// whenever a savings goal newly crosses 50% or 100% funded. Auth follows
// the same shared-secret pattern as send-due-reminders since this, too, is
// called without a user session.

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

  let body: { family_id?: string; milestone?: number; goal_title?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const { family_id, milestone, goal_title } = body;
  if (!family_id || !milestone || !goal_title) {
    return new Response("Bad request", { status: 400 });
  }

  webpush.setVapidDetails("mailto:dayli-reminders@example.com", secrets.vapid_public_key, secrets.vapid_private_key);

  const title = milestone >= 100 ? "🎉 Sparziel erreicht!" : "Fast geschafft!";
  const notificationBody =
    milestone >= 100
      ? `„${goal_title}“ ist zu 100 % gespart!`
      : `„${goal_title}“ ist schon zur Hälfte gespart!`;

  const sent = await sendPushToFamily(supabase, family_id, {
    title,
    body: notificationBody,
    tag: `goal-${family_id}-${milestone}`,
  });

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
