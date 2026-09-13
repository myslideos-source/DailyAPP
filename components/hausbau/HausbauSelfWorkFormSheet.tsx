"use client";

import { useEffect, useMemo, useState } from "react";
import { Paperclip, Trash2, X } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { FieldLabel, TextAreaField, TextField, ChipGroup } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { formatEuroCents, parseEuroInputToCents } from "@/lib/hausbau";
import { iconByName } from "@/lib/theme";
import type { HausbauPaymentSource } from "@/lib/types";

const SOURCE_OPTIONS: { value: HausbauPaymentSource; label: string }[] = [
  { value: "self", label: "Selbst bezahlt" },
  { value: "bank", label: "Bank" },
];

function toEuroString(cents: number): string {
  return cents === 0 ? "" : String(cents / 100).replace(".", ",");
}

export function HausbauSelfWorkFormSheet({ open, onClose, selfWorkId }: { open: boolean; onClose: () => void; selfWorkId?: string }) {
  const { hausbauSelfWork, hausbauCategories, addHausbauSelfWork, updateHausbauSelfWork, deleteHausbauSelfWork, uploadHausbauDocument, showToast } =
    useAppStore();
  const { openHausbauSelfWorkDetail } = useSheet();
  const editEntry = selfWorkId ? (hausbauSelfWork.find((e) => e.id === selfWorkId) ?? null) : null;
  const activeCategories = useMemo(() => hausbauCategories.filter((c) => c.isActive), [hausbauCategories]);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [estimated, setEstimated] = useState("");
  const [material, setMaterial] = useState("");
  const [external, setExternal] = useState("");
  const [hours, setHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [paymentSource, setPaymentSource] = useState<HausbauPaymentSource>("self");
  const [workDate, setWorkDate] = useState("");
  const [notes, setNotes] = useState("");
  const [documentPaths, setDocumentPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setTitle(editEntry?.title ?? "");
    setCategoryId(editEntry?.categoryId ?? activeCategories[0]?.id ?? null);
    setEstimated(editEntry ? toEuroString(editEntry.estimatedCompanyCostCents) : "");
    setMaterial(editEntry ? toEuroString(editEntry.actualMaterialCostCents) : "");
    setExternal(editEntry ? toEuroString(editEntry.additionalExternalCostCents) : "");
    setHours(editEntry?.hours != null ? String(editEntry.hours).replace(".", ",") : "");
    setHourlyRate(editEntry?.hourlyRateCents != null ? toEuroString(editEntry.hourlyRateCents) : "");
    setPaymentSource(editEntry?.paymentSource ?? "self");
    setWorkDate(editEntry?.workDate ?? "");
    setNotes(editEntry?.notes ?? "");
    setDocumentPaths(editEntry?.documentPaths ?? []);
    setError(null);
    setSaving(false);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selfWorkId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const previewSavings = useMemo(() => {
    const est = parseEuroInputToCents(estimated || "0") ?? 0;
    const mat = parseEuroInputToCents(material || "0") ?? 0;
    const ext = parseEuroInputToCents(external || "0") ?? 0;
    return Math.max(0, est - mat - ext);
  }, [estimated, material, external]);
  const hasSavings = previewSavings > 0;

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const path = await uploadHausbauDocument(file);
      setDocumentPaths((prev) => [...prev, path]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Datei konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Bitte gib eine Bezeichnung ein.");
      return;
    }
    const estimatedCents = parseEuroInputToCents(estimated || "0");
    const materialCents = parseEuroInputToCents(material || "0");
    const externalCents = parseEuroInputToCents(external || "0");
    const hourlyRateCents = hourlyRate ? parseEuroInputToCents(hourlyRate) : 0;
    if (estimatedCents === null || materialCents === null || externalCents === null || hourlyRateCents === null) {
      setError("Bitte gib gültige, nicht-negative Beträge ein.");
      return;
    }
    const hoursValue = hours ? Number(hours.replace(",", ".")) : null;
    if (hoursValue !== null && (!Number.isFinite(hoursValue) || hoursValue < 0)) {
      setError("Bitte gib eine gültige Stundenzahl ein.");
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      title: title.trim(),
      categoryId,
      estimatedCompanyCostCents: estimatedCents,
      actualMaterialCostCents: materialCents,
      additionalExternalCostCents: externalCents,
      hours: hoursValue,
      hourlyRateCents: hourlyRate ? hourlyRateCents : null,
      paymentSource,
      workDate: workDate || null,
      notes: notes.trim() || null,
      documentPaths,
    };
    try {
      if (editEntry) {
        updateHausbauSelfWork(editEntry.id, input);
        showToast("Eigenleistung aktualisiert");
        onClose();
        openHausbauSelfWorkDetail(editEntry.id);
      } else {
        const created = await addHausbauSelfWork(input);
        showToast(`„${created.title}“ erfasst`);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eigenleistung konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editEntry) return;
    deleteHausbauSelfWork(editEntry.id);
    showToast("Eigenleistung gelöscht");
    onClose();
  }

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title={editEntry ? "Eigenleistung bearbeiten" : "Eigenleistung hinzufügen"}
      leftAction={
        <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Abbrechen
        </button>
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
        <div>
          <FieldLabel>Bezeichnung</FieldLabel>
          <TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Trockenbau Dachgeschoss" autoFocus />
        </div>

        <div>
          <FieldLabel>Gewerk</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {activeCategories.map((cat) => {
              const Icon = iconByName(cat.icon);
              const active = cat.id === categoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors"
                  style={
                    active
                      ? { borderColor: "var(--dl-together)", background: "var(--dl-together-soft)", color: "var(--dl-together)" }
                      : { borderColor: "var(--dl-border)", color: "var(--dl-text-dim)" }
                  }
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Geschätzte Kosten bei Firma (€)</FieldLabel>
          <TextField inputMode="decimal" value={estimated} onChange={(e) => setEstimated(e.target.value)} placeholder="z. B. 8.000" />
        </div>

        <div>
          <FieldLabel>Tatsächliche Materialkosten (€)</FieldLabel>
          <TextField inputMode="decimal" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="z. B. 3.000" />
        </div>

        <div>
          <FieldLabel>Zusätzliche Fremdkosten (€)</FieldLabel>
          <TextField inputMode="decimal" value={external} onChange={(e) => setExternal(e.target.value)} placeholder="optional" />
        </div>

        <div
          className="rounded-[14px] border px-4 py-3"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
            Ersparnis durch Eigenleistung
          </p>
          <p className="mt-0.5 text-[19px] font-bold" style={{ color: hasSavings ? "var(--dl-domenico)" : "var(--dl-text-dim)" }}>
            {hasSavings ? formatEuroCents(previewSavings) : "Keine Ersparnis"}
          </p>
        </div>

        <div className="date-all-day-grid">
          <div>
            <FieldLabel>Arbeitsstunden (optional)</FieldLabel>
            <TextField inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="z. B. 40" />
          </div>
          <div>
            <FieldLabel>Stundenwert (€, optional)</FieldLabel>
            <TextField inputMode="decimal" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="z. B. 25" />
          </div>
        </div>

        <div>
          <FieldLabel>Zahlungsquelle der Materialkosten</FieldLabel>
          <ChipGroup ariaLabel="Zahlungsquelle" options={SOURCE_OPTIONS} value={paymentSource} onChange={setPaymentSource} />
        </div>

        <div>
          <FieldLabel>Datum</FieldLabel>
          <TextField type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </div>

        <div>
          <FieldLabel>Notizen</FieldLabel>
          <TextAreaField value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="optional" />
        </div>

        <div>
          <FieldLabel>Fotos / Dokumente</FieldLabel>
          <div className="flex flex-col gap-2">
            {documentPaths.map((path, i) => (
              <div
                key={path}
                className="flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3"
                style={{ borderColor: "var(--field-border)", background: "var(--field-background)" }}
              >
                <Paperclip size={16} style={{ color: "var(--dl-text-dim)" }} />
                <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                  Datei {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setDocumentPaths((prev) => prev.filter((p) => p !== path))}
                  aria-label="Datei entfernen"
                >
                  <X size={16} style={{ color: "var(--dl-text-faint)" }} />
                </button>
              </div>
            ))}
            <label
              className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed text-[13.5px] font-medium"
              style={{ borderColor: "var(--field-border)", color: "var(--dl-text-dim)" }}
            >
              <Paperclip size={16} />
              {uploading ? "Wird hochgeladen…" : "Bild oder PDF hinzufügen"}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChosen} disabled={uploading} />
            </label>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}

        {confirmDelete && (
          <div className="rounded-[16px] border p-3.5" style={{ borderColor: "var(--dl-danger)", background: "var(--dl-card)" }}>
            <p className="mb-3 text-[13.5px] font-medium" style={{ color: "var(--dl-text)" }}>
              Diese Eigenleistung wirklich löschen?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-[44px] rounded-full text-[13.5px] font-semibold"
                style={{ background: "var(--dl-danger)", color: "var(--dl-bg)" }}
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[36px] text-[13px]"
                style={{ color: "var(--dl-text-dim)" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {editEntry && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eigenleistung löschen"
              className="flex min-h-[48px] w-12 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--dl-border-strong)" }}
            >
              <Trash2 size={18} style={{ color: "var(--dl-danger)" }} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-[48px] flex-1 rounded-full text-[15px] font-semibold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--dl-violet), var(--dl-together))", color: "var(--dl-text)" }}
          >
            {editEntry ? "Änderungen speichern" : "Eigenleistung speichern"}
          </button>
        </div>
      </div>
    </FullscreenPage>
  );
}
