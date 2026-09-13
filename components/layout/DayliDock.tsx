"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronUp, House, ListChecks, NotebookText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DockNavigationItem } from "@/components/layout/DockNavigationItem";
import { DayliActionOrb } from "@/components/layout/DayliActionOrb";
import { DockBackdrop } from "@/components/layout/DockBackdrop";
import { QuickCreateMenu } from "@/components/sheets/QuickCreateMenu";
import { useSheet } from "@/lib/store/sheet-context";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

interface DockItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: DockItem[] = [
  { id: "heute", href: "/", label: "Heute", icon: House },
  { id: "kalender", href: "/kalender", label: "Kalender", icon: CalendarDays },
  { id: "aufgaben", href: "/aufgaben", label: "Aufgaben", icon: ListChecks },
  { id: "notizen", href: "/mehr/notizen", label: "Notizen", icon: NotebookText },
];

// Visual position within the dock, expressed as flex `order` — the orb
// always sits at 2, the active item always lands just left of it at 1, and
// the remaining items keep their original relative order to its right.
const ORB_ORDER = 2;

function matchesRoute(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Dayli Dock — the mobile navigation capsule. It stays collapsed behind a
 * small edge tab (fixed on the screen's right side, out of the way of
 * scrolling/reading content) and only expands into the full capsule while
 * `navOpen`, closing again on its own once a route change confirms the tap
 * did what it was for — so the nav is never sitting over content that
 * doesn't need it. The edge tab itself renders on every route (including
 * /mehr and its subpages) so "Heute" is always reachable from anywhere in
 * the app. `active` is a pure styling flag (true only on the known tabs' own
 * routes, so the app never implies you're on a page you're not); the left
 * slot next to the orb defaults to "heute" for visual balance whenever
 * nothing is truly active.
 *
 * All destinations stay mounted as stable flex siblings at all times —
 * switching the active/left-slot one only changes size/style and CSS
 * `order`, never which component instance holds which slot — so the
 * transition between "wide active capsule" and "compact icon" is a single
 * continuous `layout` FLIP instead of an unmount/remount across two
 * separate render slots (which briefly produced a blank, mispositioned
 * capsule).
 */
export function DayliDock() {
  const pathname = usePathname();
  const { sheet, openQuickCreateMenu, close } = useSheet();
  const quickCreateOpen = sheet?.kind === "quickCreate";
  const reducedMotion = useReducedMotion();
  const [navOpen, setNavOpen] = useState(false);

  const activeId = ITEMS.find((item) => matchesRoute(pathname, item.href))?.id ?? null;
  const leftSlotId = activeId ?? "heute";

  function closeAll() {
    setNavOpen(false);
    close();
  }

  // Auto-hide the dock again the moment a destination actually changes the
  // route — covers both a tap on a nav item and any other navigation (back
  // button, a link elsewhere) — so it never lingers open once it's served
  // its purpose.
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setNavOpen(false);
    }
  }, [pathname]);

  return (
    <>
      <DockBackdrop show={navOpen || quickCreateOpen} onClose={closeAll} />

      {/* The only permanently visible piece of the mobile navigation — a
          small tab on the screen's edge, out of the way of everything else,
          that reveals the full dock on demand instead of the dock floating
          over content at all times. */}
      <button
        type="button"
        onClick={() => (navOpen ? closeAll() : setNavOpen(true))}
        aria-label={navOpen ? "Navigation schließen" : "Navigation öffnen"}
        aria-expanded={navOpen}
        className="fixed right-0 top-1/2 z-50 flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-l-2xl md:hidden"
        style={{
          background: "rgba(9, 16, 46, 0.96)",
          border: "1px solid rgba(150, 166, 215, 0.25)",
          borderRight: "none",
          boxShadow: "-6px 0 20px rgba(0, 0, 0, 0.28)",
        }}
      >
        <ChevronUp
          size={15}
          aria-hidden
          style={{
            color: "#9da8c8",
            transform: navOpen ? "rotate(180deg)" : "none",
            transition: reducedMotion ? undefined : "transform 0.2s ease",
          }}
        />
      </button>

      <AnimatePresence>
        {navOpen && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 z-40 flex justify-center px-4 md:hidden"
            style={{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px) + var(--dl-vv-bottom-gap, 0px))" }}
          >
            <nav
              aria-label="Hauptnavigation"
              className="relative flex w-full max-w-[460px] items-center gap-1 px-3"
              style={{
                height: 76,
                borderRadius: 34,
                background: "rgba(9, 16, 46, 0.96)",
                border: "1px solid rgba(150, 166, 215, 0.25)",
                boxShadow: "0 18px 50px rgba(0, 0, 0, 0.32), 0 0 30px rgba(112, 78, 232, 0.06)",
              }}
            >
              {ITEMS.map((item, index) => (
                <DockNavigationItem
                  key={item.id}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={item.id === activeId}
                  order={item.id === leftSlotId ? 1 : 3 + index}
                />
              ))}

              <div className="relative shrink-0" style={{ order: ORB_ORDER, marginInline: "auto" }}>
                <AnimatePresence>{quickCreateOpen && <QuickCreateMenu onClose={close} />}</AnimatePresence>
                <DayliActionOrb
                  open={quickCreateOpen}
                  onToggle={() => (quickCreateOpen ? close() : openQuickCreateMenu())}
                />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
