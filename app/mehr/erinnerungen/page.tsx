"use client";

import { BellRing, TriangleAlert } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { ToggleRow } from "@/components/ui/FormControls";
import { useNotificationPermission } from "@/lib/hooks/useNotificationPermission";
import { usePushSubscription } from "@/lib/hooks/usePushSubscription";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useOptionalSupabaseAuth } from "@/lib/store/auth-context";
import { useAppStore } from "@/lib/store/app-store";

function DemoReminders() {
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
    <>
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
          Ohne System-Benachrichtigung erscheint eine Erinnerung trotzdem als kurzer Hinweis und in der Glocke oben, solange dayli offen ist. Meldet euch mit einem echten Konto an, um Erinnerungen auch bei geschlossener App zu erhalten.
        </p>
      </div>
    </>
  );
}

function RealPushReminders() {
  const { profile } = useOptionalSupabaseAuth() ?? {};
  const { status, busy, subscribe, unsubscribe, supported } = usePushSubscription(profile?.id ?? null);
  const { showToast } = useAppStore();

  async function handleToggle(checked: boolean) {
    if (checked) {
      const ok = await subscribe();
      if (ok) showToast("Push-Erinnerungen aktiviert");
      else showToast("Push konnte nicht aktiviert werden");
    } else {
      await unsubscribe();
      showToast("Push-Erinnerungen deaktiviert");
    }
  }

  return (
    <>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Für Termine mit gesetzter Erinnerung schickt dayli eine echte Push-Benachrichtigung an dieses Gerät — auch wenn die App vollständig geschlossen ist.
      </p>

      {status === "unsupported" || !supported ? (
        <div
          className="flex items-start gap-3 rounded-[16px] border px-3.5 py-3"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <TriangleAlert size={17} className="mt-0.5 shrink-0" style={{ color: "var(--dl-text-faint)" }} />
          <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
            Dieser Browser unterstützt keine Push-Benachrichtigungen. Ihr seht Erinnerungen trotzdem als Hinweis und in der Glocke oben.
          </p>
        </div>
      ) : (
        <div
          className="rounded-[16px] border p-3.5"
          style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
        >
          <ToggleRow
            label="Push-Benachrichtigungen"
            checked={status === "subscribed"}
            onChange={handleToggle}
            disabled={busy || !profile}
          />
          {!profile && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--dl-text-dim)" }}>
              Meldet euch an, um Push-Erinnerungen für dieses Gerät zu aktivieren.
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
          Die Aktivierung gilt pro Gerät. Aktiviert Push auf jedem Handy separat, auf dem ihr Erinnerungen erhalten möchtet.
        </p>
      </div>
    </>
  );
}

export default function ErinnerungenPage() {
  return (
    <div className="pt-3">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Erinnerungen
      </h1>
      {isSupabaseConfigured ? <RealPushReminders /> : <DemoReminders />}
    </div>
  );
}
