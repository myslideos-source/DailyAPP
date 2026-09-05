"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { FilterBar } from "@/components/calendar/FilterBar";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { WeekAgenda } from "@/components/calendar/WeekAgenda";
import { AgendaList } from "@/components/calendar/AgendaList";
import { DayTimeline } from "@/components/today/DayTimeline";
import { useAppStore } from "@/lib/store/app-store";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { filterEvents, matchesSearch, type CalendarFilter } from "@/lib/calendar-filter";
import { expandEventOccurrences, expandEventsForDay } from "@/lib/recurrence";
import {
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  toISODate,
} from "@/lib/date-utils";

const AGENDA_HORIZON_DAYS = 180;

type ViewMode = "tag" | "woche" | "monat" | "agenda";

export default function KalenderPage() {
  const { events, preferences } = useAppStore();
  const [view, setView] = useState<ViewMode>("monat");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [direction, setDirection] = useState<1 | -1>(1);
  const [filter, setFilter] = useState<CalendarFilter>(() => preferences.calendarFilters);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
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

  function step(dir: 1 | -1) {
    setDirection(dir);
    if (view === "monat") setAnchor((a) => addMonths(a, dir));
    else if (view === "woche") setAnchor((a) => addWeeks(a, dir));
    else if (view === "tag") {
      const next = addDays(selectedDate, dir);
      setSelectedDate(next);
      setAnchor(next);
    } else {
      setAnchor((a) => addDays(a, dir * 30));
    }
  }

  const monthStart = startOfMonth(anchor);
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });

  const monthGridEvents = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    return expandEventOccurrences(filtered, toISODate(gridStart), toISODate(gridEnd));
  }, [filtered, monthStart]);

  const weekAgendaEvents = useMemo(
    () => expandEventOccurrences(filtered, toISODate(weekStart), toISODate(addDays(weekStart, 6))),
    [filtered, weekStart],
  );

  const dayEvents = useMemo(
    () => expandEventsForDay(filtered, toISODate(selectedDate)),
    [filtered, selectedDate],
  );

  const agendaEvents = useMemo(
    () => expandEventOccurrences(filtered, toISODate(anchor), toISODate(addDays(anchor, AGENDA_HORIZON_DAYS))),
    [filtered, anchor],
  );

  const periodLabel =
    view === "monat"
      ? formatMonthYear(monthStart)
      : view === "woche"
        ? `${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}`
        : view === "tag"
          ? formatLongDate(selectedDate)
          : "Anstehend";

  const showRail = isDesktop && view !== "tag";

  return (
    <div className="pt-3 lg:flex lg:gap-8">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
            Kalender
          </h1>
          <button
            type="button"
            onClick={goToday}
            className="min-h-[36px] rounded-full border px-3.5 py-1.5 text-[13px] font-medium"
            style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
          >
            Heute
          </button>
        </div>

        <div className="mt-4">
          <SegmentControl
            segments={[
              { value: "tag", label: "Tag" },
              { value: "woche", label: "Woche" },
              { value: "monat", label: "Monat" },
              { value: "agenda", label: "Agenda" },
            ]}
            value={view}
            onChange={(v) => setView(v)}
          />
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
            {view !== "agenda" && (
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={() => step(-1)} aria-label="Zurück" className="flex h-9 w-9 items-center justify-center rounded-full">
                  <ChevronLeft size={19} style={{ color: "var(--dl-text-dim)" }} />
                </button>
                <div className="relative flex items-center justify-center">
                  {view === "tag" && !reducedMotion && (
                    <motion.span
                      layoutId="calendar-day-focus"
                      transition={{ type: "spring", stiffness: 380, damping: 36 }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: "var(--dl-together-soft)" }}
                    />
                  )}
                  <p className="relative px-3.5 py-1 text-[14.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
                    {periodLabel}
                  </p>
                </div>
                <button type="button" onClick={() => step(1)} aria-label="Weiter" className="flex h-9 w-9 items-center justify-center rounded-full">
                  <ChevronRight size={19} style={{ color: "var(--dl-text-dim)" }} />
                </button>
              </div>
            )}

            <div className="relative mt-4">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={view}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: "easeOut" }}
                >
                  {view === "monat" && (
                    <MonthGrid
                      month={monthStart}
                      selectedDate={selectedDate}
                      onSelectDate={(d) => {
                        setSelectedDate(d);
                        setAnchor(d);
                        if (!isDesktop) setView("tag");
                      }}
                      events={monthGridEvents}
                    />
                  )}
                  {view === "woche" && <WeekAgenda weekStart={weekStart} events={weekAgendaEvents} />}
                  {view === "tag" && (
                    <DayTimeline
                      events={dayEvents}
                      selectedDate={selectedDate}
                      direction={direction}
                      animate
                      onSwipeDay={(dir) => {
                        const next = addDays(selectedDate, dir);
                        setDirection(dir);
                        setSelectedDate(next);
                        setAnchor(next);
                      }}
                    />
                  )}
                  {view === "agenda" && <AgendaList events={agendaEvents} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {showRail && (
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-24 rounded-[var(--radius-lg)] border p-4" style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}>
            <p className="mb-3 text-[13px] font-semibold" style={{ color: "var(--dl-text-dim)" }}>
              {formatLongDate(selectedDate)}
            </p>
            <DayTimeline
              events={dayEvents}
              selectedDate={selectedDate}
              direction={1}
              animate
              hideTitle
              onSwipeDay={(dir) => setSelectedDate(addDays(selectedDate, dir))}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
