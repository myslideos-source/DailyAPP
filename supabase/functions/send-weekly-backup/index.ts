// dayli — send-weekly-backup
//
// Scheduled every Monday night by pg_cron (see
// 20250101001100_backup_snapshots.sql). Dumps each family's raw table rows
// as one JSON file into the private "backups" storage bucket and records it
// in backup_snapshots so the app can list/download past snapshots. This is
// a disaster-recovery safety net, not wired into the in-app restore flow
// (lib/backup.ts) — the row shapes here are the raw snake_case DB rows, not
// the app's camelCase domain types.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEEP_LAST = 8;

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

  const { data: families, error: familiesError } = await supabase.from("families").select("id");
  if (familiesError) {
    return new Response(JSON.stringify({ error: familiesError.message }), { status: 500 });
  }

  let backedUp = 0;

  for (const family of families ?? []) {
    const [events, tasks, taskSubtasks, savingsGoals, savingsEntries, notifications] = await Promise.all([
      supabase.from("events").select("*").eq("family_id", family.id),
      supabase.from("tasks").select("*").eq("family_id", family.id),
      supabase.from("task_subtasks").select("*, tasks!inner(family_id)").eq("tasks.family_id", family.id),
      supabase.from("savings_goals").select("*").eq("family_id", family.id),
      supabase
        .from("savings_entries")
        .select("*, savings_goals!inner(family_id)")
        .eq("savings_goals.family_id", family.id),
      supabase.from("notifications").select("*").eq("family_id", family.id),
    ]);

    const snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      familyId: family.id,
      events: events.data ?? [],
      tasks: tasks.data ?? [],
      taskSubtasks: taskSubtasks.data ?? [],
      savingsGoals: savingsGoals.data ?? [],
      savingsEntries: savingsEntries.data ?? [],
      notifications: notifications.data ?? [],
    };

    const path = `${family.id}/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(path, new Blob([JSON.stringify(snapshot)], { type: "application/json" }));
    if (uploadError) continue;

    await supabase.from("backup_snapshots").insert({ family_id: family.id, storage_path: path });
    backedUp++;

    const { data: existing } = await supabase
      .from("backup_snapshots")
      .select("id, storage_path, created_at")
      .eq("family_id", family.id)
      .order("created_at", { ascending: false });
    const stale = (existing ?? []).slice(KEEP_LAST);
    if (stale.length > 0) {
      await supabase.storage.from("backups").remove(stale.map((s) => s.storage_path));
      await supabase
        .from("backup_snapshots")
        .delete()
        .in(
          "id",
          stale.map((s) => s.id),
        );
    }
  }

  return new Response(JSON.stringify({ backedUp }), { headers: { "Content-Type": "application/json" } });
});
