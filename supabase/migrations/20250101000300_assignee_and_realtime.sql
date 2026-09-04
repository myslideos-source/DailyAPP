-- dayli — assignee convenience column + Realtime
-- The product only ever needs a single tri-state "who is this for" value
-- (Domenico / Elisabeth / gemeinsam), not a free-form participant list, so
-- a denormalized column is simpler and faster than joining through
-- event_participants / task_assignees for every read. Those junction
-- tables stay in place for future multi-member households.

alter table public.events
  add column if not exists assignee text not null default 'gemeinsam'
    check (assignee in ('domenico', 'elisabeth', 'gemeinsam'));

alter table public.tasks
  add column if not exists assignee text not null default 'gemeinsam'
    check (assignee in ('domenico', 'elisabeth', 'gemeinsam'));

alter table public.savings_entries
  add column if not exists contributor text not null default 'gemeinsam'
    check (contributor in ('domenico', 'elisabeth', 'gemeinsam'));

-- Realtime: let both phones see each other's changes live.
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_subtasks;
alter publication supabase_realtime add table public.savings_goals;
alter publication supabase_realtime add table public.savings_entries;
alter publication supabase_realtime add table public.notifications;
