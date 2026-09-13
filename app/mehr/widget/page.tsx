"use client";

import { TriangleAlert } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { ToggleRow } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";

export default function WidgetSettingsPage() {
  const { preferences, updateWidgetPrivacySettings } = useAppStore();
  const { widgetPrivacy } = preferences;

  return (
    <div className="pt-3 pb-8">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        iPhone-Widget
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Steuert, was dayli auf dem Homescreen-Widget zeigt — das Widget kann auf einem entsperrten Gerät für
        andere sichtbar sein.
      </p>

      <div
        className="mb-4 flex items-start gap-3 rounded-[16px] border px-3.5 py-3"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
      >
        <TriangleAlert size={17} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-faint)" }} />
        <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
          Das echte Homescreen-Widget benötigt die native iOS-Hülle von dayli (WidgetKit) — diese Einstellungen
          gelten dafür, sobald sie installiert ist. Sie wirken sich nicht auf die Web-App selbst aus.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <ToggleRow
          label="Termintitel anzeigen"
          checked={widgetPrivacy.showEventTitle}
          onChange={(showEventTitle) => updateWidgetPrivacySettings({ showEventTitle })}
          disabled={widgetPrivacy.showTimeOnly}
        />
        <ToggleRow
          label="Nur Uhrzeit anzeigen"
          checked={widgetPrivacy.showTimeOnly}
          onChange={(showTimeOnly) => updateWidgetPrivacySettings({ showTimeOnly })}
        />
        <ToggleRow
          label="Aufgaben anzeigen"
          checked={widgetPrivacy.showTasks}
          onChange={(showTasks) => updateWidgetPrivacySettings({ showTasks })}
        />
        <ToggleRow
          label="Private Inhalte ausblenden"
          checked={widgetPrivacy.hidePrivateContent}
          onChange={(hidePrivateContent) => updateWidgetPrivacySettings({ hidePrivateContent })}
        />
      </div>
    </div>
  );
}
