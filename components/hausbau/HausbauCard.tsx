"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Home, Plus } from "lucide-react";
import { computeHausbauTotals, formatEuroCents } from "@/lib/hausbau";
import { revealVariants } from "@/lib/motion-variants";
import type { HausbauBudget, HausbauExpense, HausbauSelfWork } from "@/lib/types";

type Scope = "total" | "bank" | "self";

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "total", label: "Gesamt" },
  { value: "bank", label: "Bank" },
  { value: "self", label: "Eigenmittel" },
];

/**
 * The home-page "Hausbau" tile (spec §9) — deliberately plain: one figure,
 * the last expense, an add-expense shortcut, a chevron to the full
 * overview. No charts, no progress ring, no savings-goal styling — that's
 * the explicit point of keeping this separate from "Sparziele".
 */
export function HausbauCard({
  budget,
  expenses,
  selfWork,
  onOpenOverview,
  onAddExpense,
  onSetup,
  animate,
}: {
  budget: HausbauBudget | null;
  expenses: HausbauExpense[];
  selfWork: HausbauSelfWork[];
  onOpenOverview: () => void;
  onAddExpense: () => void;
  onSetup: () => void;
  animate: boolean;
}) {
  const [scope, setScope] = useState<Scope>("total");

  if (!budget) {
    return (
      <motion.button
        type="button"
        onClick={onSetup}
        custom={4}
        initial="hidden"
        animate={animate ? "visible" : "hidden"}
        variants={revealVariants}
        className="mt-3 flex w-full items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] border p-4 text-left"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--dl-together-soft)" }}
        >
          <Home size={17} style={{ color: "var(--dl-together)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold" style={{ color: "var(--dl-text)" }}>
            Hausbau
          </p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
            Jetzt Budget einrichten
          </p>
        </div>
        <ChevronRight size={17} style={{ color: "var(--dl-text-faint)" }} />
      </motion.button>
    );
  }

  const totals = computeHausbauTotals(budget, expenses, selfWork);
  const available =
    scope === "bank" ? totals.bankAvailableCents : scope === "self" ? totals.selfAvailableCents : totals.totalAvailableCents;
  const lastExpense = totals.lastExpense;

  return (
    <motion.div
      custom={4}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      variants={revealVariants}
      className="mt-3 overflow-hidden rounded-[var(--radius-xl)] border p-4"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <button type="button" onClick={onOpenOverview} className="flex w-full items-start gap-3 text-left">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--dl-together-soft)" }}
        >
          <Home size={17} style={{ color: "var(--dl-together)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold" style={{ color: "var(--dl-text)" }}>
            Hausbau
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--dl-together)" }}>
            Aktuell verfügbar
          </p>
          <p className="mt-0.5 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
            {formatEuroCents(available)}
          </p>
          {lastExpense && (
            <div className="mt-2.5">
              <p className="text-[11px]" style={{ color: "var(--dl-text-dim)" }}>
                Letzte Ausgabe
              </p>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium" style={{ color: "var(--dl-text)" }}>
                  {lastExpense.title}
                </span>
                <span className="shrink-0 text-[13px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
                  −{formatEuroCents(lastExpense.status === "planned" ? (lastExpense.plannedAmountCents ?? 0) : (lastExpense.actualAmountCents ?? 0))}
                </span>
              </div>
            </div>
          )}
        </div>
        <ChevronRight size={17} className="mt-1 shrink-0" style={{ color: "var(--dl-text-faint)" }} />
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full p-0.5" style={{ background: "var(--dl-card-raised)" }}>
          {SCOPE_OPTIONS.map((opt) => {
            const active = opt.value === scope;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  background: active ? "var(--dl-together-soft)" : "transparent",
                  color: active ? "var(--dl-together)" : "var(--dl-text-faint)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onAddExpense}
          className="flex min-h-[32px] items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold"
          style={{ background: "var(--dl-together)", color: "#fff" }}
        >
          <Plus size={13} />
          Ausgabe hinzufügen
        </button>
      </div>
    </motion.div>
  );
}
