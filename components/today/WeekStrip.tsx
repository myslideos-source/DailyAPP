"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { addDays } from "date-fns";
import { WEEKDAY_SHORT, formatDayNumber, isSameDay, isToday, toISODate } from "@/lib/date-utils";
import { revealVariants } from "@/lib/motion-variants";
import { assigneeColor } from "@/lib/theme";
import type { CalendarEvent } from "@/lib/types";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function WeekStrip({
  weekStart,
  selectedDate,
  onSelectDate,
  onSwipeWeek,
  events,
  animate,
}: {
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSwipeWeek: (direction: 1 | -1) => void;
  events: CalendarEvent[];
  animate: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const dotsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, new Set());
      map.get(e.date)!.add(e.assignee);
    }
    return map;
  }, [events]);

  return (
    <motion.div
      custom={1}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      variants={revealVariants}
      className="pt-5"
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) onSwipeWeek(1);
          else if (info.offset.x > 60) onSwipeWeek(-1);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={toISODate(weekStart)}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-7"
          >
            {days.map((day) => {
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const dots = Array.from(dotsByDay.get(toISODate(day)) ?? []);

              return (
                <button
                  key={toISODate(day)}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  aria-pressed={selected}
                  aria-label={toISODate(day)}
                  className="relative flex min-h-[64px] flex-col items-center justify-center gap-1 py-2 text-center"
                >
                  {selected && (
                    <motion.span
                      layoutId="week-strip-selection"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-x-1.5 inset-y-0 rounded-[22px]"
                      style={{
                        background:
                          "linear-gradient(160deg, rgba(112, 78, 232, 0.55), rgba(149, 101, 245, 0.3))",
                        border: "1px solid rgba(149, 101, 245, 0.45)",
                        boxShadow: "0 0 18px rgba(112, 78, 232, 0.3)",
                      }}
                    />
                  )}
                  <span
                    className="relative z-10 text-[11px] font-medium"
                    style={{ color: selected ? "var(--dl-text)" : "var(--dl-text-faint)" }}
                  >
                    {WEEKDAY_SHORT[(day.getDay() + 6) % 7]}
                  </span>
                  <span
                    className="relative z-10 text-[15px] font-semibold"
                    style={{
                      color: selected ? "var(--dl-text)" : today ? "var(--dl-together)" : "var(--dl-text)",
                    }}
                  >
                    {formatDayNumber(day)}
                  </span>
                  <span className="relative z-10 flex h-1.5 items-center gap-0.5">
                    {selected ? (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--dl-together)", boxShadow: "0 0 6px var(--dl-together)" }}
                      />
                    ) : (
                      dots.slice(0, 3).map((assignee) => (
                        <span
                          key={assignee}
                          className="h-1 w-1 rounded-full"
                          style={{ background: assigneeColor(assignee as CalendarEvent["assignee"]) }}
                        />
                      ))
                    )}
                  </span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
