"use client";

import { useState } from "react";
import { Banknote, Calendar, CircleOff, Hash, Link2, Pencil, Paperclip, StickyNote, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { formatEuroCents } from "@/lib/hausbau";
import { hausbauPaymentSourceLabel, hausbauStatusColor, hausbauStatusLabel } from "@/lib/hausbau-theme";
import { iconByName } from "@/lib/theme";
import { formatFullDate, fromISODate } from "@/lib/date-utils";

function InfoRow({ icon: Icon, label, value, valueColor }: { icon: LucideIcon; label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <Icon size={18} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
          {label}
        </p>
        <p className="text-[15px] font-medium" style={{ color: valueColor ?? "var(--dl-text)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function HausbauExpenseDetailSheet({ open, onClose, expenseId }: { open: boolean; onClose: () => void; expenseId: string | null }) {
  const { hausbauExpenses, hausbauCategories, events, getHausbauDocumentUrl } = useAppStore();
  const { openHausbauExpenseEdit } = useSheet();
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const expense = expenseId ? (hausbauExpenses.find((e) => e.id === expenseId) ?? null) : null;
  const category = expense?.categoryId ? (hausbauCategories.find((c) => c.id === expense.categoryId) ?? null) : null;
  const linkedEvent = expense?.linkedEventId ? (events.find((e) => e.id === expense.linkedEventId) ?? null) : null;
  const amount = expense ? (expense.status === "planned" ? expense.plannedAmountCents : expense.actualAmountCents) ?? 0 : 0;

  async function handleOpenReceipt() {
    if (!expense?.receiptPath) return;
    setReceiptError(null);
    try {
      const url = await getHausbauDocumentUrl(expense.receiptPath);
      window.open(url, "_blank", "noopener");
    } catch {
      setReceiptError("Beleg konnte nicht geöffnet werden.");
    }
  }

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title="Ausgabe"
      leftAction={
        <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Schließen
        </button>
      }
      rightAction={
        expense ? (
          <button
            type="button"
            onClick={() => openHausbauExpenseEdit(expense.id)}
            aria-label="Ausgabe bearbeiten"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: "rgba(140, 150, 255, 0.35)", background: "rgba(140, 150, 255, 0.1)" }}
          >
            <Pencil size={20} style={{ color: "var(--dl-together)" }} />
          </button>
        ) : undefined
      }
    >
      {!expense ? (
        <div className="pt-10">
          <EmptyState icon={CircleOff} title="Ausgabe nicht gefunden" description="Dieser Eintrag existiert nicht mehr." />
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-6">
          <div>
            <h2 className="text-[26px] font-bold leading-tight" style={{ color: "var(--dl-text)" }}>
              {expense.title}
            </h2>
            <p className="mt-1.5 text-[28px] font-bold" style={{ color: "var(--dl-text)" }}>
              −{formatEuroCents(amount)}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-[12.5px] font-semibold"
                style={{ background: "var(--dl-card-raised)", color: "var(--dl-text-dim)" }}
              >
                {category?.label ?? "Keine Kategorie"}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[12.5px] font-semibold"
                style={{ background: "var(--dl-card-raised)", color: hausbauStatusColor(expense.status) }}
              >
                {hausbauStatusLabel(expense.status)}
              </span>
            </div>
          </div>

          <div className="rounded-[17px] px-4" style={{ background: "var(--field-background)", border: "1px solid var(--field-border)" }}>
            <div className="divide-y divide-[rgba(140,150,255,0.14)]">
              <InfoRow icon={Banknote} label="Zahlungsquelle" value={hausbauPaymentSourceLabel(expense.paymentSource)} />
              <InfoRow icon={iconByName(category?.icon)} label="Kategorie" value={category?.label ?? "Keine Kategorie"} />
              {expense.invoiceDate && (
                <InfoRow icon={Calendar} label="Rechnungsdatum" value={formatFullDate(fromISODate(expense.invoiceDate))} />
              )}
              {expense.dueDate && <InfoRow icon={Calendar} label="Fälligkeitsdatum" value={formatFullDate(fromISODate(expense.dueDate))} />}
              {expense.vendor && <InfoRow icon={Tag} label="Firma / Empfänger" value={expense.vendor} />}
              {expense.invoiceNumber && <InfoRow icon={Hash} label="Rechnungsnummer" value={expense.invoiceNumber} />}
              {linkedEvent && <InfoRow icon={Link2} label="Verknüpfter Termin" value={linkedEvent.title} />}
              {expense.notes && <InfoRow icon={StickyNote} label="Notizen" value={expense.notes} />}
            </div>
          </div>

          {expense.receiptPath && (
            <button
              type="button"
              onClick={handleOpenReceipt}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border text-[13.5px] font-medium"
              style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
            >
              <Paperclip size={16} />
              Beleg ansehen
            </button>
          )}
          {receiptError && (
            <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
              {receiptError}
            </p>
          )}
        </div>
      )}
    </FullscreenPage>
  );
}
