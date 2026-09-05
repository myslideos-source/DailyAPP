"use client";

import { useMemo } from "react";
import { addDays } from "date-fns";
import { Users } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { expandEventsForDay } from "@/lib/recurrence";
import { findSharedFreeSlots, type FreeSlot } from "@/lib/free-time";
import { toISODate, fromISODate, relativeDayLabel } from "@/lib/date-utils";

/** "Freie Zeit finden" — computes windows where neither Domenico nor
 * Elisabeth has anything on the calendar (today, tomorrow, the day after),
 * so a shared activity can be planned without a manual back-and-forth. */
export function FreeTimeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { events } = useAppStore();
  const { openNewEvent } = useSheet();

  const days = useMemo(() => {
    const today = new Date();
    return [0, 1, 2].map((offset) => toISODate(addDays(today, offset)));
  }, []);

  const slotsByDay = useMemo(() => {
    const expanded = days.flatMap((date) => expandEventsForDay(events, date));
    const slots = findSharedFreeSlots(expanded, days);
    const map = new Map<string, FreeSlot[]>();
    for (const date of days) map.set(date, []);
    for (const slot of slots) map.get(slot.date)?.push(slot);
    return map;
  }, [events, days]);

  function handlePick(date: string) {
    onClose();
    openNewEvent(date);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Freie Zeit finden">
      <div className="flex flex-col gap-5 pt-1">
        <p className="text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
          Gemeinsame freie Fenster zwischen 08:00 und 22:00 Uhr — Zeiten, in denen keiner von euch beiden etwas geplant hat.
        </p>

        {days.map((date) => {
          const slots = slotsByDay.get(date) ?? [];
          return (
            <div key={date}>
              <p className="mb-2 text-[15px] font-bold" style={{ color: "var(--dl-text)" }}>
                {relativeDayLabel(fromISODate(date))}
              </p>
              {slots.length === 0 ? (
                <p className="text-[13px]" style={{ color: "var(--dl-text-faint)" }}>
                  Kein gemeinsames Fenster gefunden.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePick(date)}
                      className="flex items-center justify-between rounded-[14px] border px-3.5 py-3 text-left transition-colors duration-150 active:bg-white/5"
                      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
                    >
                      <span className="flex items-center gap-2.5">
                        <Users size={16} style={{ color: "var(--dl-together)" }} />
                        <span className="text-[14.5px] font-medium" style={{ color: "var(--dl-text)" }}>
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </span>
                      <span className="text-[12.5px] font-semibold" style={{ color: "var(--dl-together)" }}>
                        Termin planen
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
