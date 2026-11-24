import Link from "next/link";
import { cn } from "./cn";

/** "‹ Back balcony": 48px bar with a 44px back target. */
export function BackBar({ href, label, right }: { href: string; label: string; right?: React.ReactNode }) {
  return (
    <div className="flex h-12 items-center justify-between px-5">
      <Link href={href} className="flex min-h-11 items-center gap-1.5 px-2 text-[17px]">
        <span aria-hidden className="text-[22px] leading-none">‹</span>
        <span>{label}</span>
      </Link>
      {right}
    </div>
  );
}

/** ✕ close control, 44px. Renders a link or a button. */
export function CloseButton({ href, onClick, label = "Close" }: { href?: string; onClick?: () => void; label?: string }) {
  const cls = "flex h-11 w-11 items-center justify-center text-[22px] leading-none";
  if (href)
    return (
      <Link href={href} aria-label={label} className={cls}>
        ✕
      </Link>
    );
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      ✕
    </button>
  );
}

/** Thin progress segments: onboarding (28px each) and step views (flex). */
export function Progress({ total, current, fill = false, label }: { total: number; current: number; fill?: boolean; label?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={label ?? `Step ${current} of ${total}`}
      className={cn("flex gap-1.5", fill && "w-full")}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-[3px] rounded-[2px]", fill ? "flex-1" : "w-7", i < current ? "bg-ink" : "bg-rule")} />
      ))}
    </div>
  );
}
