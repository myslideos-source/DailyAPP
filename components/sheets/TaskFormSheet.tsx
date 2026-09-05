"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { v4 as uuid } from "uuid";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChipGroup, FieldLabel, TextField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { useSavePulse } from "@/lib/store/save-pulse-context";
import { assigneeColor } from "@/lib/theme";
import { toISODate } from "@/lib/date-utils";
import type { Assignee, Subtask, TaskPriority } from "@/lib/types";
import type { QuickAddKind } from "@/components/sheets/QuickAddMenu";

const ASSIGNEE_OPTIONS: { value: Assignee; label: string }[] = [
  { value: "domenico", label: "Domenico" },
  { value: "elisabeth", label: "Elisabeth" },
  { value: "gemeinsam", label: "Gemeinsam" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Niedrig" },
  { value: "medium", label: "Mittel" },
  { value: "high", label: "Hoch" },
];

const TITLES: Record<"task" | "reminder" | "shopping", string> = {
  task: "Aufgabe erstellen",
  reminder: "Erinnerung erstellen",
  shopping: "Einkauf hinzufügen",
};

export function TaskFormSheet({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: Extract<QuickAddKind, "task" | "reminder" | "shopping">;
}) {
  const { addTask, showToast } = useAppStore();
  const { triggerSavePulse } = useSavePulse();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(toISODate(new Date()));
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignee, setAssignee] = useState<Assignee>("gemeinsam");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sheet stays mounted between opens (so its close animation can play), so
  // fields are reset here rather than via a remount-on-key approach.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDueDate(toISODate(new Date()));
    setPriority(kind === "reminder" ? "high" : "medium");
    setAssignee("gemeinsam");
    setSubtasks([]);
    setSubtaskDraft("");
    setError(null);
  }, [open, kind]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function addSubtask() {
    if (!subtaskDraft.trim()) return;
    setSubtasks((prev) => [...prev, { id: uuid(), title: subtaskDraft.trim(), done: false }]);
    setSubtaskDraft("");
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Bitte gib einen Titel ein.");
      return;
    }
    addTask({
      title: title.trim(),
      assignee,
      dueDate: kind === "shopping" ? dueDate : dueDate || null,
      priority,
      done: false,
      recurrence: "none",
      isShopping: kind === "shopping",
      subtasks: kind === "task" ? subtasks : [],
    });
    showToast(
      kind === "shopping" ? "Zur Einkaufsliste hinzugefügt" : kind === "reminder" ? "Erinnerung gespeichert" : "Aufgabe gespeichert",
    );
    triggerSavePulse();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={TITLES[kind]}>
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel>Titel</FieldLabel>
          <TextField
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "shopping" ? "z. B. Milch" : "z. B. Fliesenmuster vergleichen"}
            autoFocus
          />
        </div>

        {kind !== "shopping" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <FieldLabel>{kind === "reminder" ? "Datum" : "Fällig am"}</FieldLabel>
              <TextField type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="min-w-0">
              <FieldLabel>Priorität</FieldLabel>
              <ChipGroup
                ariaLabel="Priorität"
                options={PRIORITY_OPTIONS}
                value={priority}
                onChange={setPriority}
              />
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

        {kind === "task" && (
          <div>
            <FieldLabel>Unteraufgaben</FieldLabel>
            <div className="flex flex-col gap-2">
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-[12px] border px-3 py-2"
                  style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
                >
                  <span className="text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                    {s.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Unteraufgabe entfernen"
                    onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== s.id))}
                  >
                    <X size={15} style={{ color: "var(--dl-text-dim)" }} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <TextField
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  placeholder="Unteraufgabe hinzufügen"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  aria-label="Hinzufügen"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border"
                  style={{ borderColor: "var(--dl-border)" }}
                >
                  <Plus size={18} style={{ color: "var(--dl-text)" }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="min-h-[48px] rounded-full text-[15px] font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
            color: "var(--dl-bg)",
          }}
        >
          Speichern
        </button>
      </div>
    </BottomSheet>
  );
}
