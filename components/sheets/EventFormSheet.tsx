"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Trash2, Paperclip, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { CategoryPickerSheet } from "@/components/sheets/CategoryPickerSheet";
import { FieldLabel, TextAreaField, TextField, ToggleRow } from "@/components/ui/FormControls";
import { PrepTaskChecklist } from "@/components/events/PrepTaskChecklist";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { useSavePulse } from "@/lib/store/save-pulse-context";
import { checkAvailability } from "@/lib/availability";
import { REMINDER_OPTIONS, RECURRENCE_OPTIONS } from "@/lib/event-options";
import { assigneeColor, assigneeLabel, iconByName } from "@/lib/theme";
import { formatLongDate } from "@/lib/date-utils";
import type { Assignee, CalendarEvent, EventCategory, RecurrenceRule } from "@/lib/types";
import { PersonAvatar } from "@/components/ui/Avatar";

const ASSIGNEE_OPTIONS: { value: Assignee; label: string }[] = [
  { value: "domenico", label: "Domenico" },
  { value: "gemeinsam", label: "Gemeinsam" },
  { value: "elisabeth", label: "Elisabeth" },
];

const FIELD_STYLE = {
  borderRadius: "var(--field-radius)",
  borderColor: "var(--field-border)",
  background: "var(--field-background)",
  color: "var(--dl-text)",
} as const;

function CategoryGlyph({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return <Icon size={18} style={{ color }} />;
}

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  presetCategory?: EventCategory;
  editEvent?: CalendarEvent | null;
}

interface FormSnapshot {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  assignee: Assignee;
  category: EventCategory | null;
  location: string;
  notes: string;
  reminder: string;
  recurrence: RecurrenceRule;
}

