-- dayli — Daily briefing + iPhone widget privacy preferences.
--
-- Both concerns are strictly per-person (never shared via Realtime), so
-- they extend the existing private user_preferences row rather than a new
-- table — same reasoning as reduced_motion_override/calendar_filters.
-- Existing RLS on user_preferences (profile_id = auth.uid()) already
-- covers these new columns; no policy changes needed.

alter table public.user_preferences
  add column if not exists daily_briefing_enabled boolean not null default true,
  add column if not exists daily_briefing_auto_show boolean not null default true,
  add column if not exists daily_briefing_frequency text not null default 'daily',
  add column if not exists daily_briefing_include_shared boolean not null default true,
  add column if not exists daily_briefing_include_personal boolean not null default true,
  add column if not exists last_daily_briefing_seen_date date,
  add column if not exists widget_show_event_title boolean not null default true,
  add column if not exists widget_show_time_only boolean not null default false,
  add column if not exists widget_show_tasks boolean not null default true,
  add column if not exists widget_hide_private_content boolean not null default false;

alter table public.user_preferences
  add constraint user_preferences_daily_briefing_frequency_check
    check (daily_briefing_frequency in ('daily', 'weekdays'));
