"use client";

import { stopPushHere } from "./push";
import { supabase } from "./supabase";

export type Provider = "google" | "email";

export interface AccountUser {
  id: string;
  email: string;
  name: string | null;
  provider: Provider;
}

const callbackUrl = () => new URL("/auth/callback", location.origin).toString();

const SENT_KEY = "uchibatake-link-sent";

/** Emails a one-time sign-in link. Resolves with null, or a calm message to show. */
export async function sendSignInLink(email: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Signing in isn't set up here yet. You can still explore without an account.";
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl() } });
  if (error) return /rate|seconds/i.test(error.message) ? "We sent one a moment ago. Give it a minute, then try again." : "We couldn't send the link just now. Check the address and try again.";
  try {
    sessionStorage.setItem(SENT_KEY, JSON.stringify({ email, at: Date.now() }));
  } catch {
    // Not kept: M01 just won't show the address.
  }
  return null;
}

export function lastLinkSent(): { email: string; at: number } | null {
  try {
    return JSON.parse(sessionStorage.getItem(SENT_KEY) ?? "null");
  } catch {
    return null;
  }
}

/** Goes to Google; comes back to /auth/callback. */
export async function signInWithGoogle(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Signing in isn't set up here yet.";
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
  return error ? "Google didn't answer just now. Try again in a moment." : null;
}

/** Finishes a sign-in from the link or Google's redirect. Null when the code doesn't work (used, expired, other browser). */
export async function finishSignIn(code: string): Promise<AccountUser | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  // A retry after the code was already used: this browser may be signed in already.
  const u = !error && data.user ? data.user : (await sb.auth.getUser()).data.user;
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  const full = (meta.full_name || meta.name || "") as string;
  return {
    id: u.id,
    email: u.email ?? "",
    name: full ? full.split(/\s+/)[0] : null,
    provider: u.app_metadata?.provider === "google" ? "google" : "email",
  };
}

/** Signs out on this device only (the field stays on the device under the account). */
export async function signOutHere(): Promise<void> {
  // While still signed in: this browser stops getting the account's daily note.
  await stopPushHere();
  await supabase()?.auth.signOut({ scope: "local" });
}
