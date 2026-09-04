"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Download,
  Lock,
  LogOut,
  PiggyBank,
  Sparkles,
  Tags,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { MenuRow } from "@/components/mehr/MenuRow";
import { useAppStore } from "@/lib/store/app-store";
import { useSheet } from "@/lib/store/sheet-context";
import { PROFILES } from "@/lib/demo-data";
import { PersonAvatar } from "@/components/ui/Avatar";
import { usePwaInstall } from "@/lib/hooks/usePwaInstall";

export default function MehrPage() {
  const { preferences } = useAppStore();
  const { openNotifications } = useSheet();
  const { isStandalone } = usePwaInstall();
  const router = useRouter();

  function handleLogout() {
    try {
      window.localStorage.removeItem("dayli:prefs:v1");
    } catch {
      // ignore
    }
    router.push("/login");
  }

  const active = PROFILES[preferences.activeProfile];

  return (
    <div className="pt-3 pb-4">
      <h1 className="mb-4 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Mehr
      </h1>

      <div
        className="mb-5 flex items-center gap-3 rounded-[16px] border px-3.5 py-3"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
      >
        <PersonAvatar assignee={active.id} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold" style={{ color: "var(--dl-text)" }}>
            {active.name}
          </p>
          <p className="text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
            Angemeldet in eurem gemeinsamen Kalender
          </p>
        </div>
        <ChevronRight size={17} style={{ color: "var(--dl-text-faint)" }} />
      </div>

      <div className="flex flex-col gap-2">
        <MenuRow icon={User} label="Profile" description="Domenico & Elisabeth" href="/mehr/profil" />
        <MenuRow icon={Bell} label="Benachrichtigungen" onClick={openNotifications} />
        <MenuRow icon={PiggyBank} label="Sparziele" href="/mehr/sparziele" />
        <MenuRow icon={Tags} label="Kategorien" href="/mehr/kategorien" />
        <MenuRow icon={SlidersHorizontal} label="Kalenderfilter" href="/mehr/filter" />
        <MenuRow icon={Sparkles} label="Darstellung" href="/mehr/darstellung" />
        <MenuRow
          icon={Download}
          label="PWA installieren"
          description={isStandalone ? "Bereits installiert" : "Auf den Homescreen legen"}
          href="/mehr/installieren"
        />
        <MenuRow icon={Lock} label="Datenschutz" href="/mehr/datenschutz" />
        <MenuRow icon={LogOut} label="Abmelden" onClick={handleLogout} danger />
      </div>
    </div>
  );
}
