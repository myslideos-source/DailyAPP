-- dayli — automatic weekly backup snapshots
--
-- send-weekly-backup (edge function, cron below) dumps each family's data
-- as a JSON file into the private "backups" storage bucket once a week and
-- records it here so the app can list/download past snapshots without
-- listing storage objects directly. Only the newest 8 snapshots per family
-- are kept — the edge function prunes older ones itself after each run.

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

create table if not exists public.backup_snapshots (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  storage_path  text not null,
  created_at    timestamptz not null default now()
);

alter table public.backup_snapshots enable row level security;

create policy "backup_snapshots_select_family" on public.backup_snapshots
  for select using (public.is_family_member(family_id));

-- Storage objects are stored under "<family_id>/<timestamp>.json" — the
-- family_id is the object's top-level "folder", so a family can only read
-- its own snapshots. Writes/deletes go through the edge function's service
-- role, which bypasses RLS entirely, so no insert/delete policy is needed.
create policy "backup_snapshots_storage_read" on storage.objects
  for select using (
    bucket_id = 'backups'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

-- Monday 03:00 UTC — quiet overnight hour, well clear of the Sunday-evening
-- weekly-overview push.
select cron.schedule(
  'send-weekly-backup-monday',
  '0 3 * * 1',
  $$
  select net.http_post(
    url := 'https://jghfdzmvvizddomwqtzq.supabase.co/functions/v1/send-weekly-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', (
        select secret from public.get_reminder_secrets() where name = 'reminder_cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
