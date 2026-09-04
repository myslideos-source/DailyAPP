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

        <div className="relative h-24 w-28 shrink-0" aria-hidden>
          <motion.div
            className="absolute right-4 top-1 h-16 w-16 rounded-full"
            style={{ background: "radial-gradient(circle, var(--dl-domenico), transparent 72%)", opacity: 0.55 }}
            animate={
              reducedMotion
                ? undefined
                : { x: [0, -6, 0], y: [0, 4, 0] }
            }
            transition={{ duration: 3.2, repeat: reducedMotion ? 0 : 2, repeatType: "mirror", ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-16 w-16 rounded-full"
            style={{ background: "radial-gradient(circle, var(--dl-elisabeth), transparent 72%)", opacity: 0.55 }}
            animate={
              reducedMotion
                ? undefined
                : { x: [0, 6, 0], y: [0, -4, 0] }
            }
            transition={{ duration: 3.2, repeat: reducedMotion ? 0 : 2, repeatType: "mirror", ease: "easeInOut", delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
