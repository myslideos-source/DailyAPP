"use client";

import { useMemo, useState } from "react";
import { Layers, Pencil, Plus, Search, Settings2 } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { computeHausbauTotals, formatEuroCents, matchesHausbauFilter, selfWorkSavingsCents } from "@/lib/hausbau";
import type { HausbauFilter, HausbauListRow as HausbauListRowType } from "@/lib/hausbau";
import { hausbauPaymentSourceLabel, hausbauSourceDotStyle, hausbauStatusColor, hausbauStatusLabel } from "@/lib/hausbau-theme";
import { formatShortDate, fromISODate } from "@/lib/date-utils";
import type { HausbauExpense, HausbauSelfWork } from "@/lib/types";

const FILTER_OPTIONS: { value: HausbauFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "bank", label: "Bank" },
  { value: "self", label: "Selbst bezahlt" },
  { value: "selfwork", label: "Eigenleistung" },
  { value: "planned", label: "Geplant" },
  { value: "open", label: "Offen" },
  { value: "paid", label: "Bezahlt" },
];

type SortKey = "date" | "amount" | "status";

function rowDate(row: HausbauListRowType): string {
  if (row.kind === "expense") return row.expense!.invoiceDate ?? row.expense!.createdAt;
  return row.selfWork!.workDate ?? row.selfWork!.createdAt;
}

function rowAmountCents(row: HausbauListRowType): number {
  if (row.kind === "expense") {
    const e = row.expense!;
    return e.status === "planned" ? (e.plannedAmountCents ?? 0) : (e.actualAmountCents ?? 0);
  }
  const s = row.selfWork!;
  return s.actualMaterialCostCents + s.additionalExternalCostCents;
}

function rowTitle(row: HausbauListRowType): string {
  return (row.kind === "expense" ? row.expense!.title : row.selfWork!.title) ?? "";
}

function rowVendorOrCategory(row: HausbauListRowType): string {
  return row.kind === "expense" ? (row.expense!.vendor ?? "") : "";
}

function rowStatusSortWeight(row: HausbauListRowType): number {
  if (row.kind === "selfwork") return 0;
  const order: Record<string, number> = { planned: 1, ordered: 2, invoiced: 3, paid: 4 };
  return order[row.expense!.status] ?? 0;
}

