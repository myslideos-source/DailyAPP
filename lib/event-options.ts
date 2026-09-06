import type { RecurrenceRule } from "./types";

// Shared between EventFormSheet (edit) and EventDetailSheet (view) so the
// same stored value always reads back as the same label in both places.
export const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Keine" },
  { value: "5", label: "5 Min. vorher" },
  { value: "15", label: "15 Min. vorher" },
  { value: "30", label: "30 Min. vorher" },
  { value: "60", label: "1 Std. vorher" },
  { value: "1440", label: "1 Tag vorher" },
  { value: "10080", label: "1 Woche vorher" },
];

export const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: "none", label: "Keine" },
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "yearly", label: "Jährlich" },
];

/** null means "not set" — callers hide the row entirely rather than show
 * a placeholder, per the detail view's "no empty-optional-field" rule. */
export function reminderLabel(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  return REMINDER_OPTIONS.find((o) => o.value === String(minutes))?.label ?? `${minutes} Min. vorher`;
}

export function recurrenceLabel(rule: RecurrenceRule): string | null {
  if (rule === "none") return null;
  return RECURRENCE_OPTIONS.find((o) => o.value === rule)?.label ?? rule;
}
