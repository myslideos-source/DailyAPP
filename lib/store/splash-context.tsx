"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const SESSION_KEY = "dayli:splash-shown";

interface SplashContextValue {
  /** true once the header/content should render at full opacity */
  splashDone: boolean;
  /** false on the very first launch this session, true on every later mount */
  isReturningVisit: boolean;
  finishSplash: () => void;
}

const SplashContext = createContext<SplashContextValue | null>(null);

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);
  const [isReturningVisit, setIsReturningVisit] = useState(true);
  const checkedSession = useRef(false);

  // sessionStorage is client-only; this corrects the SSR-safe default of
  // "returning visit" immediately after mount so the long first-run splash
  // only ever plays once real session state is known. Guarded by a ref
  // since React's dev-mode StrictMode double-invokes this effect — without
  // the guard, the second invocation reads back the flag the first one just
  // wrote and flips isReturningVisit to the wrong value.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (checkedSession.current) return;
    checkedSession.current = true;
    try {
      const shown = window.sessionStorage.getItem(SESSION_KEY);
      setIsReturningVisit(Boolean(shown));
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      setIsReturningVisit(false);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const value = useMemo<SplashContextValue>(
    () => ({
      splashDone,
      isReturningVisit,
      finishSplash: () => setSplashDone(true),
    }),
    [splashDone, isReturningVisit],
  );

  return <SplashContext.Provider value={value}>{children}</SplashContext.Provider>;
}

export function useSplash() {
  const ctx = useContext(SplashContext);
  if (!ctx) throw new Error("useSplash must be used within SplashProvider");
  return ctx;
}
