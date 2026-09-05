import type { Variants } from "motion/react";

/** Staggered "settle into place" entrance used across Heute and list views. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/** Cyan (Domenico) + rosé (Elisabeth) briefly meeting in the middle as
 * lavender — dayli's "gemeinsamer Termin" motif (spec 10.1). Plays once on
 * appearance or when the participants change; never loops. Apply to a
 * `borderColor`/`background` animate prop only when assignee === "gemeinsam"
 * — solo assignees should just use their plain color with no animation. */
export const TOGETHER_MERGE_KEYFRAMES = ["var(--dl-domenico)", "var(--dl-elisabeth)", "var(--dl-together)"];
export const TOGETHER_MERGE_TRANSITION = { duration: 0.75, times: [0, 0.55, 1], ease: "easeInOut" as const };
