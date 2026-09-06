-- Per-user notification read state + custom categories support.
--
-- Notifications are shared, family-wide rows (profile_id is null for almost
-- all of them today). A single `read` boolean on that shared row cannot
-- represent "Domenico read it, Elisabeth hasn't" — so read state moves to a
-- separate per-(notification, profile) join table instead of mutating the
-- shared row.
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, profile_id)
);

create index if not exists notification_reads_profile_id_idx
  on public.notification_reads (profile_id);

alter table public.notification_reads enable row level security;

create policy notification_reads_select_own
  on public.notification_reads for select
  using (profile_id = auth.uid());

create policy notification_reads_insert_own
  on public.notification_reads for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.notifications n
      where n.id = notification_id and is_family_member(n.family_id)
    )
  );

-- The old single-row `read` column can no longer represent per-user state
-- correctly and its own update policy was silently broken (profile_id is
-- null on shared rows, so `profile_id = auth.uid()` never matched — every
-- "mark as read" write already affected 0 rows). Superseded by
-- notification_reads above.
drop policy if exists notifications_update_own on public.notifications;

alter table public.notifications
  add column if not exists type text,
  add column if not exists assignee text;

-- Returns notifications unread by the calling user: visible to their family,
-- not already marked read by them in notification_reads. security invoker
-- so it runs with the caller's own RLS, matching this project's existing
-- RPC pattern (seed_default_categories, join_family_slot).
create or replace function public.get_unread_notifications()
returns setof public.notifications
language sql
security invoker
stable
set search_path = public
as $$
  select n.*
  from public.notifications n
  where is_family_member(n.family_id)
    and (n.profile_id is null or n.profile_id = auth.uid())
    and not exists (
      select 1 from public.notification_reads nr
      where nr.notification_id = n.id and nr.profile_id = auth.uid()
    )
  order by n.created_at desc;
$$;

-- Custom categories: distinguish the 9 seeded system categories (protected
-- from deletion/rename) from user-created ones, and record who created a
-- custom one.
alter table public.categories
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists is_system boolean not null default false;

update public.categories set is_system = true where is_system = false;

drop policy if exists categories_all_family on public.categories;

create policy categories_select_family
  on public.categories for select
  using (is_family_member(family_id));

create policy categories_insert_family
  on public.categories for insert
  with check (is_family_member(family_id) and is_system = false);

create policy categories_update_own
  on public.categories for update
  using (is_family_member(family_id) and is_system = false)
  with check (is_family_member(family_id) and is_system = false);

create policy categories_delete_own
  on public.categories for delete
  using (is_family_member(family_id) and is_system = false);
