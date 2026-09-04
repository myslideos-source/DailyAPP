import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Returns a singleton Supabase client, or null when no project is
 * configured. dayli always has to work from local demo data alone, so
 * every caller must handle the null case instead of assuming a backend.
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createBrowserClient<Database>(url!, anonKey!);
  }
  return client;
}
