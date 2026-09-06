"use client";

import { Bell, Calendar, CalendarX, ChevronLeft, MapPin, Pencil, Repeat, StickyNote, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrepTaskChecklist } from "@/components/events/PrepTaskChecklist";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { assigneeColor, assigneeLabel, assigneeSoftColor, iconByName } from "@/lib/theme";
import { fromISODate, formatFullDate } from "@/lib/date-utils";
import { reminderLabel, recurrenceLabel } from "@/lib/event-options";
import type { CalendarEvent } from "@/lib/types";

function InfoRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <Icon size={18} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
          {label}
        </p>
        <p className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function timeSummary(event: CalendarEvent): string | undefined {
  if (event.allDay) return "Ganztägig";
  if (event.startTime && event.endTime) return `${event.startTime}–${event.endTime} Uhr`;
  if (event.startTime) return `Ab ${event.startTime} Uhr`;
  return undefined;
}

/** The read-only default view for tapping an event, anywhere in the app.
 * No input fields, no toggles, no save button — just the information as
 * text, plus the prep-task checklist (which stays interactive since
 * checking a task isn't editing the event itself). Editing only starts
 * from the pencil icon, which opens EventFormSheet via openEventEdit. */
export function EventDetailSheet({
  open,
  onClose,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string | null;
}) {
  const { events, tasks, categories } = useAppStore();
  const { openEventEdit } = useSheet();

  const event = eventId ? (events.find((e) => e.id === eventId) ?? null) : null;
  const prepCount = event ? tasks.filter((t) => t.linkedEventId === event.id).length : 0;
  const category = event?.category ? (categories.find((c) => c.key === event.category) ?? null) : null;

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title="Termin"
      leftAction={
        <button
          type="button"
          onClick={onClose}
          aria-label="Zurück"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ color: "var(--dl-text-dim)" }}
        >
          <ChevronLeft size={22} />
        </button>
      }
      rightAction={
        event ? (
          <button
            type="button"
            onClick={() => openEventEdit(event.id)}
            aria-label="Termin bearbeiten"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: "rgba(140, 150, 255, 0.35)", background: "rgba(140, 150, 255, 0.1)" }}
          >
            <Pencil size={22} style={{ color: "var(--dl-together)" }} />
          </button>
        ) : undefined
      }
    >
      {!event ? (
        <div className="pt-10">
          <EmptyState
            icon={CalendarX}
            title="Termin nicht gefunden"
            description="Dieser Termin existiert nicht mehr oder wurde gelöscht."
            action={
              <button
                type="button"
                onClick={onClose}
                className="mt-1 rounded-full border px-4 py-2 text-[13px] font-medium"
                style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
              >
                Zum Kalender
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-6">
          <div>
            <h2 className="text-[26px] font-bold leading-tight" style={{ color: "var(--dl-text)" }}>
              {event.title}
            </h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-[12.5px] font-semibold"
                style={{ background: "var(--dl-card-raised)", color: "var(--dl-text-dim)" }}
              >
                {category?.label ?? "Keine Kategorie"}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[12.5px] font-semibold"
                style={{ background: assigneeSoftColor(event.assignee), color: assigneeColor(event.assignee) }}
              >
                {assigneeLabel(event.assignee)}
              </span>
            </div>
          </div>

          <div
            className="rounded-[17px] px-4"
            style={{ background: "var(--field-background)", border: "1px solid var(--field-border)" }}
          >
            <div className="divide-y divide-[rgba(140,150,255,0.14)]">
              <InfoRow
                icon={Calendar}
                label="Datum"
                value={formatFullDate(fromISODate(event.date))}
                sub={timeSummary(event)}
              />
              <InfoRow icon={Users} label="Zuständig" value={assigneeLabel(event.assignee)} />
              <InfoRow
                icon={iconByName(category?.icon)}
                label="Kategorie"
                value={category?.label ?? "Keine Kategorie"}
              />
              {event.location && <InfoRow icon={MapPin} label="Ort" value={event.location} />}
              {reminderLabel(event.reminderMinutesBefore) && (
                <InfoRow icon={Bell} label="Erinnerung" value={reminderLabel(event.reminderMinutesBefore)!} />
              )}
              {recurrenceLabel(event.recurrence) && (
                <InfoRow icon={Repeat} label="Wiederholung" value={recurrenceLabel(event.recurrence)!} />
              )}
              {event.notes && <InfoRow icon={StickyNote} label="Notizen" value={event.notes} />}
            </div>
          </div>

          {prepCount > 0 && <PrepTaskChecklist event={event} />}
        </div>
      )}
    </FullscreenPage>
  );
}
