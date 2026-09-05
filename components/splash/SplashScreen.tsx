"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useSplash } from "@/lib/store/splash-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useAppStore } from "@/lib/store/app-store";

const FIRST_RUN_MS = 1700;
const RETURN_MS = 650;

export function SplashScreen() {
  const { splashDone, isReturningVisit, finishSplash } = useSplash();
  const reducedMotion = useReducedMotion();
  const { ready: dataReady } = useAppStore();
  const [visible, setVisible] = useState(true);
  const [errored, setErrored] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const duration = isReturningVisit || reducedMotion ? RETURN_MS : FIRST_RUN_MS;

  useEffect(() => {
    if (!dataReady) {
      // Local data should hydrate almost instantly; if it genuinely stalls
      // (corrupt storage, a future remote data source down) don't spin forever.
      const stuck = window.setTimeout(() => setErrored(true), 6000);
      return () => window.clearTimeout(stuck);
    }

    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      // Let the exit / shared layout transition play before unmounting for good.
      window.setTimeout(finishSplash, reducedMotion ? 50 : 520);
    }, duration);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [dataReady, duration, finishSplash, reducedMotion]);

  if (splashDone) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "var(--dl-bg)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.05 : 0.45, ease: "easeInOut" }}
        >
          {/* Ambient glow — a calm, single soft halo behind the logo, no
              decorative motifs. */}
          {!reducedMotion && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute h-[380px] w-[380px] rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              style={{
                background:
                  "radial-gradient(circle, rgba(149,101,245,0.28), rgba(72,222,244,0.1) 45%, transparent 68%)",
                filter: "blur(26px)",
              }}
            />
          )}

          <div className="relative flex flex-col items-center gap-6">
            <div className="relative flex h-[100px] w-[220px] items-center justify-center">
              {/* shared-layout target for the header logo */}
              <motion.div
                layoutId={reducedMotion ? undefined : "dayli-logo"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  layout: { type: "spring", stiffness: 210, damping: 24 },
                  opacity: { duration: 0.5, ease: "easeOut" },
                  scale: { type: "spring", stiffness: 190, damping: 18 },
                }}
                className="relative h-16 w-[152px]"
              >
                <Image src="/brand/logo.png" alt="dayli" fill priority sizes="152px" className="object-contain" />
              </motion.div>
            </div>

            {/* Loading indicator */}
            {!isReturningVisit && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reducedMotion ? 0 : 0.5, duration: 0.4 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="h-[3px] w-32 overflow-hidden rounded-full" style={{ background: "rgba(246,240,234,0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, var(--dl-domenico), var(--dl-elisabeth))",
                    }}
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      duration: reducedMotion ? 0.6 : 1.1,
                      repeat: reducedMotion ? 0 : Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
                {!errored ? (
                  <p className="text-[12.5px]" style={{ color: "var(--dl-text-faint)" }}>
                    Euer Tag wird vorbereitet …
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setErrored(false);
                      finishSplash();
                    }}
                    className="text-[12.5px] underline"
                    style={{ color: "var(--dl-text-dim)" }}
                  >
                    Erneut versuchen
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Signature line */}
          <motion.p
            className="absolute bottom-10 text-[12px]"
            style={{ color: "var(--dl-text-faint)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.6, duration: 0.4 }}
          >
            made by Domenico
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
