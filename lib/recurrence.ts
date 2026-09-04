import { addDays, addMonths, addWeeks, addYears, format, isAfter, isBefore } from "date-fns";
import { fromISODate } from "./date-utils";
import type { CalendarEvent } from "./types";

// Recurring events are never persisted per-occurrence — every future date
// is computed on the fly from the single stored event whenever a view
// needs to render a date range. Editing or deleting a recurring event
// therefore always acts on the whole series, not one occurrence; there is
// no per-occurrence exception support in this pass.

const MAX_OCCURRENCES = 400;

function stepDate(date: Date, rule: CalendarEvent["recurrence"]): Date {
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
      cursor = stepDate(cursor, event.recurrence);
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
