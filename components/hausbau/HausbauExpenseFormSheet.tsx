"use client";

import { useEffect, useMemo, useState } from "react";
import { Paperclip, Trash2, X } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { FieldLabel, TextAreaField, TextField, ChipGroup } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { formatEuroCents, parseEuroInputToCents } from "@/lib/hausbau";
import { hausbauStatusLabel } from "@/lib/hausbau-theme";
import { iconByName } from "@/lib/theme";
import { formatShortDate, fromISODate } from "@/lib/date-utils";
import type { HausbauExpenseStatus, HausbauPaymentSource } from "@/lib/types";

const STATUS_OPTIONS: { value: HausbauExpenseStatus; label: string }[] = [
  { value: "planned", label: hausbauStatusLabel("planned") },
  { value: "ordered", label: hausbauStatusLabel("ordered") },
  { value: "invoiced", label: hausbauStatusLabel("invoiced") },
  { value: "paid", label: hausbauStatusLabel("paid") },
];

const SOURCE_OPTIONS: { value: HausbauPaymentSource; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "self", label: "Selbst bezahlt" },
];

export function HausbauExpenseFormSheet({ open, onClose, expenseId }: { open: boolean; onClose: () => void; expenseId?: string }) {
  const { hausbauExpenses, hausbauCategories, events, addHausbauExpense, updateHausbauExpense, deleteHausbauExpense, uploadHausbauDocument, showToast } =
    useAppStore();
  const { openHausbauExpenseDetail } = useSheet();
  const editExpense = expenseId ? (hausbauExpenses.find((e) => e.id === expenseId) ?? null) : null;
  const activeCategories = useMemo(() => hausbauCategories.filter((c) => c.isActive), [hausbauCategories]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentSource, setPaymentSource] = useState<HausbauPaymentSource>("bank");
  const [status, setStatus] = useState<HausbauExpenseStatus>("planned");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedEventId, setLinkedEventId] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setTitle(editExpense?.title ?? "");
    const cents = editExpense
      ? (editExpense.status === "planned" ? editExpense.plannedAmountCents : editExpense.actualAmountCents) ?? 0
      : null;
    setAmount(cents !== null ? String(cents / 100).replace(".", ",") : "");
    setCategoryId(editExpense?.categoryId ?? activeCategories[0]?.id ?? null);
    setPaymentSource(editExpense?.paymentSource ?? "bank");
    setStatus(editExpense?.status ?? "planned");
    setInvoiceDate(editExpense?.invoiceDate ?? "");
    setDueDate(editExpense?.dueDate ?? "");
    setVendor(editExpense?.vendor ?? "");
    setInvoiceNumber(editExpense?.invoiceNumber ?? "");
    setNotes(editExpense?.notes ?? "");
    setLinkedEventId(editExpense?.linkedEventId ?? "");
    setReceiptPath(editExpense?.receiptPath ?? null);
    setError(null);
    setSaving(false);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expenseId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const path = await uploadHausbauDocument(file);
      setReceiptPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beleg konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Bitte gib eine Bezeichnung ein.");
      return;
    }
    const cents = parseEuroInputToCents(amount);
    if (cents === null) {
      setError("Bitte gib einen gültigen, nicht-negativen Betrag ein.");
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      title: title.trim(),
      categoryId,
      amountCents: cents,
      paymentSource,
      status,
      invoiceDate: invoiceDate || null,
      dueDate: dueDate || null,
      vendor: vendor.trim() || null,
      invoiceNumber: invoiceNumber.trim() || null,
      notes: notes.trim() || null,
      receiptPath,
      linkedEventId: linkedEventId || null,
    };
    try {
      if (editExpense) {
        updateHausbauExpense(editExpense.id, input);
        showToast("Ausgabe aktualisiert");
        onClose();
        openHausbauExpenseDetail(editExpense.id);
      } else {
        const created = await addHausbauExpense(input);
        showToast(`„${created.title}“ −${formatEuroCents(cents)}`);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ausgabe konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editExpense) return;
    deleteHausbauExpense(editExpense.id);
    showToast("Ausgabe gelöscht");
    onClose();
  }

  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events]);

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title={editExpense ? "Ausgabe bearbeiten" : "Ausgabe hinzufügen"}
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
          <TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Zisterne" autoFocus />
        </div>

        <div>
          <FieldLabel>Betrag (€)</FieldLabel>
          <TextField inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 1.600" />
        </div>

        <div>
          <FieldLabel>Kategorie</FieldLabel>
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
          <FieldLabel>Zahlungsquelle</FieldLabel>
          <ChipGroup ariaLabel="Zahlungsquelle" options={SOURCE_OPTIONS} value={paymentSource} onChange={setPaymentSource} />
        </div>

        <div>
          <FieldLabel>Status</FieldLabel>
          <ChipGroup ariaLabel="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </div>

        <div className="date-all-day-grid">
          <div>
            <FieldLabel>Rechnungsdatum</FieldLabel>
            <TextField type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Fälligkeitsdatum</FieldLabel>
            <TextField type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel>Firma / Empfänger</FieldLabel>
          <TextField value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="optional" />
        </div>

        <div>
          <FieldLabel>Rechnungsnummer</FieldLabel>
          <TextField value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="optional" />
        </div>

        <div>
          <FieldLabel>Termin verknüpfen</FieldLabel>
          <select
            value={linkedEventId}
            onChange={(e) => setLinkedEventId(e.target.value)}
            className="box-border w-full min-w-0 max-w-full border text-[15px] outline-none"
            style={{
              height: "var(--field-height)",
              borderRadius: "var(--field-radius)",
              paddingInline: "var(--field-padding-x)",
              background: "var(--field-background)",
              borderColor: "var(--field-border)",
              color: "var(--dl-text)",
            }}
          >
            <option value="">Kein Termin</option>
            {sortedEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} · {formatShortDate(fromISODate(ev.date))}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Notizen</FieldLabel>
          <TextAreaField value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="optional" />
        </div>

        <div>
          <FieldLabel>Beleg / Rechnung</FieldLabel>
          {receiptPath ? (
            <div
              className="flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3"
              style={{ borderColor: "var(--field-border)", background: "var(--field-background)" }}
            >
              <Paperclip size={16} style={{ color: "var(--dl-text-dim)" }} />
              <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                Beleg angehängt
              </span>
              <button type="button" onClick={() => setReceiptPath(null)} aria-label="Beleg entfernen">
                <X size={16} style={{ color: "var(--dl-text-faint)" }} />
              </button>
            </div>
          ) : (
            <label
              className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed text-[13.5px] font-medium"
              style={{ borderColor: "var(--field-border)", color: "var(--dl-text-dim)" }}
            >
              <Paperclip size={16} />
              {uploading ? "Wird hochgeladen…" : "Bild oder PDF hochladen"}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChosen} disabled={uploading} />
            </label>
          )}
        </div>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}

        {confirmDelete && (
          <div className="rounded-[16px] border p-3.5" style={{ borderColor: "var(--dl-danger)", background: "var(--dl-card)" }}>
            <p className="mb-3 text-[13.5px] font-medium" style={{ color: "var(--dl-text)" }}>
              Diese Ausgabe wirklich löschen? Alle Summen werden danach neu berechnet.
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
          {editExpense && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Ausgabe löschen"
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
            {editExpense ? "Änderungen speichern" : "Ausgabe speichern"}
          </button>
        </div>
      </div>
    </FullscreenPage>
  );
}
