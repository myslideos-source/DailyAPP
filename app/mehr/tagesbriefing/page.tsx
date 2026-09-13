"use client";

import { BackLink } from "@/components/mehr/BackLink";
import { ChipGroup, ToggleRow } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import type { DailyBriefingSettings } from "@/lib/types";

const FREQUENCY_OPTIONS: { value: DailyBriefingSettings["frequency"]; label: string }[] = [
  { value: "daily", label: "Täglich" },
  { value: "weekdays", label: "Nur werktags" },
];

export default function TagesbriefingSettingsPage() {
  const { preferences, updateDailyBriefingSettings } = useAppStore();
  const { dailyBriefing } = preferences;

  return (
    <div className="pt-3 pb-8">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Tagesbriefing
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Eine kurze, persönliche Zusammenfassung eures Tages — beim ersten Öffnen, oder jederzeit über das
        Briefing-Symbol oben.
      </p>

      <div className="flex flex-col gap-2.5">
        <ToggleRow
          label="Tagesbriefing aktivieren"
          checked={dailyBriefing.enabled}
          onChange={(enabled) => updateDailyBriefingSettings({ enabled })}
        />

        <ToggleRow
          label="Automatisch beim ersten Öffnen anzeigen"
          checked={dailyBriefing.autoShow}
          onChange={(autoShow) => updateDailyBriefingSettings({ autoShow })}
          disabled={!dailyBriefing.enabled}
        />

        <div>
          <p className="mb-1.5 text-[12.5px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
            Häufigkeit
          </p>
          <ChipGroup
            ariaLabel="Häufigkeit des Tagesbriefings"
            options={FREQUENCY_OPTIONS}
            value={dailyBriefing.frequency}
            onChange={(frequency) => updateDailyBriefingSettings({ frequency })}
          />
        </div>

        <p className="mb-0.5 mt-2 text-[12.5px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
          Inhalte
        </p>
        <ToggleRow
          label="Gemeinsame Inhalte berücksichtigen"
          checked={dailyBriefing.includeShared}
          onChange={(includeShared) => updateDailyBriefingSettings({ includeShared })}
        />
        <ToggleRow
          label="Persönliche Inhalte berücksichtigen"
          checked={dailyBriefing.includePersonal}
          onChange={(includePersonal) => updateDailyBriefingSettings({ includePersonal })}
        />
      </div>
    </div>
  );
}
