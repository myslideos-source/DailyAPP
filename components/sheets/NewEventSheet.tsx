"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Bell, Calendar, ChevronRight, Mic, MapPin, Plus, Square, TriangleAlert, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { useSavePulse } from "@/lib/store/save-pulse-context";
import { useSpeechInput, type SpeechInputStatus } from "@/lib/hooks/useSpeechInput";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { parseEventTextLocally } from "@/lib/nlp/parseEventText";
import { checkAvailability } from "@/lib/availability";
import { fromISODate, formatLongDate } from "@/lib/date-utils";
import { assigneeColor } from "@/lib/theme";
import type { Assignee } from "@/lib/types";

const EXAMPLE = "Freitag um 9 Uhr Bemusterung beim Haus";

const ASSIGNEE_OPTIONS: { value: Assignee; label: string }[] = [
  { value: "domenico", label: "Domenico" },
  { value: "gemeinsam", label: "Gemeinsam" },
  { value: "elisabeth", label: "Elisabeth" },
];

const REMINDER_OPTIONS = [
  { value: "", label: "Keine" },
  { value: "60", label: "1 Std. vorher" },
  { value: "180", label: "Am selben Morgen" },
  { value: "1440", label: "1 Tag vorher" },
  { value: "4320", label: "3 Tage vorher" },
  { value: "10080", label: "1 Woche vorher" },
];

const STATUS_TEXT: Partial<Record<SpeechInputStatus, string>> = {
  "hört zu": "Hört zu …",
  verarbeitet: "Verarbeitet …",
  abgelehnt: "Mikrofonzugriff abgelehnt — bitte tippen.",
  "nicht unterstützt": "Spracheingabe wird auf diesem Gerät nicht unterstützt.",
  fehler: "Bei der Spracherkennung ist ein Fehler aufgetreten.",
};

