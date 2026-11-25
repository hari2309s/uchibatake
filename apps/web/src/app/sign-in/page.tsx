import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPage } from "@/components/auth/sign-in-page";

export const metadata: Metadata = { title: "Sign in · Uchibatake" };

export default function Page() {
  // useSearchParams needs a Suspense boundary on a prerendered page.
  return (
    <Suspense>
      <SignInPage />
    </Suspense>
  );
}
