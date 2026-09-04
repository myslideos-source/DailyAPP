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
        className="overflow-hidden rounded-[var(--radius-lg)] border p-1.5"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={toISODate(weekStart)}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-7 gap-1"
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
                  className="relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[16px] py-2 text-center transition-colors"
                >
                  {selected && (
                    <motion.span
                      layoutId="week-strip-selection"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-[16px]"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
                      }}
                    />
                  )}
                  <span
                    className="relative z-10 text-[11px] font-medium"
                    style={{ color: selected ? "var(--dl-bg)" : "var(--dl-text-faint)" }}
                  >
                    {WEEKDAY_SHORT[(day.getDay() + 6) % 7]}
                  </span>
                  <span
                    className="relative z-10 text-[15px] font-semibold"
                    style={{
                      color: selected ? "var(--dl-bg)" : today ? "var(--dl-together)" : "var(--dl-text)",
                    }}
                  >
                    {formatDayNumber(day)}
                  </span>
                  <span className="relative z-10 flex h-1.5 items-center gap-0.5">
                    {dots.slice(0, 3).map((assignee) => (
                      <span
                        key={assignee}
                        className="h-1 w-1 rounded-full"
                        style={{
                          background: selected ? "var(--dl-bg)" : assigneeColor(assignee as CalendarEvent["assignee"]),
                          opacity: selected ? 0.7 : 1,
                        }}
                      />
                    ))}
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
