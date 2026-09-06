// Thin wrapper around the custom "DayliWidgetBridge" Capacitor plugin (the
// native Swift side lives at ios/DayliWidget/DayliWidgetBridgePlugin.swift —
// see ios/README.md for how to register it as an Xcode target). A no-op
// everywhere the app isn't running inside the native iOS shell, so the
// plain PWA in a browser never touches this at all.
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { WidgetSnapshotPayload } from "@/lib/widget-snapshot";

interface DayliWidgetBridgePlugin {
  /** Writes `json` (a serialized WidgetSnapshotPayload) into the shared
   * App Group container and calls WidgetCenter.reloadTimelines. */
  writeSnapshot(options: { json: string }): Promise<void>;
  /** Deletes the snapshot file — called on sign-out so a stale, possibly
   * personal snapshot never lingers on the home screen for a logged-out
   * device (spec §15 "Nicht angemeldet" must show the signed-out state,
   * not yesterday's events). */
  clearSnapshot(): Promise<void>;
}

const DayliWidgetBridge = registerPlugin<DayliWidgetBridgePlugin>("DayliWidgetBridge");

export async function pushWidgetSnapshot(payload: WidgetSnapshotPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await DayliWidgetBridge.writeSnapshot({ json: JSON.stringify(payload) });
  } catch {
    // Best-effort — a native bridge failure (e.g. extension not yet built
    // into this install) must never break the web app itself.
  }
}

export async function clearWidgetSnapshot(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await DayliWidgetBridge.clearSnapshot();
  } catch {
    // ignore
  }
}
