"use client";

import { useMemo, useState } from "react";
import { addDays, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { CalendarX } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { useSplash } from "@/lib/store/splash-context";
import { useSheet } from "@/lib/store/sheet-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { PROFILES } from "@/lib/demo-data";
import { toISODate } from "@/lib/date-utils";
import { expandEventOccurrences, expandEventsForDay } from "@/lib/recurrence";
import { computeDailyBriefing } from "@/lib/briefing";
import { Greeting } from "@/components/today/Greeting";
import { WeekStrip } from "@/components/today/WeekStrip";
import { TimeForUsCard } from "@/components/today/TimeForUsCard";
import { TodaySummaryCard } from "@/components/today/TodaySummaryCard";
import { TomorrowPreview } from "@/components/today/TomorrowPreview";
import { EventSummaryRow } from "@/components/events/EventSummaryRow";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HomePage() {
  const { events, tasks, preferences } = useAppStore();
  const { openNewEvent, openDailyBriefing } = useSheet();
  const { splashDone } = useSplash();
  const reducedMotion = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const selectedISO = toISODate(selectedDate);
  const tomorrowISO = toISODate(addDays(selectedDate, 1));

  const dayEvents = useMemo(() => {
    return expandEventsForDay(events, selectedISO).sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
  }, [events, selectedISO]);

  // The first item chronologically is featured as "Als Nächstes"; the rest
  // follow as a plain list — so the one thing coming up is always the
  // easiest to spot, whichever day is selected.
  const [nextEvent, ...restEvents] = dayEvents;

  const weekEvents = useMemo(() => {
    const weekEnd = addDays(weekStart, 6);
    return expandEventOccurrences(events, toISODate(weekStart), toISODate(weekEnd));
  }, [events, weekStart]);

  const tomorrowEvent = useMemo(() => {
    const list = expandEventsForDay(events, tomorrowISO).sort((a, b) =>
      (a.startTime ?? "").localeCompare(b.startTime ?? ""),
    );
    return list[0] ?? null;
  }, [events, tomorrowISO]);

  const timeForUs = useMemo(() => {
    const explicit = dayEvents.find((e) => e.category === "freizeit" && e.assignee === "gemeinsam");
    if (explicit) {
      return { label: explicit.startTime, subtitle: explicit.notes ?? "Der Abend gehört euch" };
    }
    const timed = dayEvents.filter((e) => !e.allDay && e.endTime);
    if (timed.length === 0) return { label: "19:00", subtitle: "Der Abend gehört euch" };
    const lastEnd = timed.reduce((max, e) => (e.endTime! > max ? e.endTime! : max), "00:00");
    const start = lastEnd > "18:00" ? lastEnd : "18:00";
    return { label: start, subtitle: "Der Abend gehört euch" };
  }, [dayEvents]);

  function selectDate(date: Date) {
    setSelectedDate(date);
  }

  function swipeWeek(dir: 1 | -1) {
    setWeekStart((prev) => addDays(prev, dir * 7));
  }

  const activeName = PROFILES[preferences.activeProfile].name;

  // Always the real "today" (Europe/Berlin), never `selectedISO` — the
  // week-strip's selected day must never leak into the briefing (spec §7).
  const briefingData = useMemo(
    () =>
      computeDailyBriefing({
        events,
        tasks,
        personId: preferences.activeProfile,
        includeShared: preferences.dailyBriefing.includeShared,
        includePersonal: preferences.dailyBriefing.includePersonal,
      }),
    [events, tasks, preferences.activeProfile, preferences.dailyBriefing.includeShared, preferences.dailyBriefing.includePersonal],
  );

  return (
    <div>
      <Greeting name={activeName} date={selectedDate} animate={splashDone} />
      <WeekStrip
        weekStart={weekStart}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onSwipeWeek={swipeWeek}
        events={weekEvents}
        animate={splashDone}
      />
      <TimeForUsCard startLabel={timeForUs.label} subtitle={timeForUs.subtitle} animate={splashDone} />
      <TodaySummaryCard data={briefingData} onOpen={openDailyBriefing} animate={splashDone} />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={selectedISO}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.24, ease: "easeOut" }}
        >
          {dayEvents.length === 0 ? (
            <div className="mt-7">
              <EmptyState
                icon={CalendarX}
                title="Noch nichts geplant"
                description="Für diesen Tag stehen keine Termine an."
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
                  <EventSummaryRow event={nextEvent} />
                </section>
              )}
              {restEvents.length > 0 && (
                <section className="mt-7">
                  <h2 className="mb-3 text-[17px] font-bold" style={{ color: "var(--dl-text)" }}>
                    Weitere Termine
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {restEvents.map((event, i) => (
                      <EventSummaryRow key={event.id} event={event} index={i} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <TomorrowPreview event={tomorrowEvent} />
    </div>
  );
}
