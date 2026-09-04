"use client";

import { useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/store/app-store";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useReducedMotion() {
  const systemReduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const { preferences } = useAppStore();

  if (preferences.reducedMotionOverride !== null) {
    return preferences.reducedMotionOverride;
  }
  return systemReduced;
}
