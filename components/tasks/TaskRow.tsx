"use client";

import { motion } from "motion/react";
import { ChevronRight, Repeat } from "lucide-react";
import { TaskCheckbox } from "@/components/tasks/TaskCheckbox";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { assigneeColor } from "@/lib/theme";
import { fromISODate, relativeDayLabel } from "@/lib/date-utils";
import type { TaskItem } from "@/lib/types";

export function TaskRow({ task }: { task: TaskItem }) {
  const { toggleTask, toggleSubtask, showToast, events } = useAppStore();
  const { openEditEvent } = useSheet();
  const doneSub = task.subtasks.filter((s) => s.done).length;
  const linkedEvent = task.linkedEventId ? events.find((e) => e.id === task.linkedEventId) : null;
  const color = assigneeColor(task.assignee);

  function handleToggle() {
    const completing = !task.done;
    toggleTask(task.id);
    if (completing) {
      showToast("Aufgabe erledigt", { label: "Rückgängig", onClick: () => toggleTask(task.id) });
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-start gap-3 overflow-hidden rounded-[14px] border pr-3.5"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <span className="h-full min-h-[1px] w-[3px] shrink-0 self-stretch" style={{ background: color }} aria-hidden />

      <div className="flex flex-1 items-start gap-3 py-3.5">
        <div className="pt-0.5">
          <TaskCheckbox checked={task.done} onToggle={handleToggle} label={`${task.title} als erledigt markieren`} />
        </div>

        <div className="min-w-0 flex-1">
          <motion.p
            animate={{ opacity: task.done ? 0.5 : 1 }}
            transition={{ duration: 0.25 }}
            className="text-[15.5px] font-semibold"
            style={{
              color: "var(--dl-text)",
              textDecoration: task.done ? "line-through" : "none",
            }}
          >
            {task.title}
          </motion.p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
            {task.dueDate && <span>{relativeDayLabel(fromISODate(task.dueDate))}</span>}
            {task.recurrence !== "none" && <Repeat size={12} style={{ color: "var(--dl-text-faint)" }} />}
          </div>

          {linkedEvent && (
            <button
              type="button"
              onClick={() => openEditEvent(linkedEvent.id)}
              className="mt-1.5 inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[12px] font-medium"
              style={{ background: "var(--dl-together-soft)", color: "var(--dl-together)" }}
            >
              {linkedEvent.title}
            </button>
          )}

          {task.subtasks.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1.5 border-t pt-2.5" style={{ borderColor: "var(--dl-border)" }}>
              {task.subtasks.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubtask(task.id, s.id)}
                  className="flex items-center gap-2 text-left"
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border"
                    style={{
                      borderColor: s.done ? "var(--dl-success)" : "var(--dl-border-strong)",
                      background: s.done ? "var(--dl-success)" : "transparent",
                    }}
                  />
                  <span
                    className="text-[13px]"
                    style={{
                      color: s.done ? "var(--dl-text-faint)" : "var(--dl-text-dim)",
                      textDecoration: s.done ? "line-through" : "none",
                    }}
                  >
                    {s.title}
                  </span>
                </button>
              ))}
              <span className="text-[11px]" style={{ color: "var(--dl-text-faint)" }}>
                {doneSub}/{task.subtasks.length} erledigt
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <PersonAvatar assignee={task.assignee} size="sm" />
          {linkedEvent && <ChevronRight size={16} style={{ color: "var(--dl-text-faint)" }} />}
        </div>
      </div>
    </motion.li>
  );
}
