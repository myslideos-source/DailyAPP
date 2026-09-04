-- dayli — single-family self-service join
--
-- This deployment of dayli is built for exactly one couple. Rather than a
-- general invite-code system, a newly signed-up user can claim one of the
-- two seats on THE family (a fixed id, not an arbitrary target) via this
-- function. It is intentionally not a generic "join any family by id"
-- primitive — that would defeat the family_members RLS policy, which
-- otherwise only lets an existing owner add members.

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

  return target_family;
end;
$$;

revoke execute on function public.join_family_slot() from public, anon;
grant execute on function public.join_family_slot() to authenticated;
