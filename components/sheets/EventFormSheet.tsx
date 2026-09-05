"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Paperclip, X, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  ChipGroup,
  FieldLabel,
  TextAreaField,
  TextField,
  ToggleRow,
} from "@/components/ui/FormControls";
import { PrepTaskChecklist } from "@/components/events/PrepTaskChecklist";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { useSavePulse } from "@/lib/store/save-pulse-context";
import { CATEGORIES } from "@/lib/demo-data";
import { assigneeColor, assigneeLabel, categoryLabel } from "@/lib/theme";
import { formatLongDate } from "@/lib/date-utils";
import type { Assignee, CalendarEvent, EventCategory, RecurrenceRule } from "@/lib/types";
import { PersonAvatar } from "@/components/ui/Avatar";

const ASSIGNEE_OPTIONS: { value: Assignee; label: string }[] = [
  { value: "domenico", label: "Domenico" },
  { value: "elisabeth", label: "Elisabeth" },
  { value: "gemeinsam", label: "Gemeinsam" },
];

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: "none", label: "Keine" },
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "yearly", label: "Jährlich" },
];

const REMINDER_OPTIONS = [
  { value: "", label: "Keine" },
  { value: "5", label: "5 Min. vorher" },
  { value: "15", label: "15 Min. vorher" },
  { value: "30", label: "30 Min. vorher" },
  { value: "60", label: "1 Std. vorher" },
  { value: "1440", label: "1 Tag vorher" },
  { value: "10080", label: "1 Woche vorher" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  presetCategory?: EventCategory;
  editEvent?: CalendarEvent | null;
}

export function EventFormSheet({ open, onClose, defaultDate, presetCategory, editEvent }: Props) {
  const { addEvent, updateEvent, deleteEvent, tasks, showToast } = useAppStore();
  const { openQuickAdd } = useSheet();
  const { triggerSavePulse } = useSavePulse();
  const isBirthday = presetCategory === "geburtstag";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const linkedTaskCount = editEvent ? tasks.filter((t) => t.linkedEventId === editEvent.id).length : 0;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(isBirthday);
  const [assignee, setAssignee] = useState<Assignee>("gemeinsam");
  const [category, setCategory] = useState<EventCategory>(presetCategory ?? "familie");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(isBirthday ? "yearly" : "none");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sheet stays mounted between opens (so its close animation can play), so
  // fields are reset here rather than via a remount-on-key approach.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setTitle(editEvent.title);
      setDate(editEvent.date);
      setStartTime(editEvent.startTime ?? "09:00");
      setEndTime(editEvent.endTime ?? "10:00");
      setAllDay(editEvent.allDay);
      setAssignee(editEvent.assignee);
      setCategory(editEvent.category);
      setLocation(editEvent.location ?? "");
      setNotes(editEvent.notes ?? "");
      setReminder(editEvent.reminderMinutesBefore ? String(editEvent.reminderMinutesBefore) : "");
      setRecurrence(editEvent.recurrence);
      setAttachment(null);
    } else {
      setTitle("");
      setDate(defaultDate);
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(isBirthday);
      setAssignee("gemeinsam");
      setCategory(presetCategory ?? "familie");
      setLocation("");
      setNotes("");
      setReminder(isBirthday ? "10080" : "");
      setRecurrence(isBirthday ? "yearly" : "none");
      setAttachment(null);
    }
    setError(null);
    setConfirmDelete(false);
  }, [open, editEvent, defaultDate, presetCategory, isBirthday]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const summaryDate = useMemo(() => {
    try {
      return formatLongDate(new Date(date + "T00:00:00"));
    } catch {
      return date;
    }
  }, [date]);

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
    onClose();
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
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editEvent ? "Termin bearbeiten" : isBirthday ? "Geburtstag" : "Termin erstellen"}
    >
      <div className="flex flex-col gap-4">
        {!editEvent && !isBirthday && (
          <button
            type="button"
            onClick={() => openQuickAdd("natural")}
            className="flex items-center gap-2 rounded-[14px] border px-3.5 py-2.5 text-left text-[13.5px] font-medium"
            style={{ borderColor: "var(--dl-together)", background: "var(--dl-together-soft)", color: "var(--dl-together)" }}
          >
            <Sparkles size={16} className="shrink-0" />
            Stattdessen per Text oder Sprache eintragen
          </button>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <FieldLabel>Datum</FieldLabel>
            <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex min-w-0 items-end">
            <ToggleRow label="Ganztägig" checked={allDay} onChange={setAllDay} />
          </div>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
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
          <ChipGroup
            ariaLabel="Zuständig"
            options={ASSIGNEE_OPTIONS}
            value={assignee}
            onChange={setAssignee}
            colorFor={assigneeColor}
          />
        </div>

        <div>
          <FieldLabel>Kategorie</FieldLabel>
          <ChipGroup
            ariaLabel="Kategorie"
            options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
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

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <FieldLabel>Erinnerung</FieldLabel>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="w-full min-w-0 rounded-[14px] border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ background: "var(--dl-card)", borderColor: "var(--dl-border)", color: "var(--dl-text)" }}
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
              className="w-full min-w-0 rounded-[14px] border px-3.5 py-2.5 text-[15px] outline-none"
              style={{ background: "var(--dl-card)", borderColor: "var(--dl-border)", color: "var(--dl-text)" }}
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
              className="flex items-center justify-between rounded-[14px] border px-3.5 py-2.5"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
            >
              <span className="flex items-center gap-2 truncate text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                <Paperclip size={15} /> {attachment}
              </span>
              <button type="button" onClick={() => setAttachment(null)} aria-label="Anhang entfernen">
                <X size={16} style={{ color: "var(--dl-text-dim)" }} />
              </button>
            </div>
          ) : (
            <label
              className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed px-3.5 py-2.5 text-[13.5px] font-medium"
              style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text-dim)" }}
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
                {categoryLabel(category)} · {assigneeLabel(assignee)}
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
              background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
              color: "var(--dl-bg)",
            }}
          >
            {editEvent ? "Änderungen speichern" : "Termin speichern"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
