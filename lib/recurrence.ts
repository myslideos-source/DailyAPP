import { v4 as uuid } from "uuid";
import { addDays, addMonths, addWeeks, addYears, format, isAfter, isBefore } from "date-fns";
import { fromISODate } from "./date-utils";
import type { Assignee, CalendarEvent, RecurrenceRule, TaskItem } from "./types";

// Recurring events are never persisted per-occurrence — every future date
// is computed on the fly from the single stored event whenever a view
// needs to render a date range. Editing or deleting a recurring event
// therefore always acts on the whole series, not one occurrence; there is
// no per-occurrence exception support in this pass.

const MAX_OCCURRENCES = 400;

export function stepRecurrence(date: Date, rule: RecurrenceRule): Date {
  switch (rule) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addWeeks(date, 1);
    case "monthly":
      return addMonths(date, 1);
    case "yearly":
      return addYears(date, 1);
    default:
      return date;
  }
}

/**
 * Expands events into every occurrence that falls within
 * [rangeStartISO, rangeEndISO] (inclusive). Non-recurring events pass
 * through unchanged (still range-filtered); recurring events are
 * projected forward from their original date, each occurrence carrying
 * the base event's id and a `date` set to that occurrence.
 */
export function expandEventOccurrences(
  events: CalendarEvent[],
  rangeStartISO: string,
  rangeEndISO: string,
): CalendarEvent[] {
  const rangeStart = fromISODate(rangeStartISO);
  const rangeEnd = fromISODate(rangeEndISO);
  const result: CalendarEvent[] = [];

  for (const event of events) {
    const anchor = fromISODate(event.date);

    if (event.recurrence === "none") {
      if (!isBefore(anchor, rangeStart) && !isAfter(anchor, rangeEnd)) {
        result.push(event);
      }
      continue;
    }

    let cursor = anchor;
    let count = 0;
    while (!isAfter(cursor, rangeEnd) && count < MAX_OCCURRENCES) {
      if (!isBefore(cursor, rangeStart)) {
        // First loop pass: cursor is still the same object as anchor, so the
        // original event (with its real date string) is reused as-is.
        result.push(cursor === anchor ? event : { ...event, date: format(cursor, "yyyy-MM-dd") });
      }
      cursor = stepRecurrence(cursor, event.recurrence);
      count++;
    }
  }

  return result;
}

/** Convenience wrapper for a single day. */
export function expandEventsForDay(events: CalendarEvent[], dateISO: string): CalendarEvent[] {
  return expandEventOccurrences(events, dateISO, dateISO);
}

export function occurrenceKey(event: CalendarEvent) {
  return `${event.id}-${event.date}`;
}

// Tasks (unlike events) have no virtual-expansion display — a recurring
// task instead spawns one real next-occurrence row when the current one is
// completed, so "erledigt" history stays intact per instance. Swapping
// stops at "gemeinsam": rotating a shared task between two people who both
// already own it doesn't mean anything.
export function swapAssignee(assignee: Assignee): Assignee {
  if (assignee === "domenico") return "elisabeth";
  if (assignee === "elisabeth") return "domenico";
  return assignee;
}

/** Builds the payload for a recurring task's next occurrence right after
 * the current one is marked done. Returns null when the task isn't
 * recurring or has no due date to advance from. */
export function nextTaskOccurrence(task: TaskItem): Omit<TaskItem, "id" | "createdAt" | "updatedAt"> | null {
  if (task.recurrence === "none" || !task.dueDate) return null;

  const nextDueDate = format(stepRecurrence(fromISODate(task.dueDate), task.recurrence), "yyyy-MM-dd");

  return {
    title: task.title,
    assignee: task.rotateAssignee ? swapAssignee(task.assignee) : task.assignee,
    dueDate: nextDueDate,
    priority: task.priority,
    done: false,
    doneAt: null,
    recurrence: task.recurrence,
    rotateAssignee: task.rotateAssignee ?? false,
    isShopping: task.isShopping,
    linkedEventId: null,
    reminderMinutesBefore: task.reminderMinutesBefore,
    sortOrder: task.sortOrder,
    subtasks: task.subtasks.map((s) => ({ ...s, id: uuid(), done: false })),
  };
}
