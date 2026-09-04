"use client";

import { BackLink } from "@/components/mehr/BackLink";
import { ToggleRow } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";

export default function DarstellungPage() {
  const { preferences, setReducedMotionOverride } = useAppStore();

  return (
    <div className="pt-3">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Darstellung
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        dayli ist bewusst als ruhiges, dunkles Erlebnis gestaltet.
      </p>

      <div
        className="rounded-[16px] border p-3.5"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
      >
        <ToggleRow
          label="Animationen reduzieren"
          checked={preferences.reducedMotionOverride === true}
          onChange={(checked) => setReducedMotionOverride(checked ? true : null)}
        />
        <p className="mt-2 text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
          Überschreibt die Systemeinstellung „Bewegung reduzieren“ nur innerhalb von dayli.
        </p>
      </div>
    </div>
  );
}
