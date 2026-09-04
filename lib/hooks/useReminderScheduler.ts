"use client";

import { useEffect, useRef } from "react";
import { addDays, addMinutes, isAfter, isBefore } from "date-fns";
import { expandEventOccurrences } from "@/lib/recurrence";
import { toISODate } from "@/lib/date-utils";
import type { CalendarEvent } from "@/lib/types";

const FIRED_KEY = "dayli:fired-reminders:v1";
const CHECK_INTERVAL_MS = 30_000;
const LATE_WINDOW_MINUTES = 5;

function loadFired(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FIRED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveFired(set: Set<string>) {
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify(Array.from(set).slice(-500)));
  } catch {
    // ignore
  }
}

/**
 * Polls upcoming (including recurrence-expanded) events with a reminder
 * set and calls `onDue` once per occurrence, right around its reminder
 * time — while this tab is open. There is no server component sending
 * these, so an event with the app fully closed on both phones will not
 * notify; see /mehr/erinnerungen for that caveat in the UI.
 */
export function useReminderScheduler(
  events: CalendarEvent[],
  enabled: boolean,
  onDue: (event: CalendarEvent, remindAt: Date) => void,
) {
  const eventsRef = useRef(events);
  const onDueRef = useRef(onDue);
  const firedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    onDueRef.current = onDue;
  }, [onDue]);

  useEffect(() => {
    if (!enabled) return;
    if (!firedRef.current) firedRef.current = loadFired();

    function check() {
      const now = new Date();
      const occurrences = expandEventOccurrences(
        eventsRef.current,
        toISODate(now),
        toISODate(addDays(now, 2)),
      );

      for (const event of occurrences) {
        if (event.allDay || !event.startTime || !event.reminderMinutesBefore) continue;

        const [hours, minutes] = event.startTime.split(":").map(Number);
        const eventStart = new Date(`${event.date}T00:00:00`);
        eventStart.setHours(hours, minutes, 0, 0);
        const remindAt = addMinutes(eventStart, -event.reminderMinutesBefore);

        if (isAfter(remindAt, now)) continue;
        if (isBefore(remindAt, addMinutes(now, -LATE_WINDOW_MINUTES))) continue;

        const key = `${event.id}:${event.date}:${event.reminderMinutesBefore}`;
        if (firedRef.current!.has(key)) continue;

        firedRef.current!.add(key);
        saveFired(firedRef.current!);
        onDueRef.current(event, remindAt);
      }
    }

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}
