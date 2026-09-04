"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useReminderScheduler } from "@/lib/hooks/useReminderScheduler";
import { fireNotification, useNotificationPermission } from "@/lib/hooks/useNotificationPermission";
import { assigneeLabel } from "@/lib/theme";

/** Mounted once at the app root — checks upcoming events with a reminder
 * set roughly every 30s while this tab is open, and surfaces due ones as
 * a toast, a bell notification, and (with permission) a real OS
 * notification. See /mehr/erinnerungen for the background-delivery caveat. */
export function ReminderScheduler() {
  const { events, ready, addLocalNotification, showToast } = useAppStore();
  const { permission } = useNotificationPermission();

  const onDue = useCallback(
    (event: (typeof events)[number]) => {
      const title = event.title;
      const body = event.allDay
        ? "Heute · " + assigneeLabel(event.assignee)
        : `${event.startTime} Uhr · ${assigneeLabel(event.assignee)}`;

      addLocalNotification({ title: `Erinnerung: ${title}`, body });
      showToast(`Erinnerung: ${title}`);
      if (permission === "granted") {
        void fireNotification(`Erinnerung: ${title}`, { body, tag: event.id });
      }
    },
    [addLocalNotification, showToast, permission],
  );

  useReminderScheduler(events, ready, onDue);

  return null;
}
