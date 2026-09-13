"use client";

import { useState } from "react";
import { Banknote, Calendar, CircleOff, Clock, Paperclip, Pencil, StickyNote } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { formatEuroCents, selfWorkSavingsCents } from "@/lib/hausbau";
import { hausbauPaymentSourceLabel } from "@/lib/hausbau-theme";
import { iconByName } from "@/lib/theme";
import { formatFullDate, fromISODate } from "@/lib/date-utils";

export function HausbauSelfWorkDetailSheet({ open, onClose, selfWorkId }: { open: boolean; onClose: () => void; selfWorkId: string | null }) {
  const { hausbauSelfWork, hausbauCategories, getHausbauDocumentUrl } = useAppStore();
  const { openHausbauSelfWorkEdit } = useSheet();
  const [docError, setDocError] = useState<string | null>(null);

  const entry = selfWorkId ? (hausbauSelfWork.find((e) => e.id === selfWorkId) ?? null) : null;
  const category = entry?.categoryId ? (hausbauCategories.find((c) => c.id === entry.categoryId) ?? null) : null;
  const savings = entry ? selfWorkSavingsCents(entry) : 0;
  const hasSavings = savings > 0;

  async function handleOpenDoc(path: string) {
    setDocError(null);
    try {
      const url = await getHausbauDocumentUrl(path);
      window.open(url, "_blank", "noopener");
    } catch {
      setDocError("Datei konnte nicht geöffnet werden.");
    }
  }

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title="Eigenleistung"
      leftAction={
        <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Schließen
        </button>
      }
      rightAction={
        entry ? (
          <button
            type="button"
            onClick={() => openHausbauSelfWorkEdit(entry.id)}
            aria-label="Eigenleistung bearbeiten"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: "rgba(140, 150, 255, 0.35)", background: "rgba(140, 150, 255, 0.1)" }}
          >
            <Pencil size={20} style={{ color: "var(--dl-together)" }} />
          </button>
        ) : undefined
      }
    >
      {!entry ? (
        <div className="pt-10">
          <EmptyState icon={CircleOff} title="Eintrag nicht gefunden" description="Diese Eigenleistung existiert nicht mehr." />
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-6">
          <div>
            <h2 className="text-[26px] font-bold leading-tight" style={{ color: "var(--dl-text)" }}>
              {entry.title}
            </h2>
            <p className="mt-1.5 text-[13px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
              Ersparnis durch Eigenleistung
            </p>
            <p className="text-[28px] font-bold" style={{ color: hasSavings ? "var(--dl-domenico)" : "var(--dl-text-dim)" }}>
              {hasSavings ? formatEuroCents(savings) : "Keine Ersparnis"}
            </p>
            {category && (
              <span
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold"
                style={{ background: "var(--dl-card-raised)", color: "var(--dl-text-dim)" }}
              >
                {(() => {
                  const CategoryIcon = iconByName(category.icon);
                  return <CategoryIcon size={13} />;
                })()}
                {category.label}
              </span>
            )}
          </div>

          <div className="rounded-[17px] px-4" style={{ background: "var(--field-background)", border: "1px solid var(--field-border)" }}>
            <div className="divide-y divide-[rgba(140,150,255,0.14)]">
              <div className="flex items-start gap-3 py-3.5">
                <Banknote size={18} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
                    Geschätzte Firmenkosten
                  </p>
                  <p className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
                    {formatEuroCents(entry.estimatedCompanyCostCents)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3.5">
                <Banknote size={18} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
                    Tatsächliche Kosten ({hausbauPaymentSourceLabel(entry.paymentSource)})
                  </p>
                  <p className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
                    {formatEuroCents(entry.actualMaterialCostCents + entry.additionalExternalCostCents)}
                  </p>
                </div>
              </div>
              {entry.hours != null && (
                <div className="flex items-start gap-3 py-3.5">
                  <Clock size={18} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
                      Arbeitsstunden
                    </p>
                    <p className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
                      {entry.hours} Std.{entry.hourlyRateCents ? ` · ${formatEuroCents(entry.hourlyRateCents)}/Std.` : ""}
                    </p>
                  </div>
                </div>
              )}
              {entry.workDate && (
                <div className="flex items-start gap-3 py-3.5">
                  <Calendar size={18} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
                      Datum
                    </p>
                    <p className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
                      {formatFullDate(fromISODate(entry.workDate))}
                    </p>
                  </div>
                </div>
              )}
              {entry.notes && (
                <div className="flex items-start gap-3 py-3.5">
                  <StickyNote size={18} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-dim)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
                      Notizen
                    </p>
                    <p className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
                      {entry.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {entry.documentPaths.length > 0 && (
            <div className="flex flex-col gap-2">
              {entry.documentPaths.map((path, i) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => handleOpenDoc(path)}
                  className="flex min-h-[48px] items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium"
                  style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
                >
                  <Paperclip size={16} />
                  Datei {i + 1} ansehen
                </button>
              ))}
            </div>
          )}
          {docError && (
            <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
              {docError}
            </p>
          )}
        </div>
      )}
    </FullscreenPage>
  );
}
