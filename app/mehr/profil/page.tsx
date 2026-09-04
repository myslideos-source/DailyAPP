"use client";

import { Check, Mail } from "lucide-react";
import { BackLink } from "@/components/mehr/BackLink";
import { PersonAvatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store/app-store";
import { PROFILES } from "@/lib/demo-data";
import { useOptionalSupabaseAuth } from "@/lib/store/auth-context";
import type { PersonId } from "@/lib/types";

function DemoProfileSwitcher() {
  const { preferences, setActiveProfile, showToast } = useAppStore();

  function select(id: PersonId) {
    setActiveProfile(id);
    showToast(`Angemeldet als ${PROFILES[id].name}`);
  }

  return (
    <>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Wähle, wessen Ansicht gerade aktiv ist. Beide seht ihr dieselben Familieninhalte.
      </p>
      <div className="flex flex-col gap-2.5">
        {Object.values(PROFILES).map((profile) => {
          const active = preferences.activeProfile === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => select(profile.id)}
              className="flex min-h-[64px] items-center gap-3 rounded-[16px] border px-4 py-3 text-left transition-colors"
              style={{
                borderColor: active ? profile.color : "var(--dl-border)",
                background: active ? `color-mix(in srgb, ${profile.color} 12%, var(--dl-card))` : "var(--dl-card)",
              }}
            >
              <PersonAvatar assignee={profile.id} size="lg" />
              <span className="flex-1 text-[15.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
                {profile.name}
              </span>
              {active && <Check size={19} style={{ color: profile.color }} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

function SupabaseAccountInfo() {
  const { profile, session, personId } = useOptionalSupabaseAuth() ?? {};

  return (
    <>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Eure Identität ist an euer Konto gekoppelt. Beide seht ihr dieselben Familieninhalte.
      </p>
      {personId && (
        <div
          className="flex items-center gap-3 rounded-[16px] border px-4 py-3.5"
          style={{ borderColor: PROFILES[personId].color, background: `color-mix(in srgb, ${PROFILES[personId].color} 12%, var(--dl-card))` }}
        >
          <PersonAvatar assignee={personId} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-semibold" style={{ color: "var(--dl-text)" }}>
              {profile?.displayName}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
              <Mail size={13} /> {session?.user.email}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProfilPage() {
  const supabaseAuth = useOptionalSupabaseAuth();

  return (
    <div className="pt-3">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Profile
      </h1>
      {supabaseAuth ? <SupabaseAccountInfo /> : <DemoProfileSwitcher />}
    </div>
  );
}
