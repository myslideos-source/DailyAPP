"use client";

import { BellRing, TriangleAlert } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { ToggleRow } from "@/components/ui/FormControls";
import { useNotificationPermission } from "@/lib/hooks/useNotificationPermission";
import { useAppStore } from "@/lib/store/app-store";

export default function ErinnerungenPage() {
  const { permission, request } = useNotificationPermission();
  const { showToast } = useAppStore();

  async function handleToggle(checked: boolean) {
    if (!checked) {
      showToast("Über die Browser-/System-Einstellungen wieder deaktivierbar");
      return;
    }
    const result = await request();
    if (result === "granted") showToast("Erinnerungen aktiviert");
    else if (result === "denied") showToast("Erinnerungen wurden blockiert");
  }

  return (
    <div className="pt-3">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Erinnerungen
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Für Termine mit gesetzter Erinnerung meldet sich dayli rechtzeitig, solange die App auf diesem Gerät geöffnet ist.
      </p>

      {permission === "unsupported" ? (
        <div
          className="flex items-start gap-3 rounded-[16px] border px-3.5 py-3"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <TriangleAlert size={17} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-faint)" }} />
          <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
            Dieser Browser unterstützt keine Benachrichtigungen. Ihr seht Erinnerungen trotzdem als Hinweis und in der Glocke oben.
          </p>
        </div>
      ) : (
        <div
          className="rounded-[16px] border p-3.5"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <ToggleRow
            label="System-Benachrichtigungen"
            checked={permission === "granted"}
            onChange={handleToggle}
          />
          {permission === "denied" && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--dl-danger)" }}>
              Blockiert. Erlaubt Benachrichtigungen für dayli in den Browser-Einstellungen, um sie wieder zu aktivieren.
            </p>
          )}
        </div>
      )}

      <div
        className="mt-3 flex items-start gap-3 rounded-[16px] border px-3.5 py-3"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
      >
        <BellRing size={17} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-faint)" }} />
        <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
          Ohne System-Benachrichtigung erscheint eine Erinnerung trotzdem als kurzer Hinweis und in der Glocke oben, solange dayli offen ist. Bei vollständig geschlossener App sind zuverlässige Erinnerungen technisch nur mit einem Push-Server möglich — das ist in dieser Version noch nicht eingebaut.
        </p>
      </div>
    </div>
  );
}
