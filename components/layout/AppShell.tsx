"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DayliDock } from "@/components/layout/DayliDock";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { SplashScreen } from "@/components/splash/SplashScreen";
import { ToastStack } from "@/components/ui/Toast";
import { QuickAddMenu } from "@/components/sheets/QuickAddMenu";
import { EventFormSheet } from "@/components/sheets/EventFormSheet";
import { EventDetailSheet } from "@/components/sheets/EventDetailSheet";
import { TaskFormSheet } from "@/components/sheets/TaskFormSheet";
import { NewEventSheet } from "@/components/sheets/NewEventSheet";
import { FreeTimeSheet } from "@/components/sheets/FreeTimeSheet";
import { NoteEditorSheet } from "@/components/sheets/NoteEditorSheet";
import { DailyBriefingCard } from "@/components/today/DailyBriefingCard";
import { HausbauOverviewSheet } from "@/components/hausbau/HausbauOverviewSheet";
import { HausbauBudgetFormSheet } from "@/components/hausbau/HausbauBudgetFormSheet";
import { HausbauExpenseDetailSheet } from "@/components/hausbau/HausbauExpenseDetailSheet";
import { HausbauExpenseFormSheet } from "@/components/hausbau/HausbauExpenseFormSheet";
import { HausbauSelfWorkDetailSheet } from "@/components/hausbau/HausbauSelfWorkDetailSheet";
import { HausbauSelfWorkFormSheet } from "@/components/hausbau/HausbauSelfWorkFormSheet";
import { HausbauCategoryManagerSheet } from "@/components/hausbau/HausbauCategoryManagerSheet";
import { ReminderScheduler } from "@/components/pwa/ReminderScheduler";
import { SheetProvider, useSheet } from "@/lib/store/sheet-context";
import { SavePulseProvider } from "@/lib/store/save-pulse-context";
import { useAppStore } from "@/lib/store/app-store";
import { useSplash } from "@/lib/store/splash-context";
import { useViewportBottomFix } from "@/lib/hooks/useViewportBottomFix";
import { useWidgetSnapshotSync } from "@/lib/hooks/useWidgetSnapshotSync";
import { useDeepLinks } from "@/lib/hooks/useDeepLinks";
import { toISODate, getBerlinParts } from "@/lib/date-utils";
import { computeDailyBriefing } from "@/lib/briefing";

function SheetRenderer() {
  const { sheet, openQuickAdd, openNewEvent, close } = useSheet();
  const { events } = useAppStore();

  // Always the true base record (never a recurrence-expanded occurrence),
  // so editing a future instance can't silently move the whole series.
  const editEvent = sheet?.kind === "eventEdit" ? (events.find((e) => e.id === sheet.editEventId) ?? null) : null;
  const detailEventId = sheet?.kind === "eventDetail" ? sheet.eventId : null;

  const manualDate =
    sheet?.kind === "newEventManual" ? sheet.date ?? toISODate(new Date()) : toISODate(new Date());
  const noteId = sheet?.kind === "noteEditor" ? sheet.noteId : null;

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
      <EventDetailSheet open={sheet?.kind === "eventDetail"} onClose={close} eventId={detailEventId} />
      <EventFormSheet
        open={sheet?.kind === "eventEdit" || sheet?.kind === "newEventManual"}
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
      <NoteEditorSheet open={sheet?.kind === "noteEditor"} onClose={close} noteId={noteId} />
      <HausbauOverviewSheet open={sheet?.kind === "hausbauOverview"} onClose={close} />
      <HausbauBudgetFormSheet open={sheet?.kind === "hausbauBudget"} onClose={close} />
      <HausbauExpenseDetailSheet
        open={sheet?.kind === "hausbauExpenseDetail"}
        onClose={close}
        expenseId={sheet?.kind === "hausbauExpenseDetail" ? sheet.expenseId : null}
      />
      <HausbauExpenseFormSheet
        open={sheet?.kind === "hausbauExpenseEdit"}
        onClose={close}
        expenseId={sheet?.kind === "hausbauExpenseEdit" ? sheet.expenseId : undefined}
      />
      <HausbauSelfWorkDetailSheet
        open={sheet?.kind === "hausbauSelfWorkDetail"}
        onClose={close}
        selfWorkId={sheet?.kind === "hausbauSelfWorkDetail" ? sheet.selfWorkId : null}
      />
      <HausbauSelfWorkFormSheet
        open={sheet?.kind === "hausbauSelfWorkEdit"}
        onClose={close}
        selfWorkId={sheet?.kind === "hausbauSelfWorkEdit" ? sheet.selfWorkId : undefined}
      />
      <HausbauCategoryManagerSheet open={sheet?.kind === "hausbauCategoryManager"} onClose={close} />
    </>
  );
}

