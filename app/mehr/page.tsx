"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  ChevronRight,
  DatabaseBackup,
  Download,
  History,
  House,
  Lock,
  LogOut,
  NotebookText,
  PiggyBank,
  Sparkles,
  Tags,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { MenuRow } from "@/components/mehr/MenuRow";
import { useAppStore } from "@/lib/store/app-store";
import { PROFILES } from "@/lib/demo-data";
import { PersonAvatar } from "@/components/ui/Avatar";
import { usePwaInstall } from "@/lib/hooks/usePwaInstall";
import { useOptionalSupabaseAuth } from "@/lib/store/auth-context";

function useLogout() {
  const router = useRouter();
  const supabaseAuth = useOptionalSupabaseAuth();

  return async () => {
    if (supabaseAuth) {
      await supabaseAuth.signOut();
    } else {
      try {
        window.localStorage.removeItem("dayli:prefs:v1");
      } catch {
        // ignore
      }
    }
    router.push("/login");
  };
}

export default function MehrPage() {
  const { preferences } = useAppStore();
  const { isStandalone } = usePwaInstall();
  const handleLogout = useLogout();

  const active = PROFILES[preferences.activeProfile];

  return (
    <div className="pt-3 pb-4">
      <div className="mb-4 flex items-center gap-2.5">
        <Link
          href="/"
          aria-label="Zur Startseite"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ color: "var(--dl-text-dim)" }}
        >
          <House size={19} />
        </Link>
        <h1 className="text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
          Mehr
        </h1>
      </div>

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
        <MenuRow icon={BellRing} label="Erinnerungen" description="Termin-Erinnerungen" href="/mehr/erinnerungen" />
        <MenuRow icon={PiggyBank} label="Sparziele" href="/mehr/sparziele" />
        <MenuRow icon={NotebookText} label="Notizen" description="Geteilt mit der Familie" href="/mehr/notizen" />
        <MenuRow icon={History} label="Verlauf" description="Wer hat was gemacht" href="/mehr/verlauf" />
        <MenuRow icon={Tags} label="Kategorien" href="/mehr/kategorien" />
        <MenuRow icon={SlidersHorizontal} label="Kalenderfilter" href="/mehr/filter" />
        <MenuRow icon={Sparkles} label="Darstellung" href="/mehr/darstellung" />
        <MenuRow
          icon={Download}
          label="PWA installieren"
          description={isStandalone ? "Bereits installiert" : "Auf den Homescreen legen"}
          href="/mehr/installieren"
        />
        <MenuRow icon={DatabaseBackup} label="Sicherung" description="Exportieren & wiederherstellen" href="/mehr/backup" />
        <MenuRow icon={Lock} label="Datenschutz" href="/mehr/datenschutz" />
        <MenuRow icon={LogOut} label="Abmelden" onClick={handleLogout} danger />
      </div>
    </div>
  );
}
