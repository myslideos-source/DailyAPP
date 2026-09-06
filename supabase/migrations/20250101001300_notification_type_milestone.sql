-- Tag savings-goal milestone notifications with type='milestone' so the
-- bell/popover can render a distinct icon for them, matching the type set
-- by send-due-reminders for event/task reminders.
create or replace function public.notify_savings_milestone()
returns trigger
language plpgsql
security definer
as $$
declare
  v_goal record;
  v_total_before numeric;
  v_total_after numeric;
  v_milestone int;
  v_secret text;
begin
  select id, family_id, title, target_amount into v_goal
  from public.savings_goals where id = new.goal_id;

  if v_goal.target_amount is null or v_goal.target_amount <= 0 then
    return new;
  end if;

  select coalesce(sum(amount), 0) into v_total_after
  from public.savings_entries where goal_id = new.goal_id;

  v_total_before := v_total_after - new.amount;

  if v_total_before < v_goal.target_amount and v_total_after >= v_goal.target_amount then
    v_milestone := 100;
  elsif v_total_before < v_goal.target_amount * 0.5 and v_total_after >= v_goal.target_amount * 0.5 then
    v_milestone := 50;
  else
    return new;
  end if;

  insert into public.notifications (family_id, title, body, type)
  values (
    v_goal.family_id,
    case when v_milestone = 100 then '🎉 Sparziel erreicht!' else 'Fast geschafft!' end,
    case when v_milestone = 100
      then format('„%s“ ist zu 100%% gespart!', v_goal.title)
      else format('„%s“ ist schon zur Hälfte gespart!', v_goal.title)
    end,
    'milestone'
  );

  select secret into v_secret from public.get_reminder_secrets() where name = 'reminder_cron_secret';

  perform net.http_post(
    url := 'https://jghfdzmvvizddomwqtzq.supabase.co/functions/v1/send-goal-milestone',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-reminder-secret', v_secret),
    body := jsonb_build_object('family_id', v_goal.family_id, 'milestone', v_milestone, 'goal_title', v_goal.title)
  );

  return new;
end;
$$;
