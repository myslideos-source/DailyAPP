"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, EyeOff, Lock, Pencil, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { FieldLabel, TextField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";
import { iconByName } from "@/lib/theme";
import { CATEGORY_COLOR_OPTIONS, CATEGORY_NAME_MAX_LENGTH, HAUSBAU_CATEGORY_ICON_CHOICES } from "@/lib/category-utils";
import type { HausbauCategory } from "@/lib/types";

function IconGlyph({ icon: Icon, size, color }: { icon: LucideIcon; size: number; color: string }) {
  return <Icon size={size} style={{ color }} />;
}

/** Two-mode sheet: a list of all Hausbau categories (list mode), or the
 * create/edit form for one custom category (form mode) — kept as one
 * sheet-context entry since the two modes never need to be reachable
 * independently (spec §6: "eigene Kategorien ergänzen, bearbeiten und
 * deaktivieren", always starting from this same list). */
export function HausbauCategoryManagerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hausbauCategories, addHausbauCategory, updateHausbauCategory, deactivateHausbauCategory, showToast } = useAppStore();
  const [editing, setEditing] = useState<HausbauCategory | "new" | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) setEditing(null);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (editing) {
    return (
      <CategoryForm
        open={open}
        editCategory={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (editing === "new") {
            await addHausbauCategory(input);
            showToast("Kategorie erstellt");
          } else {
            await updateHausbauCategory(editing.id, input);
            showToast("Kategorie aktualisiert");
          }
          setEditing(null);
        }}
      />
    );
  }

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title="Hausbau-Kategorien"
      leftAction={
        <button
          type="button"
          onClick={onClose}
          aria-label="Zurück"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ color: "var(--dl-text-dim)" }}
        >
          <ChevronLeft size={22} />
        </button>
      }
      rightAction={
        <button type="button" onClick={() => setEditing("new")} className="text-[15px] font-semibold" style={{ color: "var(--dl-together)" }}>
          Neu
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        {hausbauCategories.map((cat) => {
          const Icon = iconByName(cat.icon);
          return (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-[16px] border px-3.5 py-3"
              style={{
                borderColor: "var(--dl-border)",
                background: "var(--dl-card)",
                opacity: cat.isActive ? 1 : 0.55,
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${cat.color ?? "var(--dl-together)"} 20%, transparent)` }}
              >
                <IconGlyph icon={Icon} size={16} color={cat.color ?? "var(--dl-together)"} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: "var(--dl-text)" }}>
                {cat.label}
                {!cat.isActive && (
                  <span className="ml-2 text-[11.5px] font-normal" style={{ color: "var(--dl-text-faint)" }}>
                    Deaktiviert
                  </span>
                )}
              </span>
              {cat.isSystem ? (
                <Lock size={16} style={{ color: "var(--dl-text-faint)" }} />
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(cat)}
                    aria-label={`${cat.label} bearbeiten`}
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                  >
                    <Pencil size={15} style={{ color: "var(--dl-text-dim)" }} />
                  </button>
                  {cat.isActive && (
                    <button
                      type="button"
                      onClick={() => deactivateHausbauCategory(cat.id)}
                      aria-label={`${cat.label} deaktivieren`}
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                    >
                      <EyeOff size={15} style={{ color: "var(--dl-text-dim)" }} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setEditing("new")}
          className="mt-1 flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-dashed text-[13.5px] font-medium"
          style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text-dim)" }}
        >
          <Plus size={16} />
          Neue Kategorie
        </button>
      </div>
    </FullscreenPage>
  );
}

function CategoryForm({
  open,
  editCategory,
  onClose,
  onSave,
}: {
  open: boolean;
  editCategory: HausbauCategory | null;
  onClose: () => void;
  onSave: (input: { label: string; icon: string; color: string }) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<string>(HAUSBAU_CATEGORY_ICON_CHOICES[0]);
  const [color, setColor] = useState<string>(CATEGORY_COLOR_OPTIONS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setLabel(editCategory?.label ?? "");
    setIcon(editCategory?.icon ?? HAUSBAU_CATEGORY_ICON_CHOICES[0]);
    setColor(editCategory?.color ?? CATEGORY_COLOR_OPTIONS[0].value);
    setError(null);
    setSaving(false);
  }, [open, editCategory]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ label, icon, color });
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
              placeholder="z. B. Gartenbau"
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
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: opt.value }}>
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
            {HAUSBAU_CATEGORY_ICON_CHOICES.map((name) => {
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
