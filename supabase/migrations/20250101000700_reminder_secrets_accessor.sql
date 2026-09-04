-- dayli — Vault accessor for the push-notification edge function
--
-- PostgREST does not expose the `vault` schema, so the send-due-reminders
-- edge function (calling in as `service_role` via SUPABASE_SERVICE_ROLE_KEY)
-- reads the VAPID keys and its shared cron secret through this RPC instead
-- of querying vault.decrypted_secrets directly.

create or replace function public.get_reminder_secrets()
returns table (name text, secret text)
language sql
security definer
set search_path = public, vault
as $$
  select vault.decrypted_secrets.name, vault.decrypted_secrets.decrypted_secret
  from vault.decrypted_secrets
  where vault.decrypted_secrets.name in ('vapid_public_key', 'vapid_private_key', 'reminder_cron_secret');
$$;

revoke execute on function public.get_reminder_secrets() from public, anon, authenticated;
grant execute on function public.get_reminder_secrets() to service_role;
