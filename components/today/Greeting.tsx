"use client";

import { motion } from "motion/react";
import { formatLongDate } from "@/lib/date-utils";
import { revealVariants } from "@/lib/motion-variants";

function timeGreeting(hour: number) {
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  if (hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

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
        {timeGreeting(new Date().getHours())}, {name}
      </p>
      <h1 className="text-[26px] font-bold leading-tight" style={{ color: "var(--dl-text)" }}>
        {formatLongDate(date)}
      </h1>
    </motion.div>
  );
}