/**
 * Owns both the automatic once-per-calendar-day daily briefing (mounted
 * here, inside ShellChrome, so it survives route navigation without
 * remounting — a page swap must never re-trigger the auto-show check) and
 * the manually-reopenable briefing card itself. Always computed off the
 * real events/tasks store, never off whatever date the Kalender/Heute
 * week-strip currently has selected (spec §7).
 */
function DailyBriefingHost() {
  const { events, tasks, preferences, ready, markDailyBriefingSeen } = useAppStore();
  const { sheet, openDailyBriefing, close } = useSheet();
  const router = useRouter();
  const hasCheckedAutoShowRef = useRef(false);

  useEffect(() => {
    if (!ready || hasCheckedAutoShowRef.current) return;
    hasCheckedAutoShowRef.current = true;
    const { dailyBriefing, activeProfile, dailyBriefingSeenDates } = preferences;
    if (!dailyBriefing.enabled || !dailyBriefing.autoShow) return;
    const { isoDate: todayISO, isWeekday } = getBerlinParts();
    if (dailyBriefing.frequency === "weekdays" && !isWeekday) return;
    if (dailyBriefingSeenDates[activeProfile] === todayISO) return;
    openDailyBriefing();
    // Runs once per mount (guarded above) purely off `ready` flipping to
    // true — re-reading `preferences`/`openDailyBriefing` fresh inside is
    // intentional, not a missing dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const data = useMemo(
    () =>
      computeDailyBriefing({
        events,
        tasks,
        personId: preferences.activeProfile,
        includeShared: preferences.dailyBriefing.includeShared,
        includePersonal: preferences.dailyBriefing.includePersonal,
      }),
    [events, tasks, preferences.activeProfile, preferences.dailyBriefing.includeShared, preferences.dailyBriefing.includePersonal],
  );

  function handleLater() {
    markDailyBriefingSeen();
    close();
  }

  function handleViewDay() {
    markDailyBriefingSeen();
    close();
    router.push("/");
  }

  return <DailyBriefingCard open={sheet?.kind === "dailyBriefing"} data={data} onLater={handleLater} onViewDay={handleViewDay} />;
}

function ShellChrome({ children }: { children: React.ReactNode }) {
  const { sheet, openQuickAddMenu, openEventDetail, close } = useSheet();
  const { preferences, ready } = useAppStore();
  const { splashDone } = useSplash();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/login";

  useViewportBottomFix();
  useWidgetSnapshotSync();
  useDeepLinks();

  useEffect(() => {
    if (!ready || !splashDone) return;
    if (!preferences.hasOnboarded && !isLoginRoute) {
      router.replace("/login");
    }
  }, [ready, splashDone, preferences.hasOnboarded, isLoginRoute, router]);

  // Web-Push side of the "tap a reminder → land on that event" deep link —
  // useDeepLinks above covers the native `dayli://event/{id}` scheme, but
  // the actual PWA reminders (public/sw.js's notificationclick) navigate to
  // a plain `/?event={id}` URL instead, since a service worker has no way
  // to fire the Capacitor-only appUrlOpen event. Gated on `ready` (events
  // loaded) rather than pathname, since this only ever needs to run once
  // per fresh load — a real browser navigation from the service worker,
  // not a client-side route change, is what gets a tab here in the first
  // place. The param is stripped right after so a later refresh or back
  // navigation doesn't reopen the same sheet.
  useEffect(() => {
    if (!ready || isLoginRoute) return;
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (!eventId) return;
    openEventDetail(eventId);
    const url = new URL(window.location.href);
    url.searchParams.delete("event");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [ready, isLoginRoute, openEventDetail]);

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
        <Header />
        <main className="pb-dock mx-auto w-full max-w-3xl flex-1 px-5 md:pb-12 lg:max-w-5xl">{children}</main>
      </div>

      <DayliDock />
      <ToastStack />
      <SheetRenderer />
      <DailyBriefingHost />
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
