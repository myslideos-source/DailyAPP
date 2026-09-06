"use client";

import { NotebookText, Plus } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { relativeTimeFromNow } from "@/lib/date-utils";

export default function NotizenPage() {
  const { notes, addNote } = useAppStore();
  const { openNoteEditor } = useSheet();

  const sorted = [...notes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  async function handleCreate() {
    const created = await addNote();
    openNoteEditor(created.id);
  }

  return (
    <div className="pt-3 pb-4">
      <BackLink />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
            Notizen
          </h1>
          <p className="mt-0.5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
            Geteilt mit eurer Familie — Änderungen erscheinen kurz nach dem Tippen beim anderen.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        className="mb-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold"
        style={{
          background: "linear-gradient(135deg, var(--dl-violet), var(--dl-together))",
          color: "var(--dl-text)",
        }}
      >
        <Plus size={18} /> Neue Notiz
      </button>

      {sorted.length === 0 ? (
        <EmptyState
          icon={NotebookText}
          title="Noch keine Notizen"
          description="Legt eure erste gemeinsame Notiz an."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => openNoteEditor(note.id)}
              className="flex min-h-[64px] flex-col items-start gap-0.5 rounded-[16px] border px-3.5 py-2.5 text-left"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
            >
              <span className="w-full truncate text-[14.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
                {note.title || "Ohne Titel"}
              </span>
              {note.body && (
                <span className="w-full truncate text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
                  {note.body}
                </span>
              )}
              <span className="text-[11px]" style={{ color: "var(--dl-text-faint)" }}>
                {relativeTimeFromNow(note.updatedAt)}
                {note.updatedBy && ` · ${note.updatedBy === "domenico" ? "Domenico" : "Elisabeth"}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
