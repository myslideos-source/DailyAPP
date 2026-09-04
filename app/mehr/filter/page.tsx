"use client";

import { Check } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { useAppStore } from "@/lib/store/app-store";
import { assigneeColor } from "@/lib/theme";
import type { Assignee } from "@/lib/types";

const OPTIONS: { value: Assignee[] | "alle"; label: string; description: string }[] = [
  { value: "alle", label: "Familie", description: "Alle Termine anzeigen" },
  { value: ["domenico"], label: "Domenico", description: "Nur Domenicos Termine" },
  { value: ["elisabeth"], label: "Elisabeth", description: "Nur Elisabeths Termine" },
  { value: ["gemeinsam"], label: "Gemeinsam", description: "Nur gemeinsame Termine" },
];

function same(a: Assignee[] | "alle", b: Assignee[] | "alle") {
  if (a === "alle" || b === "alle") return a === b;
  return a[0] === b[0];
}

export default function FilterPage() {
  const { preferences, setCalendarFilters, showToast } = useAppStore();

  return (
    <div className="pt-3">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Kalenderfilter
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Standardfilter, mit dem der Kalender geöffnet wird.
      </p>

      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((opt) => {
          const active = same(preferences.calendarFilters, opt.value);
          const color = opt.value === "alle" ? "var(--dl-together)" : assigneeColor(opt.value[0]);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                setCalendarFilters(opt.value);
                showToast("Filter gespeichert");
              }}
              className="flex min-h-[56px] items-center gap-3 rounded-[16px] border px-4 py-3 text-left"
              style={{
                borderColor: active ? color : "var(--dl-border)",
                background: active ? `color-mix(in srgb, ${color} 10%, var(--dl-card))` : "var(--dl-card)",
              }}
            >
              <div className="flex-1">
                <p className="text-[14.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
                  {opt.label}
                </p>
                <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
                  {opt.description}
                </p>
              </div>
              {active && <Check size={18} style={{ color }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
