"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { SaveFieldSheet } from "@/components/auth/save-field-sheet";
import { SignIn } from "@/components/auth/sign-in";
import { WelcomeBack } from "@/components/auth/welcome-back";
import { BottomNav, Column } from "@/components/ui/shell";
import { useHousehold } from "@/lib/data/hooks";
import { DataProvider, useData, useSession } from "@/lib/data/provider";
import { endSession, rememberedAccount, subscribeSession, type RememberedAccount } from "@/lib/data/session";
import { ForecastProvider } from "@/lib/forecast-context";
import { AppHeader } from "./header";
import { Notifier } from "./notifier";
import { Sharer } from "./sharer";
import { Redirect } from "./redirect";

function useRemembered(): RememberedAccount | null {
  const raw = useSyncExternalStore(subscribeSession, () => JSON.stringify(rememberedAccount()), () => "null");
  return JSON.parse(raw);
}

/**
 * Every app screen sits in this frame: the session and the on-device database
 * stay open between screens (so live data carries over and route changes can
 * animate), with the bottom nav, the demo strip and the save-your-field sheet.
 * With no session, "/" is the front door and anything else goes there.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const path = usePathname() ?? "/";
  const remembered = useRemembered();
  const [someoneElse, setSomeoneElse] = useState(false);
  if (session === undefined) return null;
  if (!session) {
    if (path !== "/") return <Redirect to="/" />;
    return remembered && !someoneElse ? <WelcomeBack account={remembered} onSomeoneElse={() => setSomeoneElse(true)} /> : <SignIn />;
  }
  return (
    <DataProvider fallback={null}>
      <Field path={path}>{children}</Field>
    </DataProvider>
  );
}

/**
 * Sends an unfinished field to onboarding. It re-reads the household from the
 * database before going: Next keeps visited pages mounted (hidden) and re-runs
 * their effects when they're shown again, so a remembered value can be stale.
 */
function useOnboardingGuard(onboarded: boolean | undefined) {
  const { db, householdId } = useData();
  const router = useRouter();
  useEffect(() => {
    if (onboarded !== false) return;
    let cancelled = false;
    db.households.get(householdId).then((h) => {
      if (!cancelled && h && !h.onboarded_at) router.replace("/start/where");
    });
    return () => {
      cancelled = true;
    };
  }, [onboarded, db, householdId, router]);
}

function Field({ path, children }: { path: string; children: React.ReactNode }) {
  const household = useHousehold();
  useOnboardingGuard(household ? !!household.onboarded_at : undefined);
  if (!household?.onboarded_at) return null;
  // Full-screen notices (13b) have no nav.
  const full = path.startsWith("/notice/") || path.startsWith("/kid/");
  return (
    <ForecastProvider>
    <Column>
      {full ? null : <DemoStrip />}
      {full ? null : <AppHeader />}
      <main className="flex flex-1 flex-col pb-11">
        {children}
      </main>
      {full ? null : <BottomNav />}
      <SaveFieldSheet />
      <Notifier />
      <Sharer />
    </Column>
    </ForecastProvider>
  );
}

/** A quiet strip while exploring the demo, with the way out. */
function DemoStrip() {
  const { session } = useData();
  const household = useHousehold();
  const router = useRouter();
  if (session.kind !== "demo") return null;
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-rule pl-8 pr-4 text-[15px] text-ink-soft">
      <span>Exploring {household?.name.replace(/ family$/, " field") ?? "the demo"}</span>
      <button
        type="button"
        className="min-h-11 px-3 text-[16px] text-ink underline underline-offset-4"
        onClick={() => {
          endSession();
          router.replace("/");
        }}
      >
        Leave the demo
      </button>
    </div>
  );
}
