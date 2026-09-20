"use client";

import { useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { CalendarX } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { useSplash } from "@/lib/store/splash-context";
import { useSheet } from "@/lib/store/sheet-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useNowTick } from "@/lib/hooks/useNowTick";
import { PROFILES } from "@/lib/demo-data";
import { toISODate, fromISODate, getBerlinParts } from "@/lib/date-utils";
import { expandEventOccurrences, expandEventsForDay } from "@/lib/recurrence";
import { Greeting } from "@/components/today/Greeting";
import { MonthCalendarCard } from "@/components/today/MonthCalendarCard";
import { EventSummaryRow } from "@/components/events/EventSummaryRow";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HomePage() {
  const { events, preferences } = useAppStore();
  const { openNewEvent } = useSheet();
  const { splashDone } = useSplash();
  const reducedMotion = useReducedMotion();
  const nowTick = useNowTick();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());

  const selectedISO = toISODate(selectedDate);

  const dayEvents = useMemo(() => {
    return expandEventsForDay(events, selectedISO).sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
  }, [events, selectedISO]);

  // "Als Nächstes"/"Weitere Termine" only ever look within the current
  // calendar month — never a "yearly recurring event" 2-year lookahead,
  // which used to surface e.g. next year's birthday alongside this
  // month's real termine. Once the month is down to its last week or so,
  // that same cutoff would otherwise leave the list running dry a few days
  // before it's actually over — so the search range then also reaches into
  // next month, far enough that there's always still a genuine "next
  // termin" to show, not just an early empty state. Always anchored to the
  // true today (Europe/Berlin), never whichever day is selected in the
  // month calendar above (spec §12). Full timestamps, not bare date
  // strings: a today event only drops out once its end time (or start
  // time, if it has no end) has actually passed; an all-day event counts
  // as upcoming for its whole calendar day. `nowTick` is otherwise unused
  // below — it's there purely so this memo re-evaluates "now" as time
  // passes, not only when `events` itself changes. Without it, an
  // already-past event kept showing here for as long as the tab stayed
  // open without any actual data change.
  const upcomingEvents = useMemo(() => {
    const { isoDate: todayISO, hour, minute } = getBerlinParts();
    const nowHHmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const today = fromISODate(todayISO);
    const monthEnd = endOfMonth(today);
    const daysLeftInMonth = differenceInCalendarDays(monthEnd, today);
    const rangeEnd = daysLeftInMonth <= 7 ? endOfMonth(addMonths(today, 1)) : monthEnd;
    const monthEndISO = toISODate(rangeEnd);
    return expandEventOccurrences(events, todayISO, monthEndISO)
      .filter((e) => {
        if (e.date > todayISO) return true;
        if (e.date < todayISO) return false;
        if (e.allDay) return true;
        const cutoff = e.endTime ?? e.startTime;
        return !cutoff || cutoff > nowHHmm;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      });
    // nowTick isn't read above — it's a dependency purely to force this
    // memo to re-run as time passes, see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, nowTick]);

  // The next event is featured as "Als Nächstes"; up to three further
  // ones follow as "Weitere Termine" (spec §13) — both spanning the rest
  // of the current calendar month (plus a spillover into next month once
  // this one is nearly over, see above), not just today.
  const [nextEvent, ...restEvents] = upcomingEvents;
  const furtherEvents = restEvents.slice(0, 3);

  // Same range the Kalender tab's month grid uses (full leading/trailing
  // weeks included) so dots for days just outside the month still show up.
  const monthGridEvents = useMemo(() => {
    const monthStart = startOfMonth(monthAnchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    return expandEventOccurrences(events, toISODate(gridStart), toISODate(gridEnd));
  }, [events, monthAnchor]);

  function selectDate(date: Date) {
    setSelectedDate(date);
  }

  function swipeMonth(dir: 1 | -1) {
    setMonthAnchor((prev) => addMonths(prev, dir));
  }

  function goToday() {
    const now = new Date();
    setMonthAnchor(now);
    setSelectedDate(now);
  }

  const activeName = PROFILES[preferences.activeProfile].name;

  return (
    <div>
      <Greeting name={activeName} date={selectedDate} animate={splashDone} />
      <MonthCalendarCard
        month={monthAnchor}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onSwipeMonth={swipeMonth}
        onGoToday={goToday}
        gridEvents={monthGridEvents}
        dayEvents={dayEvents}
        onAddEvent={() => openNewEvent(selectedISO)}
        animate={splashDone}
      />

      <AnimatePresence initial={false}>
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.24, ease: "easeOut" }}
        >
          {upcomingEvents.length === 0 ? (
            <div className="mt-7">
              <EmptyState
                icon={CalendarX}
                title="Noch nichts geplant"
                description="Für diesen Monat stehen keine weiteren Termine an."
                action={
                  <button
                    type="button"
                    onClick={() => openNewEvent(selectedISO)}
                    className="mt-1 rounded-full border px-4 py-2 text-[13px] font-medium"
                    style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
                  >
                    Termin hinzufügen
                  </button>
                }
              />
            </div>
          ) : (
            <>
              {nextEvent && (
                <section className="mt-7">
                  <h2 className="mb-3 text-[17px] font-bold" style={{ color: "var(--dl-text)" }}>
                    Als Nächstes
                  </h2>
                  <EventSummaryRow event={nextEvent} showDate />
                </section>
              )}
              {furtherEvents.length > 0 && (
                <section className="mt-7">
                  <h2 className="mb-3 text-[17px] font-bold" style={{ color: "var(--dl-text)" }}>
                    Weitere Termine
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {furtherEvents.map((event, i) => (
                      <EventSummaryRow key={event.id} event={event} index={i} showDate />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
