-- dayli — security hardening (addresses Supabase advisor warnings)
--
-- Supabase grants EXECUTE on every new function to `anon` and
-- `authenticated` by default (via ALTER DEFAULT PRIVILEGES), on top of
-- Postgres' own default grant to the PUBLIC pseudo-role. Both of those
-- need to be revoked explicitly — revoking just one leaves the other in
-- place — for functions that were never meant to be called directly as an
-- RPC endpoint.

-- handle_new_user only ever needs to run from the auth.users trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_family_member / is_family_owner are read by RLS policies for the
-- `authenticated` role on every request — that grant must stay (Postgres
-- requires the querying role to hold EXECUTE on functions referenced
-- inside its own RLS policy expressions). Anonymous callers can never
-- satisfy them anyway (auth.uid() is null), so only the public/anon RPC
-- surface is removed.
revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.is_family_owner(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid) to authenticated;
