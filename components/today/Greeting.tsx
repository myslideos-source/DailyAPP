"use client";

import { motion } from "motion/react";
import { formatLongDate, getBerlinParts } from "@/lib/date-utils";
import { greetingWordForHour } from "@/lib/briefing";
import { revealVariants } from "@/lib/motion-variants";

export function Greeting({
  name,
  date,
  animate,
}: {
  name: string;
  date: Date;
  animate: boolean;
}) {
  return (
    <motion.div
      custom={0}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      variants={revealVariants}
      className="pt-3"
    >
      <p className="text-[14.5px]" style={{ color: "var(--dl-text-dim)" }}>
        {greetingWordForHour(getBerlinParts().hour)}, {name}
      </p>
      <h1 className="text-[26px] font-bold leading-tight" style={{ color: "var(--dl-text)" }}>
        {formatLongDate(date)}
      </h1>
    </motion.div>
  );
}
