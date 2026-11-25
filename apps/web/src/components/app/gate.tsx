"use client";

import { useState, useSyncExternalStore } from "react";
import { SignIn } from "@/components/auth/sign-in";
import { SaveFieldSheet } from "@/components/auth/save-field-sheet";
import { WelcomeBack } from "@/components/auth/welcome-back";
import { AppShell } from "@/components/ui/shell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHousehold } from "@/lib/data/hooks";
import { DataProvider, useData, useSession } from "@/lib/data/provider";
import { rememberedAccount, subscribeSession, type RememberedAccount } from "@/lib/data/session";
import { parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { TodayList } from "./today-list";

function useRemembered(): RememberedAccount | null {
  const raw = useSyncExternalStore(subscribeSession, () => JSON.stringify(rememberedAccount()), () => "null");
  return JSON.parse(raw);
}

/** "/": sign in or welcome back with no session; onboarding until the field is set up; then Home. */
export function AppGate() {
  const session = useSession();
  const remembered = useRemembered();
  const [someoneElse, setSomeoneElse] = useState(false);
  if (session === undefined) return null;
  if (!session) return remembered && !someoneElse ? <WelcomeBack account={remembered} onSomeoneElse={() => setSomeoneElse(true)} /> : <SignIn />;
  return (
    <DataProvider fallback={null}>
      <HomeForNow />
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

/** Placeholder Home until Phase 4: the field's name and today's jobs. */
function HomeForNow() {
  const household = useHousehold();
  const today = useToday();
  useOnboardingGuard(household ? !!household.onboarded_at : undefined);
  if (!household?.onboarded_at || !today) return null;
  const dateLine = parseIsoDate(today).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <AppShell>
      <div className="flex flex-col gap-2 px-8 pt-8">
        <span className="text-[16px] text-ink-soft">{[dateLine, household.place].filter(Boolean).join(" · ")}</span>
        <h1 className="font-mincho text-[34px] font-normal">{household.name}</h1>
      </div>
      <section aria-labelledby="today" className="px-8 pt-10">
        <div className="flex items-baseline justify-between">
          <h2 id="today" className="font-mincho text-[26px] font-normal">
            Today
          </h2>
          <span className="text-[16px] text-ink-soft">A few small things</span>
        </div>
        <TodayList day={today} />
      </section>
      <SaveFieldSheet />
    </AppShell>
  );
}
