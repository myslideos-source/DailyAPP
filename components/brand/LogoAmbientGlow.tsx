"use client";

import { motion } from "motion/react";
import { useTimeOfDay, type TimeOfDay } from "@/lib/hooks/useTimeOfDay";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

const GLOW_BY_TIME: Record<TimeOfDay, { background: string; opacity: number }> = {
  morgen: { background: "radial-gradient(circle, var(--dl-domenico), transparent 70%)", opacity: 0.32 },
  tag: { background: "radial-gradient(circle, var(--dl-text-faint), transparent 70%)", opacity: 0.08 },
  abend: { background: "radial-gradient(circle, var(--dl-elisabeth), transparent 70%)", opacity: 0.26 },
  nacht: { background: "radial-gradient(circle, var(--dl-together), transparent 70%)", opacity: 0.1 },
};

/** A soft light layer behind the dayli logo that shifts with the time of
 * day (spec 10.7) — the logo image itself is never touched, this just sits
 * behind it via z-index and blurs outward. Meant to be felt more than
 * consciously noticed, so it never animates continuously, only cross-fades
 * on the rare occasion the time-of-day bucket changes. */
export function LogoAmbientGlow() {
  const timeOfDay = useTimeOfDay();
  const reducedMotion = useReducedMotion();
  const { background, opacity } = GLOW_BY_TIME[timeOfDay];

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -inset-3 -z-10 rounded-full blur-xl"
      initial={false}
      animate={{ background, opacity }}
      transition={{ duration: reducedMotion ? 0.01 : 1.2, ease: "easeInOut" }}
    />
  );
}
