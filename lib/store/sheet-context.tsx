"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { QuickAddKind } from "@/components/sheets/QuickAddMenu";
import type { ParsedEventDraft } from "@/lib/nlp/parseEventText";

export type ActiveSheet =
  | { kind: "menu" }
  | { kind: "event"; date?: string; editEventId?: string }
  | { kind: "task" }
  | { kind: "reminder" }
  | { kind: "shopping" }
  | { kind: "birthday" }
  | { kind: "natural" }
  | { kind: "naturalPreview"; draft: ParsedEventDraft }
  | { kind: "notifications" }
  | null;

interface SheetContextValue {
  sheet: ActiveSheet;
  openQuickAddMenu: () => void;
  openNewEvent: (date?: string) => void;
  /** Always resolves the *base* event by id (never a recurrence-expanded
   * occurrence), so editing a future instance can never silently shift the
   * whole series' anchor date — see EventFormSheet. */
  openEditEvent: (eventId: string) => void;
  openQuickAdd: (kind: QuickAddKind) => void;
  /** Opens the "So habe ich deinen Termin verstanden" confirmation card
   * for a draft produced by the natural-language quick-add sheet. Nothing
   * is saved until the user confirms there. */
  openNaturalPreview: (draft: ParsedEventDraft) => void;
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
      openNewEvent: (date) => setSheet({ kind: "event", date }),
      openEditEvent: (eventId) => setSheet({ kind: "event", editEventId: eventId }),
      openQuickAdd: (kind) => setSheet({ kind }),
      openNaturalPreview: (draft) => setSheet({ kind: "naturalPreview", draft }),
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
