"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface SavePulseContextValue {
  /** Increments once per successful save from any quick-add sheet. 0 means
   * "nothing saved yet this session" — consumers should treat that as the
   * quiet/idle state and only animate on subsequent increments. */
  pulseCount: number;
  triggerSavePulse: () => void;
}

const SavePulseContext = createContext<SavePulseContextValue | null>(null);

/** Backs the "Lichtimpuls beim Speichern" motif (spec 10.5): the central
 * plus button reacts once, briefly, after any quick-add sheet saves
 * successfully — never on error, never as a loop. Kept as its own tiny
 * context rather than folded into the app store, since it's pure transient
 * UI signal with no persisted state. */
export function SavePulseProvider({ children }: { children: React.ReactNode }) {
  const [pulseCount, setPulseCount] = useState(0);
  const triggerSavePulse = useCallback(() => setPulseCount((c) => c + 1), []);
  const value = useMemo(() => ({ pulseCount, triggerSavePulse }), [pulseCount, triggerSavePulse]);
  return <SavePulseContext.Provider value={value}>{children}</SavePulseContext.Provider>;
}

export function useSavePulse() {
  const ctx = useContext(SavePulseContext);
  if (!ctx) throw new Error("useSavePulse must be used within SavePulseProvider");
  return ctx;
}
