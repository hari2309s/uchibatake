import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * Supabase is only used for signing in (and, later, opt-in sync). Everything
 * else lives on the device. The code exchange happens in the browser (PKCE),
 * so a sign-in link works on the phone that asked for it.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when this build has Supabase keys. Without them, guest and demo still work fully. */
export const AUTH_CONFIGURED = !!(URL && KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!AUTH_CONFIGURED || typeof window === "undefined") return null;
  client ??= createClient(URL!, KEY!, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
