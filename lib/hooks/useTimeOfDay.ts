"use client";

import { useEffect, useState } from "react";

export type TimeOfDay = "morgen" | "tag" | "abend" | "nacht";

const CHECK_INTERVAL_MS = 15 * 60_000;

function computeTimeOfDay(): TimeOfDay {
  // Europe/Berlin explicitly, regardless of device locale/timezone — the
  // spec ties this to dayli's home timezone, not wherever the phone thinks
  // it is.
  const hour = Number(
    new Intl.DateTimeFormat("de-DE", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }).format(
      new Date(),
    ),
  );
  if (hour >= 5 && hour < 11) return "morgen";
  if (hour >= 11 && hour < 17) return "tag";
  if (hour >= 17 && hour < 22) return "abend";
  return "nacht";
}

/** Drives the dayli logo's "sehr dezent" ambient-lighting shift across the
 * day (spec 10.7) — never the logo artwork itself, only a soft glow layer
 * behind it. Defaults to "tag" (the most neutral state) until the first
 * client-side check to avoid an SSR/client render mismatch. */
export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("tag");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTimeOfDay(computeTimeOfDay());
    const id = window.setInterval(() => setTimeOfDay(computeTimeOfDay()), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return timeOfDay;
}
