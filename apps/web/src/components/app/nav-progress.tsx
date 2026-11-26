"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const SHOW_AFTER_MS = 120;
const GIVE_UP_MS = 10_000;

/**
 * A page on its way: a thin ink line draws across the top of the screen from
 * the tap until the new screen arrives. Only after a short pause, so quick
 * changes don't flicker. Tracks taps on links within the app.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, setPending] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // A tap on a link inside the app to a different page starts it.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      // HTML links only (an SVG link's href isn't a plain string).
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname + url.search === location.pathname + location.search) return;
      setPending(url.pathname + url.search);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Arrived (or gave up): done.
  const here = pathname + (search?.toString() ? `?${search}` : "");
  useEffect(() => {
    // The route changed: whatever was on its way has arrived.
    const t = setTimeout(() => setPending(null), 0);
    return () => clearTimeout(t);
  }, [here]);

  useEffect(() => {
    if (!pending) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }
    const show = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const stop = setTimeout(() => setPending(null), GIVE_UP_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(stop);
    };
  }, [pending]);

  if (!visible) return null;
  return (
    <div role="progressbar" aria-label="Opening" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <span className="nav-ink block h-full bg-ink" />
    </div>
  );
}
