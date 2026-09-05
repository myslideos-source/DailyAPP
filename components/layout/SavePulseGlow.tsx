"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useSavePulse } from "@/lib/store/save-pulse-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/** Drives the "Lichtimpuls beim Speichern" reaction on the central plus
 * button: a brief scale dip and a single cyan-rosé light sweep, played
 * once per successful save (never on error, never looping — spec 10.5).
 * Renders a light-sweep overlay to place inside the button and returns the
 * `scale` value the button itself should animate to. */
export function useSavePulseScale() {
  const { pulseCount } = useSavePulse();
  const [pulsing, setPulsing] = useState(false);

  // Reacts to an external signal (a save completing elsewhere in the app),
  // not to be confused with a one-time mount effect this rule usually flags.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pulseCount === 0) return;
    setPulsing(true);
    const timeout = window.setTimeout(() => setPulsing(false), 260);
    return () => window.clearTimeout(timeout);
  }, [pulseCount]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return pulsing ? 0.96 : 1;
}

export function SavePulseSweep() {
  const { pulseCount } = useSavePulse();
  const reducedMotion = useReducedMotion();

  if (pulseCount === 0 || reducedMotion) return null;

  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
      <motion.span
        key={pulseCount}
        className="absolute inset-y-0 w-1/3 -skew-x-12"
        style={{ background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.6), transparent)" }}
        initial={{ x: "-140%" }}
        animate={{ x: "240%" }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      />
    </span>
  );
}
