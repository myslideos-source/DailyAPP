"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DayliDock } from "@/components/layout/DayliDock";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { SplashScreen } from "@/components/splash/SplashScreen";
import { ToastStack } from "@/components/ui/Toast";
import { QuickAddMenu } from "@/components/sheets/QuickAddMenu";
import { EventFormSheet } from "@/components/sheets/EventFormSheet";
import { TaskFormSheet } from "@/components/sheets/TaskFormSheet";
import { NewEventSheet } from "@/components/sheets/NewEventSheet";
import { FreeTimeSheet } from "@/components/sheets/FreeTimeSheet";
import { NotificationsSheet } from "@/components/sheets/NotificationsSheet";
import { ReminderScheduler } from "@/components/pwa/ReminderScheduler";
import { SheetProvider, useSheet } from "@/lib/store/sheet-context";
import { SavePulseProvider } from "@/lib/store/save-pulse-context";
import { useAppStore } from "@/lib/store/app-store";
import { useSplash } from "@/lib/store/splash-context";
import { toISODate } from "@/lib/date-utils";

function SheetRenderer() {
  const { sheet, openQuickAdd, openNewEvent, close } = useSheet();
  const { events } = useAppStore();

  // Always the true base record (never a recurrence-expanded occurrence),
  // so editing a future instance can't silently move the whole series.
  const editEvent = sheet?.kind === "event" ? (events.find((e) => e.id === sheet.editEventId) ?? null) : null;

  const manualDate =
    sheet?.kind === "newEventManual" ? sheet.date ?? toISODate(new Date()) : toISODate(new Date());

  return (
    <>
      <QuickAddMenu
        open={sheet?.kind === "menu"}
        onClose={close}
        onSelect={openQuickAdd}
        onNewEvent={() => openNewEvent()}
      />
      <NewEventSheet
        open={sheet?.kind === "newEvent"}
        onClose={close}
        defaultDate={sheet?.kind === "newEvent" ? sheet.date ?? toISODate(new Date()) : toISODate(new Date())}
      />
      <EventFormSheet
        open={sheet?.kind === "event" || sheet?.kind === "newEventManual"}
        onClose={close}
        defaultDate={manualDate}
        editEvent={editEvent}
      />
      <EventFormSheet
        open={sheet?.kind === "birthday"}
        onClose={close}
        defaultDate={toISODate(new Date())}
        presetCategory="geburtstag"
      />
      <TaskFormSheet open={sheet?.kind === "task"} onClose={close} kind="task" />
      <TaskFormSheet open={sheet?.kind === "reminder"} onClose={close} kind="reminder" />
      <TaskFormSheet open={sheet?.kind === "shopping"} onClose={close} kind="shopping" />
      <FreeTimeSheet open={sheet?.kind === "freeTime"} onClose={close} />
      <NotificationsSheet open={sheet?.kind === "notifications"} onClose={close} />
    </>
  );
}

function ShellChrome({ children }: { children: React.ReactNode }) {
  const { sheet, openQuickAddMenu, openNotifications, close } = useSheet();
  const { preferences, ready } = useAppStore();
  const { splashDone } = useSplash();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (!ready || !splashDone) return;
    if (!preferences.hasOnboarded && !isLoginRoute) {
      router.replace("/login");
    }
  }, [ready, splashDone, preferences.hasOnboarded, isLoginRoute, router]);

  // Close the Dayli Dock's quick-create popover on every real route change
  // (including navigating away to a detail page where the Dock itself
  // unmounts) — tracked here rather than in DayliDock so it still fires
  // even when the Dock isn't currently rendered.
  const sheetRef = useRef(sheet);
  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (sheetRef.current?.kind === "quickCreate") close();
    }
  }, [pathname, close]);

  if (isLoginRoute) {
    return (
      <div className="relative min-h-dvh">
        <SplashScreen />
        {children}
        <ToastStack />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh md:flex">
      <div className="dl-grain" aria-hidden />
      <SplashScreen />

      <DesktopSidebar onPlusClick={openQuickAddMenu} />

      <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
        <Header onOpenNotifications={openNotifications} />
        <main className="pb-dock mx-auto w-full max-w-3xl flex-1 px-5 md:pb-12 lg:max-w-5xl">{children}</main>
      </div>

      <DayliDock />
      <ToastStack />
      <SheetRenderer />
      <ReminderScheduler />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SavePulseProvider>
      <SheetProvider>
        <ShellChrome>{children}</ShellChrome>
      </SheetProvider>
    </SavePulseProvider>
  );
}
