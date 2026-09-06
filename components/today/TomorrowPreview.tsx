"use client";

import { motion } from "motion/react";
import { ChevronRight, CalendarClock } from "lucide-react";
import { revealVariants } from "@/lib/motion-variants";
import { useSheet } from "@/lib/store/sheet-context";
import type { CalendarEvent } from "@/lib/types";

export function TomorrowPreview({ event }: { event: CalendarEvent | null }) {
  const { openEventDetail } = useSheet();

  if (!event) return null;

  return (
    <motion.button
      type="button"
      custom={4}
      initial="hidden"
      animate="visible"
      variants={revealVariants}
      onClick={() => openEventDetail(event.id)}
      className="mt-4 flex w-full min-h-[64px] items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-colors active:bg-white/[0.03]"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--dl-together-soft)" }}
      >
        <CalendarClock size={16} style={{ color: "var(--dl-together)" }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
          Morgen · {event.allDay ? "Ganztägig" : event.startTime}
        </p>
        <p className="truncate text-[14.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
          {event.title}
        </p>
      </div>
      <ChevronRight size={18} style={{ color: "var(--dl-text-faint)" }} />
    </motion.button>
  );
}
