"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { BrokenEnso } from "@/components/ui/enso";
import { Column } from "@/components/ui/shell";
import { isoDate } from "../dates";
import { seedDemo } from "../demo/seed";
import { openFieldDB, type FieldDB } from "./db";
import { create, live } from "./repo";
import { readSession, subscribeSession, type Session } from "./session";
import type { Household } from "./types";

interface DataContextValue {
  db: FieldDB;
  session: Session;
  householdId: string;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}

/** The session; `undefined` until the device's storage has been read (server render and hydration). */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribeSession, readSession, () => undefined);
}

/**
 * Makes sure the database has its household: the demo is seeded, a guest gets
 * an empty field. Check and create happen in one transaction, and the guest's
 * household id is fixed, so two runs at once (StrictMode, two tabs) make one.
 */
async function ensureHousehold(db: FieldDB, session: Session): Promise<string> {
  if (session.kind === "demo") {
    if (!(await live(db.households))[0]) await seedDemo(db);
    return (await live(db.households))[0].id;
  }
  const id = session.id;
  await db.transaction("rw", db.households, async () => {
    if ((await live(db.households))[0]) return;
    const h: Omit<Household, "household_id" | "created_at" | "updated_at" | "deleted_at" | "dirty"> = {
      id,
      name: "Our field",
      place: "",
      address: null,
      area: null,
      climate: null,
      season_table: null,
      since: isoDate(),
      people_count: null,
      likes: [],
      diet: [],
      experience: null,
      onboarded_at: null,
    };
    await create(db.households, h, id);
  });
  return (await live(db.households))[0].id;
}

/**
 * Opens this device's database for the current session. With no session yet
 * it shows `fallback` (the sign-in / explore choice, from Phase 3).
 */
export function DataProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const session = useSession();
  const [ready, setReady] = useState<DataContextValue | null>(null);
  const [failed, setFailed] = useState<Session | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const db = openFieldDB(session.id);
    ensureHousehold(db, session).then(
      (householdId) => !cancelled && setReady({ db, session, householdId }),
      () => !cancelled && setFailed(session)
    );
    return () => {
      cancelled = true;
    };
  }, [session, attempt]);

  // Still reading this device's storage: show nothing (not the choice screen, which would flash).
  if (session === undefined) return null;
  if (session === null) return <>{fallback}</>;
  if (failed === session) return (
      <CannotStore
        onRetry={() => {
          setFailed(null);
          setAttempt((a) => a + 1);
        }}
      />
    );
  // The database opens in a few milliseconds; render nothing rather than a spinner meanwhile.
  if (!ready || ready.session !== session) return null;
  return <DataContext.Provider value={ready}>{children}</DataContext.Provider>;
}

/** When this browser won't keep anything (some private modes, full storage). Calm, with a way to try again. */
function CannotStore({ onRetry }: { onRetry: () => void }) {
  return (
    <Column className="items-center gap-2.5 px-8 pt-[130px] text-center">
      <BrokenEnso />
      <h1 className="pt-6 font-mincho text-[32px] font-normal">Your field can&apos;t be kept here</h1>
      <p className="text-[17px] leading-[1.6] text-ink-body">This browser isn&apos;t letting us save anything on the device. A private window can do that. Try a normal window, or try again.</p>
      <div className="mt-6 w-full">
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </Column>
  );
}
