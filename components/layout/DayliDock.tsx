"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { CalendarDays, House, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DockNavigationItem } from "@/components/layout/DockNavigationItem";
import { DayliActionOrb } from "@/components/layout/DayliActionOrb";
import { DockBackdrop } from "@/components/layout/DockBackdrop";
import { QuickCreateMenu } from "@/components/sheets/QuickCreateMenu";
import { useSheet } from "@/lib/store/sheet-context";

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
];

// Visual position within the dock, expressed as flex `order` — the orb
// always sits at 2, the active item always lands just left of it at 1, and
// the remaining two keep their original relative order to its right.
const ORB_ORDER = 2;

function matchesRoute(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Dayli Dock — the floating mobile navigation capsule. Only rendered on the
 * three main screens (Heute/Kalender/Aufgaben); returns null everywhere
 * else so it's automatically absent on detail pages, matching the spec's
 * "darf auf Detailseiten ausgeblendet werden".
 *
 * All three destinations stay mounted as stable flex siblings at all
 * times — switching the active one only changes size/style and CSS
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

  const activeId = ITEMS.find((item) => matchesRoute(pathname, item.href))?.id ?? null;
  if (!activeId) return null;

  return (
    <>
      <DockBackdrop show={quickCreateOpen} onClose={close} />
      <div
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
              order={item.id === activeId ? 1 : 3 + index}
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
      </div>
    </>
  );
}
