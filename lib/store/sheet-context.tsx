"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { QuickAddKind } from "@/components/sheets/QuickAddMenu";

export type ActiveSheet =
  | { kind: "menu" }
  | { kind: "quickCreate" }
  | { kind: "newEvent"; date?: string }
  | { kind: "newEventManual"; date?: string }
  | { kind: "eventDetail"; eventId: string }
  | { kind: "eventEdit"; editEventId: string }
  | { kind: "task" }
  | { kind: "reminder" }
  | { kind: "shopping" }
  | { kind: "birthday" }
  | { kind: "freeTime" }
  | { kind: "noteEditor"; noteId: string }
  | { kind: "dailyBriefing" }
  | null;

interface SheetContextValue {
  sheet: ActiveSheet;
  openQuickAddMenu: () => void;
  /** The compact "Neu erstellen" popover anchored above the Dayli Dock's
   * brand orb on mobile — a leaner set of actions than the desktop grid
   * sheet (`openQuickAddMenu`), per the Dayli Dock spec. */
  openQuickCreateMenu: () => void;
  /** The default "Neuer Termin" flow: natural-language text/voice input
   * with live-recognized fields, per the current design. */
  openNewEvent: (date?: string) => void;
  /** Escape hatch to the full manual form (category, recurrence, notes,
   * attachment) — for cases the quick natural-language flow doesn't cover. */
  openManualNewEvent: (date?: string) => void;
  /** Opens the read-only event detail view — the default result of tapping
   * an event anywhere in the app. Always resolves the *base* event by id
   * (never a recurrence-expanded occurrence), so a future instance can
   * never silently shift the whole series' anchor date. */
  openEventDetail: (eventId: string) => void;
  /** Opens the edit form directly — reached only from the detail view's
   * pencil icon (or the manual-create escape hatch, which passes no id). */
  openEventEdit: (eventId: string) => void;
  openQuickAdd: (kind: QuickAddKind) => void;
  openFreeTime: () => void;
  openNoteEditor: (noteId: string) => void;
  openDailyBriefing: () => void;
  close: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<ActiveSheet>(null);

  const value = useMemo<SheetContextValue>(
    () => ({
      sheet,
      openQuickAddMenu: () => setSheet({ kind: "menu" }),
      openQuickCreateMenu: () => setSheet({ kind: "quickCreate" }),
      openNewEvent: (date) => setSheet({ kind: "newEvent", date }),
      openManualNewEvent: (date) => setSheet({ kind: "newEventManual", date }),
      openEventDetail: (eventId) => setSheet({ kind: "eventDetail", eventId }),
      openEventEdit: (eventId) => setSheet({ kind: "eventEdit", editEventId: eventId }),
      openQuickAdd: (kind) => setSheet({ kind }),
      openFreeTime: () => setSheet({ kind: "freeTime" }),
      openNoteEditor: (noteId) => setSheet({ kind: "noteEditor", noteId }),
      openDailyBriefing: () => setSheet({ kind: "dailyBriefing" }),
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
