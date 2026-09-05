// Shared "when is this due, and what's still open" copy for reminders —
// used both by the Supabase repository (building the `reminders.message`
// row the send-due-reminders edge function delivers as push) and by the
// local in-tab scheduler in demo mode, so the wording is identical
// regardless of which delivery path actually fires.

import { fromISODate, relativeDayPhrase } from "@/lib/date-utils";
import type { CalendarEvent, TaskItem } from "@/lib/types";

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

export function buildEventReminderMessage(event: CalendarEvent, openPrepTaskCount: number) {
  const when = relativeDayPhrase(fromISODate(event.date));
  const time = event.startTime ? ` um ${event.startTime} Uhr` : "";
  const base = `${event.title} ${when}${time}.`;
  if (openPrepTaskCount <= 0) return base;
  const openLabel =
    openPrepTaskCount === 1 ? "Noch 1 Vorbereitung offen." : `Noch ${openPrepTaskCount} Vorbereitungen offen.`;
  return `${base} ${openLabel}`;
}

export function buildTaskReminderMessage(task: TaskItem, linkedEvent?: CalendarEvent | null) {
  if (linkedEvent) {
    const when = relativeDayPhrase(fromISODate(linkedEvent.date));
    return `${task.title} — Vorbereitung für „${linkedEvent.title}“ (${when}).`;
  }
  const when = task.dueDate ? relativeDayPhrase(fromISODate(task.dueDate)) : "bald fällig";
  return `${task.title} (${when}).`;
}
