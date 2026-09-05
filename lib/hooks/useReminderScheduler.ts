"use client";

import { useEffect, useRef } from "react";
import { addDays, addMinutes, isAfter, isBefore } from "date-fns";
import { expandEventOccurrences } from "@/lib/recurrence";
import { toISODate } from "@/lib/date-utils";
import { computeTaskRemindAt } from "@/lib/reminder-messages";
import type { CalendarEvent, TaskItem } from "@/lib/types";

const FIRED_KEY = "dayli:fired-reminders:v1";
const FIRED_TASKS_KEY = "dayli:fired-task-reminders:v1";
const CHECK_INTERVAL_MS = 30_000;
const LATE_WINDOW_MINUTES = 5;

function loadFired(storageKey: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveFired(storageKey: string, set: Set<string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(set).slice(-500)));
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
    if (!firedRef.current) firedRef.current = loadFired(FIRED_KEY);

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
        saveFired(FIRED_KEY, firedRef.current!);
        onDueRef.current(event, remindAt);
      }
    }

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}

/** Same polling scheme as useReminderScheduler, but for a task's own
 * reminderMinutesBefore/dueDate (e.g. a prep task's "am Tag vorher"
 * reminder) rather than an event's start time. */
export function useTaskReminderScheduler(
  tasks: TaskItem[],
  enabled: boolean,
  onDue: (task: TaskItem) => void,
) {
  const tasksRef = useRef(tasks);
  const onDueRef = useRef(onDue);
  const firedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    onDueRef.current = onDue;
  }, [onDue]);

  useEffect(() => {
    if (!enabled) return;
    if (!firedRef.current) firedRef.current = loadFired(FIRED_TASKS_KEY);

    function check() {
      const now = new Date();

      for (const task of tasksRef.current) {
        if (task.done || !task.dueDate || !task.reminderMinutesBefore) continue;

        const remindAt = computeTaskRemindAt(task.dueDate, task.reminderMinutesBefore);

        if (isAfter(remindAt, now)) continue;
        if (isBefore(remindAt, addMinutes(now, -LATE_WINDOW_MINUTES))) continue;

        const key = `${task.id}:${task.dueDate}:${task.reminderMinutesBefore}`;
        if (firedRef.current!.has(key)) continue;

        firedRef.current!.add(key);
        saveFired(FIRED_TASKS_KEY, firedRef.current!);
        onDueRef.current(task);
      }
    }

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}
