// Builds the small, privacy-filtered JSON payload handed to the native
// DayliWidgetBridge Capacitor plugin, which writes it into the shared App
// Group container the WidgetKit extension reads (spec §11/§12). This is
// the ONLY place widget-privacy settings are applied — the Swift side
// renders whatever it's given verbatim, so a privacy toggle can never be
// bypassed by a stale or buggy native build.
import { computeDailyBriefing } from "@/lib/briefing";
import type { CalendarEvent, PersonId, TaskItem, WidgetPrivacySettings } from "@/lib/types";

export interface WidgetEventPayload {
  id: string;
  title: string;
  /** ISO 8601 local-wall-clock instant (no timezone suffix) — the phone
   * renders its own local time, same as any other on-device widget. */
  startDate: string;
  endDate: string | null;
  isAllDay: boolean;
  assignee: string;
  category: string | null;
}

export interface WidgetTaskPayload {
  id: string;
  title: string;
  dueDate: string | null;
  assignee: string;
  isCompleted: boolean;
}

/** Mirrors the Swift `DayliWidgetSnapshot` struct (ios/DayliWidget/DayliWidgetSnapshot.swift)
 * field-for-field — keep both in sync by hand, there is no shared schema
 * generator between the two languages. */
export interface WidgetSnapshotPayload {
  generatedAt: string;
  userName: string;
  nextEvent: WidgetEventPayload | null;
  openTasks: WidgetTaskPayload[];
  openTaskCount: number;
}

function toLocalISO(dateISO: string, timeHHmm: string | null): string {
  return `${dateISO}T${timeHHmm ?? "00:00"}:00`;
}

export function computeWidgetSnapshot({
  events,
  tasks,
  personId,
  userName,
  privacy,
  now = new Date(),
}: {
  events: CalendarEvent[];
  tasks: TaskItem[];
  personId: PersonId;
  userName: string;
  privacy: WidgetPrivacySettings;
  now?: Date;
}): WidgetSnapshotPayload {
  const briefing = computeDailyBriefing({ events, tasks, personId, now });

  // "Nur Uhrzeit anzeigen" wins over "Termintitel anzeigen" when both are
  // somehow set inconsistently — showing a title the user explicitly asked
  // to suppress would be the more surprising failure mode of the two.
  const showTitle = privacy.showEventTitle && !privacy.showTimeOnly;

  const nextEvent: WidgetEventPayload | null = briefing.nextEvent
    ? {
        id: briefing.nextEvent.id,
        title: showTitle ? (privacy.hidePrivateContent ? "Privater Termin" : briefing.nextEvent.title) : "",
        startDate: toLocalISO(briefing.nextEvent.date, briefing.nextEvent.startTime),
        endDate: briefing.nextEvent.endTime ? toLocalISO(briefing.nextEvent.date, briefing.nextEvent.endTime) : null,
        isAllDay: briefing.nextEvent.allDay,
        assignee: briefing.nextEvent.assignee,
        category: briefing.nextEvent.category,
      }
    : null;

  const openTasks: WidgetTaskPayload[] = privacy.showTasks
    ? briefing.openTaskItems.slice(0, 3).map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        assignee: t.assignee,
        isCompleted: t.done,
      }))
    : [];

  return {
    generatedAt: now.toISOString(),
    userName,
    nextEvent,
    openTasks,
    // Deliberately 0 (not the real count) when "Aufgaben anzeigen" is off —
    // the widget has no other field to signal "hidden" vs. "actually zero",
    // so hiding is modeled as an empty task list end to end (documented
    // limitation of sticking to the exact snapshot shape from spec §11).
    openTaskCount: privacy.showTasks ? briefing.openTasksCount : 0,
  };
}
