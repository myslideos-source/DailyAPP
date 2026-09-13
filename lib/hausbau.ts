// The Hausbau-Kalkulation's calculation engine — the one place every total
// shown anywhere in the feature (home tile, overview, filters) is derived
// from. Nothing here is ever persisted as a pre-computed sum (spec §10):
// every render recomputes from the current `expenses`/`selfWork` arrays, so
// there is no cached total that can drift from the underlying entries.
import type { HausbauBudget, HausbauExpense, HausbauExpenseStatus, HausbauSelfWork } from "@/lib/types";

// --- money formatting -------------------------------------------------------

const EURO_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1.600,00 €". Pass a negative value for an expense row and it renders
 * with a leading minus, matching spec §16's "Ausgaben automatisch mit
 * Minus darstellen". */
export function formatEuroCents(cents: number): string {
  return EURO_FORMATTER.format(cents / 100);
}

/** Parses German-formatted amount input ("1.600", "1600,50", "1.600,00 €")
 * into integer cents. Returns null for anything that isn't a valid,
 * non-negative amount — callers use null as the validation-failure signal
 * (spec §16: negative amounts must be rejected). */
export function parseEuroInputToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/[€\s]/g, "");
  if (!trimmed) return null;
  // German format: "." groups thousands, "," is the decimal separator.
  // Strip thousand-dots, then normalize the decimal comma to a dot.
  const normalized = trimmed.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

// --- status classification ---------------------------------------------------

const RESERVED_STATUSES: HausbauExpenseStatus[] = ["ordered", "invoiced"];

function amountForStatus(expense: HausbauExpense): number {
  return expense.status === "planned"
    ? (expense.plannedAmountCents ?? 0)
    : (expense.actualAmountCents ?? 0);
}

// --- self-work savings --------------------------------------------------------

/** Savings from doing it yourself — never negative; a self-work entry that
 * cost more than a company quote shows "Keine Ersparnis" in the UI rather
 * than a negative number (spec §3). */
export function selfWorkSavingsCents(entry: HausbauSelfWork): number {
  const savings = entry.estimatedCompanyCostCents - entry.actualMaterialCostCents - entry.additionalExternalCostCents;
  return Math.max(0, savings);
}

function selfWorkActualCostCents(entry: HausbauSelfWork): number {
  return entry.actualMaterialCostCents + entry.additionalExternalCostCents;
}

// --- totals -------------------------------------------------------------------

export interface HausbauTotals {
  bankFinancingCents: number;
  ownReserveCents: number;
  emergencyReserveCents: number;

  bankPaidCents: number;
  bankReservedCents: number;
  bankAvailableCents: number;

  selfPaidCents: number;
  selfReservedCents: number;
  selfAvailableCents: number;

  /** bankAvailableCents + selfAvailableCents — powers the home tile's
   * "Aktuell verfügbar" figure (spec §9), already net of paid AND reserved
   * amounts (spec §9: "Reservierte bestätigte Kosten werden dabei
   * berücksichtigt"). */
  totalAvailableCents: number;
  totalPaidCents: number;
  totalReservedCents: number;
  /** Sum of planned-status entries' planned amounts — forecast only, never
   * subtracted from availability. */
  totalPlannedCents: number;

  selfWorkCount: number;
  selfWorkEstimatedCents: number;
  selfWorkActualCents: number;
  selfWorkSavingsCents: number;

  /** Most recently created expense (by createdAt), for the home tile's
   * "Letzte Ausgabe" line — null when there are no expenses yet. */
  lastExpense: HausbauExpense | null;
}

export function computeHausbauTotals(
  budget: HausbauBudget,
  expenses: HausbauExpense[],
  selfWork: HausbauSelfWork[],
): HausbauTotals {
  let bankPaidCents = 0;
  let bankReservedCents = 0;
  let selfPaidCents = 0;
  let selfReservedCents = 0;
  let totalPlannedCents = 0;

  for (const expense of expenses) {
    if (expense.status === "planned") {
      totalPlannedCents += expense.plannedAmountCents ?? 0;
      continue;
    }
    const amount = amountForStatus(expense);
    const isReserved = RESERVED_STATUSES.includes(expense.status);
    if (expense.paymentSource === "bank") {
      if (isReserved) bankReservedCents += amount;
      else bankPaidCents += amount;
    } else {
      if (isReserved) selfReservedCents += amount;
      else selfPaidCents += amount;
    }
  }

  let selfWorkEstimatedCents = 0;
  let selfWorkActualCents = 0;
  let selfWorkSavings = 0;
  for (const entry of selfWork) {
    selfWorkEstimatedCents += entry.estimatedCompanyCostCents;
    const actual = selfWorkActualCostCents(entry);
    selfWorkActualCents += actual;
    selfWorkSavings += selfWorkSavingsCents(entry);
    // Self-work material/external costs are always "paid" immediately —
    // there's no planned/reserved status for self-work (spec §3 lists no
    // status field for it) — and they draw from whichever pot the entry
    // says they were paid from, same as a regular expense.
    if (entry.paymentSource === "bank") bankPaidCents += actual;
    else selfPaidCents += actual;
  }

  const bankAvailableCents = budget.bankFinancingCents - bankPaidCents - bankReservedCents;
  const selfAvailableCents = budget.ownReserveCents - selfPaidCents - selfReservedCents;

  // "Letzte Ausgabe" means the most recent entry money actually moved for
  // (spec §9's own example is a "Bezahlt" row) — a still-"Geplant" entry
  // hasn't been spent yet, so it's excluded from this candidate set even
  // if it was the most recently added row.
  const lastExpense = expenses.reduce<HausbauExpense | null>((latest, e) => {
    if (e.status === "planned") return latest;
    if (!latest) return e;
    return e.createdAt > latest.createdAt ? e : latest;
  }, null);

  return {
    bankFinancingCents: budget.bankFinancingCents,
    ownReserveCents: budget.ownReserveCents,
    emergencyReserveCents: budget.emergencyReserveCents,

    bankPaidCents,
    bankReservedCents,
    bankAvailableCents,

    selfPaidCents,
    selfReservedCents,
    selfAvailableCents,

    totalAvailableCents: bankAvailableCents + selfAvailableCents,
    totalPaidCents: bankPaidCents + selfPaidCents,
    totalReservedCents: bankReservedCents + selfReservedCents,
    totalPlannedCents,

    selfWorkCount: selfWork.length,
    selfWorkEstimatedCents,
    selfWorkActualCents,
    selfWorkSavingsCents: selfWorkSavings,

    lastExpense,
  };
}

// --- filters --------------------------------------------------------------

export type HausbauFilter = "all" | "bank" | "self" | "selfwork" | "planned" | "open" | "paid";

export interface HausbauListRow {
  kind: "expense" | "selfwork";
  expense?: HausbauExpense;
  selfWork?: HausbauSelfWork;
}

export function matchesHausbauFilter(row: HausbauListRow, filter: HausbauFilter): boolean {
  if (filter === "all") return true;
  if (filter === "selfwork") return row.kind === "selfwork";
  if (row.kind === "selfwork") return filter === "self";
  const expense = row.expense!;
  switch (filter) {
    case "bank":
      return expense.paymentSource === "bank";
    case "self":
      return expense.paymentSource === "self";
    case "planned":
      return expense.status === "planned";
    case "open":
      return expense.status === "ordered" || expense.status === "invoiced";
    case "paid":
      return expense.status === "paid";
    default:
      return true;
  }
}
