"use client";

import { Redirect } from "@/components/app/redirect";
import { DataProvider } from "@/lib/data/provider";
import type { Step } from "./draft";
import { Onboarding } from "./flow";

/** /start/<step>: onboarding inside the current session's field. No session yet? Back to the front door. */
export function StartPage({ step }: { step: Step }) {
  return (
    <DataProvider fallback={<Redirect to="/" />}>
      <Onboarding step={step} />
    </DataProvider>
  );
}
