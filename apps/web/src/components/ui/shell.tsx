"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/spaces", label: "Spaces" },
  { href: "/add", label: "Add plant", add: true },
  { href: "/journal", label: "Journal" },
  { href: "/profile", label: "Profile" },
] as const;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

/** Bottom nav: Home, Spaces, + Add plant, Journal, Profile. The current tab gets a dot and bold label. */
export function BottomNav() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Main" className="washi sticky bottom-0 z-10 grid grid-cols-5 items-end border-t border-rule px-2 pt-2" style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
      {TABS.map((t) => {
        const on = isActive(path, t.href);
        if ("add" in t)
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className="flex min-h-14 flex-col items-center justify-end gap-1">
              <span aria-hidden className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-ink text-[26px] text-on-ink">
                +
              </span>
              <span className={cn("text-[16px]", on ? "font-bold" : "text-ink-soft")}>{t.label}</span>
            </Link>
          );
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className="flex min-h-14 flex-col items-center justify-end gap-1.5">
            {on ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" /> : null}
            <span className={cn("text-[16px]", on ? "font-bold" : "text-ink-soft")}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The phone column: 390-first, centred and capped at 480 on wider screens,
 * with the washi grain running edge to edge behind it.
 */
export function Column({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex min-h-dvh w-full max-w-[480px] flex-col", className)}>{children}</div>;
}

/** App screen: content plus the bottom nav. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Column>
      <main className="flex flex-1 flex-col pb-11">{children}</main>
      <BottomNav />
    </Column>
  );
}
