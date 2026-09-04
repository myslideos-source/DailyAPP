-- dayli — Row Level Security
-- Every family-scoped table is only readable/writable by members of that
-- family (see public.is_family_member). Owner-only actions are limited to
-- family membership management; day-to-day content is fully symmetric
-- between Domenico and Elisabeth, matching the product's shared-view model.

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.reminders enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;

-- ---------------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------------

create policy "families_select_members" on public.families
  for select using (public.is_family_member(id));

create policy "families_insert_authenticated" on public.families
  for insert with check (auth.uid() is not null);

create policy "families_update_owner" on public.families
  for update using (public.is_family_owner(id));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles_select_self_or_family" on public.profiles
  for select using (
    id = auth.uid()
    or (family_id is not null and public.is_family_member(family_id))
  );

create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- family_members
-- ---------------------------------------------------------------------------

create policy "family_members_select_family" on public.family_members
  for select using (public.is_family_member(family_id));

-- Bootstrap: the very first member of a brand-new family joins as owner.
-- After that, only an existing owner may add or remove members.
create policy "family_members_insert_bootstrap_or_owner" on public.family_members
  for insert with check (
    profile_id = auth.uid()
    and (
      not exists (select 1 from public.family_members fm where fm.family_id = family_id)
      or public.is_family_owner(family_id)
    )
  );

create policy "family_members_delete_owner" on public.family_members
  for delete using (public.is_family_owner(family_id));

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create policy "categories_all_family" on public.categories
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- events & participants
-- ---------------------------------------------------------------------------

create policy "events_all_family" on public.events
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "event_participants_select_family" on public.event_participants
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id and public.is_family_member(e.family_id)
    )
  );

create policy "event_participants_write_family" on public.event_participants
  for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and public.is_family_member(e.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and public.is_family_member(e.family_id)
    )
  );

-- ---------------------------------------------------------------------------
-- tasks, assignees & subtasks
-- ---------------------------------------------------------------------------

create policy "tasks_all_family" on public.tasks
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "task_assignees_all_family" on public.task_assignees
  for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_family_member(t.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_family_member(t.family_id)
    )
  );

create policy "task_subtasks_all_family" on public.task_subtasks
  for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_family_member(t.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_family_member(t.family_id)
    )
  );

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------

create policy "reminders_all_family" on public.reminders
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- savings
-- ---------------------------------------------------------------------------

create policy "savings_goals_all_family" on public.savings_goals
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "savings_entries_all_family" on public.savings_entries
  for all
  using (
    exists (
      select 1 from public.savings_goals g
      where g.id = goal_id and public.is_family_member(g.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.savings_goals g
      where g.id = goal_id and public.is_family_member(g.family_id)
    )
  );

-- ---------------------------------------------------------------------------
-- notifications (a null profile_id means "broadcast to the whole family")
-- ---------------------------------------------------------------------------

create policy "notifications_select_family" on public.notifications
  for select using (
    public.is_family_member(family_id)
    and (profile_id is null or profile_id = auth.uid())
  );

create policy "notifications_insert_family" on public.notifications
  for insert with check (public.is_family_member(family_id));

create policy "notifications_update_own" on public.notifications
  for update using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_preferences — strictly private per profile
-- ---------------------------------------------------------------------------

create policy "user_preferences_select_self" on public.user_preferences
  for select using (profile_id = auth.uid());

create policy "user_preferences_insert_self" on public.user_preferences
  for insert with check (profile_id = auth.uid());

create policy "user_preferences_update_self" on public.user_preferences
  for update using (profile_id = auth.uid());