export function EventFormSheet({ open, onClose, defaultDate, presetCategory, editEvent }: Props) {
  const { addEvent, updateEvent, deleteEvent, tasks, events, categories, showToast } = useAppStore();
  const { openEventDetail } = useSheet();
  const { triggerSavePulse } = useSavePulse();
  const isBirthday = presetCategory === "geburtstag";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const linkedTaskCount = editEvent ? tasks.filter((t) => t.linkedEventId === editEvent.id).length : 0;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(isBirthday);
  const [assignee, setAssignee] = useState<Assignee>("gemeinsam");
  const [category, setCategory] = useState<EventCategory | null>(presetCategory ?? "familie");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(isBirthday ? "yearly" : "none");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState("");

  function snapshotOf(v: FormSnapshot) {
    return JSON.stringify(v);
  }

  // Sheet stays mounted between opens (so its close animation can play), so
  // fields are reset here rather than via a remount-on-key approach.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    const next: FormSnapshot = editEvent
      ? {
          title: editEvent.title,
          date: editEvent.date,
          startTime: editEvent.startTime ?? "09:00",
          endTime: editEvent.endTime ?? "10:00",
          allDay: editEvent.allDay,
          assignee: editEvent.assignee,
          category: editEvent.category,
          location: editEvent.location ?? "",
          notes: editEvent.notes ?? "",
          reminder: editEvent.reminderMinutesBefore ? String(editEvent.reminderMinutesBefore) : "",
          recurrence: editEvent.recurrence,
        }
      : {
          title: "",
          date: defaultDate,
          startTime: "09:00",
          endTime: "10:00",
          allDay: isBirthday,
          assignee: "gemeinsam",
          category: presetCategory ?? "familie",
          location: "",
          notes: "",
          reminder: isBirthday ? "10080" : "",
          recurrence: isBirthday ? "yearly" : "none",
        };
    setTitle(next.title);
    setDate(next.date);
    setStartTime(next.startTime);
    setEndTime(next.endTime);
    setAllDay(next.allDay);
    setAssignee(next.assignee);
    setCategory(next.category);
    setLocation(next.location);
    setNotes(next.notes);
    setReminder(next.reminder);
    setRecurrence(next.recurrence);
    setAttachment(null);
    setInitialSnapshot(snapshotOf(next));
    setError(null);
    setConfirmDelete(false);
    setConfirmDiscard(false);
  }, [open, editEvent, defaultDate, presetCategory, isBirthday]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isDirty = useMemo(() => {
    const current = snapshotOf({
      title,
      date,
      startTime,
      endTime,
      allDay,
      assignee,
      category,
      location,
      notes,
      reminder,
      recurrence,
    });
    return current !== initialSnapshot;
  }, [title, date, startTime, endTime, allDay, assignee, category, location, notes, reminder, recurrence, initialSnapshot]);

  const availability = useMemo(() => {
    if (assignee !== "gemeinsam" || allDay || !startTime) return null;
    return checkAvailability(events, date, startTime, endTime, editEvent?.id);
  }, [assignee, allDay, startTime, endTime, date, events, editEvent]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.key === category) ?? null,
    [categories, category],
  );

  const summaryDate = useMemo(() => {
    try {
      return formatLongDate(new Date(date + "T00:00:00"));
    } catch {
      return date;
    }
  }, [date]);

  function returnAfterEditing() {
    if (editEvent) {
      openEventDetail(editEvent.id);
    } else {
      onClose();
    }
  }

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    returnAfterEditing();
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Bitte gib einen Titel ein.");
      return;
    }
    if (!allDay && startTime >= endTime) {
      setError("Die Endzeit muss nach der Startzeit liegen.");
      return;
    }

    const payload = {
      title: title.trim(),
      date,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      allDay,
      assignee,
      category,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      reminderMinutesBefore: reminder ? Number(reminder) : null,
      recurrence,
    };

    if (editEvent) {
      updateEvent(editEvent.id, payload);
      showToast("Termin aktualisiert");
    } else {
      addEvent(payload);
      showToast("Termin gespeichert");
    }
    triggerSavePulse();
    returnAfterEditing();
  }

  function handleDeleteRequest() {
    if (!editEvent) return;
    if (linkedTaskCount > 0) {
      setConfirmDelete(true);
      return;
    }
    deleteEvent(editEvent.id);
    showToast("Termin gelöscht");
    onClose();
  }

  function handleDeleteConfirmed(deleteLinkedTasks: boolean) {
    if (!editEvent) return;
    deleteEvent(editEvent.id, deleteLinkedTasks);
    showToast(deleteLinkedTasks ? "Termin und Aufgaben gelöscht" : "Termin gelöscht, Aufgaben bleiben erhalten");
    onClose();
  }

  return (
    <FullscreenPage
      open={open}
      onClose={handleCancelClick}
      title={editEvent ? "Termin bearbeiten" : isBirthday ? "Geburtstag" : "Termin erstellen"}
      leftAction={
        <button type="button" onClick={handleCancelClick} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Abbrechen
        </button>
      }
      rightAction={
        <button
          type="button"
          onClick={handleSave}
          className="text-[15px] font-semibold"
          style={{ color: "var(--dl-together)" }}
        >
          Speichern
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {confirmDiscard && (
          <div
            className="rounded-[16px] border p-3.5"
            style={{ borderColor: "var(--dl-border-strong)", background: "var(--dl-card)" }}
          >
            <p className="mb-1 text-[14px] font-semibold" style={{ color: "var(--dl-text)" }}>
              Änderungen verwerfen?
            </p>
            <p className="mb-3 text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
              Deine Änderungen wurden noch nicht gespeichert.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  returnAfterEditing();
                }}
                className="min-h-[44px] rounded-full text-[13.5px] font-semibold"
                style={{ background: "var(--dl-danger)", color: "var(--dl-bg)" }}
              >
                Änderungen verwerfen
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="min-h-[36px] text-[13px]"
                style={{ color: "var(--dl-text-dim)" }}
              >
                Weiter bearbeiten
              </button>
            </div>
          </div>
        )}

        <div>
          <FieldLabel>Titel</FieldLabel>
          <TextField
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isBirthday ? "z. B. Geburtstag Mama" : "z. B. Bemusterung Haus"}
            autoFocus
          />
        </div>

        <div className="date-all-day-grid">
          <div className="min-w-0">
            <FieldLabel>Datum</FieldLabel>
            <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="min-w-0">
            <ToggleRow label="Ganztägig" checked={allDay} onChange={setAllDay} />
          </div>
        </div>

        {!allDay && (
          <div className="grid w-full grid-cols-2 gap-3">
            <div className="min-w-0">
              <FieldLabel>Beginn</FieldLabel>
              <TextField type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="min-w-0">
              <FieldLabel>Ende</FieldLabel>
              <TextField type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <FieldLabel>Zuständig</FieldLabel>
          <div className="grid w-full grid-cols-3 gap-2.5">
            {ASSIGNEE_OPTIONS.map((opt) => {
              const active = opt.value === assignee;
              const color = assigneeColor(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAssignee(opt.value)}
                  className="box-border flex min-w-0 items-center justify-center border text-[13.5px] font-semibold transition-colors duration-200"
                  style={
                    active
                      ? {
                          height: "var(--field-height)",
                          borderRadius: "var(--field-radius)",
                          background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 65%, white))`,
                          borderColor: color,
                          color: "var(--dl-text)",
                        }
                      : {
                          height: "var(--field-height)",
                          borderRadius: "var(--field-radius)",
                          borderColor: "var(--field-border)",
                          background: "var(--field-background)",
                          color: "var(--dl-text-dim)",
                        }
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {availability && (
            <div
              className="mt-2.5 flex items-center gap-2 px-1 text-[13px]"
              style={{ color: availability.status === "clear" ? "var(--dl-text-dim)" : "var(--dl-danger)" }}
            >
              {availability.status === "conflict" ? (
                <TriangleAlert size={14} className="shrink-0" />
              ) : (
                <CheckCircle2 size={14} className="shrink-0" style={{ color: "var(--dl-success)" }} />
              )}
              <span>
                {availability.status === "clear"
                  ? "Ihr habt beide Zeit."
                  : `Überschneidet sich mit „${availability.conflicts[0].title}“.`}
              </span>
            </div>
          )}
        </div>

        <div>
          <FieldLabel>Kategorie</FieldLabel>
          <button
            type="button"
            onClick={() => setCategoryPickerOpen(true)}
            className="box-border flex w-full min-w-0 items-center gap-3 border text-left"
            style={{ ...FIELD_STYLE, height: "var(--field-height)", paddingInline: "var(--field-padding-x)" }}
          >
            <CategoryGlyph icon={iconByName(selectedCategory?.icon)} color="var(--dl-text-dim)" />
            <span className="min-w-0 flex-1 truncate text-[15px]">
              {selectedCategory?.label ?? "Keine Kategorie"}
            </span>
            <ChevronDown size={18} style={{ color: "var(--dl-together)", opacity: 0.75 }} />
          </button>
          <CategoryPickerSheet
            open={categoryPickerOpen}
            onClose={() => setCategoryPickerOpen(false)}
            value={category}
            onChange={setCategory}
          />
        </div>

        <div>
          <FieldLabel>Ort</FieldLabel>
          <TextField value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
        </div>

        <div>
          <FieldLabel>Notizen</FieldLabel>
          <TextAreaField
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {editEvent && <PrepTaskChecklist event={editEvent} />}

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="min-w-0">
            <FieldLabel>Erinnerung</FieldLabel>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="box-border w-full min-w-0 border text-[15px] outline-none"
              style={{ ...FIELD_STYLE, height: "var(--field-height)", paddingInline: "var(--field-padding-x)" }}
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <FieldLabel>Wiederholung</FieldLabel>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
              className="box-border w-full min-w-0 border text-[15px] outline-none"
              style={{ ...FIELD_STYLE, height: "var(--field-height)", paddingInline: "var(--field-padding-x)" }}
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>Anhang</FieldLabel>
          {attachment ? (
            <div
              className="box-border flex w-full min-w-0 items-center justify-between border"
              style={{ ...FIELD_STYLE, height: "var(--field-height)", paddingInline: "var(--field-padding-x)" }}
            >
              <span className="flex min-w-0 items-center gap-2 truncate text-[13.5px]">
                <Paperclip size={15} className="shrink-0" /> {attachment}
              </span>
              <button type="button" onClick={() => setAttachment(null)} aria-label="Anhang entfernen" className="shrink-0">
                <X size={16} style={{ color: "var(--dl-text-dim)" }} />
              </button>
            </div>
          ) : (
            <label
              className="box-border flex w-full min-w-0 cursor-pointer items-center justify-center gap-2 border border-dashed text-[13.5px] font-medium"
              style={{
                height: "var(--field-height)",
                borderRadius: "var(--field-radius)",
                borderColor: "var(--field-border)",
                color: "var(--dl-text-dim)",
              }}
            >
              <Paperclip size={15} /> Datei hinzufügen
              <input
                type="file"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          )}
        </div>

        <div
          className="rounded-[16px] border p-3.5"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card-raised)" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--dl-text-faint)" }}>
            Zusammenfassung
          </p>
          <div className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: assigneeColor(assignee) }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
                {title || "Ohne Titel"}
              </p>
              <p className="truncate text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
                {summaryDate}
                {!allDay && ` · ${startTime}–${endTime}`}
                {" · "}
                {selectedCategory?.label ?? "Keine Kategorie"} · {assigneeLabel(assignee)}
              </p>
            </div>
            <PersonAvatar assignee={assignee} size="sm" />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}

        {confirmDelete && (
          <div
            className="rounded-[16px] border p-3.5"
            style={{ borderColor: "var(--dl-danger)", background: "var(--dl-card)" }}
          >
            <p className="mb-3 text-[13.5px] font-medium" style={{ color: "var(--dl-text)" }}>
              Diesem Termin {linkedTaskCount === 1 ? "ist 1 Vorbereitungsaufgabe" : `sind ${linkedTaskCount} Vorbereitungsaufgaben`} zugeordnet. Was soll damit passieren?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleDeleteConfirmed(false)}
                className="min-h-[44px] rounded-full border text-[13.5px] font-semibold"
                style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
              >
                Nur Termin löschen, Aufgaben behalten
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirmed(true)}
                className="min-h-[44px] rounded-full text-[13.5px] font-semibold"
                style={{ background: "var(--dl-danger)", color: "var(--dl-bg)" }}
              >
                Termin und Aufgaben löschen
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[36px] text-[13px]"
                style={{ color: "var(--dl-text-dim)" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {editEvent && (
            <button
              type="button"
              onClick={handleDeleteRequest}
              aria-label="Termin löschen"
              className="flex min-h-[48px] w-12 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--dl-border-strong)" }}
            >
              <Trash2 size={18} style={{ color: "var(--dl-danger)" }} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] flex-1 rounded-full text-[15px] font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--dl-violet), var(--dl-together))",
              color: "var(--dl-text)",
            }}
          >
            {editEvent ? "Änderungen speichern" : "Termin speichern"}
          </button>
        </div>
      </div>
    </FullscreenPage>
  );
}
