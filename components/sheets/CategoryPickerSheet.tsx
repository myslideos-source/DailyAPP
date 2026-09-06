"use client";

import { Check, CircleSlash } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppStore } from "@/lib/store/app-store";
import { iconByName } from "@/lib/theme";
import type { EventCategory } from "@/lib/types";

/** Compact category picker — a quick, single-purpose selection, so it
 * stays a BottomSheet rather than a FullscreenPage (same distinction the
 * app already draws for the Dayli Dock's quick-create menu, confirm
 * dialogs, etc.). Reads from the store's dynamic category list (system +
 * custom) so a newly created category shows up here immediately. */
export function CategoryPickerSheet({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: EventCategory | null;
  onChange: (category: EventCategory | null) => void;
}) {
  const { categories } = useAppStore();

  return (
    <BottomSheet open={open} onClose={onClose} title="Kategorie">
      <div role="listbox" aria-label="Kategorie" className="flex flex-col gap-1 pb-2">
        <button
          type="button"
          role="option"
          aria-selected={value === null}
          onClick={() => {
            onChange(null);
            onClose();
          }}
          className="flex min-h-[52px] items-center gap-3 rounded-[14px] px-3 text-left transition-colors duration-150 hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10"
          style={value === null ? { background: "var(--dl-together-soft)" } : undefined}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background:
                value === null ? "color-mix(in srgb, var(--dl-together) 28%, transparent)" : "var(--dl-card-raised)",
            }}
          >
            <CircleSlash size={17} style={{ color: value === null ? "var(--dl-together)" : "var(--dl-text-dim)" }} />
          </span>
          <span className="flex-1 text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
            Keine Kategorie
          </span>
          {value === null && <Check size={18} style={{ color: "var(--dl-together)" }} />}
        </button>
        {categories.map((cat) => {
          const Icon = iconByName(cat.icon);
          const active = cat.key === value;
          return (
            <button
              key={cat.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                onChange(cat.key);
                onClose();
              }}
              className="flex min-h-[52px] items-center gap-3 rounded-[14px] px-3 text-left transition-colors duration-150 hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10"
              style={active ? { background: "var(--dl-together-soft)" } : undefined}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: active
                    ? "color-mix(in srgb, var(--dl-together) 28%, transparent)"
                    : "var(--dl-card-raised)",
                }}
              >
                <Icon size={17} style={{ color: active ? "var(--dl-together)" : (cat.color ?? "var(--dl-text-dim)") }} />
              </span>
              <span className="flex-1 text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
                {cat.label}
              </span>
              {active && <Check size={18} style={{ color: "var(--dl-together)" }} />}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
