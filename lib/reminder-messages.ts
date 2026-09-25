// Shared "when is this due, and what's still open" copy for reminders —
// used both by the Supabase repository (building the `reminders.message`
// row the send-due-reminders edge function delivers as push) and by the
// local in-tab scheduler in demo mode, so the wording is identical
// regardless of which delivery path actually fires.
//
// Push title/body are built separately on purpose: the title is just the
// bare event/task name (the OS notification chrome already shows which
// app sent it and, on iPhone, a "von dayli"-style origin line of its own —
// repeating "Erinnerung" or the app name in our own text would be a second,
// redundant label on top of that). The body never repeats the title or the
// time already visible elsewhere; it only adds what the title can't say —
// when, and (for events) where.

import { pushTimingPhrase } from "@/lib/date-utils";
import type { CalendarEvent, TaskItem } from "@/lib/types";

export interface ReminderPush {
  title: string;
  body: string;
}

// All-day events (e.g. birthdays) have no intrinsic time, so their reminder
// is anchored to a fixed local time of day instead.
const ALL_DAY_REMINDER_TIME = "09:00";

export function computeEventRemindAt(dateISO: string, startTime: string | null, minutesBefore: number) {
  const [hours, minutes] = (startTime ?? ALL_DAY_REMINDER_TIME).split(":").map(Number);
  const start = new Date(`${dateISO}T00:00:00`);
  start.setHours(hours, minutes, 0, 0);
  start.setMinutes(start.getMinutes() - minutesBefore);
  return start;
}

// Tasks have no time-of-day, so a "day before" reminder is anchored to a
// fixed nominal morning time (08:00 local) rather than a specific hour.
export function computeTaskRemindAt(dueDateISO: string, minutesBefore: number) {
  const due = new Date(`${dueDateISO}T08:00:00`);
  due.setMinutes(due.getMinutes() - minutesBefore);
  return due;
}

/** Title is the bare event name; body is only the timing (plus a short
 * location, plus open-prep-task count) — never the title again. */
export function buildEventReminderPush(event: CalendarEvent, openPrepTaskCount: number): ReminderPush {
  let body = pushTimingPhrase(event.date, event.allDay ? null : event.startTime);
  const location = event.location?.trim();
  if (location) body += ` · ${location}`;
  body += ".";
  if (openPrepTaskCount > 0) {
    body += ` Noch ${openPrepTaskCount === 1 ? "1 Vorbereitung" : `${openPrepTaskCount} Vorbereitungen`} offen.`;
  }
  return { title: event.title, body };
}

/** Title is the bare task name; body says only when it's due — or, for a
 * prep task, which event it's for and when that is (genuinely new
 * information, not a repeat of the task's own title in the title bar). */
export function buildTaskReminderPush(task: TaskItem, linkedEvent?: CalendarEvent | null): ReminderPush {
  if (linkedEvent) {
    const when = pushTimingPhrase(linkedEvent.date, linkedEvent.allDay ? null : linkedEvent.startTime);
    return { title: task.title, body: `Vorbereitung für „${linkedEvent.title}“ · ${when}.` };
  }
  if (!task.dueDate) return { title: task.title, body: "Bald fällig." };
  const label = pushTimingPhrase(task.dueDate);
  const body = label === "Heute" || label === "Morgen" ? `${label} fällig.` : `Fällig am ${label}.`;
  return { title: task.title, body };
}
