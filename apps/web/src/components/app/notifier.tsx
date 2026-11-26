"use client";

import { useEffect } from "react";
import { useData } from "@/lib/data/provider";
import { sendDueNotes } from "@/lib/notify";

/** While the app is open: checks for due notes now, when it comes back to the front, and every ten minutes. */
export function Notifier() {
  const { db, session } = useData();
  useEffect(() => {
    if (session.kind === "demo") return; // the demo never sends notes
    const run = () => void sendDueNotes(db).catch(() => undefined);
    run();
    const t = setInterval(run, 10 * 60_000);
    const vis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [db, session.kind]);
  return null;
}
