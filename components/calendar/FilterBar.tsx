"use client";

import { Search, X } from "lucide-react";
import type { Assignee } from "@/lib/types";
import type { CalendarFilter } from "@/lib/calendar-filter";
import { assigneeColor } from "@/lib/theme";

const OPTIONS: { value: CalendarFilter; label: string }[] = [
  { value: "alle", label: "Familie" },
  { value: ["domenico"], label: "Domenico" },
  { value: ["elisabeth"], label: "Elisabeth" },
  { value: ["gemeinsam"], label: "Gemeinsam" },
];

function isActive(a: CalendarFilter, b: CalendarFilter) {
  if (a === "alle" || b === "alle") return a === b;
  return a[0] === b[0];
}

export function FilterBar({
  value,
  onChange,
  searchOpen,
  onToggleSearch,
}: {
  value: CalendarFilter;
  onChange: (v: CalendarFilter) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
}) {
  return (
    <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
      {OPTIONS.map((opt) => {
        const active = isActive(value, opt.value);
        const color = opt.value === "alle" ? "var(--dl-together)" : assigneeColor((opt.value as Assignee[])[0]);
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className="shrink-0 min-h-[36px] rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300"
            style={
              active
                ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }
                : { borderColor: "var(--dl-border)", color: "var(--dl-text-dim)" }
            }
          >
            {opt.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onToggleSearch}
        aria-label={searchOpen ? "Suche schließen" : "Suchen"}
        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300"
        style={{
          borderColor: searchOpen ? "var(--dl-together)" : "var(--dl-border)",
          color: searchOpen ? "var(--dl-together)" : "var(--dl-text-dim)",
        }}
      >
        {searchOpen ? <X size={16} /> : <Search size={16} />}
      </button>
    </div>
  );
}
