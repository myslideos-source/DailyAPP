"use client";

import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 60_000;

/** A value that changes once a minute (by default), purely to be listed as
 * a `useMemo`/`useEffect` dependency wherever a computation reads "now" (via
 * `getBerlinParts()`, `new Date()`, …) — without it such a memo only
 * recomputes when its *other* inputs change, so e.g. "upcoming events"
 * filtered by the current time silently keeps showing an event that has
 * already started/ended for as long as the events array itself doesn't
 * change (the tab was simply left open). Returns a plain counter, not a
 * `Date`, since callers only need a changing value, never its content. */
export function useNowTick(intervalMs = DEFAULT_INTERVAL_MS): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return tick;
}
