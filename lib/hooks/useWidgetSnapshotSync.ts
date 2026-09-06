"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { computeWidgetSnapshot } from "@/lib/widget-snapshot";
import { pushWidgetSnapshot } from "@/lib/native/widget-bridge";
import { PROFILES } from "@/lib/demo-data";

/**
 * Keeps the native iOS widget's shared snapshot in sync with the app's own
 * data — a no-op in the browser PWA (pushWidgetSnapshot bails out there).
 *
 * Deliberately reacts to `events`/`tasks`/`activeProfile`/`widgetPrivacy`
 * changing rather than wrapping every individual mutation (addEvent,
 * toggleTask, …) — the store already gives every one of those a new array
 * reference, so this effect re-fires after each of the mutations spec §12
 * lists (create/edit/delete event, create/complete/delete task, user
 * switch) without needing a call site at each one. A short debounce
 * collapses rapid-fire edits (e.g. checking off several tasks quickly)
 * into a single native write. The `visibilitychange` listener covers the
 * remaining trigger, "App aus dem Hintergrund öffnen".
 */
export function useWidgetSnapshotSync() {
  const { events, tasks, preferences, ready } = useAppStore();
  const debounceRef = useRef<number | null>(null);

  function sync() {
    const payload = computeWidgetSnapshot({
      events,
      tasks,
      personId: preferences.activeProfile,
      userName: PROFILES[preferences.activeProfile].name,
      privacy: preferences.widgetPrivacy,
    });
    void pushWidgetSnapshot(payload);
  }

  useEffect(() => {
    if (!ready) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(sync, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, events, tasks, preferences.activeProfile, preferences.widgetPrivacy]);

  useEffect(() => {
    if (!ready) return;
    function onVisible() {
      if (document.visibilityState === "visible") sync();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, events, tasks, preferences.activeProfile, preferences.widgetPrivacy]);
}
