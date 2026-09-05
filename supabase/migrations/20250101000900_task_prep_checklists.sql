-- dayli — Vorbereitungsaufgaben (prep-task checklists on events)
-- A task can already reference a single event via linked_event_id (added in
-- the init schema), and that FK already permits many tasks to point at the
-- same event — so no new join table is needed for the checklist itself.
-- This migration adds what's still missing: a stable order for checklist
-- items and a per-task reminder, mirroring events.reminder_minutes_before.

alter table public.tasks
  add column if not exists sort_order integer not null default 0;

alter table public.tasks
  add column if not exists reminder_minutes_before integer;

-- Fast "which prep tasks belong to this event" lookups (EventFormSheet,
-- badges on EventCard/EventRow, delete-cascade decisions).
create index if not exists tasks_linked_event_idx
  on public.tasks (linked_event_id)
  where linked_event_id is not null;
