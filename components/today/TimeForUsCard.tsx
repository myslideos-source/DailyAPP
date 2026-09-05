"use client";

import { motion } from "motion/react";
import { PersonAvatar } from "@/components/ui/Avatar";
import { revealVariants } from "@/lib/motion-variants";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function TimeForUsCard({
  startLabel,
  subtitle,
  animate,
}: {
  startLabel: string | null;
  subtitle: string;
  animate: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      custom={2}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      variants={revealVariants}
      className="mt-5 overflow-hidden rounded-[var(--radius-xl)] border p-5"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <div className="relative flex items-center justify-between">
        <div className="relative z-10">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--dl-together)" }}
          >
            Zeit für uns
          </p>
          <p className="mt-1.5 text-[21px] font-bold" style={{ color: "var(--dl-text)" }}>
            {startLabel ? `Heute ab ${startLabel}` : "Heute noch offen"}
          </p>
          <p className="mt-0.5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
            {subtitle}
          </p>
          <div className="mt-3 flex -space-x-2">
            <PersonAvatar assignee="domenico" size="sm" />
            <PersonAvatar assignee="elisabeth" size="sm" />
          </div>
        </div>

        {/* Cyan (Domenico) and rosé (Elisabeth) drift toward each other once
            on appearance, with a soft lavender bloom where they meet — then
            the card goes still. No loop, no continuous motion (spec 10.6). */}
        <div className="relative h-24 w-28 shrink-0" aria-hidden>
          <motion.div
            className="absolute right-2 top-1 h-16 w-16 rounded-full"
            style={{ background: "radial-gradient(circle, var(--dl-domenico), transparent 72%)", opacity: 0.55 }}
            initial={reducedMotion ? { x: -8, y: 4 } : { x: -16, y: -6 }}
            animate={{ x: -8, y: 4 }}
            transition={{ duration: reducedMotion ? 0.01 : 1.4, ease: "easeOut" }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-16 w-16 rounded-full"
            style={{ background: "radial-gradient(circle, var(--dl-elisabeth), transparent 72%)", opacity: 0.55 }}
            initial={reducedMotion ? { x: 8, y: -4 } : { x: 18, y: 8 }}
            animate={{ x: 8, y: -4 }}
            transition={{ duration: reducedMotion ? 0.01 : 1.4, ease: "easeOut" }}
          />
          <motion.div
            className="absolute right-4 top-6 h-14 w-14 rounded-full"
            style={{ background: "radial-gradient(circle, var(--dl-together), transparent 72%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.7, delay: reducedMotion ? 0 : 1, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
