"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarX } from "lucide-react";
import { EventCard } from "@/components/today/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { revealVariants } from "@/lib/motion-variants";
import { toISODate } from "@/lib/date-utils";
import { useSheet } from "@/lib/store/sheet-context";
import type { CalendarEvent } from "@/lib/types";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function DayTimeline({
  events,
  selectedDate,
  direction,
  animate,
  onSwipeDay,
  hideTitle,
}: {
  events: CalendarEvent[];
  selectedDate: Date;
  direction: 1 | -1;
  animate: boolean;
  onSwipeDay: (direction: 1 | -1) => void;
  hideTitle?: boolean;
}) {
  const { openNewEvent } = useSheet();
  const reducedMotion = useReducedMotion();
  const sorted = [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });

  return (
    <motion.section
      custom={3}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      variants={revealVariants}
      className="mt-7"
    >
      {!hideTitle && (
        <h2 className="mb-3 text-[17px] font-bold" style={{ color: "var(--dl-text)" }}>
          Euer Tag
        </h2>
      )}

      <motion.div
        className="relative min-h-[80px] overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={(_, info) => {
          if (info.offset.x < -70) onSwipeDay(1);
          else if (info.offset.x > 70) onSwipeDay(-1);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={toISODate(selectedDate)}
            custom={direction}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -18 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          >
            {sorted.length === 0 ? (
              <EmptyState
                icon={CalendarX}
                title="Noch nichts geplant"
                description="Für diesen Tag stehen keine Termine an."
                action={
                  <button
                    type="button"
                    onClick={() => openNewEvent(toISODate(selectedDate))}
                    className="mt-1 rounded-full border px-4 py-2 text-[13px] font-medium"
                    style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
                  >
                    Termin hinzufügen
                  </button>
                }
              />
            ) : (
              <div className="relative">
                {/* The timeline "draws" top-to-bottom before the event dots
                    and content stagger in — scaleY keeps this to a single
                    compositor-friendly transform, never a layout-affecting
                    height animation (spec 10.3). */}
                <motion.span
                  aria-hidden
                  className="absolute left-[7px] top-2 bottom-6 w-px"
                  style={{ background: "var(--dl-border)", transformOrigin: "top" }}
                  initial={reducedMotion ? { scaleY: 1 } : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.5, ease: "easeOut" }}
                />
                <ul>
                  {sorted.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} />
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}
