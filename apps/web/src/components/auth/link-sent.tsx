"use client";

import { brushDraw } from "@/components/ui/enso";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@/components/ui/bars";
import { Column } from "@/components/ui/shell";
import { lastLinkSent, sendSignInLink } from "@/lib/auth";

const WAIT = 30;
const noop = () => () => {};

/** M01: check your email. The ensō stays open until the link is tapped; resend counts down quietly. */
export function LinkSent() {
  const router = useRouter();
  const sent = useSyncExternalStore(noop, () => JSON.stringify(lastLinkSent()), () => "null");
  const info = JSON.parse(sent) as { email: string; at: number } | null;
  // The clock starts in the browser (pages are prerendered, so no Date.now() during render).
  const [now, setNow] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const left = info && now !== null ? Math.max(0, WAIT - Math.floor((now - info.at) / 1000)) : WAIT;

  return (
    <Column>
      <div className="flex h-12 items-center justify-end px-5">
        <CloseButton href="/sign-in" />
      </div>
      <div className="flex flex-col items-center gap-7 px-8 pt-10 text-center">
        <div className="relative h-[150px] w-[150px]" aria-hidden>
          <svg width="150" height="150" className="block">
            <circle cx="75" cy="75" r="61.5" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" transform="rotate(-80 75 75)" style={brushDraw(332.3, 2 * Math.PI * 61.5, 0, 1100)} />
            <circle cx="76.8" cy="73.2" r="56.1" fill="none" stroke="var(--ink)" strokeWidth="2.25" strokeLinecap="round" transform="rotate(-70 75 75)" opacity=".4" style={brushDraw(272.5, 2 * Math.PI * 56.1, 260, 1100)} />
          </svg>
          <span className="absolute left-1/2 top-1/2 -ml-[23px] -mt-4 h-8 w-[46px] border-[1.5px] border-ink" />
          <span className="absolute left-1/2 top-1/2 -ml-4 -mt-[33px] h-[33px] w-[33px] border-b-[1.5px] border-r-[1.5px] border-ink" style={{ transform: "rotate(45deg) scale(.68)" }} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-mincho text-[32px] font-normal leading-[1.2] text-balance">Check your email</h1>
          <p className="text-[17px] leading-[1.6] text-ink-body text-pretty">
            {info ? (
              <>
                We sent a sign-in link to <strong className="font-medium text-ink">{info.email}</strong>. Tap it on this phone and you&apos;re in.
              </>
            ) : (
              <>We sent you a sign-in link. Tap it on this phone and you&apos;re in.</>
            )}
          </p>
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-8">
        {note ? (
          <p role="status" className="text-center text-[16px] text-ink-soft">
            {note}
          </p>
        ) : null}
        <div className="flex min-h-11 items-center justify-between">
          {left > 0 || !info ? (
            <span className="text-[16px] text-ink-soft" aria-live="off">
              {info ? `Send again in 0:${String(left).padStart(2, "0")}` : ""}
            </span>
          ) : (
            <button type="button" className="min-h-11 text-[16px] underline underline-offset-4" onClick={async () => setNote((await sendSignInLink(info.email)) ?? "Sent again.")}>
              Send again
            </button>
          )}
          <button type="button" className="flex min-h-11 items-center text-[16px] underline underline-offset-4" onClick={() => router.push("/sign-in?email=1")}>
            Wrong address?
          </button>
        </div>
      </div>
    </Column>
  );
}
