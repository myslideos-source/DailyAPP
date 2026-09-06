"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarDays, ListChecks, MoreHorizontal, NotebookText, Plus, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { SavePulseSweep, useSavePulseScale } from "@/components/layout/SavePulseGlow";

const ITEMS = [
  { href: "/", label: "Heute", icon: House },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/aufgaben", label: "Aufgaben", icon: ListChecks },
  { href: "/mehr/notizen", label: "Notizen", icon: NotebookText },
  { href: "/mehr", label: "Mehr", icon: MoreHorizontal },
] as const;

// Picks the most specific matching item (e.g. "/mehr/notizen" over "/mehr"
// when both would otherwise match via startsWith), so a sub-route pulled
// out into its own nav entry doesn't also highlight its parent.
function findActiveHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of ITEMS) {
    const matches = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    if (matches && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export function DesktopSidebar({ onPlusClick }: { onPlusClick: () => void }) {
  const pathname = usePathname();
  const pulseScale = useSavePulseScale();
  const activeHref = findActiveHref(pathname);

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r px-4 py-6 md:flex"
      style={{ borderColor: "var(--dl-border)" }}
    >
      <div>
        <div className="relative mb-8 ml-2 h-8 w-20">
          <Image src="/brand/logo.png" alt="dayli" fill sizes="80px" className="object-contain object-left" />
        </div>

        <nav className="flex flex-col gap-1">
          {ITEMS.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                  active ? "text-[var(--dl-text)]" : "text-[var(--dl-text-dim)] hover:text-[var(--dl-text)]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="desktop-nav-pill"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "var(--dl-card)" }}
                  />
                )}
                <item.icon size={19} strokeWidth={active ? 2 : 1.6} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <motion.button
        type="button"
        onClick={onPlusClick}
        animate={{ scale: pulseScale }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className="relative flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold shadow-lg"
        style={{
          background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
          color: "var(--dl-bg)",
        }}
      >
        <SavePulseSweep />
        <Plus size={18} strokeWidth={2.4} />
        Neu erstellen
      </motion.button>
    </aside>
  );
}
