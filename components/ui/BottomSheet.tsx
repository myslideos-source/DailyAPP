"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function BottomSheet({
  open,
  onClose,
  title,
  leftAction,
  rightAction,
  children,
  maxWidth = "480px",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Optional text-link style action in the header row, left of the title
   * (e.g. "Abbrechen"). Falls back to just the drag handle when omitted. */
  leftAction?: React.ReactNode;
  /** Optional text-link style action in the header row, right of the title
   * (e.g. "Speichern"). */
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            transition={
              reducedMotion
                ? { duration: 0.01 }
                : { type: "spring", stiffness: 380, damping: 38 }
            }
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-x sm:rounded-[28px] sm:border"
            style={{
              background: "var(--dl-aubergine)",
              borderColor: "var(--dl-border-strong)",
              maxWidth,
            }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div
                className="h-1.5 w-9 rounded-full"
                style={{ background: "var(--dl-border-strong)" }}
              />
            </div>
            {(title || leftAction || rightAction) && (
              <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
                <div className="min-h-[24px] min-w-[44px]">{leftAction}</div>
                {title && (
                  <h2 className="flex-1 truncate text-center text-[17px] font-semibold" style={{ color: "var(--dl-text)" }}>
                    {title}
                  </h2>
                )}
                <div className="min-h-[24px] min-w-[44px] text-right">{rightAction}</div>
              </div>
            )}
            <div className="safe-bottom overflow-x-hidden overflow-y-auto px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
