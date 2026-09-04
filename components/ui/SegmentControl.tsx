"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface Segment<T extends string> {
  value: T;
  label: string;
}

export function SegmentControl<T extends string>({
  segments,
  value,
  onChange,
  className,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "relative flex rounded-full border p-1",
        className,
      )}
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      {segments.map((seg) => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(seg.value)}
            className={cn(
              "relative z-10 flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors min-h-[36px]",
              isActive ? "text-[var(--dl-bg)]" : "text-[var(--dl-text-dim)]",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="segment-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
                }}
              />
            )}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
