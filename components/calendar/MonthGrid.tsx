"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { WEEKDAY_SHORT, formatDayNumber, isSameDay, isToday, toISODate } from "@/lib/date-utils";
import { assigneeColor } from "@/lib/theme";
import type { CalendarEvent } from "@/lib/types";

export function MonthGrid({
  month,
  selectedDate,
  onSelectDate,
  events,
}: {
  month: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: CalendarEvent[];
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const result: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      result.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return result;
  }, [month]);

  const dotsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, new Set());
      map.get(e.date)!.add(e.assignee);
    }
    return map;
  }, [events]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 px-1 pb-1.5">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="text-center text-[11px] font-medium" style={{ color: "var(--dl-text-faint)" }}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const dots = Array.from(dotsByDay.get(toISODate(day)) ?? []);

          return (
            <button
              key={toISODate(day)}
              type="button"
              onClick={() => onSelectDate(day)}
              className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px]"
              style={{ opacity: inMonth ? 1 : 0.32 }}
            >
              {selected && (
                <motion.span
                  layoutId="month-grid-selection"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0.5 rounded-[12px]"
                  style={{ background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))" }}
                />
              )}
              <span
                className="relative z-10 text-[13.5px] font-medium"
                style={{
                  color: selected ? "var(--dl-bg)" : today ? "var(--dl-together)" : "var(--dl-text)",
                }}
              >
                {formatDayNumber(day)}
              </span>
              <span className="relative z-10 flex h-1.5 items-center gap-0.5">
                {dots.slice(0, 3).map((a) => (
                  <span
                    key={a}
                    className="h-1 w-1 rounded-full"
                    style={{
                      background: selected ? "var(--dl-bg)" : assigneeColor(a as CalendarEvent["assignee"]),
                      opacity: selected ? 0.7 : 1,
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
