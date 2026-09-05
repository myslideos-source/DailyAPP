"use client";

import { motion } from "motion/react";
import { ChevronRight, ListChecks } from "lucide-react";
import { PersonAvatar } from "@/components/ui/Avatar";
import { assigneeColor, assigneeLabel, assigneeSoftColor } from "@/lib/theme";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import type { CalendarEvent } from "@/lib/types";

/** The shared "one event, at a glance" row — colored accent bar, time and
 * title, an assignee pill, avatars, and a chevron into the edit view. Used
 * for the Kalender day-agenda list and the Heute page's upcoming-events
 * lists, so both read as the same app rather than two bespoke layouts. */
export function EventSummaryRow({ event, index = 0 }: { event: CalendarEvent; index?: number }) {
  const { openEditEvent } = useSheet();
  const { tasks } = useAppStore();
  const color = assigneeColor(event.assignee);
  const softColor = assigneeSoftColor(event.assignee);
  const openPrepCount = tasks.filter((t) => t.linkedEventId === event.id && !t.done).length;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      onClick={() => openEditEvent(event.id)}
      className="flex w-full items-center gap-3 rounded-[16px] border px-4 py-3.5 text-left"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <span
        aria-hidden
        className="h-full min-h-[40px] w-[3px] shrink-0 self-stretch rounded-full"
        style={{ background: color }}
      />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold" style={{ color }}>
          {event.allDay ? "Ganztägig" : event.startTime}
        </p>
        <p className="truncate text-[15.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
          {event.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11.5px] font-medium"
            style={{ background: softColor, color }}
          >
            {assigneeLabel(event.assignee)}
          </span>
          {openPrepCount > 0 && (
            <span
              className="flex items-center gap-1 text-[11px] font-medium"
              style={{ color: "var(--dl-text-faint)" }}
              aria-label={`${openPrepCount} Aufgaben offen`}
            >
              <ListChecks size={11} />
              {openPrepCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <PersonAvatar assignee={event.assignee} size="sm" />
        <ChevronRight size={16} style={{ color: "var(--dl-text-faint)" }} />
      </div>
    </motion.button>
  );
}
