"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker (production only) and shows a quiet strip when
 * a new version is ready. Tapping it lets the new worker take over and reloads.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reloading = false;
    // The first worker taking charge (clients.claim on a first visit) also fires controllerchange:
    // only reload when a worker was already in charge, i.e. after "Reload" on an update.
    const hadController = !!navigator.serviceWorker.controller;
    const onChange = () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    navigator.serviceWorker
      .register(`/sw.js?build=${process.env.NEXT_PUBLIC_BUILD ?? "dev"}`)
      .then((reg) => {
        // Only an update (there's already a worker in charge) asks to reload; the first install doesn't.
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          sw?.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
          });
        });
      })
      .catch(() => {
        // No offline shell this time; the app still works online.
      });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  if (!waiting) return null;
  return (
    <div role="status" className="washi fixed inset-x-0 top-0 z-50 mx-auto flex min-h-12 max-w-[480px] items-center justify-between gap-3 border-b border-rule px-6 page-enter">
      <span className="text-[16px]">A new version is ready.</span>
      <button type="button" onClick={() => waiting.postMessage("skip-waiting")} className="tap min-h-11 px-2 text-[16px] font-medium underline underline-offset-4">
        Reload
      </button>
    </div>
  );
}
