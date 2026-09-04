import type { Assignee, CalendarEvent } from "./types";

export type CalendarFilter = Assignee[] | "alle";

export function filterEvents(events: CalendarEvent[], filter: CalendarFilter) {
  if (filter === "alle") return events;
  return events.filter((e) => filter.includes(e.assignee));
}

export function matchesSearch(event: CalendarEvent, query: string) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    event.title.toLowerCase().includes(q) ||
    (event.location?.toLowerCase().includes(q) ?? false) ||
    (event.notes?.toLowerCase().includes(q) ?? false)
  );
}
