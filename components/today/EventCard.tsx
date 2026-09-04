"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Pencil, StickyNote } from "lucide-react";
import { PersonAvatar } from "@/components/ui/Avatar";
import { assigneeColor, assigneeLabel, categoryLabel } from "@/lib/theme";
import { useSheet } from "@/lib/store/sheet-context";
import type { CalendarEvent } from "@/lib/types";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function EventCard({ event, index }: { event: CalendarEvent; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { openEditEvent } = useSheet();
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const color = assigneeColor(event.assignee);

  const subtitleParts = [
    event.assignee === "gemeinsam" ? "Gemeinsam" : assigneeLabel(event.assignee),
    event.location,
  ].filter(Boolean);

  return (
    <motion.li
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reducedMotion ? 0 : index * 0.07, duration: 0.35, ease: "easeOut" }}
      className="relative flex gap-3.5 pb-6 last:pb-0"
    >
      <div className="flex w-4 flex-col items-center pt-1.5">
        <motion.span
          initial={reducedMotion ? { scale: 1 } : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: reducedMotion ? 0 : index * 0.07 + 0.04, type: "spring", stiffness: 500, damping: 20 }}
          className="h-3 w-3 shrink-0 rounded-full border-2"
          style={{ borderColor: color, background: "var(--dl-bg)" }}
        />
        <span className="mt-1 w-px flex-1" style={{ background: "var(--dl-border)" }} />
      </div>

      <motion.div layout className="min-w-0 flex-1 pt-0.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex w-full min-h-[44px] flex-col items-start gap-0.5 rounded-[14px] text-left"
        >
          <span className="text-[12.5px] font-semibold" style={{ color }}>
            {event.allDay ? "Ganztägig" : event.startTime}
          </span>
          <span className="text-[15.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
            {event.title}
          </span>
          {subtitleParts.length > 0 && (
            <span className="text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
              {subtitleParts.join(" · ")}
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reducedMotion ? 0.05 : 0.28, ease: "easeOut" }}
            className="mt-2.5 overflow-hidden rounded-[16px] border p-3.5"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
          >
            <div className="flex flex-wrap items-center gap-3 text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
              <span
                className="rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
              >
                {categoryLabel(event.category)}
              </span>
              {!event.allDay && (
                <span>
                  {event.startTime}–{event.endTime}
                </span>
              )}
            </div>

            {event.location && (
              <p className="mt-2.5 flex items-center gap-1.5 text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                <MapPin size={14} style={{ color: "var(--dl-text-dim)" }} /> {event.location}
              </p>
            )}
            {event.notes && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                <StickyNote size={14} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
                {event.notes}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <PersonAvatar assignee={event.assignee} size="sm" />
              <button
                type="button"
                onClick={() => openEditEvent(event)}
                className="flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium"
                style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
              >
                <Pencil size={13} /> Bearbeiten
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </motion.li>
  );
}
