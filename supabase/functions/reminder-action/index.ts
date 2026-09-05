// dayli — reminder-action
//
// Handles the "Erledigt" / "1 Std. später" action buttons on a reminder's
// push notification (see the service worker's notificationclick handler in
// public/sw.js). Called directly from the browser with no user session —
// even fully closed — so it authenticates via a per-reminder HMAC signature
// (computed with the same reminder_cron_secret already in Vault) instead of
// a JWT. Anyone without that signature can't act on a reminder they didn't
// receive a push for.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: { reminderId?: string; action?: string; sig?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const { reminderId, action, sig } = body;
  if (!reminderId || !sig || (action !== "done" && action !== "snooze")) {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: secretRows, error: secretsError } = await supabase.rpc("get_reminder_secrets");
  if (secretsError || !secretRows) {
    return new Response(JSON.stringify({ error: "secrets unavailable" }), { status: 500 });
  }
  const secrets = Object.fromEntries(secretRows.map((r: { name: string; secret: string }) => [r.name, r.secret]));

  const expected = await hmacHex(secrets.reminder_cron_secret, reminderId);
  if (expected !== sig) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: reminder } = await supabase
    .from("reminders")
    .select("id, task_id")
    .eq("id", reminderId)
    .maybeSingle();
  if (!reminder) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });

  if (action === "done") {
    if (reminder.task_id) {
      await supabase
        .from("tasks")
        .update({ done: true, done_at: new Date().toISOString() })
        .eq("id", reminder.task_id);
    }
  } else {
    await supabase
      .from("reminders")
      .update({ remind_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), sent: false })
      .eq("id", reminderId);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
