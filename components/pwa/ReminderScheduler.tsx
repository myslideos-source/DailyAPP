"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useReminderScheduler, useTaskReminderScheduler } from "@/lib/hooks/useReminderScheduler";
import { fireNotification, useNotificationPermission } from "@/lib/hooks/useNotificationPermission";
import { buildEventReminderMessage, buildTaskReminderMessage } from "@/lib/reminder-messages";

/** Mounted once at the app root — checks upcoming events and tasks with a
 * reminder set roughly every 30s while this tab is open, and surfaces due
 * ones as a toast, a bell notification, and (with permission) a real OS
 * notification. In Supabase mode this is a foreground-only complement to
 * the real background push pipeline (see /mehr/erinnerungen); in demo mode
 * it's the only delivery path there is. */
export function ReminderScheduler() {
  const { events, tasks, ready, addLocalNotification, showToast } = useAppStore();
  const { permission } = useNotificationPermission();

  const onEventDue = useCallback(
    (event: (typeof events)[number]) => {
      const openPrepCount = tasks.filter((t) => t.linkedEventId === event.id && !t.done).length;
      const title = `Erinnerung: ${event.title}`;
      const body = buildEventReminderMessage(event, openPrepCount);

      addLocalNotification({ title, body });
      showToast(title);
      if (permission === "granted") {
        void fireNotification(title, { body, tag: event.id });
      }
    },
    [tasks, addLocalNotification, showToast, permission],
  );

  const onTaskDue = useCallback(
    (task: (typeof tasks)[number]) => {
      const linkedEvent = task.linkedEventId ? events.find((e) => e.id === task.linkedEventId) : null;
      const title = `Erinnerung: ${task.title}`;
      const body = buildTaskReminderMessage(task, linkedEvent);

      addLocalNotification({ title, body });
      showToast(title);
      if (permission === "granted") {
        void fireNotification(title, { body, tag: task.id });
      }
    },
    [events, addLocalNotification, showToast, permission],
  );

  useReminderScheduler(events, ready, onEventDue);
  useTaskReminderScheduler(tasks, ready, onTaskDue);

  return null;
}
