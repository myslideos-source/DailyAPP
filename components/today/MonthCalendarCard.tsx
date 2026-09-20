"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, CalendarX } from "lucide-react";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { EventSummaryRow } from "@/components/events/EventSummaryRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatLongDate, formatMonthYear, isToday, toISODate } from "@/lib/date-utils";
import { revealVariants } from "@/lib/motion-variants";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import type { CalendarEvent } from "@/lib/types";

/**
 * Replaces the old week strip at the top of the home page (spec: swipeable
 * month-by-month overview, tapping a date shows that day's termine right
 * there instead of doing nothing). Mirrors the Kalender tab's month grid +
 * inline agenda pattern, just in a compact card, and reuses WeekStrip's
 * drag-to-swipe gesture for the month step.
 */
export function MonthCalendarCard({
  month,
  selectedDate,
  onSelectDate,
  onSwipeMonth,
  onGoToday,
  gridEvents,
  dayEvents,
  onAddEvent,
  animate,
}: {
  month: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSwipeMonth: (direction: 1 | -1) => void;
  onGoToday: () => void;
  gridEvents: CalendarEvent[];
  dayEvents: CalendarEvent[];
  onAddEvent: () => void;
  animate: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      custom={1}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      variants={revealVariants}
      className="mt-5 overflow-hidden rounded-[var(--radius-xl)] border p-4"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <div className="flex items-center justify-between px-1">
        <p className="text-[15px] font-bold capitalize" style={{ color: "var(--dl-text)" }}>
          {formatMonthYear(month)}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSwipeMonth(-1)}
            aria-label="Vorheriger Monat"
            className="flex h-8 w-8 items-center justify-center rounded-full"
          >
            <ChevronLeft size={17} style={{ color: "var(--dl-text-dim)" }} />
          </button>
          {!isToday(selectedDate) && (
            <button
              type="button"
              onClick={onGoToday}
              className="min-h-[32px] rounded-full border px-3 py-1 text-[12.5px] font-medium"
              style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
            >
              Heute
            </button>
          )}
          <button
            type="button"
            onClick={() => onSwipeMonth(1)}
            aria-label="Nächster Monat"
            className="flex h-8 w-8 items-center justify-center rounded-full"
          >
            <ChevronRight size={17} style={{ color: "var(--dl-text-dim)" }} />
          </button>
        </div>
      </div>

      <motion.div
        className="mt-2"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) onSwipeMonth(1);
          else if (info.offset.x > 60) onSwipeMonth(-1);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={toISODate(month)}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: "easeOut" }}
          >
            <MonthGrid month={month} selectedDate={selectedDate} onSelectDate={onSelectDate} events={gridEvents} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--dl-border)" }}>
        <p className="mb-2 px-1 text-[12.5px] font-semibold capitalize" style={{ color: "var(--dl-text-dim)" }}>
          {formatLongDate(selectedDate)}
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={toISODate(selectedDate)}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
            className="flex flex-col gap-2"
          >
            {dayEvents.length === 0 ? (
              <EmptyState
                icon={CalendarX}
                title="Noch nichts geplant"
                description="Für diesen Tag stehen keine Termine an."
                action={
                  <button
                    type="button"
                    onClick={onAddEvent}
                    className="mt-1 rounded-full border px-4 py-2 text-[13px] font-medium"
                    style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
                  >
                    Termin hinzufügen
                  </button>
                }
              />
            ) : (
              dayEvents.map((event, i) => <EventSummaryRow key={event.id} event={event} index={i} />)
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
