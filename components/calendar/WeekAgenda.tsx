"use client";

import { useMemo } from "react";
import { addDays } from "date-fns";
import { CalendarX } from "lucide-react";
import { EventRow } from "@/components/calendar/EventRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatShortDate, isToday, relativeDayLabel, toISODate } from "@/lib/date-utils";
import type { CalendarEvent } from "@/lib/types";

export function WeekAgenda({ weekStart, events }: { weekStart: Date; events: CalendarEvent[] }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <div className="flex flex-col gap-5">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => e.date === toISODate(day))
          .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

        return (
          <div key={toISODate(day)}>
            <div className="mb-2 flex items-baseline gap-2">
              <p
                className="text-[13.5px] font-semibold"
                style={{ color: isToday(day) ? "var(--dl-together)" : "var(--dl-text)" }}
              >
                {relativeDayLabel(day)}
              </p>
              <p className="text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
                {formatShortDate(day)}
              </p>
            </div>
            {dayEvents.length === 0 ? (
              <p className="pb-1 text-[13px]" style={{ color: "var(--dl-text-faint)" }}>
                Keine Termine
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {dayEvents.map((e, i) => (
                  <EventRow key={e.id} event={e} index={i} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {events.length === 0 && (
        <EmptyState icon={CalendarX} title="Ruhige Woche" description="Keine Termine in diesem Zeitraum." />
      )}
    </div>
  );
}
