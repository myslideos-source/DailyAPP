"use client";

import { motion } from "motion/react";
import { ListChecks } from "lucide-react";
import { PersonAvatar } from "@/components/ui/Avatar";
import { assigneeColor } from "@/lib/theme";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { TOGETHER_MERGE_KEYFRAMES, TOGETHER_MERGE_TRANSITION } from "@/lib/motion-variants";
import type { CalendarEvent } from "@/lib/types";

export function EventRow({ event, index = 0 }: { event: CalendarEvent; index?: number }) {
  const { openEventDetail } = useSheet();
  const { tasks } = useAppStore();
  const reducedMotion = useReducedMotion();
  const color = assigneeColor(event.assignee);
  const openPrepCount = tasks.filter((t) => t.linkedEventId === event.id && !t.done).length;
  const isTogether = event.assignee === "gemeinsam";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
      onClick={() => openEventDetail(event.id)}
      className="flex w-full min-h-[52px] items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <motion.span
        className="h-2 w-2 shrink-0 rounded-full"
        initial={{ background: color }}
        animate={!reducedMotion && isTogether ? { background: TOGETHER_MERGE_KEYFRAMES } : { background: color }}
        transition={TOGETHER_MERGE_TRANSITION}
      />
      <span className="w-12 shrink-0 text-[12.5px] font-semibold" style={{ color }}>
        {event.allDay ? "Ganztägig" : event.startTime}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: "var(--dl-text)" }}>
        {event.title}
      </span>
      {openPrepCount > 0 && (
        <span
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium"
          style={{ color: "var(--dl-text-faint)" }}
          aria-label={`${openPrepCount} Aufgaben offen`}
        >
          <ListChecks size={12} />
          {openPrepCount}
        </span>
      )}
      <PersonAvatar assignee={event.assignee} size="sm" />
    </motion.button>
  );
}
