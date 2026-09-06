"use client";

import { motion } from "motion/react";
import { Sunrise } from "lucide-react";
import type { DailyBriefingData } from "@/lib/briefing";
import { revealVariants } from "@/lib/motion-variants";

/**
 * "Euer Tag" — a compact, whole-day summary on the home page, distinct from
 * "Als Nächstes" (which shows the next event in full detail): this card
 * only ever surfaces the next event's title/time plus the open-task count,
 * never a second full event row, so the two never show the same thing
 * twice (spec §6). Tapping opens the full DailyBriefingCard rather than
 * navigating anywhere.
 */
export function TodaySummaryCard({
  data,
  onOpen,
  animate,
}: {
  data: DailyBriefingData;
  onOpen: () => void;
  animate: boolean;
}) {
  const nextLabel = data.nextEvent
    ? data.nextEvent.allDay
      ? data.nextEvent.title
      : data.nextEvent.startTime
        ? `${data.nextEvent.title} · ${data.nextEvent.startTime} Uhr`
        : data.nextEvent.title
    : "Keine weiteren Termine heute";

  const taskLabel =
    data.openTasksCount === 0
      ? "Alles erledigt"
      : data.openTasksCount === 1
        ? "1 Aufgabe offen"
        : `${data.openTasksCount} Aufgaben offen`;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      custom={3}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      variants={revealVariants}
      className="mt-3 flex w-full items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] border p-4 text-left"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--dl-together-soft)" }}
      >
        <Sunrise size={17} style={{ color: "var(--dl-together)" }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--dl-together)" }}>
          Euer Tag
        </p>
        <p className="mt-0.5 truncate text-[14px] font-semibold" style={{ color: "var(--dl-text)" }}>
          {nextLabel}
        </p>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
          {taskLabel}
        </p>
      </div>
    </motion.button>
  );
}
