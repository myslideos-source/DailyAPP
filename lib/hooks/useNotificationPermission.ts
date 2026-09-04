"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function useNotificationPermission() {
  const permission = useSyncExternalStore(subscribe, getSnapshot, () => "unsupported" as const);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    const result = await Notification.requestPermission();
    return result;
  }, []);

  return { permission, request };
}

export async function fireNotification(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    } catch {
      // fall through to the plain constructor below
    }
  }

  new Notification(title, options);
}
