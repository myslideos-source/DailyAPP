"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ListChecks, Plus, X } from "lucide-react";
import { TaskCheckbox } from "@/components/tasks/TaskCheckbox";
import { PersonAvatar } from "@/components/ui/Avatar";
import { TextField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { fromISODate, isToday, relativeDayLabel } from "@/lib/date-utils";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import type { CalendarEvent } from "@/lib/types";

/** The "Vorbereitung" section of the event detail: a checklist of tasks
 * linked to this event via TaskItem.linkedEventId. Reuses the generic task
 * store (addTask/toggleTask/deleteTask) rather than a bespoke data path —
 * a prep task is a completely ordinary task that happens to point at an
 * event, so the rest of the app (Aufgaben view, reminders) already knows
 * how to handle it. */
export function PrepTaskChecklist({ event }: { event: CalendarEvent }) {
  const { tasks, addTask, toggleTask, deleteTask, showToast } = useAppStore();
  const reducedMotion = useReducedMotion();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const prepTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.linkedEventId === event.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks, event.id],
  );

  const doneCount = prepTasks.filter((t) => t.done).length;
  const total = prepTasks.length;
  const progress = total > 0 ? doneCount / total : 0;

  function handleToggle(taskId: string, wasDone: boolean) {
    toggleTask(taskId);
    if (!wasDone) {
      showToast("Aufgabe erledigt", { label: "Rückgängig", onClick: () => toggleTask(taskId) });
    }
  }

  function handleAdd() {
    const title = draft.trim();
    if (!title) {
      setAdding(false);
      return;
    }
    const nextSortOrder = prepTasks.length > 0 ? Math.max(...prepTasks.map((t) => t.sortOrder)) + 1 : 0;
    addTask({
      title,
      assignee: event.assignee,
      dueDate: event.date,
      priority: "medium",
      done: false,
      recurrence: "none",
      isShopping: false,
      linkedEventId: event.id,
      sortOrder: nextSortOrder,
      subtasks: [],
    });
    setDraft("");
    setAdding(false);
  }

  return (
    <div
      className="rounded-[16px] border p-3.5"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card-raised)" }}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ListChecks size={15} style={{ color: "var(--dl-text-faint)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--dl-text-faint)" }}>
            Vorbereitung
          </p>
        </div>
        {total > 0 && (
          <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
            {doneCount} von {total} erledigt
          </p>
        )}
      </div>

      {total > 0 && (
        <div
          className="mb-3 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--dl-border)" }}
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, var(--dl-domenico), var(--dl-elisabeth))" }}
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: reducedMotion ? 0.01 : 0.35, ease: "easeOut" }}
          />
        </div>
      )}

      {total === 0 && !adding && (
        <p className="mb-3 text-[13px]" style={{ color: "var(--dl-text-faint)" }}>
          Noch keine Vorbereitungsaufgaben.
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {prepTasks.map((task) => (
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: "easeOut" }}
              className="group flex items-center gap-2.5 rounded-[12px] px-1 py-1"
            >
              <TaskCheckbox
                checked={task.done}
                onToggle={() => handleToggle(task.id, task.done)}
                label={`${task.title} als erledigt markieren`}
              />
              <motion.span
                animate={{ opacity: task.done ? 0.5 : 1 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.25 }}
                className="min-w-0 flex-1 truncate text-[14px]"
                style={{
                  color: "var(--dl-text)",
                  textDecoration: task.done ? "line-through" : "none",
                }}
              >
                {task.title}
              </motion.span>
              {task.assignee !== event.assignee && <PersonAvatar assignee={task.assignee} size="sm" />}
              {task.dueDate && !task.done && (
                <span
                  className="shrink-0 text-[11px] font-medium"
                  style={{ color: isToday(fromISODate(task.dueDate)) ? "var(--dl-together)" : "var(--dl-text-faint)" }}
                >
                  {relativeDayLabel(fromISODate(task.dueDate))}
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                aria-label={`${task.title} entfernen`}
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={14} style={{ color: "var(--dl-text-faint)" }} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {adding ? (
        <div className="mt-2 flex items-center gap-2">
          <TextField
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            onBlur={handleAdd}
            placeholder="z. B. Höhenplan bereitlegen"
            className="text-[13.5px]"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 flex min-h-[36px] items-center gap-1.5 text-[13px] font-medium"
          style={{ color: "var(--dl-together)" }}
        >
          <Plus size={15} /> Aufgabe hinzufügen
        </button>
      )}
    </div>
  );
}
