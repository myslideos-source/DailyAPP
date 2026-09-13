"use client";

import { useEffect, useState } from "react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { FieldLabel, TextField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { parseEuroInputToCents } from "@/lib/hausbau";
import { toISODate } from "@/lib/date-utils";

/**
 * The "Grundeinrichtung" (first-time setup) and "Budget bearbeiten" form
 * are the same screen — spec §2/§7 never distinguishes them beyond when
 * they're shown (automatically once, vs. from the overview afterwards).
 */
export function HausbauBudgetFormSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hausbauBudget, saveHausbauBudget, showToast } = useAppStore();
  const isSetup = !hausbauBudget;

  const [projectName, setProjectName] = useState("Unser Hausbau");
  const [bankFinancing, setBankFinancing] = useState("");
  const [ownReserve, setOwnReserve] = useState("");
  const [emergencyReserve, setEmergencyReserve] = useState("");
  const [startDate, setStartDate] = useState(() => toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setProjectName(hausbauBudget?.projectName ?? "Unser Hausbau");
    setBankFinancing(hausbauBudget ? String(hausbauBudget.bankFinancingCents / 100).replace(".", ",") : "");
    setOwnReserve(hausbauBudget ? String(hausbauBudget.ownReserveCents / 100).replace(".", ",") : "");
    setEmergencyReserve(hausbauBudget ? String(hausbauBudget.emergencyReserveCents / 100).replace(".", ",") : "");
    setStartDate(hausbauBudget?.startDate ?? toISODate(new Date()));
    setError(null);
    setSaving(false);
  }, [open, hausbauBudget]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSave() {
    if (!projectName.trim()) {
      setError("Bitte gib einen Projektnamen ein.");
      return;
    }
    const bankCents = parseEuroInputToCents(bankFinancing || "0");
    const ownCents = parseEuroInputToCents(ownReserve || "0");
    const emergencyCents = parseEuroInputToCents(emergencyReserve || "0");
    if (bankCents === null || ownCents === null || emergencyCents === null) {
      setError("Bitte gib gültige, nicht-negative Beträge ein.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveHausbauBudget({
        projectName: projectName.trim(),
        bankFinancingCents: bankCents,
        ownReserveCents: ownCents,
        emergencyReserveCents: emergencyCents,
        startDate: startDate || null,
      });
      showToast(isSetup ? "Hausbau-Budget eingerichtet" : "Budget aktualisiert");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Budget konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title={isSetup ? "Hausbau einrichten" : "Budget bearbeiten"}
      leftAction={
        !isSetup && (
          <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
            Abbrechen
          </button>
        )
      }
      rightAction={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-[15px] font-semibold disabled:opacity-50"
          style={{ color: "var(--dl-together)" }}
        >
          Speichern
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        {isSetup && (
          <p className="text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
            Legt fest, welche Gesamtsumme die Bank übernimmt und wie viel ihr zusätzlich aus eigenen Mitteln
            einsetzt. Bankbudget, Eigenmittel und Eigenleistung werden danach immer getrennt berechnet.
          </p>
        )}

        <div>
          <FieldLabel>Projektname</FieldLabel>
          <TextField value={projectName} onChange={(e) => setProjectName(e.target.value)} autoFocus={isSetup} />
        </div>

        <div>
          <FieldLabel>Finanzierung der Bank (€)</FieldLabel>
          <TextField
            inputMode="decimal"
            value={bankFinancing}
            onChange={(e) => setBankFinancing(e.target.value)}
            placeholder="z. B. 300.000"
          />
        </div>

        <div>
          <FieldLabel>Eigene Rücklage für den Hausbau (€)</FieldLabel>
          <TextField
            inputMode="decimal"
            value={ownReserve}
            onChange={(e) => setOwnReserve(e.target.value)}
            placeholder="z. B. 30.000"
          />
        </div>

        <div>
          <FieldLabel>Notfallreserve (€, optional)</FieldLabel>
          <TextField
            inputMode="decimal"
            value={emergencyReserve}
            onChange={(e) => setEmergencyReserve(e.target.value)}
            placeholder="z. B. 5.000"
          />
          <p className="mt-1.5 text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
            Wird separat angezeigt, nicht automatisch zum verfügbaren Betrag addiert.
          </p>
        </div>

        <div>
          <FieldLabel>Startdatum</FieldLabel>
          <TextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}
      </div>
    </FullscreenPage>
  );
}
