"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { SavingsGoalCard } from "@/components/savings/SavingsGoalCard";
import { AddSavingsEntrySheet, NewGoalSheet } from "@/components/savings/SavingsSheets";
import { useAppStore } from "@/lib/store/app-store";
import type { SavingsGoal } from "@/lib/types";

export default function SparzielePage() {
  const { savingsGoals, savingsEntries } = useAppStore();
  const [entryGoal, setEntryGoal] = useState<SavingsGoal | null>(null);
  const [newGoalOpen, setNewGoalOpen] = useState(false);

  return (
    <div className="pt-3">
      <Link href="/mehr" className="mb-3 inline-flex items-center gap-1 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        <ChevronLeft size={16} /> Mehr
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
          Sparziele
        </h1>
        <button
          type="button"
          onClick={() => setNewGoalOpen(true)}
          aria-label="Neues Sparziel"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "var(--dl-together-soft)" }}
        >
          <Plus size={18} style={{ color: "var(--dl-together)" }} />
        </button>
      </div>
      <p className="mt-1 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Eure gemeinsamen Ziele, ganz ohne Punkte oder Wettbewerb.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {savingsGoals.map((goal) => (
          <SavingsGoalCard
            key={goal.id}
            goal={goal}
            entries={savingsEntries.filter((e) => e.goalId === goal.id)}
            onAddEntry={() => setEntryGoal(goal)}
          />
        ))}
      </div>

      <AddSavingsEntrySheet goal={entryGoal} onClose={() => setEntryGoal(null)} />
      <NewGoalSheet open={newGoalOpen} onClose={() => setNewGoalOpen(false)} />
    </div>
  );
}
