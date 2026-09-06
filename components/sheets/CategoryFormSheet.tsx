"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { FieldLabel, TextField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { iconByName } from "@/lib/theme";
import { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_CHOICES, CATEGORY_NAME_MAX_LENGTH } from "@/lib/category-utils";
import type { CategoryDef } from "@/lib/types";

function IconGlyph({ icon: Icon, size, color }: { icon: LucideIcon; size: number; color: string }) {
  return <Icon size={size} style={{ color }} />;
}

/** Create/edit form for a custom category — a FullscreenPage since it's a
 * full form (name, icon, color), matching the app's convention of
 * FullscreenPage for forms and BottomSheet for quick pickers. System
 * categories never open this (no edit affordance is shown for them). */
export function CategoryFormSheet({
  open,
  onClose,
  editCategory,
}: {
  open: boolean;
  onClose: () => void;
  editCategory?: CategoryDef | null;
}) {
  const { addCategory, updateCategory, showToast } = useAppStore();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<string>(CATEGORY_ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(CATEGORY_COLOR_OPTIONS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setLabel(editCategory?.label ?? "");
    setIcon(editCategory?.icon ?? CATEGORY_ICON_CHOICES[0]);
    setColor(editCategory?.color ?? CATEGORY_COLOR_OPTIONS[0].value);
    setError(null);
    setSaving(false);
  }, [open, editCategory]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (editCategory) {
        await updateCategory(editCategory.id, { label, icon, color });
        showToast("Kategorie aktualisiert");
      } else {
        await addCategory({ label, icon, color });
        showToast("Kategorie erstellt");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategorie konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title={editCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
      leftAction={
        <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Abbrechen
        </button>
      }
      rightAction={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-[15px] font-semibold disabled:opacity-50"
          style={{ color: "var(--dl-together)" }}
        >
          Speichern
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${color} 24%, transparent)` }}
          >
            <IconGlyph icon={iconByName(icon)} size={24} color={color} />
          </span>
          <div className="min-w-0 flex-1">
            <FieldLabel>Name</FieldLabel>
            <TextField
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, CATEGORY_NAME_MAX_LENGTH))}
              placeholder="z. B. Vereine"
              autoFocus
            />
          </div>
        </div>

        <div>
          <FieldLabel>Farbe</FieldLabel>
          <div className="grid grid-cols-4 gap-2.5">
            {CATEGORY_COLOR_OPTIONS.map((opt) => {
              const active = opt.value === color;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  aria-label={opt.label}
                  aria-pressed={active}
                  className="flex flex-col items-center gap-1.5 rounded-[14px] border py-2.5 transition-colors"
                  style={{
                    borderColor: active ? opt.value : "var(--field-border)",
                    background: active ? `color-mix(in srgb, ${opt.value} 16%, transparent)` : "var(--field-background)",
                  }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: opt.value }}
                  >
                    {active && <Check size={14} style={{ color: "#0b1230" }} />}
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Symbol</FieldLabel>
          <div className="grid grid-cols-6 gap-2.5">
            {CATEGORY_ICON_CHOICES.map((name) => {
              const Icon = iconByName(name);
              const active = name === icon;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  aria-label={name}
                  aria-pressed={active}
                  className="flex h-11 w-11 items-center justify-center rounded-full border transition-colors"
                  style={
                    active
                      ? { borderColor: color, background: `color-mix(in srgb, ${color} 20%, transparent)` }
                      : { borderColor: "var(--field-border)", background: "var(--field-background)" }
                  }
                >
                  <Icon size={18} style={{ color: active ? color : "var(--dl-text-dim)" }} />
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}
      </div>
    </FullscreenPage>
  );
}
