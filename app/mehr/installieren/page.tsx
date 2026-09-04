"use client";

import Image from "next/image";
import { Share, SquarePlus, MonitorDown } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { usePwaInstall } from "@/lib/hooks/usePwaInstall";
import { useAppStore } from "@/lib/store/app-store";

export default function InstallierenPage() {
  const { canPromptInstall, promptInstall, installed, isIOS, isStandalone } = usePwaInstall();
  const { showToast } = useAppStore();

  async function handleInstall() {
    const accepted = await promptInstall();
    if (accepted) showToast("dayli wird installiert");
  }

  const alreadyInstalled = installed || isStandalone;

  return (
    <div className="pt-3">
      <BackLink />
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="relative h-20 w-20 overflow-hidden rounded-[22px]">
          <Image src="/icons/icon-192.png" alt="dayli App-Icon" fill sizes="80px" />
        </div>
        <h1 className="mt-4 text-[20px] font-bold" style={{ color: "var(--dl-text)" }}>
          dayli installieren
        </h1>
        <p className="mt-1.5 max-w-xs text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
          Installiert als eigene App fühlt sich dayli an wie eine echte iPhone-App — mit eigenem Icon und ohne Browserleiste.
        </p>
      </div>

      {alreadyInstalled ? (
        <div
          className="mt-6 rounded-[16px] border p-4 text-center text-[13.5px]"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text)" }}
        >
          dayli ist bereits installiert.
        </div>
      ) : canPromptInstall ? (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
          style={{ background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))", color: "var(--dl-bg)" }}
        >
          <MonitorDown size={18} /> Jetzt installieren
        </button>
      ) : isIOS ? (
        <div className="mt-6 flex flex-col gap-3">
          <Step icon={Share} step={1} text="Öffnet das Teilen-Menü unten in Safari." />
          <Step icon={SquarePlus} step={2} text="Wählt „Zum Home-Bildschirm“." />
          <Step icon={MonitorDown} step={3} text="Bestätigt mit „Hinzufügen“ — fertig!" />
        </div>
      ) : (
        <div
          className="mt-6 rounded-[16px] border p-4 text-center text-[13.5px]"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text-dim)" }}
        >
          Öffnet das Browsermenü und wählt „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
        </div>
      )}
    </div>
  );
}

function Step({ icon: Icon, step, text }: { icon: typeof Share; step: number; text: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[16px] border px-3.5 py-3"
      style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
        style={{ background: "var(--dl-together-soft)", color: "var(--dl-together)" }}
      >
        {step}
      </span>
      <Icon size={17} style={{ color: "var(--dl-text-dim)" }} />
      <span className="text-[13.5px]" style={{ color: "var(--dl-text)" }}>
        {text}
      </span>
    </div>
  );
}
