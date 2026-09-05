"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Sparkle, Check } from "lucide-react";
import { useSplash } from "@/lib/store/splash-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useAppStore } from "@/lib/store/app-store";

const FIRST_RUN_MS = 1700;
const RETURN_MS = 650;

// Small decorations twinkling around the orbit ring, one after another, in
// roughly the positions of the reference artwork (percentages of the
// 320×180 orbit box). Colors reuse the app's own Domenico/Elisabeth/together
// palette rather than inventing new ones.
const ORBIT_ICONS: {
  icon: typeof Heart;
  left: string;
  top: string;
  size: number;
  color: string;
  delay: number;
}[] = [
  { icon: Heart, left: "20%", top: "16%", size: 15, color: "var(--dl-elisabeth)", delay: 0.35 },
  { icon: Sparkle, left: "63%", top: "10%", size: 13, color: "var(--dl-together)", delay: 0.55 },
  { icon: Sparkle, left: "16%", top: "62%", size: 11, color: "var(--dl-domenico)", delay: 0.75 },
  { icon: Check, left: "76%", top: "70%", size: 14, color: "var(--dl-domenico)", delay: 0.95 },
];

const ORBIT_DOTS: { left: string; top: string; size: number; color: string; delay: number }[] = [
  { left: "88%", top: "36%", size: 6, color: "var(--dl-together)", delay: 0.65 },
  { left: "6%", top: "44%", size: 4, color: "var(--dl-elisabeth)", delay: 1.05 },
  { left: "84%", top: "12%", size: 5, color: "var(--dl-domenico)", delay: 0.45 },
];

export function SplashScreen() {
  const { splashDone, isReturningVisit, finishSplash } = useSplash();
  const reducedMotion = useReducedMotion();
  const { ready: dataReady } = useAppStore();
  const [visible, setVisible] = useState(true);
  const [errored, setErrored] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const duration = isReturningVisit || reducedMotion ? RETURN_MS : FIRST_RUN_MS;
  const showBrandBeats = !isReturningVisit && !reducedMotion;

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
          {/* Phase 1 — ambient glow, a tight saturated halo (not a wide, muddy
              blur) so it reads as a deliberate glow rather than a smudge. */}
          {!reducedMotion && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute h-[380px] w-[380px] rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              style={{
                background:
                  "radial-gradient(circle, rgba(180,136,232,0.4), rgba(99,216,244,0.14) 45%, transparent 68%)",
                filter: "blur(26px)",
              }}
            />
          )}

          <div className="relative flex flex-col items-center gap-6">
            {/* Phase 2 — orbit ring + twinkling cluster around the logo */}
            <div className="relative flex h-[180px] w-[320px] items-center justify-center">
              {showBrandBeats && (
                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: visible ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 320 180"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  >
                    <defs>
                      <linearGradient id="dl-orbit-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--dl-domenico)" />
                        <stop offset="50%" stopColor="var(--dl-together)" />
                        <stop offset="100%" stopColor="var(--dl-elisabeth)" />
                      </linearGradient>
                    </defs>
                    <motion.ellipse
                      cx="160"
                      cy="90"
                      rx="142"
                      ry="58"
                      transform="rotate(-16 160 90)"
                      fill="none"
                      stroke="url(#dl-orbit-gradient)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: [0, 0.9, 0.55] }}
                      transition={{
                        pathLength: { duration: 1.3, ease: "easeInOut", delay: 0.15 },
                        opacity: { duration: 1.6, times: [0, 0.6, 1], delay: 0.15 },
                      }}
                    />
                  </svg>

                  {ORBIT_ICONS.map(({ icon: Icon, left, top, size, color, delay }, i) => (
                    <motion.div
                      key={i}
                      aria-hidden
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left, top, color }}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: [0, 1, 0.5], scale: [0.4, 1.15, 0.9] }}
                      transition={{ duration: 0.65, ease: "easeOut", delay }}
                    >
                      <Icon size={size} fill={color} strokeWidth={Icon === Check ? 3 : 0} />
                    </motion.div>
                  ))}

                  {ORBIT_DOTS.map(({ left, top, size, color, delay }, i) => (
                    <motion.div
                      key={i}
                      aria-hidden
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left, top, width: size, height: size, background: color }}
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{ opacity: [0, 1, 0.4], scale: [0.3, 1.2, 0.8] }}
                      transition={{ duration: 0.6, ease: "easeOut", delay }}
                    />
                  ))}
                </motion.div>
              )}

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

          {/* Phase 4 — signature line, heart pulsing as the closing beat */}
          <div
            className="absolute bottom-10 flex items-center gap-1.5 text-[12px]"
            style={{ color: "var(--dl-text-faint)" }}
          >
            <span>made with</span>
            <motion.span
              className="inline-flex"
              style={{ color: "var(--dl-elisabeth)" }}
              initial={{ scale: 1 }}
              animate={showBrandBeats ? { scale: [1, 1.35, 1] } : undefined}
              transition={{
                duration: 0.9,
                ease: "easeInOut",
                delay: 1.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            >
              <Heart size={13} fill="var(--dl-elisabeth)" strokeWidth={0} />
            </motion.span>
            <span>by Domenico</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
