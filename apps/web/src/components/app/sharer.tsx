"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { getMeta } from "@/lib/data/db";
import { useData } from "@/lib/data/provider";
import { engineFor } from "@/lib/data/sharing";
import { SHARED_TABLES, SHARING_KEY, type Sharing } from "@/lib/data/sync";

const AFTER_EDIT_MS = 2_000;
const EVERY_MS = 60_000;

/**
 * While the app is open on a sharing phone: shares changes a moment after
 * they're made, and picks up the family's every minute, when the app comes
 * back to the front, and when the phone is back online.
 */
export function Sharer() {
  const { db, session } = useData();
  const sharing = useLiveQuery(() => getMeta<Sharing>(db, SHARING_KEY), [db]);
  const changed = useLiveQuery(async () => {
    let n = 0;
    for (const t of SHARED_TABLES) n += await db[t].where("dirty").equals(1).count();
    return n;
  }, [db]);
  const on = session.kind === "account" && !!sharing;

  useEffect(() => {
    if (!on) return;
    const engine = engineFor(db);
    if (!engine) return;
    const run = () => void engine.sync();
    run();
    const t = setInterval(() => document.visibilityState === "visible" && run(), EVERY_MS);
    const vis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("online", run);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("online", run);
    };
  }, [db, on]);

  useEffect(() => {
    if (!on || !changed) return;
    const t = setTimeout(() => void engineFor(db)?.sync(), AFTER_EDIT_MS);
    return () => clearTimeout(t);
  }, [db, on, changed]);

  return null;
}
