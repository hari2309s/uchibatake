"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BackBar } from "./bars";
import { InkDropLoader } from "./enso";

/** When a loader was last on screen: a loader that follows straight on carries on, rather than blinking. */
let lastVisibleAt = 0;
const CARRY_ON_MS = 400;
const noop = () => () => {};

/**
 * While a screen's data loads: the ink-drop (15c), centred. It waits a moment
 * before appearing, so reads that finish at once never flash a loader. Detail
 * screens keep their way back above it.
 */
export function PageLoader({ label = "Loading", delayMs = 150, back }: { label?: string; delayMs?: number; back?: { href: string; label: string } }) {
  // Straight after another loader: visible from the first frame (the server render says no).
  const carryOn = useSyncExternalStore(noop, () => Date.now() - lastVisibleAt < CARRY_ON_MS, () => false);
  const [waited, setWaited] = useState(false);
  const show = carryOn || waited;
  useEffect(() => {
    if (!show) {
      const t = setTimeout(() => setWaited(true), delayMs);
      return () => clearTimeout(t);
    }
    // On screen: keep the time fresh, so a loader that follows carries straight on.
    lastVisibleAt = Date.now();
    const t = setInterval(() => (lastVisibleAt = Date.now()), 200);
    return () => {
      clearInterval(t);
      lastVisibleAt = Date.now();
    };
  }, [delayMs, show]);
  return (
    <>
      {back ? <BackBar href={back.href} label={back.label} /> : null}
      <div className="flex min-h-[60dvh] items-center justify-center" aria-busy="true">
        {show ? <InkDropLoader label={label} className="fade-in" /> : null}
      </div>
    </>
  );
}
