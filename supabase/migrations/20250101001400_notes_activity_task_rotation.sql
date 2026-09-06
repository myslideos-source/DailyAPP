-- Shared notes list ("wie bei Apple Notes"), a family-wide activity feed,
-- and optional assignee rotation for recurring tasks.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_family_id_idx on public.notes (family_id, updated_at desc);

alter table public.notes enable row level security;

create policy notes_all_family
  on public.notes for all
  using (is_family_member(family_id))
  with check (is_family_member(family_id));

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Immutable feed of "who did what" — never updated or deleted from the
-- client, only ever appended to alongside the mutation it describes.
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

create index activity_log_family_id_idx on public.activity_log (family_id, created_at desc);

alter table public.activity_log enable row level security;

create policy activity_log_select_family
  on public.activity_log for select
  using (is_family_member(family_id));

create policy activity_log_insert_family
  on public.activity_log for insert
  with check (is_family_member(family_id) and (actor_id is null or actor_id = auth.uid()));

-- When set, completing a recurring task swaps the assignee (Domenico <->
-- Elisabeth) on the auto-generated next occurrence instead of keeping the
-- same person every time. Meaningless (ignored) for "gemeinsam" tasks.
alter table public.tasks
  add column if not exists rotate_assignee boolean not null default false;
