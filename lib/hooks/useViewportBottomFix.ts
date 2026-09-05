"use client";

import { useEffect } from "react";

/**
 * iOS Safari/PWA cold-launch quirk: on first paint, `env(safe-area-inset-
 * bottom)` and the viewport used for `position: fixed` can briefly be
 * computed against a stale/settling browser-chrome state, so a bottom-
 * anchored fixed element (the Dayli Dock) renders too high with a gap
 * beneath it — until a scroll forces Safari to recompute layout and it
 * snaps into place. Pure CSS (`position: fixed`, `100dvh`,
 * `env(safe-area-inset-bottom)`) is the primary fix and is already in
 * place; this hook is the "clean fallback" for the residual timing bug —
 * it tracks the real gap between the layout viewport and
 * `visualViewport` (normally 0) and exposes it as `--dl-vv-bottom-gap`,
 * which the fixed nav adds on top of `env(safe-area-inset-bottom)`. No
 * timers, no scroll-to-correct, no negative offsets — just keeping one
 * CSS variable in sync with the platform's own viewport data.
 */
export function useViewportBottomFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const gap = Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop);
      document.documentElement.style.setProperty("--dl-vv-bottom-gap", `${gap}px`);
    }

    update();
    window.addEventListener("pageshow", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("pageshow", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
}
