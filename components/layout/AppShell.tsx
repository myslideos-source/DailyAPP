"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { SplashScreen } from "@/components/splash/SplashScreen";
import { ToastStack } from "@/components/ui/Toast";
import { QuickAddMenu } from "@/components/sheets/QuickAddMenu";
import { EventFormSheet } from "@/components/sheets/EventFormSheet";
import { TaskFormSheet } from "@/components/sheets/TaskFormSheet";
import { NotificationsSheet } from "@/components/sheets/NotificationsSheet";
import { SheetProvider, useSheet } from "@/lib/store/sheet-context";
import { useAppStore } from "@/lib/store/app-store";
import { useSplash } from "@/lib/store/splash-context";
import { toISODate } from "@/lib/date-utils";

function SheetRenderer() {
  const { sheet, openQuickAdd, close } = useSheet();

  return (
    <>
      <QuickAddMenu open={sheet?.kind === "menu"} onClose={close} onSelect={openQuickAdd} />
      <EventFormSheet
        open={sheet?.kind === "event"}
        onClose={close}
        defaultDate={sheet?.kind === "event" ? sheet.date ?? toISODate(new Date()) : toISODate(new Date())}
        editEvent={sheet?.kind === "event" ? sheet.editEvent ?? null : null}
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
      <NotificationsSheet open={sheet?.kind === "notifications"} onClose={close} />
    </>
  );
}

function ShellChrome({ children }: { children: React.ReactNode }) {
  const { openQuickAddMenu, openNotifications } = useSheet();
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
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-28 md:pb-12 lg:max-w-5xl">{children}</main>
      </div>

      <BottomNav onPlusClick={openQuickAddMenu} />
      <ToastStack />
      <SheetRenderer />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SheetProvider>
      <ShellChrome>{children}</ShellChrome>
    </SheetProvider>
  );
}
