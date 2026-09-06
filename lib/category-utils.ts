// Shared rules for user-created categories — kept in one place since both
// the Supabase repository (key generation) and CategoryFormSheet (live
// validation feedback) need the exact same constraints.

export const CATEGORY_NAME_MAX_LENGTH = 30;

export interface CategoryColorOption {
  id: string;
  label: string;
  value: string;
}

// A deliberately restricted palette — no free color picker, so custom
// categories always sit visually consistent with the app's own tokens.
export const CATEGORY_COLOR_OPTIONS: CategoryColorOption[] = [
  { id: "cyan", label: "Cyan", value: "#22D3EE" },
  { id: "blau", label: "Blau", value: "#3B82F6" },
  { id: "violett", label: "Violett", value: "#8B5CF6" },
  { id: "pink", label: "Pink", value: "#EC4899" },
  { id: "terrakotta", label: "Terrakotta", value: "#E0785A" },
  { id: "gruen", label: "Grün", value: "#22C55E" },
  { id: "gold", label: "Gold", value: "#EAB308" },
  { id: "grau", label: "Grau", value: "#94A3B8" },
];

// A curated subset of lucide-react icon names — never emoji, and never an
// open-ended icon search, so every custom category renders through the
// app's existing icon system.
export const CATEGORY_ICON_CHOICES: string[] = [
  "Tag",
  "Star",
  "Heart",
  "Home",
  "Briefcase",
  "ShoppingCart",
  "Utensils",
  "Plane",
  "Dumbbell",
  "Music",
  "Book",
  "Car",
  "Gift",
  "PawPrint",
  "Palette",
  "Wrench",
  "Coffee",
  "Camera",
  "Gamepad2",
  "Sun",
  "Sparkles",
  "GraduationCap",
  "Stethoscope",
  "Leaf",
];

export function validateCategoryName(name: string, existingLabels: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Bitte gib einen Namen ein.";
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    return `Der Name darf höchstens ${CATEGORY_NAME_MAX_LENGTH} Zeichen lang sein.`;
  }
  const lower = trimmed.toLowerCase();
  if (existingLabels.some((label) => label.trim().toLowerCase() === lower)) {
    return "Diese Kategorie existiert bereits.";
  }
  return null;
}

// Generates a stable slug for a new category's `key` column, appending a
// numeric suffix on collision (e.g. two categories both named "Sport").
export function slugifyCategoryKey(name: string, existingKeys: string[]): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "kategorie";
  let key = base;
  let suffix = 2;
  while (existingKeys.includes(key)) {
    key = `${base}-${suffix}`;
    suffix += 1;
  }
  return key;
}
