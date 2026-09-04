"use client";

import { forwardRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type SafeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface IconButtonProps extends SafeButtonProps {
  label: string;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, active, className, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full text-[var(--dl-text)] transition-colors",
        active ? "bg-white/10" : "hover:bg-white/5",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  ),
);
IconButton.displayName = "IconButton";