export function NewEventSheet({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
}) {
  const { addEvent, addTask, events, showToast } = useAppStore();
  const { openManualNewEvent } = useSheet();
  const { triggerSavePulse } = useSavePulse();
  const reducedMotion = useReducedMotion();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [assignee, setAssignee] = useState<Assignee>("gemeinsam");
  const [reminder, setReminder] = useState("");
  const [prepTasks, setPrepTasks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseTextRef = useRef("");

  const handleTranscript = useCallback((sessionText: string) => {
    setText(baseTextRef.current ? `${baseTextRef.current} ${sessionText}`.trim() : sessionText);
  }, []);

  const { status, supported, start, stop, reset } = useSpeechInput(handleTranscript);
  const listening = status === "hört zu" || status === "verarbeitet";
  const effectiveStatus: SpeechInputStatus = !supported && status === "bereit" ? "nicht unterstützt" : status;

  // Re-derive the whole draft from the free-text field on every change —
  // this is what lets the "recognized" fields below update live as you
  // type or speak, instead of requiring a separate confirmation step.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (!text.trim()) {
      setTitle("");
      setDate(null);
      setStartTime(null);
      return;
    }
    const draft = parseEventTextLocally(text);
    setTitle(draft.title);
    setDate(draft.date);
    setStartTime(draft.startTime);
    if (draft.location) setLocation(draft.location);
    if (draft.assigneeCertain) setAssignee(draft.assignee);
    if (draft.reminderMinutesBefore) setReminder(String(draft.reminderMinutesBefore));
    if (draft.prepTasks.length > 0) setPrepTasks(draft.prepTasks);
  }, [text, open]);

  useEffect(() => {
    if (!open) {
      setText("");
      setTitle("");
      setDate(null);
      setStartTime(null);
      setLocation("");
      setAssignee("gemeinsam");
      setReminder("");
      setPrepTasks([]);
      setError(null);
      setSaving(false);
      baseTextRef.current = "";
      reset();
    }
  }, [open, reset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const recognizedLabel = useMemo(() => {
    if (!date) return null;
    try {
      const day = formatLongDate(fromISODate(date));
      return startTime ? `${day} · ${startTime}` : day;
    } catch {
      return date;
    }
  }, [date, startTime]);

  const availability = useMemo(() => {
    if (assignee !== "gemeinsam" || !date || !startTime) return null;
    return checkAvailability(events, date, startTime, null);
  }, [assignee, date, startTime, events]);

  function handleMicClick() {
    if (listening) {
      stop();
      return;
    }
    baseTextRef.current = text;
    start();
  }

  function handleAdvanced() {
    onClose();
    openManualNewEvent(date ?? defaultDate);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Bitte beschreibe kurz, was ansteht.");
      return;
    }
    if (!date) {
      setError("Ich konnte kein Datum erkennen — bitte ergänze z. B. \"am Freitag\" oder \"morgen\".");
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
        category: "familie",
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
      onClose();
    } catch {
      setError("Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten — bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Neuer Termin"
      leftAction={
        <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Abbrechen
        </button>
      }
      rightAction={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-[15px] font-semibold disabled:opacity-50"
          style={{ color: "var(--dl-together)" }}
        >
          Speichern
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className="rounded-[16px] border p-3.5"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <p className="mb-1.5 text-[13px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
            Was steht an?
          </p>
          <div className="flex items-start gap-2">
            <TextAreaField
              autoFocus
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              className="!border-0 !bg-transparent !p-0 text-[16px] leading-snug"
            />
            <motion.button
              type="button"
              onClick={handleMicClick}
              aria-label={listening ? "Aufnahme stoppen" : "Spracheingabe starten"}
              disabled={effectiveStatus === "nicht unterstützt"}
              animate={listening && !reducedMotion ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={
                listening && !reducedMotion
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.15 }
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
              style={{
                borderColor: listening ? "var(--dl-together)" : "var(--dl-border-strong)",
                background: listening ? "var(--dl-together-soft)" : "transparent",
              }}
            >
              {listening ? (
                <Square size={15} style={{ color: "var(--dl-together)" }} fill="var(--dl-together)" />
              ) : (
                <Mic size={17} style={{ color: "var(--dl-text-dim)" }} />
              )}
            </motion.button>
          </div>
          {STATUS_TEXT[effectiveStatus] && (
            <p className="mt-1.5 text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
              {STATUS_TEXT[effectiveStatus]}
            </p>
          )}
        </div>

        {recognizedLabel && (
          <div className="flex items-center gap-3 rounded-[16px] border p-3.5" style={{ borderColor: "var(--dl-border)" }}>
            <Calendar size={18} style={{ color: "var(--dl-text-dim)" }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold" style={{ color: "var(--dl-text)" }}>
                {recognizedLabel}
              </p>
              <p className="text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
                Aus deinem Text erkannt
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-[16px] font-bold" style={{ color: "var(--dl-text)" }}>
            Für wen?
          </p>
          <div className="flex rounded-full border p-1" style={{ borderColor: "var(--dl-border)" }}>
            {ASSIGNEE_OPTIONS.map((opt) => {
              const active = opt.value === assignee;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAssignee(opt.value)}
                  className="min-h-[40px] flex-1 rounded-full text-[13.5px] font-semibold transition-colors duration-200"
                  style={active ? { background: assigneeColor(opt.value), color: "var(--dl-bg)" } : { color: "var(--dl-text-dim)" }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {availability && (
          <div
            className="flex items-start gap-2.5 rounded-[14px] border px-3.5 py-3"
            style={
              availability.status === "clear"
                ? { borderColor: "var(--dl-border)", color: "var(--dl-text-dim)" }
                : { borderColor: "var(--dl-danger)", color: "var(--dl-danger)" }
            }
          >
            {availability.status === "conflict" && <TriangleAlert size={16} className="mt-0.5 shrink-0" />}
            <p className="text-[13px]">
              {availability.status === "clear"
                ? "Ihr habt beide Zeit."
                : `Überschneidet sich mit „${availability.conflicts[0].title}“.`}
            </p>
          </div>
        )}

        <div className="flex flex-col divide-y rounded-[16px] border" style={{ borderColor: "var(--dl-border)" }}>
          <div className="relative flex items-center gap-3 px-3.5 py-3.5">
            <Bell size={17} style={{ color: "var(--dl-text-dim)" }} />
            <span className="flex-1 text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
              Erinnerung
            </span>
            <span className="text-[14px]" style={{ color: "var(--dl-text-dim)" }}>
              {REMINDER_OPTIONS.find((o) => o.value === reminder)?.label ?? "Keine"}
            </span>
            <ChevronRight size={16} style={{ color: "var(--dl-text-faint)" }} />
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              aria-label="Erinnerung"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3.5" style={{ borderColor: "var(--dl-border)" }}>
            <MapPin size={17} style={{ color: "var(--dl-text-dim)" }} />
            <span className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
              Ort
            </span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional"
              className="min-w-0 flex-1 bg-transparent text-right text-[14px] outline-none"
              style={{ color: "var(--dl-text-dim)" }}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[16px] font-bold" style={{ color: "var(--dl-text)" }}>
            Aufgaben
          </p>
          <div className="flex flex-col gap-1 rounded-[16px] border" style={{ borderColor: "var(--dl-border)" }}>
            {prepTasks.map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 border-b px-3.5 py-3 last:border-b-0"
                style={{ borderColor: "var(--dl-border)" }}
              >
                <span className="h-[18px] w-[18px] shrink-0 rounded-[6px] border" style={{ borderColor: "var(--dl-border-strong)" }} />
                <input
                  value={task}
                  onChange={(e) => setPrepTasks((prev) => prev.map((t, idx) => (idx === i ? e.target.value : t)))}
                  className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none"
                  style={{ color: "var(--dl-text)" }}
                />
                <button
                  type="button"
                  onClick={() => setPrepTasks((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Aufgabe entfernen"
                >
                  <X size={15} style={{ color: "var(--dl-text-faint)" }} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPrepTasks((prev) => [...prev, ""])}
              className="flex min-h-[48px] items-center gap-2 px-3.5 text-[14px] font-medium"
              style={{ color: "var(--dl-together)" }}
            >
              <Plus size={16} className="rounded-full" style={{ border: "1.5px solid var(--dl-together)" }} />
              Aufgabe hinzufügen
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdvanced}
          className="text-[13.5px] font-medium underline"
          style={{ color: "var(--dl-text-dim)" }}
        >
          Mehr Optionen (Kategorie, Wiederholung, Notizen …)
        </button>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-h-[52px] rounded-full text-[16px] font-semibold disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--dl-violet), var(--dl-together))",
            color: "var(--dl-text)",
          }}
        >
          Termin speichern
        </button>
      </div>
    </BottomSheet>
  );
}
