"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, TriangleAlert, History } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { useAppStore } from "@/lib/store/app-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useOptionalSupabaseAuth } from "@/lib/store/auth-context";
import { downloadBackup, parseBackup, serializeBackup } from "@/lib/backup";
import { listBackupSnapshots, getBackupSignedUrl, type BackupSnapshotRef } from "@/lib/supabase/repository";
import { formatLongDate } from "@/lib/date-utils";

function AutomaticBackups() {
  const familyId = useOptionalSupabaseAuth()?.profile?.familyId ?? null;
  const [snapshots, setSnapshots] = useState<BackupSnapshotRef[] | null>(null);

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    listBackupSnapshots(familyId).then(
      (rows) => !cancelled && setSnapshots(rows),
      () => !cancelled && setSnapshots([]),
    );
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  async function handleDownload(storagePath: string) {
    const url = await getBackupSignedUrl(storagePath);
    window.open(url, "_blank", "noopener");
  }

  if (!snapshots || snapshots.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="mb-2.5 text-[12.5px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
        Automatische Sicherungen
      </p>
      <div className="flex flex-col gap-2">
        {snapshots.slice(0, 5).map((snap) => (
          <button
            key={snap.id}
            type="button"
            onClick={() => handleDownload(snap.storagePath)}
            className="flex min-h-[46px] items-center gap-3 rounded-[14px] border px-3.5 py-2 text-left"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
          >
            <History size={16} style={{ color: "var(--dl-text-faint)" }} />
            <span className="text-[13.5px]" style={{ color: "var(--dl-text)" }}>
              {formatLongDate(new Date(snap.createdAt))}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px]" style={{ color: "var(--dl-text-faint)" }}>
        Wird jede Woche automatisch erstellt — nur zur Sicherheit, nicht zum Wiederherstellen in der App gedacht.
      </p>
    </div>
  );
}

export default function BackupPage() {
  const { events, tasks, savingsGoals, savingsEntries, notifications, restoreFromBackup, showToast } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<File | null>(null);

  function handleExport() {
    const json = serializeBackup({ events, tasks, savingsGoals, savingsEntries, notifications });
    downloadBackup(json);
    showToast("Sicherung heruntergeladen");
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setConfirming(file);
  }

  async function handleConfirmImport() {
    if (!confirming) return;
    try {
      const text = await confirming.text();
      const data = parseBackup(text);
      const ok = restoreFromBackup(data);
      if (!ok) {
        setError("Wiederherstellen ist im Sync-Modus nicht möglich.");
      } else {
        showToast("Daten wiederhergestellt");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import fehlgeschlagen.");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="pt-3">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Sicherung
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Ladet eure Termine, Aufgaben und Sparziele als Datei herunter — nützlich, falls mal ein Handy verloren geht.
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="flex min-h-[52px] items-center gap-3 rounded-[16px] border px-3.5 py-2.5 text-left"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--dl-together-soft)" }}>
            <Download size={17} style={{ color: "var(--dl-together)" }} />
          </span>
          <div>
            <p className="text-[14.5px] font-medium" style={{ color: "var(--dl-text)" }}>
              Sicherung herunterladen
            </p>
            <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
              Speichert eine .json-Datei mit allen Inhalten
            </p>
          </div>
        </button>

        {isSupabaseConfigured ? (
          <div
            className="flex items-start gap-3 rounded-[16px] border px-3.5 py-3"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
          >
            <TriangleAlert size={17} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-faint)" }} />
            <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
              Eure Daten sind mit der Cloud synchronisiert. Ein Wiederherstellen aus einer Datei ist hier deaktiviert, damit nicht versehentlich der Stand des anderen Geräts überschrieben wird.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[52px] items-center gap-3 rounded-[16px] border px-3.5 py-2.5 text-left"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--dl-elisabeth-soft)" }}>
              <Upload size={17} style={{ color: "var(--dl-elisabeth)" }} />
            </span>
            <div>
              <p className="text-[14.5px] font-medium" style={{ color: "var(--dl-text)" }}>
                Aus Sicherung wiederherstellen
              </p>
              <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
                Ersetzt die aktuellen Inhalte auf diesem Gerät
              </p>
            </div>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChosen} />

        {isSupabaseConfigured && <AutomaticBackups />}

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--dl-danger)" }}>
            {error}
          </p>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-[20px] border p-5" style={{ borderColor: "var(--dl-border-strong)", background: "var(--dl-aubergine)" }}>
            <p className="text-[15.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
              Wirklich ersetzen?
            </p>
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
              Die aktuellen Termine, Aufgaben und Sparziele auf diesem Gerät werden durch den Inhalt von „{confirming.name}“ ersetzt. Das kann nicht rückgängig gemacht werden.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="min-h-[44px] flex-1 rounded-full border text-[14px] font-medium"
                style={{ borderColor: "var(--dl-border-strong)", color: "var(--dl-text)" }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="min-h-[44px] flex-1 rounded-full text-[14px] font-semibold"
                style={{ background: "var(--dl-danger)", color: "var(--dl-bg)" }}
              >
                Ersetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
