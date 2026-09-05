"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, List, SquareCheck, Users } from "lucide-react";
import { QuickCreateItem } from "@/components/sheets/QuickCreateItem";
import { useSheet } from "@/lib/store/sheet-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/** The compact "Neu erstellen" popover that opens directly above the Dayli
 * Dock's brand orb. Deliberately a leaner set than the desktop grid sheet
 * (QuickAddMenu) — exactly the four actions from the Dayli Dock spec. */
export function QuickCreateMenu({ onClose }: { onClose: () => void }) {
  const reducedMotion = useReducedMotion();
  const { openNewEvent, openQuickAdd, openFreeTime } = useSheet();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSelect(action: () => void) {
    onClose();
    action();
  }

  return (
    <motion.div
      role="menu"
      aria-label="Neu erstellen"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
      transition={reducedMotion ? { duration: 0.05 } : { duration: 0.21, ease: [0.22, 1, 0.36, 1] }}
      style={{
        transformOrigin: "bottom center",
        background: "rgba(13, 21, 55, 0.98)",
        border: "1px solid rgba(149, 101, 245, 0.38)",
        boxShadow: "0 24px 70px rgba(0, 0, 0, 0.42), 0 0 28px rgba(112, 78, 232, 0.08)",
        borderRadius: 20,
      }}
      className="absolute bottom-full left-1/2 mb-3 w-[min(330px,calc(100vw-32px))] -translate-x-1/2 px-2 pb-2 pt-1"
    >
      <p className="px-3 pb-1 pt-2 text-[13px] font-semibold" style={{ color: "var(--dl-text-dim)" }}>
        Neu erstellen
      </p>
      <div className="flex flex-col">
        <QuickCreateItem
          label="Termin"
          icon={Calendar}
          iconBackground="color-mix(in srgb, var(--dl-together) 18%, transparent)"
          iconColor="var(--dl-together)"
          onSelect={() => handleSelect(() => openNewEvent())}
        />
        <QuickCreateItem
          label="Aufgabe"
          icon={SquareCheck}
          iconBackground="color-mix(in srgb, var(--dl-domenico) 18%, transparent)"
          iconColor="var(--dl-domenico)"
          onSelect={() => handleSelect(() => openQuickAdd("task"))}
        />
        <QuickCreateItem
          label="Liste"
          icon={List}
          iconBackground="color-mix(in srgb, var(--dl-elisabeth) 18%, transparent)"
          iconColor="var(--dl-elisabeth)"
          onSelect={() => handleSelect(() => openQuickAdd("shopping"))}
        />
        <QuickCreateItem
          label="Freie Zeit finden"
          icon={Users}
          iconBackground="linear-gradient(135deg, color-mix(in srgb, var(--dl-domenico) 24%, transparent), color-mix(in srgb, var(--dl-elisabeth) 24%, transparent))"
          iconColor="var(--dl-text)"
          onSelect={() => handleSelect(() => openFreeTime())}
        />
      </div>
      <span
        aria-hidden
        className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45"
        style={{
          background: "rgba(13, 21, 55, 0.98)",
          borderRight: "1px solid rgba(149, 101, 245, 0.38)",
          borderBottom: "1px solid rgba(149, 101, 245, 0.38)",
        }}
      />
    </motion.div>
  );
}