export function HausbauOverviewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hausbauBudget, hausbauExpenses, hausbauSelfWork, hausbauCategories } = useAppStore();
  const { openHausbauBudget, openHausbauExpenseEdit, openHausbauExpenseDetail, openHausbauSelfWorkEdit, openHausbauSelfWorkDetail, openHausbauCategoryManager } =
    useSheet();

  const [filter, setFilter] = useState<HausbauFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");

  const totals = useMemo(
    () => (hausbauBudget ? computeHausbauTotals(hausbauBudget, hausbauExpenses, hausbauSelfWork) : null),
    [hausbauBudget, hausbauExpenses, hausbauSelfWork],
  );

  const rows: HausbauListRowType[] = useMemo(() => {
    const expenseRows: HausbauListRowType[] = hausbauExpenses.map((expense) => ({ kind: "expense", expense }));
    const selfWorkRows: HausbauListRowType[] = hausbauSelfWork.map((selfWork) => ({ kind: "selfwork", selfWork }));
    return [...expenseRows, ...selfWorkRows];
  }, [hausbauExpenses, hausbauSelfWork]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => matchesHausbauFilter(row, filter))
      .filter((row) => {
        if (!categoryFilter) return true;
        const catId = row.kind === "expense" ? row.expense!.categoryId : row.selfWork!.categoryId;
        return catId === categoryFilter;
      })
      .filter((row) => {
        if (!q) return true;
        return rowTitle(row).toLowerCase().includes(q) || rowVendorOrCategory(row).toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortKey === "amount") return rowAmountCents(b) - rowAmountCents(a);
        if (sortKey === "status") return rowStatusSortWeight(b) - rowStatusSortWeight(a);
        return rowDate(b).localeCompare(rowDate(a));
      });
  }, [rows, filter, categoryFilter, query, sortKey]);

  function openRow(row: HausbauListRowType) {
    if (row.kind === "expense") openHausbauExpenseDetail(row.expense!.id);
    else openHausbauSelfWorkDetail(row.selfWork!.id);
  }

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title={hausbauBudget?.projectName ?? "Hausbau"}
      leftAction={
        <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Schließen
        </button>
      }
      rightAction={
        <button
          type="button"
          onClick={openHausbauBudget}
          aria-label="Budget bearbeiten"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border"
          style={{ borderColor: "rgba(140, 150, 255, 0.35)", background: "rgba(140, 150, 255, 0.1)" }}
        >
          <Pencil size={18} style={{ color: "var(--dl-together)" }} />
        </button>
      }
    >
      {!hausbauBudget || !totals ? (
        <div className="pt-10">
          <EmptyState
            icon={Layers}
            title="Noch kein Budget eingerichtet"
            description="Richtet zuerst euer Hausbau-Budget ein."
            action={
              <button
                type="button"
                onClick={openHausbauBudget}
                className="mt-1 rounded-full border px-4 py-2 text-[13px] font-medium"
                style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
              >
                Jetzt einrichten
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-10">
          {/* Summary — spec §7: few readable rows, no charts. */}
          <div className="grid grid-cols-2 gap-2.5">
            <SummaryBlock
              title="Gesamt"
              rows={[
                ["Noch verfügbar", formatEuroCents(totals.totalAvailableCents)],
                ["Bezahlt", formatEuroCents(totals.totalPaidCents)],
                ["Reserviert", formatEuroCents(totals.totalReservedCents)],
                ["Geplant", formatEuroCents(totals.totalPlannedCents)],
              ]}
              accent="var(--dl-text)"
            />
            <SummaryBlock
              title="Bank"
              rows={[
                ["Finanzierung", formatEuroCents(totals.bankFinancingCents)],
                ["Bezahlt", formatEuroCents(totals.bankPaidCents)],
                ["Reserviert", formatEuroCents(totals.bankReservedCents)],
                ["Verfügbar", formatEuroCents(totals.bankAvailableCents)],
              ]}
              accent="var(--dl-together)"
            />
            <SummaryBlock
              title="Eigenmittel"
              rows={[
                ["Rücklage", formatEuroCents(totals.ownReserveCents)],
                ["Bezahlt", formatEuroCents(totals.selfPaidCents)],
                ["Reserviert", formatEuroCents(totals.selfReservedCents)],
                ["Verfügbar", formatEuroCents(totals.selfAvailableCents)],
              ]}
              accent="var(--dl-domenico)"
            />
            <SummaryBlock
              title="Eigenleistung"
              rows={[
                ["Anzahl", String(totals.selfWorkCount)],
                ["Firmenkosten (geschätzt)", formatEuroCents(totals.selfWorkEstimatedCents)],
                ["Eigene Kosten", formatEuroCents(totals.selfWorkActualCents)],
                ["Ersparnis", formatEuroCents(totals.selfWorkSavingsCents)],
              ]}
              accent="var(--dl-elisabeth)"
            />
          </div>

          {totals.emergencyReserveCents > 0 && (
            <p className="text-[12.5px]" style={{ color: "var(--dl-text-faint)" }}>
              Notfallreserve (separat, nicht enthalten): {formatEuroCents(totals.emergencyReserveCents)}
            </p>
          )}

          {/* Search + category filter + sort */}
          <div className="flex flex-col gap-2.5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--dl-text-faint)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suche nach Bezeichnung oder Firma"
                className="box-border w-full min-w-0 max-w-full border text-[14px] outline-none"
                style={{
                  height: "var(--field-height)",
                  borderRadius: "var(--field-radius)",
                  paddingLeft: 38,
                  paddingRight: 12,
                  background: "var(--field-background)",
                  borderColor: "var(--field-border)",
                  color: "var(--dl-text)",
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="min-w-0 flex-1 border text-[13px] outline-none"
                style={{
                  height: 40,
                  borderRadius: "var(--field-radius)",
                  paddingInline: 12,
                  background: "var(--field-background)",
                  borderColor: "var(--field-border)",
                  color: "var(--dl-text)",
                }}
              >
                <option value="">Alle Kategorien</option>
                {hausbauCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="border text-[13px] outline-none"
                style={{
                  height: 40,
                  borderRadius: "var(--field-radius)",
                  paddingInline: 12,
                  background: "var(--field-background)",
                  borderColor: "var(--field-border)",
                  color: "var(--dl-text)",
                }}
              >
                <option value="date">Nach Datum</option>
                <option value="amount">Nach Betrag</option>
                <option value="status">Nach Status</option>
              </select>
              <button
                type="button"
                onClick={openHausbauCategoryManager}
                aria-label="Kategorien verwalten"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--dl-border-strong)" }}
              >
                <Settings2 size={16} style={{ color: "var(--dl-text-dim)" }} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((opt) => {
                const active = opt.value === filter;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilter(opt.value)}
                    className="min-h-[34px] rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                    style={
                      active
                        ? { borderColor: "var(--dl-together)", background: "var(--dl-together-soft)", color: "var(--dl-together)" }
                        : { borderColor: "var(--dl-border)", color: "var(--dl-text-dim)" }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          {filteredRows.length === 0 ? (
            <EmptyState icon={Layers} title="Keine Einträge" description="Für diese Auswahl gibt es noch keine Einträge." />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRows.map((row) => (
                <HausbauRow
                  key={row.kind === "expense" ? `e-${row.expense!.id}` : `s-${row.selfWork!.id}`}
                  row={row}
                  categoryLabel={
                    hausbauCategories.find(
                      (c) => c.id === (row.kind === "expense" ? row.expense!.categoryId : row.selfWork!.categoryId),
                    )?.label ?? null
                  }
                  onOpen={() => openRow(row)}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openHausbauExpenseEdit(undefined)}
              className="min-h-[48px] flex-1 rounded-full text-[14px] font-semibold"
              style={{ background: "linear-gradient(135deg, var(--dl-violet), var(--dl-together))", color: "var(--dl-text)" }}
            >
              <Plus size={16} className="mr-1 inline" />
              Ausgabe
            </button>
            <button
              type="button"
              onClick={() => openHausbauSelfWorkEdit(undefined)}
              className="min-h-[48px] flex-1 rounded-full border text-[14px] font-semibold"
              style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
            >
              <Plus size={16} className="mr-1 inline" />
              Eigenleistung
            </button>
          </div>
        </div>
      )}
    </FullscreenPage>
  );
}

function SummaryBlock({ title, rows, accent }: { title: string; rows: [string, string][]; accent: string }) {
  return (
    <div className="rounded-[16px] border p-3.5" style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <span className="text-[11.5px]" style={{ color: "var(--dl-text-dim)" }}>
              {label}
            </span>
            <span className="text-[13px] font-semibold" style={{ color: "var(--dl-text)" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HausbauRow({
  row,
  categoryLabel,
  onOpen,
}: {
  row: HausbauListRowType;
  categoryLabel: string | null;
  onOpen: () => void;
}) {
  const isExpense = row.kind === "expense";
  const expense = row.expense as HausbauExpense | undefined;
  const selfWork = row.selfWork as HausbauSelfWork | undefined;
  const title = isExpense ? expense!.title : selfWork!.title;
  const dateISO = isExpense ? expense!.invoiceDate : selfWork!.workDate;
  const amount = rowAmountCents(row);
  const savings = !isExpense ? selfWorkSavingsCents(selfWork!) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={hausbauSourceDotStyle(isExpense ? expense!.paymentSource : "self", row.kind)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold" style={{ color: "var(--dl-text)" }}>
          {title}
        </p>
        <p className="mt-0.5 truncate text-[12px]" style={{ color: "var(--dl-text-dim)" }}>
          {[categoryLabel, isExpense ? hausbauPaymentSourceLabel(expense!.paymentSource) : "Eigenleistung"].filter(Boolean).join(" · ")}
        </p>
        {dateISO && (
          <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--dl-text-faint)" }}>
            {formatShortDate(fromISODate(dateISO))}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[14px] font-semibold" style={{ color: "var(--dl-text)" }}>
          −{formatEuroCents(amount)}
        </p>
        {isExpense ? (
          <p className="mt-0.5 text-[11.5px] font-medium" style={{ color: hausbauStatusColor(expense!.status) }}>
            {hausbauStatusLabel(expense!.status)}
          </p>
        ) : (
          <p className="mt-0.5 text-[11.5px] font-medium" style={{ color: savings > 0 ? "var(--dl-domenico)" : "var(--dl-text-dim)" }}>
            {savings > 0 ? `Ersparnis ${formatEuroCents(savings)}` : "Keine Ersparnis"}
          </p>
        )}
      </div>
    </button>
  );
}
