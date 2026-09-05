"use client";

import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/** Minimal dimming behind the open quick-create popover — content stays
 * legible, no blur. Tapping it closes the menu, same as tapping outside a
 * native quick-actions sheet. */
export function DockBackdrop({ show, onClose }: { show: boolean; onClose: () => void }) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.2 }}
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(5, 9, 31, 0.35)" }}
        />
      )}
    </AnimatePresence>
  );
}
