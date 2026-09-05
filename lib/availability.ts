import type { CalendarEvent } from "@/lib/types";

export interface AvailabilityResult {
  status: "clear" | "conflict";
  conflicts: CalendarEvent[];
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Whether a shared ("gemeinsam") event at the given date/time range would
 * clash with anything either Domenico or Elisabeth already has on their
 * calendar — any existing event overlapping the same window counts,
 * regardless of who it's assigned to, since a "gemeinsam" slot needs both
 * of them free. Only checks timed events; all-day events are ignored since
 * they don't occupy a specific window. */
export function checkAvailability(
  events: CalendarEvent[],
  date: string,
  startTime: string,
  endTime: string | null,
  excludeEventId?: string,
): AvailabilityResult {
  const newStart = toMinutes(startTime);
  const newEnd = endTime ? toMinutes(endTime) : newStart + 60;

  const conflicts = events.filter((event) => {
    if (event.id === excludeEventId) return false;
    if (event.date !== date) return false;
    if (event.allDay || !event.startTime) return false;
    const start = toMinutes(event.startTime);
    const end = event.endTime ? toMinutes(event.endTime) : start + 60;
    return start < newEnd && newStart < end;
  });

  return { status: conflicts.length > 0 ? "conflict" : "clear", conflicts };
}
