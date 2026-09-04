"use client";

import { motion } from "motion/react";
import { PersonAvatar } from "@/components/ui/Avatar";
import { assigneeColor } from "@/lib/theme";
import { useSheet } from "@/lib/store/sheet-context";
import type { CalendarEvent } from "@/lib/types";

export function EventRow({ event, index = 0 }: { event: CalendarEvent; index?: number }) {
  const { openEditEvent } = useSheet();
  const color = assigneeColor(event.assignee);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
      onClick={() => openEditEvent(event)}
      className="flex w-full min-h-[52px] items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="w-12 shrink-0 text-[12.5px] font-semibold" style={{ color }}>
        {event.allDay ? "Ganztägig" : event.startTime}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: "var(--dl-text)" }}>
        {event.title}
      </span>
      <PersonAvatar assignee={event.assignee} size="sm" />
    </motion.button>
  );
}
