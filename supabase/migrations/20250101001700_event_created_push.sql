-- dayli — instant "new event" push
--
-- Until now the only push a family member ever received was a reminder
-- firing at its scheduled time (send-due-reminders) — creating an event
-- itself never told the other partner anything, in-app or as a push. This
-- closes that gap: right after an event is inserted, notify every other
-- family member (never the creator's own devices) with a real push, same
-- shared-secret/pg_net pattern as notify_savings_milestone.
--
-- Fires once per INSERT — a recurring event's base row triggers exactly
-- one push for the series, not one per expanded occurrence (those are
-- computed client-side, never stored as rows).

create or replace function public.notify_event_created()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_secret text;
begin
  select secret into v_secret from public.get_reminder_secrets() where name = 'reminder_cron_secret';
  if v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://jghfdzmvvizddomwqtzq.supabase.co/functions/v1/send-event-created',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-reminder-secret', v_secret),
    body := jsonb_build_object(
      'event_id', new.id,
      'family_id', new.family_id,
      'title', new.title,
      'date', new.date,
      'start_time', new.start_time,
      'all_day', new.all_day,
      'assignee', new.assignee,
      'created_by', new.created_by
    )
  );

  return new;
end;
$function$;

drop trigger if exists events_notify_created on public.events;
create trigger events_notify_created
  after insert on public.events
  for each row
  execute function public.notify_event_created();
