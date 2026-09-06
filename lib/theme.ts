import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Assignee, CategoryDef, EventCategory } from "./types";
import { CATEGORIES, PROFILES } from "./demo-data";

export function assigneeColor(assignee: Assignee): string {
  if (assignee === "domenico") return "var(--dl-domenico)";
  if (assignee === "elisabeth") return "var(--dl-elisabeth)";
  return "var(--dl-together)";
}

export function assigneeSoftColor(assignee: Assignee): string {
  if (assignee === "domenico") return "var(--dl-domenico-soft)";
  if (assignee === "elisabeth") return "var(--dl-elisabeth-soft)";
  return "var(--dl-together-soft)";
}

export function assigneeLabel(assignee: Assignee): string {
  if (assignee === "domenico") return PROFILES.domenico.name;
  if (assignee === "elisabeth") return PROFILES.elisabeth.name;
  return "Gemeinsam";
}

export function assigneeInitials(assignee: Assignee): string[] {
  if (assignee === "domenico") return ["D"];
  if (assignee === "elisabeth") return ["E"];
  return ["D", "E"];
}

/** Static fallback for the 9 seeded categories — used only where the live
 * store isn't available. Everywhere else, look up label/icon/color in
 * useAppStore().categories instead, since that list also includes custom
 * categories and reflects renames immediately. */
export function categoryLabel(category: EventCategory | null): string {
  if (!category) return "Keine Kategorie";
  return CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function categoryIcon(category: EventCategory | null): LucideIcon {
  const name = (category && CATEGORIES.find((c) => c.id === category)?.icon) || "CircleDot";
  return iconByName(name);
}

/** Precomputed once at module load (not inside any component's render),
 * so a component can look up `CATEGORY_ICONS[category]` as a plain value
 * rather than calling categoryIcon() from within its own render body. Only
 * covers the 9 system categories — for a dynamic list (system + custom)
 * use iconByName(category.icon) per-row instead. */
export const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, categoryIcon(c.id)]),
) as Record<EventCategory, LucideIcon>;

/** Generic lucide lookup by name — the one to use for a CategoryDef row
 * (system or custom alike), since custom categories have no entry in the
 * static CATEGORY_ICONS map above. */
export function iconByName(name: string | null | undefined): LucideIcon {
  if (!name) return Icons.CircleDot;
  return (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.CircleDot;
}

export function categoryDefLabel(category: CategoryDef | null | undefined): string {
  return category?.label ?? "Keine Kategorie";
}
