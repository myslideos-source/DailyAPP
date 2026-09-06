"use client";

import { useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { CategoryFormSheet } from "@/components/sheets/CategoryFormSheet";
import { useAppStore } from "@/lib/store/app-store";
import { iconByName } from "@/lib/theme";
import type { CategoryDef } from "@/lib/types";

export default function KategorienPage() {
  const { categories, events, deleteCategory, showToast } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryDef | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CategoryDef | null>(null);
  const [deleting, setDeleting] = useState(false);

  const usageCount = pendingDelete ? events.filter((e) => e.category === pendingDelete.key).length : 0;

  function openCreate() {
    setEditCategory(null);
    setFormOpen(true);
  }

  function openEdit(category: CategoryDef) {
    setEditCategory(category);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(pendingDelete.id);
      showToast("Kategorie gelöscht");
      setPendingDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Kategorie konnte nicht gelöscht werden.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pt-3 pb-4">
      <BackLink />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
            Kategorien
          </h1>
          <p className="mt-0.5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
            Diese Kategorien stehen euch beim Erstellen von Terminen zur Verfügung.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={openCreate}
        className="mb-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold"
        style={{
          background: "linear-gradient(135deg, var(--dl-violet), var(--dl-together))",
          color: "var(--dl-text)",
        }}
      >
        <Plus size={18} /> Neue Kategorie
      </button>

      <div className="flex flex-col gap-2">
        {categories.map((cat) => {
          const Icon = iconByName(cat.icon);
          return (
            <div
              key={cat.id}
              className="flex min-h-[52px] items-center gap-3 rounded-[16px] border px-3.5 py-2.5"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: cat.color
                    ? `color-mix(in srgb, ${cat.color} 22%, transparent)`
                    : "var(--dl-together-soft)",
                }}
              >
                <Icon size={17} strokeWidth={1.8} style={{ color: cat.color ?? "var(--dl-together)" }} />
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] font-medium" style={{ color: "var(--dl-text)" }}>
                {cat.label}
              </span>
              {cat.isSystem ? (
                <Lock size={15} aria-label="Systemkategorie" style={{ color: "var(--dl-text-faint)" }} />
              ) : (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    aria-label={`${cat.label} bearbeiten`}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/5"
                  >
                    <Pencil size={15} style={{ color: "var(--dl-text-dim)" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(cat)}
                    aria-label={`${cat.label} löschen`}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/5"
                  >
                    <Trash2 size={15} style={{ color: "var(--dl-danger)" }} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "rgba(8, 10, 19, 0.6)" }}
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-[380px] rounded-[18px] border p-4"
            style={{ borderColor: "var(--dl-border-strong)", background: "var(--dl-aubergine)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-[14.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
              „{pendingDelete.label}“ löschen?
            </p>
            <p className="mb-3.5 text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
              {usageCount > 0
                ? 'Diese Kategorie wird bereits von Terminen verwendet. Beim Löschen werden diese Termine auf „Keine Kategorie" gesetzt.'
                : "Dieser Schritt kann nicht rückgängig gemacht werden."}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="min-h-[44px] rounded-full text-[13.5px] font-semibold disabled:opacity-50"
                style={{ background: "var(--dl-danger)", color: "var(--dl-bg)" }}
              >
                Kategorie löschen
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="min-h-[36px] text-[13px]"
                style={{ color: "var(--dl-text-dim)" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <CategoryFormSheet open={formOpen} onClose={() => setFormOpen(false)} editCategory={editCategory} />
    </div>
  );
}
