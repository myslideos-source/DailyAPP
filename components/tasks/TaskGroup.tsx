"use client";

import { AnimatePresence, motion } from "motion/react";
import { TaskRow } from "@/components/tasks/TaskRow";
import type { TaskItem } from "@/lib/types";

export function TaskGroup({ title, tasks }: { title: string; tasks: TaskItem[] }) {
  if (tasks.length === 0) return null;

  return (
    <section className="mt-7 first:mt-0">
      <h2 className="mb-3 text-[19px] font-bold" style={{ color: "var(--dl-text)" }}>
        {title}
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
