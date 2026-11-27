import Link from "next/link";
import { Button, buttonClass } from "./button";
import { brushDraw } from "./enso";

/*
 * M18a–d empty states: one open ensō, one sentence, one action (MVP Flows).
 * The ensō is the frame's own: a 140 px open brush ring with a thin second
 * stroke inside it, drawn in.
 */

function OpenEnso() {
  const outer = 2 * Math.PI * 57.4;
  const inner = 2 * Math.PI * 52.36;
  return (
    <svg width="140" height="140" aria-hidden className="block flex-none">
      <circle cx="70" cy="70" r="57.4" fill="none" stroke="var(--ink)" strokeWidth="8.4" strokeLinecap="round" style={{ ...brushDraw(295.7, outer, 150, 1100), transform: "rotate(-80deg)", transformOrigin: "70px 70px" }} />
      <circle cx="71.68" cy="68.32" r="52.36" fill="none" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" style={{ ...brushDraw(242.5, inner, 450, 1100), transform: "rotate(-70deg)", transformOrigin: "70px 70px", opacity: 0.4 }} />
    </svg>
  );
}

export function EmptyState({ line, action, href, onAction, top = 88 }: { line: string; action: string; href?: string; onAction?: () => void; top?: number }) {
  return (
    <div className="flex flex-col items-center gap-[26px] px-8 text-center" style={{ paddingTop: top }}>
      <OpenEnso />
      <p className="rise max-w-[280px] font-mincho text-[20px] leading-[1.55]" style={{ "--i": 3 } as React.CSSProperties}>
        {line}
      </p>
      <div className="rise w-full" style={{ "--i": 4 } as React.CSSProperties}>
        {href ? (
          <Link href={href} className={buttonClass("primary", "md", "tap w-full")}>
            {action}
          </Link>
        ) : (
          <Button onClick={onAction} className="w-full">
            {action}
          </Button>
        )}
      </div>
    </div>
  );
}
