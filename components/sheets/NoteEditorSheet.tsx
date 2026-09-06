"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { FieldLabel, TextAreaField, TextField } from "@/components/ui/FormControls";
import { useAppStore } from "@/lib/store/app-store";

// "Live" here means "syncs shortly after a typing pause" — the partner sees
// the update within about a second, without either side risking a
// keystroke-level merge conflict from true concurrent co-editing.
const AUTOSAVE_DEBOUNCE_MS = 800;

/** Create/edit form for a single shared note — a FullscreenPage since it's
 * a full-content editor, matching the app's FullscreenPage-for-forms
 * convention. Autosaves in the background; there is no explicit "Speichern"
 * action, matching how a notes app behaves. */
export function NoteEditorSheet({
  open,
  onClose,
  noteId,
}: {
  open: boolean;
  onClose: () => void;
  noteId: string | null;
}) {
  const { notes, updateNote, deleteNote, showToast } = useAppStore();
  const note = noteId ? (notes.find((n) => n.id === noteId) ?? null) : null;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // The note stays mounted between opens (sheet pattern used throughout the
  // app), so fields are reset here rather than via remount-on-key. Only
  // keyed on [open, noteId] — deliberately NOT on the live `note` object,
  // so a Realtime update to this note's body while it's mid-edit here
  // never overwrites what the person is currently typing.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !note) return;
    setTitle(note.title);
    setBody(note.body);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, noteId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  function scheduleSave(next: { title: string; body: string }) {
    if (!noteId) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      updateNote(noteId, next);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    scheduleSave({ title: value, body });
  }

  function handleBodyChange(value: string) {
    setBody(value);
    scheduleSave({ title, body: value });
  }

  function handleClose() {
    // Flush immediately so closing right after typing never loses the last
    // debounce window's worth of edits.
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      if (noteId) updateNote(noteId, { title, body });
    }
    onClose();
  }

  function handleDelete() {
    if (!noteId) return;
    deleteNote(noteId);
    showToast("Notiz gelöscht");
    onClose();
  }

  return (
    <FullscreenPage
      open={open}
      onClose={handleClose}
      title="Notiz"
      leftAction={
        <button type="button" onClick={handleClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Fertig
        </button>
      }
      rightAction={
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label="Notiz löschen"
          className="flex h-9 w-9 items-center justify-center rounded-full"
        >
          <Trash2 size={18} style={{ color: "var(--dl-danger)" }} />
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {confirmDelete && (
          <div
            className="rounded-[16px] border p-3.5"
            style={{ borderColor: "var(--dl-danger)", background: "var(--dl-card)" }}
          >
            <p className="mb-3 text-[13.5px] font-medium" style={{ color: "var(--dl-text)" }}>
              Diese Notiz wirklich löschen?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-[44px] rounded-full text-[13.5px] font-semibold"
                style={{ background: "var(--dl-danger)", color: "var(--dl-bg)" }}
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[36px] text-[13px]"
                style={{ color: "var(--dl-text-dim)" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div>
          <FieldLabel>Titel</FieldLabel>
          <TextField
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ohne Titel"
            autoFocus={!note?.body}
          />
        </div>

        <div>
          <FieldLabel>Notiz</FieldLabel>
          <TextAreaField
            rows={14}
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="Schreib etwas auf …"
          />
        </div>

        {note?.updatedBy && (
          <p className="text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
            Zuletzt bearbeitet von {note.updatedBy === "domenico" ? "Domenico" : "Elisabeth"}
          </p>
        )}
      </div>
    </FullscreenPage>
  );
}
