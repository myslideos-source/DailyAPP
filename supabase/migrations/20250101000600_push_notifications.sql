-- dayli — Web Push infrastructure
--
-- Stores each device's push subscription (one row per browser/device a
-- profile has enabled notifications on), and the scheduling primitives
-- (pg_cron + pg_net) used to deliver reminders even when the app is fully
-- closed. The actual VAPID keys and the cron→edge-function shared secret
-- live in Supabase Vault (see the follow-up `select vault.create_secret`
-- calls run once via the dashboard/CLI, not in this file) — never in a
-- migration, so they never end up in the repo.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_id_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

-- Each device manages only its own subscription row. The delivery edge
-- function reads across the whole family using the service role, which
-- bypasses RLS entirely, so no family-wide select policy is needed here.
create policy "push_subscriptions_all_self" on public.push_subscriptions
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
