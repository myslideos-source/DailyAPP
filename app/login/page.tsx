"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAppStore } from "@/lib/store/app-store";
import { PROFILES } from "@/lib/demo-data";
import { PersonAvatar } from "@/components/ui/Avatar";
import { ChipGroup } from "@/components/ui/FormControls";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/lib/store/auth-context";
import type { PersonId } from "@/lib/types";

function DemoLogin() {
  const { setActiveProfile } = useAppStore();
  const router = useRouter();

  function selectDemoProfile(id: PersonId) {
    setActiveProfile(id);
    router.push("/");
  }

  return (
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
  );
}

function SupabaseLogin() {
  const { signUp, signIn } = useSupabaseAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [person, setPerson] = useState<PersonId>("domenico");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signin") {
      const { error: authError } = await signIn({ email, password });
      setLoading(false);
      if (authError) {
        setError("Anmeldung fehlgeschlagen. Bitte prüft eure Zugangsdaten.");
        return;
      }
      router.push("/");
    } else {
      const { error: authError, needsConfirmation } = await signUp({ email, password, person });
      setLoading(false);
      if (authError) {
        setError(authError);
        return;
      }
      if (needsConfirmation) {
        setConfirmationSent(true);
      } else {
        router.push("/");
      }
    }
  }

  if (confirmationSent) {
    return (
      <div className="mt-8 rounded-[16px] border p-4 text-center text-[13.5px]" style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text)" }}>
        Fast geschafft! Wir haben euch eine Bestätigungs-E-Mail an <strong>{email}</strong> geschickt. Bestätigt sie und meldet euch danach an.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3.5">
      <div className="flex rounded-full border p-1" style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}>
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="min-h-[38px] flex-1 rounded-full text-[13.5px] font-medium transition-colors"
            style={
              mode === m
                ? { background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))", color: "var(--dl-bg)" }
                : { color: "var(--dl-text-dim)" }
            }
          >
            {m === "signin" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>

      {mode === "signup" && (
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
            Wer bist du?
          </p>
          <ChipGroup
            ariaLabel="Wer bist du"
            options={[
              { value: "domenico" as const, label: "Domenico" },
              { value: "elisabeth" as const, label: "Elisabeth" },
            ]}
            value={person}
            onChange={setPerson}
          />
        </div>
      )}

      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-Mail"
        className="min-h-[44px] rounded-[14px] border px-3.5 text-[14px] outline-none"
        style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text)" }}
      />
      <input
        type="password"
        required
        minLength={8}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
        className="min-h-[46px] rounded-full text-[14.5px] font-semibold disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))", color: "var(--dl-bg)" }}
      >
        {loading ? "Einen Moment …" : mode === "signin" ? "Anmelden" : "Konto erstellen"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10" style={{ background: "var(--dl-bg)" }}>
      <div className="relative mb-10 h-10 w-[110px]">
        <Image src="/brand/logo.png" alt="dayli" fill sizes="110px" className="object-contain" priority />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-center text-[19px] font-bold" style={{ color: "var(--dl-text)" }}>
          {isSupabaseConfigured ? "Willkommen bei dayli" : "Wer meldet sich an?"}
        </h1>
        <p className="mt-1.5 text-center text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
          Euer privater Familienkalender.
        </p>

        {isSupabaseConfigured ? <SupabaseLogin /> : <DemoLogin />}
      </div>
    </div>
  );
}
