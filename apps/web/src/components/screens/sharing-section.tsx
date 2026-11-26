"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { getMeta } from "@/lib/data/db";
import { useData } from "@/lib/data/provider";
import type { Membership } from "@/lib/data/remote";
import { engineFor, turnOffSharing, turnOnSharing, adoptSharedField } from "@/lib/data/sharing";
import { LAST_SHARED_KEY, SHARING_KEY, type Sharing, type SyncStatus } from "@/lib/data/sync";
import { AUTH_CONFIGURED } from "@/lib/supabase";

const IDLE: SyncStatus = { state: "idle", note: null };
const ROLE = { owner: "You look after it", editor: "You can edit everything", helper: "You help out" } as const;

function ago(ms: number, now: number): string {
  const m = Math.round((now - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : "more than a day ago";
}

/** M17 › Share between phones. Opt-in; every sentence is what the code does. */
export function SharingSection() {
  const { db, session, householdId } = useData();
  const sharing = useLiveQuery(() => getMeta<Sharing>(db, SHARING_KEY), [db]);
  const last = useLiveQuery(() => getMeta<number>(db, LAST_SHARED_KEY), [db]);
  const engine = engineFor(db);
  const status = useSyncExternalStore(engine?.subscribe ?? (() => () => undefined), engine?.getStatus ?? (() => IDLE), () => IDLE);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [other, setOther] = useState<Membership | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const p = "text-[17px] leading-[1.6] text-ink-body";
  if (session.kind !== "account" || !AUTH_CONFIGURED)
    return (
      <div className="px-8 pt-2">
        <p className={p}>
          {session.kind === "demo" ? "The demo stays on this phone." : !AUTH_CONFIGURED ? "Sharing isn't set up on this copy of Uchibatake." : "Your field is only on this phone. Sign in to share it with your other phones and your family."}
        </p>
        {session.kind === "guest" && AUTH_CONFIGURED ? (
          <Link href="/sign-in" className="tap inline-flex min-h-11 items-center text-[16px] font-medium underline underline-offset-4">
            Sign in
          </Link>
        ) : null}
      </div>
    );

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } catch {
      setNote(typeof navigator !== "undefined" && !navigator.onLine ? "You're offline. Try again when you're connected." : "That didn't work just now. Nothing has changed; try again.");
    } finally {
      setBusy(false);
    }
  };

  if (other)
    return (
      <div className="flex flex-col gap-3 px-8 pt-2">
        <p className={p}>This account already shares a field. Using it on this phone replaces the field here. You could export this one first.</p>
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              await adoptSharedField(db, other);
              location.replace("/");
            })
          }
        >
          Use the shared field here
        </Button>
        <button type="button" className="min-h-11 text-[16px] text-ink-soft" onClick={() => setOther(null)}>
          Keep this phone&apos;s field
        </button>
        {note ? <p role="status" className="text-[16px] text-ink-soft">{note}</p> : null}
      </div>
    );

  if (!sharing)
    return (
      <div className="flex flex-col gap-3 px-8 pt-2">
        <p className={p}>Your field is only on this phone. Sharing copies it to our server (Supabase), with your rough area for the weather, so your other phones and the family you invite can open it. Photos and your street address stay on this phone.</p>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await turnOnSharing(db, session, householdId);
              if ("other" in r) setOther(r.other);
            })
          }
        >
          {busy ? "Sharing…" : "Share between phones"}
        </Button>
        {note ? <p role="status" className="text-[16px] text-ink-soft">{note}</p> : null}
      </div>
    );

  return (
    <div className="flex flex-col gap-2 px-8 pt-2">
      <p className={p}>
        Shared with your phones and family. {ROLE[sharing.role]}.
      </p>
      <p role="status" className="text-[16px] text-ink-soft">
        {status.state === "syncing" ? "Sharing…" : status.note ?? (last ? `Last shared ${ago(last, Math.max(now, last))}.` : "Not shared yet.")}
      </p>
      <p className="text-[15px] leading-normal text-ink-soft">Photos and your street address stay on this phone.</p>
      <div className="flex flex-wrap gap-x-6">
        <button type="button" disabled={busy || status.state === "syncing"} onClick={() => void engine?.sync()} className="tap min-h-11 text-[16px] font-medium underline underline-offset-4">
          Share now
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => turnOffSharing(db))} className="tap min-h-11 text-[16px] text-ink-soft underline underline-offset-4">
          Stop on this phone
        </button>
      </div>
      <p className="text-[15px] leading-normal text-ink-soft">Stopping keeps the field here and the shared copy for your family.</p>
    </div>
  );
}
