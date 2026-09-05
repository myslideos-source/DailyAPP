// dayli — shared Web Push helpers for edge functions that deliver a push to
// every device of a family (send-goal-milestone, send-weekly-overview).
// send-due-reminders keeps its own inline copy of this loop since it also
// needs per-reminder bookkeeping (marking rows sent/rescheduled) that these
// simpler, family-wide broadcasts don't.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

export interface ReminderSecrets {
  vapid_public_key: string;
  vapid_private_key: string;
  reminder_cron_secret: string;
}

export async function getSecrets(supabase: SupabaseClient): Promise<ReminderSecrets | null> {
  const { data, error } = await supabase.rpc("get_reminder_secrets");
  if (error || !data) return null;
  return Object.fromEntries(
    (data as { name: string; secret: string }[]).map((r) => [r.name, r.secret]),
  ) as unknown as ReminderSecrets;
}

export async function sendPushToFamily(
  supabase: SupabaseClient,
  familyId: string,
  payload: Record<string, unknown>,
): Promise<number> {
  const { data: members } = await supabase.from("family_members").select("profile_id").eq("family_id", familyId);
  const profileIds = (members ?? []).map((m: { profile_id: string }) => m.profile_id);
  if (profileIds.length === 0) return 0;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("profile_id", profileIds);

  let sent = 0;
  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return sent;
}
