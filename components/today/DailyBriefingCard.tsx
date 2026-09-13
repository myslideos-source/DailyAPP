"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { Calendar, CheckSquare, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BriefingIcon, DailyBriefingData } from "@/lib/briefing";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

const HIGHLIGHT_ICONS: Record<BriefingIcon, LucideIcon> = {
  calendar: Calendar,
  tasks: CheckSquare,
  hausbau: Home,
};

/**
 * The floating "daily briefing" glass card — spec calls for a compact,
 * high-quality surface (not a technical system dialog, not a full-screen
 * form) that still lets the app's own atmospheric background show through.
 * Reuses NotificationsPopover's glass recipe (dark translucent navy +
 * strong backdrop blur) but centered, sized to ~85% of the viewport width,
 * and framed with a soft cyan/pink/violet ambient glow — the same
 * Domenico/Elisabeth/gemeinsam trio used by TimeForUsCard — instead of a
 * literal multi-color border line, which CSS can't render cleanly on a
 * rounded rect.
 */
export function DailyBriefingCard({
  open,
  data,
  onLater,
  onViewDay,
}: {
  open: boolean;
  data: DailyBriefingData;
  onLater: () => void;
  onViewDay: () => void;
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onLater]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Tagesbriefing"
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
          style={{ background: "rgba(5, 9, 31, 0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onLater();
          }}
        >
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full max-w-[380px] flex-col gap-4 p-5"
            style={{
              borderRadius: 24,
              border: "1px solid rgba(153, 169, 215, 0.28)",
              background: "rgba(11, 14, 34, 0.82)",
              backdropFilter: "blur(26px)",
              WebkitBackdropFilter: "blur(26px)",
              boxShadow:
                "0 24px 70px rgba(0, 0, 0, 0.5), 0 0 40px rgba(72, 222, 244, 0.10), 0 0 46px rgba(240, 90, 165, 0.10), 0 0 60px rgba(149, 101, 245, 0.16)",
            }}
          >
            <div>
              <p className="text-[14.5px] font-semibold" style={{ color: "var(--dl-text-dim)" }}>
                {data.greetingWord}, {data.name}
              </p>
              <h2 className="mt-0.5 text-[19px] font-bold" style={{ color: "var(--dl-text)" }}>
                {data.dateLabel}
              </h2>
            </div>

            <div className="flex flex-col gap-1">
              {data.summaryLines.map((line, i) => (
                <p key={i} className="text-[14px] leading-snug" style={{ color: "var(--dl-text)" }}>
                  {line}
                </p>
              ))}
            </div>

            {data.highlights.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                {data.highlights.map((h, i) => {
                  const Icon = HIGHLIGHT_ICONS[h.icon];
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(140, 120, 255, 0.14)" }}
                      >
                        <Icon size={14} style={{ color: "var(--dl-text-dim)" }} />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[13px]" style={{ color: "var(--dl-text)" }}>
                        {h.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onLater}
                className="flex-1 rounded-full border py-2.5 text-[13.5px] font-medium"
                style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
              >
                Später
              </button>
              <button
                type="button"
                onClick={onViewDay}
                className="flex-1 rounded-full py-2.5 text-[13.5px] font-semibold"
                style={{ background: "var(--dl-together)", color: "#fff" }}
              >
                Tag ansehen
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
