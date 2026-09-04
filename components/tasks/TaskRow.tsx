"use client";

import { motion } from "motion/react";
import { Repeat, Link2 } from "lucide-react";
import { TaskCheckbox } from "@/components/tasks/TaskCheckbox";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store/app-store";
import { fromISODate, isToday, relativeDayLabel } from "@/lib/date-utils";
import type { TaskItem, TaskPriority } from "@/lib/types";

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: "var(--dl-text-faint)",
  medium: "var(--dl-domenico)",
  high: "var(--dl-elisabeth)",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

export function TaskRow({ task }: { task: TaskItem }) {
  const { toggleTask, toggleSubtask } = useAppStore();
  const doneSub = task.subtasks.filter((s) => s.done).length;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-[16px] border p-3.5"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <TaskCheckbox checked={task.done} onToggle={() => toggleTask(task.id)} label={`${task.title} als erledigt markieren`} />
        </div>

        <div className="min-w-0 flex-1">
          <motion.p
            animate={{ opacity: task.done ? 0.5 : 1 }}
            transition={{ duration: 0.25 }}
            className="text-[14.5px] font-medium"
            style={{
              color: "var(--dl-text)",
              textDecoration: task.done ? "line-through" : "none",
            }}
          >
            {task.title}
          </motion.p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {task.dueDate && (
              <span
                className="text-[12px] font-medium"
                style={{ color: isToday(fromISODate(task.dueDate)) ? "var(--dl-together)" : "var(--dl-text-faint)" }}
              >
                {relativeDayLabel(fromISODate(task.dueDate))}
              </span>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{
                color: PRIORITY_COLOR[task.priority],
                background: `color-mix(in srgb, ${PRIORITY_COLOR[task.priority]} 14%, transparent)`,
              }}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
            {task.recurrence !== "none" && <Repeat size={13} style={{ color: "var(--dl-text-faint)" }} />}
            {task.linkedEventId && <Link2 size={13} style={{ color: "var(--dl-text-faint)" }} />}
            <PersonAvatar assignee={task.assignee} size="sm" className="ml-auto" />
          </div>

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
      </div>
    </motion.li>
  );
}
