-- dayli — schedule the reminder delivery edge function
--
-- Runs every minute; the function itself is idempotent (only processes
-- reminders with sent = false), so a slightly late or doubled tick is
-- harmless. The shared secret is read from Vault at call time so it never
-- appears in this file or anywhere else in the repo.
--
-- NOTE: this references this project's own function URL
-- (https://jghfdzmvvizddomwqtzq.supabase.co/functions/v1/send-due-reminders).
-- Re-running this migration against a different project needs that URL
-- updated first.

select cron.schedule(
  'send-due-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://jghfdzmvvizddomwqtzq.supabase.co/functions/v1/send-due-reminders',
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
