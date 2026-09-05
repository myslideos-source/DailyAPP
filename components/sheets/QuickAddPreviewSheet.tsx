"use client";

import { useEffect, useState } from "react";
import { Sparkles, TriangleAlert, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChipGroup, FieldLabel, TextField } from "@/components/ui/FormControls";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { useSavePulse } from "@/lib/store/save-pulse-context";
import { CATEGORIES } from "@/lib/demo-data";
import { assigneeColor } from "@/lib/theme";
import type { ParsedEventDraft } from "@/lib/nlp/parseEventText";
import type { Assignee, EventCategory } from "@/lib/types";

const ASSIGNEE_OPTIONS: { value: Assignee; label: string }[] = [
  { value: "domenico", label: "Domenico" },
  { value: "elisabeth", label: "Elisabeth" },
  { value: "gemeinsam", label: "Gemeinsam" },
];

const REMINDER_OPTIONS = [
  { value: "", label: "Keine" },
  { value: "60", label: "1 Std. vorher" },
  { value: "180", label: "Am selben Morgen" },
  { value: "1440", label: "1 Tag vorher" },
  { value: "4320", label: "3 Tage vorher" },
  { value: "10080", label: "1 Woche vorher" },
];

function UncertainNote({ question }: { question?: string }) {
  if (!question) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[12px]" style={{ color: "var(--dl-danger)" }}>
      <TriangleAlert size={13} className="mt-0.5 shrink-0" />
      {question}
    </p>
  );
}

export function QuickAddPreviewSheet({ open, draft }: { open: boolean; draft: ParsedEventDraft | null }) {
  const { close, openNewEvent } = useSheet();
  const { addEvent, addTask, showToast } = useAppStore();
  const { triggerSavePulse } = useSavePulse();

  const [title, setTitle] = useState("");
  const [titleQuestion, setTitleQuestion] = useState<string | undefined>();
  const [date, setDate] = useState("");
  const [dateQuestion, setDateQuestion] = useState<string | undefined>();
  const [startTime, setStartTime] = useState("");
  const [startTimeQuestion, setStartTimeQuestion] = useState<string | undefined>();
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<EventCategory>("familie");
  const [assignee, setAssignee] = useState<Assignee>("gemeinsam");
  const [assigneeQuestion, setAssigneeQuestion] = useState<string | undefined>();
  const [reminder, setReminder] = useState("");
  const [prepTasks, setPrepTasks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only ever reads `draft` while opening — see EventFormSheet for the
  // same guarded-effect pattern, which lets the sheet's close animation
  // play against the last confirmed content instead of blanking instantly.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !draft) return;
    setTitle(draft.title);
    setTitleQuestion(draft.titleQuestion);
    setDate(draft.date ?? "");
    setDateQuestion(draft.dateQuestion);
    setStartTime(draft.startTime ?? "");
    setStartTimeQuestion(draft.startTimeCertain ? undefined : "Um wie viel Uhr soll der Termin stattfinden?");
    setLocation(draft.location ?? "");
    setCategory(draft.category);
    setAssignee(draft.assignee);
    setAssigneeQuestion(draft.assigneeQuestion);
    setReminder(draft.reminderMinutesBefore ? String(draft.reminderMinutesBefore) : "");
    setPrepTasks(draft.prepTasks);
    setSaving(false);
    setError(null);
  }, [open, draft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleCancel() {
    close();
  }

  function handleEditFully() {
    if (!date) {
      setError("Bitte zuerst ein Datum wählen.");
      return;
    }
    close();
    openNewEvent(date);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Bitte gib einen Titel ein.");
      return;
    }
    if (!date) {
      setError("Bitte gib ein Datum an.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await addEvent({
        title: title.trim(),
        date,
        startTime: startTime || null,
        endTime: null,
        allDay: !startTime,
        assignee,
        category,
        location: location.trim() || undefined,
        reminderMinutesBefore: reminder ? Number(reminder) : null,
        recurrence: "none",
      });

      for (const [i, taskTitle] of prepTasks.entries()) {
        if (!taskTitle.trim()) continue;
        await addTask({
          title: taskTitle.trim(),
          assignee,
          dueDate: date,
          priority: "medium",
          done: false,
          recurrence: "none",
          isShopping: false,
          linkedEventId: created.id,
          sortOrder: i,
          subtasks: [],
        });
      }

      showToast("Termin gespeichert");
      triggerSavePulse();
      close();
    } catch {
      setError("Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten — bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={handleCancel} title="So habe ich deinen Termin verstanden">
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel>Titel</FieldLabel>
          <TextField value={title} onChange={(e) => setTitle(e.target.value)} />
          <UncertainNote question={titleQuestion} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Datum</FieldLabel>
            <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <UncertainNote question={dateQuestion} />
          </div>
          <div>
            <FieldLabel>Uhrzeit</FieldLabel>
            <TextField type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <UncertainNote question={startTimeQuestion} />
          </div>
        </div>

        <div>
          <FieldLabel>Ort</FieldLabel>
          <TextField value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
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
          <FieldLabel>Beteiligte</FieldLabel>
          <ChipGroup
            ariaLabel="Beteiligte"
            options={ASSIGNEE_OPTIONS}
            value={assignee}
            onChange={setAssignee}
            colorFor={assigneeColor}
          />
          <UncertainNote question={assigneeQuestion} />
        </div>

        <div>
          <FieldLabel>Erinnerung</FieldLabel>
          <select
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="w-full rounded-[14px] border px-3.5 py-2.5 text-[15px] outline-none"
            style={{ background: "var(--dl-card)", borderColor: "var(--dl-border)", color: "var(--dl-text)" }}
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Erkannte Aufgaben</FieldLabel>
          <div className="flex flex-col gap-2">
            {prepTasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2">
                <TextField
                  value={task}
                  onChange={(e) =>
                    setPrepTasks((prev) => prev.map((t, idx) => (idx === i ? e.target.value : t)))
                  }
                />
                <button
                  type="button"
                  onClick={() => setPrepTasks((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Aufgabe entfernen"
                  className="shrink-0"
                >
                  <X size={16} style={{ color: "var(--dl-text-faint)" }} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPrepTasks((prev) => [...prev, ""])}
              className="min-h-[36px] text-left text-[13px] font-medium"
              style={{ color: "var(--dl-together)" }}
            >
              + Aufgabe hinzufügen
            </button>
          </div>
        </div>

        <div
          className="flex items-center gap-3 rounded-[16px] border p-3.5"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card-raised)" }}
        >
          <PersonAvatar assignee={assignee} size="sm" />
          <p className="min-w-0 flex-1 truncate text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
            {title || "Ohne Titel"}
            {date && ` · ${date}`}
            {startTime && ` · ${startTime}`}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-[48px] flex-1 rounded-full border text-[14px] font-semibold"
            style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleEditFully}
            className="min-h-[48px] flex-1 rounded-full border text-[14px] font-semibold"
            style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex min-h-[48px] flex-[1.4] items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
              color: "var(--dl-bg)",
            }}
          >
            <Sparkles size={15} /> Termin speichern
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
