import { cn } from "./cn";

/** Small caps-style label: "TODAY'S MICROSEASON", "GOOD TO GROW THERE NOW". 15px, tracked. */
export function Eyebrow({ children, className, as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "span" | "p" | "h2" | "h3" }) {
  return <Tag className={cn("text-[15px] uppercase tracking-[.16em] text-ink-soft", className)}>{children}</Tag>;
}

/** Screen title in Mincho. Sizes from the frames: 40 (hero), 34, 32 (onboarding), 28 (sheets). */
export function Title({ children, size = 32, className, as: Tag = "h1" }: { children: React.ReactNode; size?: 28 | 30 | 32 | 34 | 40 | 44; className?: string; as?: "h1" | "h2" }) {
  const sizes = { 28: "text-[28px]", 30: "text-[30px]", 32: "text-[32px]", 34: "text-[34px]", 40: "text-[40px]", 44: "text-[44px]" };
  return <Tag className={cn("font-mincho font-normal leading-[1.15] text-pretty", sizes[size], className)}>{children}</Tag>;
}

/** Section heading row: Mincho 26 with an optional quiet aside on the right ("A few small things", "See all"). */
export function SectionHeading({ children, aside, className, id }: { children: React.ReactNode; aside?: React.ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <h2 id={id} className="font-mincho text-[26px] font-normal">
        {children}
      </h2>
      {aside ? <span className="text-[16px] text-ink-soft">{aside}</span> : null}
    </div>
  );
}

/** Mincho lede paragraph under a title. */
export function Lede({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mincho text-[17px] leading-[1.65] text-ink-body text-pretty", className)}>{children}</p>;
}
