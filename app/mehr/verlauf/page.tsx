"use client";

import { History } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { PROFILES } from "@/lib/demo-data";
import { relativeTimeFromNow } from "@/lib/date-utils";

export default function VerlaufPage() {
  const { activity, preferences } = useAppStore();

  function actorLabel(actorId: string | null): string {
    if (!actorId) return "Jemand";
    if (actorId === preferences.activeProfile) return "Du";
    return actorId === "domenico" ? PROFILES.domenico.name : PROFILES.elisabeth.name;
  }

  return (
    <div className="pt-3 pb-4">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Verlauf
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Wer zuletzt was erstellt, erledigt oder gelöscht hat.
      </p>

      {activity.length === 0 ? (
        <EmptyState icon={History} title="Noch nichts passiert" description="Hier taucht bald eure Aktivität auf." />
      ) : (
        <ul className="flex flex-col gap-2">
          {activity.map((entry) => (
            <li
              key={entry.id}
              className="flex min-h-[52px] flex-col justify-center gap-0.5 rounded-[14px] border px-3.5 py-2.5"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
            >
              <p className="text-[13.5px]" style={{ color: "var(--dl-text)" }}>
                <span className="font-semibold">{actorLabel(entry.actorId)}</span> {entry.message}
              </p>
              <p className="text-[11px]" style={{ color: "var(--dl-text-faint)" }}>
                {relativeTimeFromNow(entry.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
