"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function subscriptionKeys(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" };
}

type Status = "unsupported" | "unknown" | "subscribed" | "unsubscribed";

/** Real, background-capable push subscriptions — requires Supabase to be
 * configured (a device-tied row lives in push_subscriptions, delivered to
 * by the send-due-reminders edge function on a schedule). */
export function usePushSubscription(profileId: string | null | undefined) {
  const [status, setStatus] = useState<Status>("unknown");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    } catch {
      setStatus("unsupported");
    }
  }, []);

  // One-time check of the current subscription state on mount; not a
  // subscription to an external store's change events.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const subscribe = useCallback(async () => {
    if (!profileId || !VAPID_PUBLIC_KEY) return false;
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const { p256dh, auth } = subscriptionKeys(subscription);
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          profile_id: profileId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;

      setStatus("subscribed");
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [profileId]);

  const unsubscribe = useCallback(async () => {
    const supabase = getSupabaseClient();
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, subscribe, unsubscribe, supported: Boolean(VAPID_PUBLIC_KEY) };
}
