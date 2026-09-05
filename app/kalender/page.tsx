"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { CalendarX, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { FilterBar } from "@/components/calendar/FilterBar";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { AgendaList } from "@/components/calendar/AgendaList";
import { EventSummaryRow } from "@/components/events/EventSummaryRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useSheet } from "@/lib/store/sheet-context";
import { filterEvents, matchesSearch, type CalendarFilter } from "@/lib/calendar-filter";
import { expandEventOccurrences, expandEventsForDay } from "@/lib/recurrence";
import { formatLongDate, formatMonthYear, toISODate } from "@/lib/date-utils";

export default function KalenderPage() {
  const { events, preferences } = useAppStore();
  const { openNewEvent } = useSheet();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [filter, setFilter] = useState<CalendarFilter>(() => preferences.calendarFilters);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const reducedMotion = useReducedMotion();

  const filtered = useMemo(() => filterEvents(events, filter), [events, filter]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return filtered.filter((e) => matchesSearch(e, query));
  }, [filtered, query]);

  function goToday() {
    const now = new Date();
    setAnchor(now);
    setSelectedDate(now);
  }

  function stepMonth(dir: 1 | -1) {
    setAnchor((a) => addMonths(a, dir));
  }

  const monthStart = startOfMonth(anchor);

  const monthGridEvents = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    return expandEventOccurrences(filtered, toISODate(gridStart), toISODate(gridEnd));
  }, [filtered, monthStart]);

  const dayEvents = useMemo(() => {
    const selectedISO = toISODate(selectedDate);
    return expandEventsForDay(filtered, selectedISO).sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
  }, [filtered, selectedDate]);

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: "var(--dl-text)" }}>
            Kalender
          </h1>
          <p className="mt-0.5 text-[14px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
            {formatMonthYear(monthStart)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => stepMonth(-1)}
            aria-label="Vorheriger Monat"
            className="flex h-9 w-9 items-center justify-center rounded-full"
          >
            <ChevronLeft size={19} style={{ color: "var(--dl-text-dim)" }} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="min-h-[36px] rounded-full border px-3.5 py-1.5 text-[13px] font-medium"
            style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
          >
            Heute
          </button>
          <button
            type="button"
            onClick={() => stepMonth(1)}
            aria-label="Nächster Monat"
            className="flex h-9 w-9 items-center justify-center rounded-full"
          >
            <ChevronRight size={19} style={{ color: "var(--dl-text-dim)" }} />
          </button>
        </div>
      </div>

      <FilterBar
        value={filter}
        onChange={setFilter}
        searchOpen={searchOpen}
        onToggleSearch={() => {
          setSearchOpen((s) => !s);
          setQuery("");
        }}
      />

      {searchOpen && (
        <div className="relative mt-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--dl-text-faint)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Termine durchsuchen …"
            className="w-full rounded-full border py-2.5 pl-10 pr-4 text-[14px] outline-none"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text)" }}
          />
        </div>
      )}

      {searchResults ? (
        <div className="mt-5">
          <AgendaList events={searchResults} emptyLabel="Keine Termine gefunden." />
        </div>
      ) : (
        <>
          <div className="relative mt-4">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={toISODate(monthStart)}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: "easeOut" }}
              >
                <MonthGrid
                  month={monthStart}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => setSelectedDate(d)}
                  events={monthGridEvents}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* The month grid never hides — the selected day's agenda always
              renders below it, so switching days is a single tap, not a
              view change (spec: "ohne Kalender auszublenden"). */}
          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--dl-border)" }}>
            <h2 className="mb-3 text-[17px] font-bold" style={{ color: "var(--dl-text)" }}>
              {formatLongDate(selectedDate)}
            </h2>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={toISODate(selectedDate)}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
                className="flex flex-col gap-2.5"
              >
                {dayEvents.length === 0 ? (
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
                  dayEvents.map((event, i) => <EventSummaryRow key={event.id} event={event} index={i} />)
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
