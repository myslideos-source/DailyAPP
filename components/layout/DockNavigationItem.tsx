"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import type { LucideIcon } from "lucide-react";

/** One destination in the Dayli Dock. The active destination renders as a
 * wide capsule with icon + label; the other two render as compact,
 * icon-only buttons. All three items stay mounted as stable flex siblings
 * at all times — only their CSS `order` and size change — so a route
 * change animates via a plain `layout` FLIP rather than an element
 * unmounting in one slot and remounting in another. */
export function DockNavigationItem({
  href,
  label,
  icon: Icon,
  active,
  order,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  order: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      layout
      transition={reducedMotion ? { duration: 0.01 } : { type: "spring", stiffness: 420, damping: 38 }}
      className="relative shrink-0"
      style={{ order }}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-label={`${label} öffnen`}
        className="flex items-center justify-center gap-2 rounded-full transition-colors duration-150"
        style={
          active
            ? {
                minWidth: 108,
                height: 52,
                paddingInline: 16,
                background: "linear-gradient(135deg, rgba(112, 78, 232, 0.30), rgba(149, 101, 245, 0.18))",
                border: "1px solid rgba(149, 101, 245, 0.34)",
              }
            : { height: 44, width: 44 }
        }
      >
        <Icon size={20} strokeWidth={active ? 2 : 1.7} style={{ color: active ? "var(--dl-text)" : "#9da8c8" }} />
        {active && (
          <span className="whitespace-nowrap text-[13.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
            {label}
          </span>
        )}
      </Link>
      {active && (
        <span
          aria-hidden
          className="absolute bottom-[7px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full"
          style={{ background: "var(--dl-together)" }}
        />
      )}
    </motion.div>
  );
}
