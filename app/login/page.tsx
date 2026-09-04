"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAppStore } from "@/lib/store/app-store";
import { PROFILES } from "@/lib/demo-data";
import { PersonAvatar } from "@/components/ui/Avatar";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";
import type { PersonId } from "@/lib/types";

export default function LoginPage() {
  const { setActiveProfile } = useAppStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function selectDemoProfile(id: PersonId) {
    setActiveProfile(id);
    router.push("/");
  }

  async function handleSupabaseLogin(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError("Anmeldung fehlgeschlagen. Bitte prüft eure Zugangsdaten.");
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10" style={{ background: "var(--dl-bg)" }}>
      <div className="relative mb-10 h-10 w-[110px]">
        <Image src="/brand/logo.png" alt="dayli" fill sizes="110px" className="object-contain" priority />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-center text-[19px] font-bold" style={{ color: "var(--dl-text)" }}>
          Wer meldet sich an?
        </h1>
        <p className="mt-1.5 text-center text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
          Euer privater Familienkalender.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          {Object.values(PROFILES).map((profile, i) => (
            <motion.button
              key={profile.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              onClick={() => selectDemoProfile(profile.id)}
              className="flex min-h-[68px] items-center gap-3.5 rounded-[20px] border px-4 py-3.5 text-left transition-colors active:scale-[0.99]"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
            >
              <PersonAvatar assignee={profile.id} size="lg" />
              <span className="text-[16px] font-semibold" style={{ color: "var(--dl-text)" }}>
                {profile.name}
              </span>
            </motion.button>
          ))}
        </div>

        {isSupabaseConfigured && (
          <form onSubmit={handleSupabaseLogin} className="mt-8 flex flex-col gap-3 border-t pt-6" style={{ borderColor: "var(--dl-border)" }}>
            <p className="text-[12.5px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
              Oder mit E-Mail anmelden
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail"
              className="min-h-[44px] rounded-[14px] border px-3.5 text-[14px] outline-none"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text)" }}
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="min-h-[44px] rounded-[14px] border px-3.5 text-[14px] outline-none"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text)" }}
            />
            {error && (
              <p role="alert" className="text-[12.5px]" style={{ color: "var(--dl-danger)" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] rounded-full text-[14.5px] font-semibold disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))", color: "var(--dl-bg)" }}
            >
              {loading ? "Anmelden …" : "Anmelden"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
