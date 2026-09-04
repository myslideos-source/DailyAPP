"use client";

import { AnimatePresence, motion } from "motion/react";
import { TaskRow } from "@/components/tasks/TaskRow";
import type { TaskItem } from "@/lib/types";

export function TaskGroup({ title, tasks }: { title: string; tasks: TaskItem[] }) {
  if (tasks.length === 0) return null;

  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--dl-text-faint)" }}>
        {title} <span style={{ color: "var(--dl-text-faint)", opacity: 0.6 }}>({tasks.length})</span>
      </h2>
      <motion.ul layout className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </AnimatePresence>
      </motion.ul>
    </section>
  );
}
