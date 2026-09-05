"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/** The dayli-Dock's central brand action — the colored dot from the "i" in
 * the wordmark, ringed by a thin open arc, rather than a generic plus
 * button. Opens/closes the quick-create popover. */
export function DayliActionOrb({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={open ? "Schnellmenü schließen" : "Neuen Inhalt erstellen"}
      className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center"
      animate={{ y: open && !reducedMotion ? -5 : 0 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg aria-hidden viewBox="0 0 58 58" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="dayli-dock-orb-arc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#48def4" />
            <stop offset="50%" stopColor="#9565f5" />
            <stop offset="100%" stopColor="#f05aa5" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="29"
          cy="29"
          r="25"
          fill="none"
          stroke="url(#dayli-dock-orb-arc)"
          strokeWidth="1.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDashoffset={0.25}
          initial={false}
          animate={{ strokeDasharray: open ? "0.82 1" : "0.68 1" }}
          transition={{ duration: reducedMotion ? 0.01 : 0.24, ease: "easeOut" }}
        />
      </svg>
      <span
        aria-hidden
        className="h-11 w-11 rounded-full transition-shadow duration-200"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #ff8dcb 0%, #b477f2 38%, #51dff4 72%, #f05aa5 100%)",
          boxShadow: open ? "0 6px 18px rgba(112, 78, 232, 0.35)" : "0 4px 12px rgba(112, 78, 232, 0.22)",
        }}
      />
    </motion.button>
  );
}
