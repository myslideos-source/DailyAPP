-- dayli — Hausbau-Kalkulation (house-build budget & expense tracking)
--
-- New, self-contained domain reusing the existing family/profile structure
-- (no second auth system, no parallel "project" abstraction — a family IS
-- the project here, same as every other table in this schema). Money is
-- stored as bigint CENTS throughout, never numeric/float — this is a
-- deliberate departure from the numeric(12,2) used by savings_goals/
-- savings_entries, made explicit here so it doesn't read as an oversight.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.hausbau_payment_source as enum ('bank', 'self');

-- "planned" = forecast only, never deducted from availability.
-- "ordered"/"invoiced" = reserved (committed but not yet paid).
-- "paid" = final, deducted for good. An entry is exactly one of these at a
-- time, so nothing is ever double-counted as both reserved and paid.
create type public.hausbau_expense_status as enum ('planned', 'ordered', 'invoiced', 'paid');

-- ---------------------------------------------------------------------------
-- Budget — one row per family (the "Grundeinrichtung" settings).
-- ---------------------------------------------------------------------------

create table public.hausbau_budgets (
  family_id                uuid primary key references public.families (id) on delete cascade,
  project_name             text not null default 'Unser Hausbau',
  bank_financing_cents     bigint not null default 0 check (bank_financing_cents >= 0),
  own_reserve_cents        bigint not null default 0 check (own_reserve_cents >= 0),
  emergency_reserve_cents  bigint not null default 0 check (emergency_reserve_cents >= 0),
  currency                 text not null default 'EUR',
  start_date               date,
  created_by               uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger hausbau_budgets_set_updated_at
  before update on public.hausbau_budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Categories — parallel to public.categories (events), separate domain/table
-- so Hausbau's construction-trade categories never mix with event
-- categories. "Deaktivieren" (spec §6) rather than delete for custom rows,
-- via is_active — expenses/self-work keep referencing a deactivated
-- category (FK stays valid), it just drops out of the picker for new ones.
-- ---------------------------------------------------------------------------

create table public.hausbau_categories (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  key          text not null,
  label        text not null,
  icon         text not null default 'Hammer',
  color        text,
  sort_order   smallint not null default 0,
  is_system    boolean not null default false,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (family_id, key)
);

create trigger hausbau_categories_set_updated_at
  before update on public.hausbau_categories
  for each row execute function public.set_updated_at();

create or replace function public.seed_default_hausbau_categories(target_family_id uuid)
returns void
language sql
set search_path = public
as $$
  insert into public.hausbau_categories (family_id, key, label, icon, sort_order, is_system)
  values
    (target_family_id, 'hausvertrag',   'Hausvertrag',              'FileText',      0,  true),
    (target_family_id, 'bemusterung',   'Bemusterung',              'Palette',       1,  true),
    (target_family_id, 'bodenplatte',   'Bodenplatte',              'Layers',        2,  true),
    (target_family_id, 'tiefbau',       'Tiefbau',                  'Shovel',        3,  true),
    (target_family_id, 'schotter',      'Schotter',                 'Truck',         4,  true),
    (target_family_id, 'zisterne',      'Zisterne',                 'Box',           5,  true),
    (target_family_id, 'entwaesserung', 'Entwässerung und Schächte','Waves',         6,  true),
    (target_family_id, 'hausanschluss', 'Hausanschlüsse',           'Plug',          7,  true),
    (target_family_id, 'elektro',       'Elektro',                  'Zap',           8,  true),
    (target_family_id, 'smarthome',     'Smart Home',               'Network',       9,  true),
    (target_family_id, 'sanitaer',      'Sanitär',                  'Droplet',       10, true),
    (target_family_id, 'heizung',       'Heizung',                  'Flame',         11, true),
    (target_family_id, 'lueftung',      'Lüftung',                  'Wind',          12, true),
    (target_family_id, 'photovoltaik',  'Photovoltaik',             'Sun',           13, true),
    (target_family_id, 'trockenbau',    'Trockenbau',               'SquareStack',   14, true),
    (target_family_id, 'bodenbelaege',  'Bodenbeläge',              'LayoutGrid',    15, true),
    (target_family_id, 'malerarbeiten', 'Malerarbeiten',            'PaintRoller',   16, true),
    (target_family_id, 'kueche',        'Küche',                    'ChefHat',       17, true),
    (target_family_id, 'garage',        'Garage',                   'Car',           18, true),
    (target_family_id, 'aussenanlage',  'Außenanlage',              'Trees',         19, true),
    (target_family_id, 'werkzeuge',     'Werkzeuge',                'Wrench',        20, true),
    (target_family_id, 'gebuehren',     'Gebühren',                 'Receipt',       21, true),
    (target_family_id, 'sonstiges',     'Sonstiges',                'CircleDot',     22, true)
  on conflict (family_id, key) do nothing;
$$;

revoke execute on function public.seed_default_hausbau_categories(uuid) from public, anon;
grant execute on function public.seed_default_hausbau_categories(uuid) to authenticated;

-- Also seed it whenever a family is (re-)joined, same as seed_default_categories.
create or replace function public.join_family_slot()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family uuid := '00000000-0000-0000-0000-000000000001';
  member_count int;
  assigned_role text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.families (id, name)
  values (target_family, 'Domenico & Elisabeth')
  on conflict (id) do nothing;

  select count(*) into member_count
  from public.family_members
  where family_id = target_family;

  if member_count >= 2 and not exists (
    select 1 from public.family_members
    where family_id = target_family and profile_id = auth.uid()
  ) then
    raise exception 'Diese Familie hat bereits zwei Mitglieder.';
  end if;

  assigned_role := case when member_count = 0 then 'owner' else 'member' end;

  insert into public.family_members (family_id, profile_id, role)
  values (target_family, auth.uid(), assigned_role)
  on conflict (family_id, profile_id) do nothing;

  update public.profiles set family_id = target_family where id = auth.uid();

  perform public.seed_default_categories(target_family);
  perform public.seed_default_hausbau_categories(target_family);

  return target_family;
end;
$$;

revoke execute on function public.join_family_slot() from public, anon;
grant execute on function public.join_family_slot() to authenticated;

-- Seed it now for the one family that already exists in this deployment.
select public.seed_default_hausbau_categories(id) from public.families;

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------

create table public.hausbau_expenses (
  id                     uuid primary key default gen_random_uuid(),
  family_id              uuid not null references public.families (id) on delete cascade,
  category_id            uuid references public.hausbau_categories (id) on delete set null,
  title                  text not null,
  -- Populated when status = 'planned' (the forecast figure); actual_amount_cents
  -- is populated for every other status (the committed/real figure). Never both
  -- meaningfully at once from the UI's single "Betrag" field, but both columns
  -- exist so a planned estimate survives once the entry moves to "beauftragt".
  planned_amount_cents   bigint check (planned_amount_cents >= 0),
  actual_amount_cents    bigint check (actual_amount_cents >= 0),
  payment_source         public.hausbau_payment_source not null,
  status                 public.hausbau_expense_status not null default 'planned',
  invoice_date           date,
  due_date               date,
  vendor                 text,
  invoice_number         text,
  notes                  text,
  receipt_path           text,
  linked_event_id        uuid references public.events (id) on delete set null,
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint hausbau_expenses_amount_check check (
    (status = 'planned' and planned_amount_cents is not null)
    or (status <> 'planned' and actual_amount_cents is not null)
  )
);

create index hausbau_expenses_family_idx on public.hausbau_expenses (family_id, status);
create index hausbau_expenses_family_date_idx on public.hausbau_expenses (family_id, invoice_date);

create trigger hausbau_expenses_set_updated_at
  before update on public.hausbau_expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Self-performed work ("Eigenleistung")
-- ---------------------------------------------------------------------------

create table public.hausbau_self_work (
  id                             uuid primary key default gen_random_uuid(),
  family_id                      uuid not null references public.families (id) on delete cascade,
  category_id                    uuid references public.hausbau_categories (id) on delete set null,
  title                          text not null,
  estimated_company_cost_cents   bigint not null default 0 check (estimated_company_cost_cents >= 0),
  actual_material_cost_cents     bigint not null default 0 check (actual_material_cost_cents >= 0),
  additional_external_cost_cents bigint not null default 0 check (additional_external_cost_cents >= 0),
  hours                          numeric(6, 1) check (hours >= 0),
  hourly_rate_cents              bigint check (hourly_rate_cents >= 0),
  payment_source                 public.hausbau_payment_source not null default 'self',
  work_date                      date,
  notes                          text,
  document_paths                 text[] not null default '{}',
  created_by                     uuid references public.profiles (id) on delete set null,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create index hausbau_self_work_family_idx on public.hausbau_self_work (family_id);

create trigger hausbau_self_work_set_updated_at
  before update on public.hausbau_self_work
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — same is_family_member() gate as every other family-scoped table.
-- The app currently has no "helper" role (family_members.role is only
-- 'owner'/'member', and this deployment is hard-capped at 2 members — see
-- join_family_slot() above), so "family member" already means exactly
-- "Domenico & Elisabeth"; there is no broader role to additionally lock out.
-- ---------------------------------------------------------------------------

alter table public.hausbau_budgets enable row level security;
alter table public.hausbau_categories enable row level security;
alter table public.hausbau_expenses enable row level security;
alter table public.hausbau_self_work enable row level security;

create policy "hausbau_budgets_all_family" on public.hausbau_budgets
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "hausbau_categories_select_family" on public.hausbau_categories
  for select using (public.is_family_member(family_id));
create policy "hausbau_categories_insert_family" on public.hausbau_categories
  for insert with check (public.is_family_member(family_id) and is_system = false);
create policy "hausbau_categories_update_family" on public.hausbau_categories
  for update using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy "hausbau_categories_delete_own" on public.hausbau_categories
  for delete using (public.is_family_member(family_id) and is_system = false);

create policy "hausbau_expenses_all_family" on public.hausbau_expenses
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "hausbau_self_work_all_family" on public.hausbau_self_work
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- Storage — receipts/photos, private, family-scoped folder (mirrors the
-- existing "backups" bucket pattern exactly).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('hausbau-documents', 'hausbau-documents', false)
on conflict (id) do nothing;

create policy "hausbau_documents_family_read" on storage.objects
  for select using (
    bucket_id = 'hausbau-documents'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "hausbau_documents_family_write" on storage.objects
  for insert with check (
    bucket_id = 'hausbau-documents'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "hausbau_documents_family_delete" on storage.objects
  for delete using (
    bucket_id = 'hausbau-documents'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Realtime — so both partners' devices stay in sync, same as events/tasks.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.hausbau_budgets;
alter publication supabase_realtime add table public.hausbau_categories;
alter publication supabase_realtime add table public.hausbau_expenses;
alter publication supabase_realtime add table public.hausbau_self_work;
