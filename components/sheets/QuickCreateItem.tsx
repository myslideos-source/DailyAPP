"use client";

import type { LucideIcon } from "lucide-react";

/** One row in the QuickCreateMenu — icon on the left as a small colored
 * accent, label to the right. The row itself stays neutral; only the small
 * icon badge carries color, per the "keine grell eingefärbten Zeilen"
 * requirement. */
export function QuickCreateItem({
  label,
  icon: Icon,
  iconBackground,
  iconColor,
  onSelect,
}: {
  label: string;
  icon: LucideIcon;
  iconBackground: string;
  iconColor: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex min-h-[54px] w-full items-center gap-3 rounded-[14px] px-3 text-left transition-colors duration-150 hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10"
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: iconBackground }}
      >
        <Icon size={18} strokeWidth={1.8} style={{ color: iconColor }} />
      </span>
      <span className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
        {label}
      </span>
    </button>
  );
}
