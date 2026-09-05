"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/**
 * The single, central surface for every larger create/edit/detail/settings
 * view in dayli — a real full-screen page (the app's own atmospheric
 * background, no floating box, no rounded outer corners, no drag handle,
 * no dimmed/blurred/shrunk page behind it), not a bottom sheet. Small,
 * quick interactions (confirm delete, pick a color/time/date, a short
 * context menu) stay as compact sheets/popovers instead — see BottomSheet
 * and QuickCreateMenu.
 *
 * Shares its header API (leftAction/rightAction/title) with BottomSheet on
 * purpose, so a view can move between the two with a one-line swap.
 */
export function FullscreenPage({
  open,
  onClose,
  title,
  leftAction,
  rightAction,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Text-link style action in the header, left of the title (e.g.
   * "Abbrechen" or "Schließen"). */
  leftAction?: React.ReactNode;
  /** Text-link style action in the header, right of the title (e.g.
   * "Speichern"). */
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={reducedMotion ? { duration: 0.01 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="dl-atmosphere-bg fixed inset-0 z-50 flex flex-col"
        >
          <div className="dl-grain" aria-hidden />

          <div className="safe-top relative z-10 mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-5 pb-3 pt-4">
            <div className="min-h-[24px] min-w-[64px]">{leftAction}</div>
            {title && (
              <h1 className="flex-1 truncate text-center text-[17px] font-semibold" style={{ color: "var(--dl-text)" }}>
                {title}
              </h1>
            )}
            <div className="min-h-[24px] min-w-[64px] text-right">{rightAction}</div>
          </div>

          <div className="safe-bottom relative z-10 mx-auto w-full max-w-xl flex-1 overflow-y-auto px-5 pb-10">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
