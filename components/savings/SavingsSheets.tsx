"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChipGroup, FieldLabel, TextField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { assigneeColor } from "@/lib/theme";
import type { Assignee, SavingsGoal } from "@/lib/types";

const ASSIGNEE_OPTIONS: { value: Assignee; label: string }[] = [
  { value: "gemeinsam", label: "Gemeinsam" },
  { value: "domenico", label: "Domenico" },
  { value: "elisabeth", label: "Elisabeth" },
];

export function AddSavingsEntrySheet({
  goal,
  onClose,
}: {
  goal: SavingsGoal | null;
  onClose: () => void;
}) {
  const { addSavingsEntry, showToast } = useAppStore();
  const [amount, setAmount] = useState("");
  const [contributor, setContributor] = useState<Assignee>("gemeinsam");
  const [note, setNote] = useState("");

  // Sheet stays mounted between opens (so its close animation can play), so
  // fields are reset here rather than via a remount-on-key approach.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (goal) {
      setAmount("");
      setContributor("gemeinsam");
      setNote("");
    }
  }, [goal]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSave() {
    const value = Number(amount.replace(",", "."));
    if (!goal || !value || value <= 0) return;
    addSavingsEntry({ goalId: goal.id, amount: value, contributor, note: note.trim() || undefined });
    showToast("Betrag hinzugefügt");
    onClose();
  }

  return (
    <BottomSheet open={Boolean(goal)} onClose={onClose} title={`Betrag für „${goal?.title ?? ""}“`}>
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel>Betrag (€)</FieldLabel>
          <TextField
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="z. B. 100"
            autoFocus
          />
        </div>
        <div>
          <FieldLabel>Von</FieldLabel>
          <ChipGroup ariaLabel="Von" options={ASSIGNEE_OPTIONS} value={contributor} onChange={setContributor} colorFor={assigneeColor} />
        </div>
        <div>
          <FieldLabel>Notiz</FieldLabel>
          <TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="min-h-[48px] rounded-full text-[15px] font-semibold"
          style={{ background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))", color: "var(--dl-bg)" }}
        >
          Hinzufügen
        </button>
      </div>
    </BottomSheet>
  );
}

export function NewGoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addSavingsGoal, showToast } = useAppStore();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [color, setColor] = useState<SavingsGoal["color"]>("together");

  // Sheet stays mounted between opens (so its close animation can play), so
  // fields are reset here rather than via a remount-on-key approach.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setTitle("");
      setTarget("");
      setColor("together");
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSave() {
    const value = Number(target.replace(",", "."));
    if (!title.trim() || !value || value <= 0) return;
    addSavingsGoal({ title: title.trim(), targetAmount: value, color });
    showToast("Sparziel erstellt");
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Neues Sparziel">
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel>Titel</FieldLabel>
          <TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Urlaub" autoFocus />
        </div>
        <div>
          <FieldLabel>Zielbetrag (€)</FieldLabel>
          <TextField inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="z. B. 2000" />
        </div>
        <div>
          <FieldLabel>Zuordnung</FieldLabel>
          <ChipGroup
            ariaLabel="Zuordnung"
            options={[
              { value: "together" as const, label: "Gemeinsam" },
              { value: "domenico" as const, label: "Domenico" },
              { value: "elisabeth" as const, label: "Elisabeth" },
            ]}
            value={color}
            onChange={setColor}
            colorFor={(v) => (v === "together" ? "var(--dl-together)" : v === "domenico" ? "var(--dl-domenico)" : "var(--dl-elisabeth)")}
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="min-h-[48px] rounded-full text-[15px] font-semibold"
          style={{ background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))", color: "var(--dl-bg)" }}
        >
          Sparziel erstellen
        </button>
      </div>
    </BottomSheet>
  );
}
