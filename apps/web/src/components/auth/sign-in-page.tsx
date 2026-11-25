"use client";

import { useSearchParams } from "next/navigation";
import { Redirect } from "@/components/app/redirect";
import { useSession } from "@/lib/data/provider";
import { SignIn } from "./sign-in";

/** /sign-in: A 01, opening the email sheet when asked (?email=1). Already in? Go home. */
export function SignInPage() {
  const session = useSession();
  const wantsEmail = useSearchParams().get("email") === "1";
  if (session === undefined) return null;
  if (session) return <Redirect to="/" />;
  // Keyed, so arriving again with ?email=1 (e.g. "Wrong address?") opens the sheet even on a kept page.
  return <SignIn key={wantsEmail ? "email" : "door"} openEmail={wantsEmail} />;
}
