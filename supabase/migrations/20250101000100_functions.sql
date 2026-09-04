-- dayli — helper functions & triggers

-- Keep updated_at accurate on every row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- Central membership check used by every RLS policy below. SECURITY DEFINER
-- so it can read family_members regardless of the caller's own row-level
-- access, while still only ever answering "is *this* caller a member".
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.profile_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.profile_id = auth.uid()
      and fm.role = 'owner'
  );
$$;

-- Default categories seeded for every newly created family.
create or replace function public.seed_default_categories(target_family_id uuid)
returns void
language sql
set search_path = public
as $$
  insert into public.categories (family_id, key, label, icon, sort_order)
  values
    (target_family_id, 'familie', 'Familie', 'Users', 0),
    (target_family_id, 'hausbau', 'Hausbau', 'Home', 1),
    (target_family_id, 'kinder', 'Kinder', 'Baby', 2),
    (target_family_id, 'arbeit', 'Arbeit', 'Briefcase', 3),
    (target_family_id, 'einkauf', 'Einkauf', 'ShoppingBasket', 4),
    (target_family_id, 'freizeit', 'Freizeit', 'Sparkles', 5),
    (target_family_id, 'geburtstag', 'Geburtstag', 'Cake', 6),
    (target_family_id, 'gesundheit', 'Gesundheit', 'HeartPulse', 7),
    (target_family_id, 'sonstiges', 'Sonstiges', 'CircleDot', 8)
  on conflict (family_id, key) do nothing;
$$;

-- When a new auth user signs up, give them a profile row. Joining an
-- existing family (or creating a new one) happens explicitly in the app —
-- this only ensures `profiles` never lags behind `auth.users`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, initial)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(upper(left(new.raw_user_meta_data ->> 'display_name', 1)), upper(left(new.email, 1)))
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
