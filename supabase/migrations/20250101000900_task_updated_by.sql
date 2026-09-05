-- dayli — track who last touched a task
--
-- Lets a device tell apart "I just checked this off" from "my partner just
-- checked this off" in the Realtime stream, so the shared shopping list can
-- show a live toast for the partner's changes without echoing your own.

alter table public.tasks
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;
