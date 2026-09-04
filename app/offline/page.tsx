"use client";

import { WifiOff, RotateCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "var(--dl-card)" }}
      >
        <WifiOff size={26} strokeWidth={1.6} style={{ color: "var(--dl-text-dim)" }} />
      </span>
      <h1 className="mt-5 text-[19px] font-bold" style={{ color: "var(--dl-text)" }}>
        Gerade keine Verbindung
      </h1>
      <p className="mt-2 max-w-xs text-[14px]" style={{ color: "var(--dl-text-dim)" }}>
        Eure zuletzt geladenen Inhalte bleiben verfügbar. Sobald ihr wieder online seid, synchronisiert sich dayli automatisch.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
        style={{ background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))", color: "var(--dl-bg)" }}
      >
        <RotateCw size={16} /> Erneut versuchen
      </button>
    </div>
  );
}
