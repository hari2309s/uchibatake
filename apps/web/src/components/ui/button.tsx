import Link from "next/link";
import { cn } from "./cn";

/**
 * Buttons from the frames:
 * - primary: sumi fill (most screens' main action)
 * - accent: vermilion fill. Only ONE per screen, and only where the design uses it ("Grow this").
 * - outline: 1.5px sumi border ("Back", "Remind me at 16:00")
 * - quiet: underlined text link-button ("How to plant cloves", "Replay the stamp")
 * Heights: 56 (default), 64 (step views, for muddy hands), 52 (secondary under a primary).
 */
export type ButtonVariant = "primary" | "accent" | "outline" | "quiet";
export type ButtonSize = "md" | "lg" | "sm";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  const h = variant === "quiet" ? "min-h-11" : size === "lg" ? "h-16 text-[18px]" : size === "sm" ? "h-[52px] text-[17px]" : "h-14 text-[17px]";
  const v = {
    primary: "bg-ink text-on-ink font-medium",
    accent: "bg-shu text-on-ink font-medium",
    outline: "border-[1.5px] border-ink text-ink",
    quiet: "text-ink text-[17px] underline underline-offset-4 decoration-ink",
  }[variant];
  return cn(
    "inline-flex w-full select-none items-center justify-center gap-3.5 rounded-[4px] px-4 text-center transition-[transform,opacity] duration-150 ease-out active:scale-[.98] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
    h,
    v,
    variant !== "quiet" && "font-medium",
    className
  );
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode };

export function Button({ variant, size, className, children, type = "button", ...rest }: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, children, href, ...rest }: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

/** Bottom-pinned action area used on most full-screen steps (32px sides, 34px from the bottom). */
export function ActionDock({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-6", className)}>{children}</div>;
}
