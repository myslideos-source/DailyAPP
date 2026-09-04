"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import type { QuickAddKind } from "@/components/sheets/QuickAddMenu";

export type ActiveSheet =
  | { kind: "menu" }
  | { kind: "event"; date?: string; editEvent?: CalendarEvent }
  | { kind: "task" }
  | { kind: "reminder" }
  | { kind: "shopping" }
  | { kind: "birthday" }
  | { kind: "notifications" }
  | null;

interface SheetContextValue {
  sheet: ActiveSheet;
  openQuickAddMenu: () => void;
  openNewEvent: (date?: string) => void;
  openEditEvent: (event: CalendarEvent) => void;
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
      openNewEvent: (date) => setSheet({ kind: "event", date }),
      openEditEvent: (event) => setSheet({ kind: "event", editEvent: event }),
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
