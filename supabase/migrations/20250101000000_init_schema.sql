-- dayli — core schema
-- Domenico & Elisabeth's private family calendar. Every content table is
-- scoped to a single family via family_id; access is enforced in
-- 20250101000100_rls_policies.sql.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- families & membership
-- ---------------------------------------------------------------------------

create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Familie',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  family_id     uuid references public.families (id) on delete set null,
  display_name  text not null,
  initial       text not null default '',
  color         text not null default '#B488E8',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id   uuid not null references public.families (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  created_at  timestamptz not null default now(),
  primary key (family_id, profile_id)
);

create index if not exists family_members_profile_id_idx on public.family_members (profile_id);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  key         text not null,
  label       text not null,
  icon        text not null default 'CircleDot',
  color       text,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  unique (family_id, key)
);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id                        uuid primary key default gen_random_uuid(),
  family_id                 uuid not null references public.families (id) on delete cascade,
  category_id               uuid references public.categories (id) on delete set null,
  title                     text not null,
  date                      date not null,
  start_time                time,
  end_time                  time,
  all_day                   boolean not null default false,
  location                  text,
  notes                     text,
  color                     text,
  reminder_minutes_before   integer,
  recurrence_rule           text not null default 'none'
                              check (recurrence_rule in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  created_by                uuid references public.profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint events_time_order check (
    all_day or start_time is null or end_time is null or end_time > start_time
  )
);

create index if not exists events_family_date_idx on public.events (family_id, date);

create table if not exists public.event_participants (
  event_id    uuid not null references public.events (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create index if not exists event_participants_profile_id_idx on public.event_participants (profile_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families (id) on delete cascade,
  title             text not null,
  due_date          date,
  priority          text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  done              boolean not null default false,
  done_at           timestamptz,
  is_shopping       boolean not null default false,
  recurrence_rule   text not null default 'none'
                      check (recurrence_rule in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  linked_event_id   uuid references public.events (id) on delete set null,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists tasks_family_due_date_idx on public.tasks (family_id, due_date);
create index if not exists tasks_family_done_idx on public.tasks (family_id, done);

create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, profile_id)
);

create table if not exists public.task_subtasks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists task_subtasks_task_id_idx on public.task_subtasks (task_id);

-- ---------------------------------------------------------------------------
-- reminders (scheduled notification instances, distinct from an event's
-- inline reminder_minutes_before convenience field)
-- ---------------------------------------------------------------------------

create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  event_id    uuid references public.events (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete cascade,
  remind_at   timestamptz not null,
  message     text,
  sent        boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint reminders_target_check check (
    (event_id is not null and task_id is null) or (event_id is null and task_id is not null)
  )
);

create index if not exists reminders_family_remind_at_idx on public.reminders (family_id, remind_at);

-- ---------------------------------------------------------------------------
-- savings
-- ---------------------------------------------------------------------------

create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  title          text not null,
  target_amount  numeric(12, 2) not null check (target_amount > 0),
  color          text not null default 'together' check (color in ('domenico', 'elisabeth', 'together')),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.savings_entries (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references public.savings_goals (id) on delete cascade,
  amount         numeric(12, 2) not null check (amount > 0),
  contributor_id uuid references public.profiles (id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists savings_entries_goal_id_idx on public.savings_entries (goal_id);

-- ---------------------------------------------------------------------------
-- notifications & preferences
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  profile_id  uuid references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_family_profile_idx on public.notifications (family_id, profile_id);

create table if not exists public.user_preferences (
  profile_id                uuid primary key references public.profiles (id) on delete cascade,
  reduced_motion_override   boolean,
  calendar_filters          jsonb not null default '"alle"'::jsonb,
  has_onboarded             boolean not null default false,
  updated_at                timestamptz not null default now()
);
