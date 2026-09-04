"use client";

import { useMemo, useState } from "react";
import { addDays, addWeeks, startOfWeek } from "date-fns";
import { useAppStore } from "@/lib/store/app-store";
import { useSplash } from "@/lib/store/splash-context";
import { PROFILES } from "@/lib/demo-data";
import { toISODate } from "@/lib/date-utils";
import { expandEventOccurrences, expandEventsForDay } from "@/lib/recurrence";
import { Greeting } from "@/components/today/Greeting";
import { WeekStrip } from "@/components/today/WeekStrip";
import { TimeForUsCard } from "@/components/today/TimeForUsCard";
import { DayTimeline } from "@/components/today/DayTimeline";
import { TomorrowPreview } from "@/components/today/TomorrowPreview";

export default function HomePage() {
  const { events, preferences } = useAppStore();
  const { splashDone } = useSplash();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [direction, setDirection] = useState<1 | -1>(1);

  const selectedISO = toISODate(selectedDate);
  const tomorrowISO = toISODate(addDays(selectedDate, 1));

  const dayEvents = useMemo(() => expandEventsForDay(events, selectedISO), [events, selectedISO]);
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
    setDirection(date > selectedDate ? 1 : -1);
    setSelectedDate(date);
  }

  function swipeDay(dir: 1 | -1) {
    const next = addDays(selectedDate, dir);
    setDirection(dir);
    setSelectedDate(next);
    setWeekStart(startOfWeek(next, { weekStartsOn: 1 }));
  }

  function swipeWeek(dir: 1 | -1) {
    setWeekStart((prev) => addWeeks(prev, dir));
  }

  const activeName = PROFILES[preferences.activeProfile].name;

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
      <DayTimeline
        events={dayEvents}
        selectedDate={selectedDate}
        direction={direction}
        animate={splashDone}
        onSwipeDay={swipeDay}
      />
      <TomorrowPreview event={tomorrowEvent} />
    </div>
  );
}
