"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useSheet } from "@/lib/store/sheet-context";

type DayliDeepLink = { kind: "today" } | { kind: "tasks" } | { kind: "event"; eventId: string };

function parseDayliUrl(raw: string): DayliDeepLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "dayli:") return null;
  // iOS's URL parser puts the first path segment of a custom scheme into
  // `hostname` (dayli://event/abc -> hostname "event", pathname "/abc"),
  // not `pathname` as a browser would for http(s) — handled explicitly
  // rather than assumed, since this is easy to get backwards.
  if (url.hostname === "tasks") return { kind: "tasks" };
  if (url.hostname === "event") {
    const eventId = url.pathname.replace(/^\//, "");
    if (eventId) return { kind: "event", eventId };
  }
  return { kind: "today" };
}

/**
 * Routes `dayli://today`, `dayli://event/{id}`, `dayli://tasks` deep links
 * (spec §14) — fired by iOS when the widget, or anything else, opens the
 * app via its custom URL scheme (registered in ios/App/App/Info.plist).
 *
 * `@capacitor/app`'s `appUrlOpen` event covers both a cold start (the
 * event is buffered by the native layer until this listener attaches,
 * once the app finishes launching) and an already-running app, so no
 * separate `getLaunchUrl()` cold-start check is needed. A no-op entirely
 * in the browser PWA.
 *
 * Login-gating ("ist die App noch nicht angemeldet, erscheint zuerst der
 * Login") falls out of the existing route guard in AppShell's
 * ShellChrome, which already redirects to /login whenever
 * `!preferences.hasOnboarded` — router.push here still "succeeds" and
 * that guard then takes over, so the target is reached right after login
 * rather than being dropped.
 */
export function useDeepLinks() {
  const router = useRouter();
  const { openEventDetail } = useSheet();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const link = parseDayliUrl(url);
      if (!link) return;
      if (link.kind === "event") openEventDetail(link.eventId);
      else if (link.kind === "tasks") router.push("/aufgaben");
      else router.push("/");
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [router, openEventDetail]);
}
