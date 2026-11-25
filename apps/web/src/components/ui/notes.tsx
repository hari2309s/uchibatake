import { cn } from "./cn";

/**
 * ひとこと: a short tip. In the frames a small vertical "ひとこと" sits in the
 * left gutter; we keep that gutter as a thin ink rule instead of the kana
 * (decorative Japanese is kept to seals and notices). Optional eyebrow
 * ("FROM IDA") and a quieter body size for inline tips.
 */
export function Hitokoto({ children, from, title, className }: { children: React.ReactNode; from?: string; title?: string; className?: string }) {
  return (
    <aside className={cn("flex gap-3.5", className)} aria-label={from ? `A tip from ${from}` : "A tip"}>
      <span aria-hidden className="w-[1.5px] flex-none self-stretch bg-ink-soft" />
      <div className="flex flex-col gap-1.5">
        {from ? <span className="text-[15px] uppercase tracking-[.12em] text-ink-soft">From {from}</span> : null}
        {title ? <span className="font-mincho text-[20px]">{title}</span> : null}
        <div className="text-[16px] leading-[1.6] text-ink-body text-pretty">{children}</div>
      </div>
    </aside>
  );
}

/** もったいない: the "use it up" variant of ひとこと, for scraps (09 Recipe, M11). */
export function Mottainai({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <aside className={cn("flex gap-3.5 border-t border-rule pt-[18px]", className)} aria-label="Mottainai: use it up">
      <span aria-hidden className="w-[1.5px] flex-none self-stretch bg-ink-soft" />
      <div className="flex flex-col gap-1.5">
        <span className="font-mincho text-[20px]">Mottainai</span>
        <div className="text-[16px] leading-[1.6] text-ink-body text-pretty">{children}</div>
      </div>
    </aside>
  );
}
