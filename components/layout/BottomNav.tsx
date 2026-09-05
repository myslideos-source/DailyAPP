"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarDays, ListChecks, MoreHorizontal, Plus, House } from "lucide-react";
import { SavePulseSweep, useSavePulseScale } from "@/components/layout/SavePulseGlow";

const ITEMS = [
  { href: "/", label: "Heute", icon: House },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
] as const;

const ITEMS_RIGHT = [
  { href: "/aufgaben", label: "Aufgaben", icon: ListChecks },
  { href: "/mehr", label: "Mehr", icon: MoreHorizontal },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 pt-1"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2 : 1.6}
        className="transition-colors duration-300"
        style={{ color: active ? "var(--dl-together)" : "var(--dl-text-dim)" }}
      />
      <span
        className="text-[10.5px] font-medium transition-colors duration-300"
        style={{ color: active ? "var(--dl-text)" : "var(--dl-text-faint)" }}
      >
        {label}
      </span>
      {active && (
        <motion.span
          layoutId="nav-indicator"
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="absolute bottom-0 h-1 w-1 rounded-full"
          style={{ background: "var(--dl-together)" }}
        />
      )}
    </Link>
  );
}

export function BottomNav({ onPlusClick }: { onPlusClick: () => void }) {
  const pathname = usePathname();
  const pulseScale = useSavePulseScale();

  return (
    <nav
      className="pb-safe-nav fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      style={{
        background: "rgba(23, 16, 29, 0.92)",
        borderColor: "var(--dl-border)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="mx-auto flex max-w-md items-center px-2 pt-1.5">
        {ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="flex flex-1 items-center justify-center">
          <motion.button
            type="button"
            aria-label="Neu erstellen"
            onClick={onPlusClick}
            whileTap={{ scale: 0.88 }}
            animate={{ scale: pulseScale }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
              boxShadow: "0 8px 22px rgba(180, 136, 232, 0.35)",
            }}
          >
            <SavePulseSweep />
            <Plus size={26} strokeWidth={2.2} color="var(--dl-bg)" />
          </motion.button>
        </div>

        {ITEMS_RIGHT.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </div>
    </nav>
  );
}

export function navItemsAll() {
  return [...ITEMS, ...ITEMS_RIGHT];
}
