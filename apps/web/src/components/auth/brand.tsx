import { brushDraw } from "@/components/ui/enso";

/** The うちばたけ mark: an open ensō with the 畑 seal (A 01). */
export function BrandMark() {
  return (
    <div className="relative h-[104px] w-[104px]" aria-hidden>
      <svg width="104" height="104" className="block">
        <circle cx="52" cy="52" r="42" fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" transform="rotate(-65 52 52)" style={brushDraw(236, 2 * Math.PI * 42, 0, 1100)} />
        <circle cx="53" cy="51" r="40" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" transform="rotate(-50 52 52)" opacity=".45" style={brushDraw(200, 2 * Math.PI * 40, 260, 1100)} />
      </svg>
      <span className="ink-press absolute -right-1.5 bottom-1 flex h-[30px] w-[30px] items-center justify-center rounded-[3px] bg-shu font-mincho text-[17px] text-on-ink" style={{ animationDelay: "900ms, 1180ms" }}>
        畑
      </span>
    </div>
  );
}

/** Vertical うちばたけ in the top-right corner (the wordmark). */
export function VerticalWordmark({ text = "うちばたけ" }: { text?: string }) {
  return (
    <div lang="ja" aria-hidden className="fade-in vertical absolute right-[30px] top-[34px] font-mincho text-[16px] tracking-[.5em] text-ink-soft" style={{ animationDelay: "400ms" }}>
      {text}
    </div>
  );
}
