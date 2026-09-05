import type { CalendarEvent } from "@/lib/types";

export interface FreeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

const DAY_START = "08:00";
const DAY_END = "22:00";
const MIN_SLOT_MINUTES = 30;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

/** Gaps in either partner's timed schedule on a given day, between
 * DAY_START and DAY_END, at least MIN_SLOT_MINUTES long. Any timed event
 * counts regardless of assignee, since a shared activity needs both of
 * them free; all-day events don't occupy a specific window and are
 * ignored, matching `checkAvailability`. */
function freeSlotsForDay(events: CalendarEvent[], date: string): FreeSlot[] {
  const busy = events
    .filter((e) => e.date === date && !e.allDay && e.startTime)
    .map((e): [number, number] => {
      const start = toMinutes(e.startTime!);
      const end = e.endTime ? toMinutes(e.endTime) : start + 60;
      return [start, end];
    })
    .sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const [start, end] of busy) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  const dayStart = toMinutes(DAY_START);
  const dayEnd = toMinutes(DAY_END);
  const slots: FreeSlot[] = [];
  let cursor = dayStart;
  for (const [start, end] of merged) {
    if (start - cursor >= MIN_SLOT_MINUTES) {
      slots.push({ date, startTime: toTime(cursor), endTime: toTime(start) });
    }
    cursor = Math.max(cursor, end);
  }
  if (dayEnd - cursor >= MIN_SLOT_MINUTES) {
    slots.push({ date, startTime: toTime(cursor), endTime: toTime(dayEnd) });
  }
  return slots;
}

/** Shared free windows across the given dates. Pass already recurrence-
 * expanded occurrences for those dates (see `expandEventsForDay`). */
export function findSharedFreeSlots(events: CalendarEvent[], dates: string[]): FreeSlot[] {
  return dates.flatMap((date) => freeSlotsForDay(events, date));
}
