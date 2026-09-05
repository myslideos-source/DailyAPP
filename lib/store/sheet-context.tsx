"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { QuickAddKind } from "@/components/sheets/QuickAddMenu";

export type ActiveSheet =
  | { kind: "menu" }
  | { kind: "newEvent"; date?: string }
  | { kind: "newEventManual"; date?: string }
  | { kind: "event"; editEventId: string }
  | { kind: "task" }
  | { kind: "reminder" }
  | { kind: "shopping" }
  | { kind: "birthday" }
  | { kind: "notifications" }
  | null;

interface SheetContextValue {
  sheet: ActiveSheet;
  openQuickAddMenu: () => void;
  /** The default "Neuer Termin" flow: natural-language text/voice input
   * with live-recognized fields, per the current design. */
  openNewEvent: (date?: string) => void;
  /** Escape hatch to the full manual form (category, recurrence, notes,
   * attachment) — for cases the quick natural-language flow doesn't cover. */
  openManualNewEvent: (date?: string) => void;
  /** Always resolves the *base* event by id (never a recurrence-expanded
   * occurrence), so editing a future instance can never silently shift the
   * whole series' anchor date — see EventFormSheet. */
  openEditEvent: (eventId: string) => void;
  openQuickAdd: (kind: QuickAddKind) => void;
  openNotifications: () => void;
  close: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<ActiveSheet>(null);

  const value = useMemo<SheetContextValue>(
    () => ({
      sheet,
      openQuickAddMenu: () => setSheet({ kind: "menu" }),
      openNewEvent: (date) => setSheet({ kind: "newEvent", date }),
      openManualNewEvent: (date) => setSheet({ kind: "newEventManual", date }),
      openEditEvent: (eventId) => setSheet({ kind: "event", editEventId: eventId }),
      openQuickAdd: (kind) => setSheet({ kind }),
      openNotifications: () => setSheet({ kind: "notifications" }),
      close: () => setSheet(null),
    }),
    [sheet],
  );

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useSheet must be used within SheetProvider");
  return ctx;
}
