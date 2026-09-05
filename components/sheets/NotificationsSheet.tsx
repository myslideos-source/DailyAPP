"use client";

import { BellOff } from "lucide-react";
import { FullscreenPage } from "@/components/ui/FullscreenPage";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";

export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, markNotificationRead } = useAppStore();

  return (
    <FullscreenPage
      open={open}
      onClose={onClose}
      title="Benachrichtigungen"
      leftAction={
        <button type="button" onClick={onClose} className="text-[15px]" style={{ color: "var(--dl-text-dim)" }}>
          Schließen
        </button>
      }
    >
      {notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="Keine Benachrichtigungen" description="Ihr seid auf dem Laufenden." />
      ) : (
        <ul className="flex flex-col gap-2 pb-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => markNotificationRead(n.id)}
                className="flex w-full items-start gap-3 rounded-[14px] border px-3.5 py-3 text-left"
                style={{
                  borderColor: "var(--dl-border)",
                  background: n.read ? "transparent" : "var(--dl-card)",
                }}
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: n.read ? "transparent" : "var(--dl-together)" }}
                />
                <div>
                  <p className="text-[14px] font-medium" style={{ color: "var(--dl-text)" }}>
                    {n.title}
                  </p>
                  <p className="text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
                    {n.body}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </FullscreenPage>
  );
}
