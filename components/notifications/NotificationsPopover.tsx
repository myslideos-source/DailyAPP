"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { Bell, Calendar, CheckSquare, PiggyBank, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { relativeTimeFromNow } from "@/lib/date-utils";
import type { AppNotification, Assignee } from "@/lib/types";

// Notifications stay visible in the popover for a moment after opening even
// though they're marked read in the background — otherwise the list would
// visibly empty itself out from under the person still reading it. Tapping
// a single item, or "Alle gelesen", both skip this delay since the popover
// is closing (or fading that item) right away regardless.
const AUTO_READ_DELAY_MS = 1200;

function typeIcon(type: string | null | undefined): LucideIcon {
  switch (type) {
    case "event":
      return Calendar;
    case "task":
      return CheckSquare;
    case "milestone":
      return PiggyBank;
    default:
      return Sparkles;
  }
}

function dotColor(assignee: Assignee | null | undefined): string {
  if (assignee === "domenico") return "var(--dl-domenico)";
  if (assignee === "elisabeth") return "var(--dl-elisabeth)";
  if (assignee === "gemeinsam") return "var(--dl-violet)";
  return "color-mix(in srgb, var(--dl-together) 55%, var(--dl-domenico) 45%)";
}

interface NotificationRowProps {
  notification: AppNotification;
  icon: LucideIcon;
  onOpen: () => void;
}

function NotificationRow({ notification, icon: Icon, onOpen }: NotificationRowProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-2.5 rounded-[14px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-white/5 active:bg-white/10"
      >
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(140, 120, 255, 0.14)" }}
        >
          <Icon size={15} style={{ color: "var(--dl-text-dim)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: dotColor(notification.assignee) }}
            />
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
              {notification.title}
            </p>
          </div>
          <p className="mt-0.5 line-clamp-2 pl-3 text-[12.5px] leading-snug" style={{ color: "var(--dl-text-dim)" }}>
            {notification.body}
          </p>
          <p className="mt-1 pl-3 text-[11px]" style={{ color: "var(--dl-text-faint)" }}>
            {relativeTimeFromNow(notification.createdAt)}
          </p>
        </div>
      </button>
    </motion.li>
  );
}

export function NotificationsPopover({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const reducedMotion = useReducedMotion();
  const [snapshot, setSnapshot] = useState<AppNotification[]>([]);
  const [anchorRect, setAnchorRect] = useState<{ top: number; right: number; width: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Freezes the visible list at open time — see AUTO_READ_DELAY_MS above.
  // Only re-captured the next time the popover opens, never while it's
  // already open (so background auto-marking doesn't visibly shrink it).
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (!open) return;
    setSnapshot(notifications);
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) {
      const right = Math.max(16, window.innerWidth - rect.right);
      // Width is capped by whichever is smaller: the design's own max
      // (372px) or whatever actually fits between this right inset and a
      // 16px margin on the opposite side — otherwise a bell sitting near
      // the right edge would push the popover past the left edge instead
      // of just narrowing it.
      const width = Math.min(372, window.innerWidth - right - 16);
      setAnchorRect({ top: rect.bottom + 8, right, width });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open || snapshot.length === 0) return;
    const ids = snapshot.map((n) => n.id);
    const timer = window.setTimeout(() => {
      for (const id of ids) markNotificationRead(id);
    }, AUTO_READ_DELAY_MS);
    return () => window.clearTimeout(timer);
    // Only re-arms when a genuinely new snapshot is captured (open), not on
    // every store update — markNotificationRead itself is stable-enough for
    // this one-shot timer's purposes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, snapshot]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClickOutside = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    // A pushed history entry lets the iOS PWA back-gesture (and the
    // hardware/browser back button) close the popover instead of
    // navigating the app away from the current page.
    window.history.pushState({ dayliNotifications: true }, "");
    const onPopState = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.dayliNotifications) window.history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleOpenNotification(id: string) {
    markNotificationRead(id);
    onClose();
  }

  function handleMarkAllRead() {
    markAllNotificationsRead();
    setSnapshot([]);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && anchorRect && (
        <motion.div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label="Benachrichtigungen"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }}
          className="fixed z-50 flex flex-col overflow-hidden"
          style={{
            top: anchorRect.top,
            right: anchorRect.right,
            width: anchorRect.width,
            maxHeight: "56vh",
            borderRadius: "20px",
            border: "1px solid rgba(140, 120, 255, 0.32)",
            background: "rgba(18, 15, 38, 0.78)",
            backdropFilter: "blur(22px)",
            WebkitBackdropFilter: "blur(22px)",
            boxShadow: "0 22px 60px rgba(0, 0, 0, 0.45), 0 0 44px rgba(140, 100, 255, 0.16)",
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
            <h2 className="text-[14.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
              Benachrichtigungen
            </h2>
            {snapshot.length > 1 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[12.5px] font-semibold"
                style={{ color: "var(--dl-together)" }}
              >
                Alle gelesen
              </button>
            )}
          </div>
          <div className="overflow-y-auto px-2 pb-3">
            {snapshot.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell size={22} style={{ color: "var(--dl-text-faint)" }} />
                <p className="text-[13.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
                  Alles erledigt
                </p>
                <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
                  Du hast keine neuen Benachrichtigungen.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                <AnimatePresence initial={false}>
                  {snapshot.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      icon={typeIcon(n.type)}
                      onOpen={() => handleOpenNotification(n.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
