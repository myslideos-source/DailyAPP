-- dayli — local development seed
-- Run via `supabase db reset` (local stack only). Creates the two demo
-- accounts, links them into one family, and mirrors the same content that
-- lib/demo-data.ts ships client-side so the local Supabase-backed app looks
-- identical to the offline demo mode.
--
-- Demo logins (local only): domenico@dayli.app / elisabeth@dayli.app
-- Password for both: dayli-demo

do $$
declare
  v_family_id      uuid := '00000000-0000-0000-0000-000000000001';
  v_domenico_id    uuid := '00000000-0000-0000-0000-0000000000d1';
  v_elisabeth_id   uuid := '00000000-0000-0000-0000-0000000000e1';
  v_today          date := current_date;
  v_cat_hausbau    uuid;
  v_cat_kinder     uuid;
  v_cat_einkauf    uuid;
  v_cat_freizeit   uuid;
  v_evt_bemusterung uuid := gen_random_uuid();
  v_goal_haus      uuid := gen_random_uuid();
  v_goal_urlaub    uuid := gen_random_uuid();
begin
  -- Demo auth users (local Supabase stack only — auth.users is not writable
  -- like this against a hosted project; use supabase.auth.signUp there).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    ('00000000-0000-0000-0000-000000000000', v_domenico_id, 'authenticated', 'authenticated',
     'domenico@dayli.app', crypt('dayli-demo', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Domenico"}',
     now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_elisabeth_id, 'authenticated', 'authenticated',
     'elisabeth@dayli.app', crypt('dayli-demo', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Elisabeth"}',
     now(), now())
  on conflict (id) do nothing;

  -- public.profiles rows are normally created by the on_auth_user_created
  -- trigger; update them here with dayli's brand colors.
  insert into public.families (id, name) values (v_family_id, 'Domenico & Elisabeth')
  on conflict (id) do nothing;

  update public.profiles set family_id = v_family_id, display_name = 'Domenico', initial = 'D', color = '#63D8F4'
    where id = v_domenico_id;
  update public.profiles set family_id = v_family_id, display_name = 'Elisabeth', initial = 'E', color = '#EA82B7'
    where id = v_elisabeth_id;

  insert into public.family_members (family_id, profile_id, role) values
    (v_family_id, v_domenico_id, 'owner'),
    (v_family_id, v_elisabeth_id, 'member')
  on conflict do nothing;

  perform public.seed_default_categories(v_family_id);

  select id into v_cat_hausbau from public.categories where family_id = v_family_id and key = 'hausbau';
  select id into v_cat_kinder from public.categories where family_id = v_family_id and key = 'kinder';
  select id into v_cat_einkauf from public.categories where family_id = v_family_id and key = 'einkauf';
  select id into v_cat_freizeit from public.categories where family_id = v_family_id and key = 'freizeit';

  -- Today's events, mirroring lib/demo-data.ts
  insert into public.events (id, family_id, category_id, title, date, start_time, end_time, all_day, location, notes, created_by)
  values
    (v_evt_bemusterung, v_family_id, v_cat_hausbau, 'Bemusterung Haus', v_today, '09:00', '10:30', false,
     'Musterhauszentrum', 'Fliesen und Armaturen final abstimmen.', v_domenico_id),
    (gen_random_uuid(), v_family_id, v_cat_kinder, 'Mias Termin', v_today, '14:30', '15:15', false,
     'Crailsheim', null, v_elisabeth_id),
    (gen_random_uuid(), v_family_id, v_cat_einkauf, 'Einkaufen', v_today, '18:00', '18:45', false,
     null, null, v_domenico_id),
    (gen_random_uuid(), v_family_id, v_cat_freizeit, 'Zeit für uns', v_today, '19:15', '22:00', false,
     null, 'Der Abend gehört euch.', v_domenico_id),
    (gen_random_uuid(), v_family_id, v_cat_hausbau, 'Tiefbauer anrufen', v_today + 1, '08:30', '08:45', false,
     null, null, v_domenico_id);

  insert into public.event_participants (event_id, profile_id) values
    (v_evt_bemusterung, v_domenico_id),
    (v_evt_bemusterung, v_elisabeth_id);

  -- Tasks
  insert into public.tasks (id, family_id, title, due_date, priority, is_shopping, created_by)
  values
    (gen_random_uuid(), v_family_id, 'Tiefbauer wegen Termin anrufen', v_today + 1, 'high', false, v_domenico_id),
    (gen_random_uuid(), v_family_id, 'Bauversicherung vergleichen', v_today + 3, 'medium', false, v_elisabeth_id),
    (gen_random_uuid(), v_family_id, 'Milch', v_today, 'low', true, v_domenico_id),
    (gen_random_uuid(), v_family_id, 'Obst und Gemüse', v_today, 'low', true, v_domenico_id);

  -- Savings goals
  insert into public.savings_goals (id, family_id, title, target_amount, color, created_by) values
    (v_goal_haus, v_family_id, 'Haus', 25000, 'together', v_domenico_id),
    (v_goal_urlaub, v_family_id, 'Urlaub', 3000, 'together', v_elisabeth_id);

  insert into public.savings_entries (goal_id, amount, contributor_id, note) values
    (v_goal_haus, 800, v_domenico_id, 'Gehalt August'),
    (v_goal_haus, 800, v_elisabeth_id, 'Gehalt August'),
    (v_goal_urlaub, 150, v_elisabeth_id, null);
end $$;
