"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PersonId } from "@/lib/types";

interface Profile {
  id: string;
  familyId: string | null;
  displayName: string;
  initial: string;
  color: string;
}

interface AuthContextValue {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  personId: PersonId | null;
  signUp: (input: { email: string; password: string; person: PersonId }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (input: { email: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, family_id, display_name, initial, color")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      return;
    }

    let familyId = data.family_id;
    if (!familyId) {
      const { data: joinedFamilyId, error: joinError } = await supabase.rpc("join_family_slot");
      if (!joinError && joinedFamilyId) {
        familyId = joinedFamilyId;
      }
    }

    setProfile({
      id: data.id,
      familyId: familyId ?? null,
      displayName: data.display_name,
      initial: data.initial,
      color: data.color,
    });
  }, []);

  // SupabaseAuthProvider is only ever mounted when Supabase is configured
  // (see AppStoreProvider's branch in lib/store/app-store.tsx).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const signUp = useCallback(async ({ email, password, person }: { email: string; password: string; person: PersonId }) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Supabase ist nicht konfiguriert.", needsConfirmation: false };

    const displayName = person === "domenico" ? "Domenico" : "Elisabeth";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message, needsConfirmation: false };

    const needsConfirmation = !data.session;
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    }
    return { error: null, needsConfirmation };
  }, [loadProfile]);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Supabase ist nicht konfiguriert." };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    setSession(data.session);
    await loadProfile(data.session.user.id);
    return { error: null };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const personId = useMemo<PersonId | null>(() => {
    if (!profile) return null;
    return profile.displayName.toLowerCase() === "elisabeth" ? "elisabeth" : "domenico";
  }, [profile]);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, session, profile, personId, signUp, signIn, signOut }),
    [ready, session, profile, personId, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSupabaseAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  return ctx;
}

/** Safe to call from components shared between demo and Supabase mode —
 * returns null instead of throwing when no SupabaseAuthProvider is mounted. */
export function useOptionalSupabaseAuth() {
  return useContext(AuthContext);
}
