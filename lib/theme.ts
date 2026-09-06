import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Assignee, EventCategory } from "./types";
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

export function categoryLabel(category: EventCategory): string {
  return CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function categoryIcon(category: EventCategory): LucideIcon {
  const name = CATEGORIES.find((c) => c.id === category)?.icon ?? "CircleDot";
  return (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.CircleDot;
}

/** Precomputed once at module load (not inside any component's render),
 * so a component can look up `CATEGORY_ICONS[category]` as a plain value
 * rather than calling categoryIcon() from within its own render body. */
export const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, categoryIcon(c.id)]),
) as Record<EventCategory, LucideIcon>;
