"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Plus } from "lucide-react";
import { PersonAvatar } from "@/components/ui/Avatar";
import type { SavingsEntry, SavingsGoal } from "@/lib/types";
import { formatShortDate, fromISODate } from "@/lib/date-utils";

const GOAL_COLOR: Record<SavingsGoal["color"], string> = {
  domenico: "var(--dl-domenico)",
  elisabeth: "var(--dl-elisabeth)",
  together: "var(--dl-together)",
};

export function SavingsGoalCard({
  goal,
  entries,
  onAddEntry,
}: {
  goal: SavingsGoal;
  entries: SavingsEntry[];
  onAddEntry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const pct = Math.min(100, Math.round((total / goal.targetAmount) * 100));
  const color = GOAL_COLOR[goal.color];

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
            {goal.title}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
            {total.toLocaleString("de-DE")} € von {goal.targetAmount.toLocaleString("de-DE")} €
          </p>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} style={{ color: "var(--dl-text-dim)" }} />
        </motion.span>
      </button>

      <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--dl-border)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
        {pct}% erreicht
      </p>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="mt-3.5 overflow-hidden border-t pt-3.5"
          style={{ borderColor: "var(--dl-border)" }}
        >
          <div className="flex flex-col gap-2.5">
            {entries.length === 0 && (
              <p className="text-[13px]" style={{ color: "var(--dl-text-faint)" }}>
                Noch keine Einträge.
              </p>
            )}
            {[...entries]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((entry) => (
                <div key={entry.id} className="flex items-center gap-2.5">
                  <PersonAvatar assignee={entry.contributor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                      {entry.note || "Einzahlung"}
                    </p>
                    <p className="text-[11.5px]" style={{ color: "var(--dl-text-faint)" }}>
                      {formatShortDate(fromISODate(entry.createdAt.slice(0, 10)))}
                    </p>
                  </div>
                  <span className="text-[13.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
                    +{entry.amount.toLocaleString("de-DE")} €
                  </span>
                </div>
              ))}
          </div>

          <button
            type="button"
            onClick={onAddEntry}
            className="mt-3.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full border text-[13px] font-medium"
            style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
          >
            <Plus size={15} /> Betrag hinzufügen
          </button>
        </motion.div>
      )}
    </div>
  );
}
