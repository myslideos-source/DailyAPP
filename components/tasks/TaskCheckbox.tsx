"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function TaskCheckbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
      style={{
        borderColor: checked ? "var(--dl-success)" : "var(--dl-border-strong)",
        background: checked ? "color-mix(in srgb, var(--dl-success) 18%, transparent)" : "transparent",
      }}
    >
      <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden>
        <motion.path
          d="M1 5L4.5 8.5L12 1"
          stroke="var(--dl-success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.28, ease: "easeOut" }}
        />
      </svg>
    </button>
  );
}
