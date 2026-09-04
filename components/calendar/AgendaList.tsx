"use client";

import { useMemo } from "react";
import { CalendarX } from "lucide-react";
import { EventRow } from "@/components/calendar/EventRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatLongDate, fromISODate } from "@/lib/date-utils";
import type { CalendarEvent } from "@/lib/types";

export function AgendaList({ events, emptyLabel }: { events: CalendarEvent[]; emptyLabel?: string }) {
  const grouped = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
    const map = new Map<string, CalendarEvent[]>();
    for (const e of sorted) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  if (grouped.length === 0) {
    return <EmptyState icon={CalendarX} title="Keine Ergebnisse" description={emptyLabel ?? "Für diesen Zeitraum gibt es nichts zu zeigen."} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {grouped.map(([date, items]) => (
        <div key={date}>
          <p className="mb-2 text-[13.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
            {formatLongDate(fromISODate(date))}
          </p>
          <div className="flex flex-col gap-2">
            {items.map((e, i) => (
              <EventRow key={e.id} event={e} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
