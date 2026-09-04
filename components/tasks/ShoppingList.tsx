"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { TaskCheckbox } from "@/components/tasks/TaskCheckbox";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store/app-store";
import { toISODate } from "@/lib/date-utils";
import type { TaskItem } from "@/lib/types";

export function ShoppingList({ items }: { items: TaskItem[] }) {
  const { toggleTask, addTask } = useAppStore();
  const [draft, setDraft] = useState("");

  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  function handleAdd() {
    if (!draft.trim()) return;
    addTask({
      title: draft.trim(),
      assignee: "gemeinsam",
      dueDate: toISODate(new Date()),
      priority: "low",
      done: false,
      recurrence: "none",
      isShopping: true,
      subtasks: [],
    });
    setDraft("");
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--dl-text-faint)" }}>
        Einkaufsliste
      </h2>

      <div
        className="rounded-[16px] border p-3.5"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
      >
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Artikel hinzufügen"
            className="min-h-[40px] flex-1 rounded-[12px] border px-3 text-[14px] outline-none"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-bg)", color: "var(--dl-text)" }}
          />
          <button
            type="button"
            onClick={handleAdd}
            aria-label="Hinzufügen"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: "var(--dl-together-soft)" }}
          >
            <Plus size={18} style={{ color: "var(--dl-together)" }} />
          </button>
        </div>

        <motion.ul layout className="mt-3 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {[...open, ...done].map((item) => (
              <motion.li
                layout
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 py-1"
              >
                <TaskCheckbox checked={item.done} onToggle={() => toggleTask(item.id)} label={item.title} />
                <motion.span
                  animate={{ opacity: item.done ? 0.45 : 1 }}
                  className="flex-1 text-[14px]"
                  style={{
                    color: "var(--dl-text)",
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.title}
                </motion.span>
                <PersonAvatar assignee={item.assignee} size="sm" />
              </motion.li>
            ))}
          </AnimatePresence>
          {items.length === 0 && (
            <p className="py-2 text-[13px]" style={{ color: "var(--dl-text-faint)" }}>
              Die Einkaufsliste ist leer.
            </p>
          )}
        </motion.ul>
      </div>
    </section>
  );
}
