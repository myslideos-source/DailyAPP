"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { CalendarPlus, ListPlus, BellPlus, ShoppingBasket, Cake } from "lucide-react";

export type QuickAddKind = "task" | "reminder" | "shopping" | "birthday";

const OPTIONS: { kind: QuickAddKind; label: string; icon: typeof CalendarPlus; color: string }[] = [
  { kind: "task", label: "Aufgabe", icon: ListPlus, color: "var(--dl-domenico)" },
  { kind: "reminder", label: "Erinnerung", icon: BellPlus, color: "var(--dl-elisabeth)" },
  { kind: "shopping", label: "Einkauf", icon: ShoppingBasket, color: "var(--dl-domenico)" },
  { kind: "birthday", label: "Geburtstag", icon: Cake, color: "var(--dl-elisabeth)" },
];

export function QuickAddMenu({
  open,
  onClose,
  onSelect,
  onNewEvent,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (kind: QuickAddKind) => void;
  onNewEvent: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Neu erstellen">
      <div className="grid grid-cols-3 gap-3 pb-2 pt-1 sm:grid-cols-6">
        <button
          type="button"
          onClick={onNewEvent}
          className="flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 transition-colors active:bg-white/5"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--dl-together) 16%, transparent)" }}
          >
            <CalendarPlus size={20} strokeWidth={1.8} style={{ color: "var(--dl-together)" }} />
          </span>
          <span className="text-[12.5px] font-medium" style={{ color: "var(--dl-text)" }}>
            Termin
          </span>
        </button>

        {OPTIONS.map((opt) => (
          <button
            key={opt.kind}
            type="button"
            onClick={() => onSelect(opt.kind)}
            className="flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 transition-colors active:bg-white/5"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, " + opt.color + " 16%, transparent)" }}
            >
              <opt.icon size={20} strokeWidth={1.8} style={{ color: opt.color }} />
            </span>
            <span className="text-[12.5px] font-medium" style={{ color: "var(--dl-text)" }}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
