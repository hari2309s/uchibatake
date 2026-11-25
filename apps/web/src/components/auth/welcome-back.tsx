"use client";

import { brushDraw } from "@/components/ui/enso";
import { microseasonFor, seasonFor, SEASON_TABLES } from "@uchibatake/content";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Column } from "@/components/ui/shell";
import { forgetRememberedAccount, type RememberedAccount } from "@/lib/data/session";
import { useToday } from "@/lib/use-today";
import { VerticalWordmark } from "./brand";
import { EmailSheet, GoogleButton } from "./sign-in-actions";

/** M02: a returning person on this device. Their field is still here; one primary way back in. */
export function WelcomeBack({ account, onSomeoneElse }: { account: RememberedAccount; onSomeoneElse: () => void }) {
  const today = useToday();
  const [emailOpen, setEmailOpen] = useState(false);
  const table = account.seasonTable ? (SEASON_TABLES[account.seasonTable] ?? null) : null;
  const ms = today ? microseasonFor(today.slice(5)) : null;
  const season = today && table ? seasonFor(table, today.slice(5)) : null;
  const name = account.name ?? "friend";

  return (
    <Column className="page-enter relative">
      <VerticalWordmark text="おかえり" />
      <div className="flex flex-col gap-7 px-8 pt-[120px]">
        <svg width="96" height="96" aria-hidden className="block">
          <circle cx="48" cy="48" r="39.36" fill="none" stroke="var(--ink)" strokeWidth="5.76" strokeLinecap="round" transform="rotate(-80 48 48)" style={brushDraw(222.6, 2 * Math.PI * 39.36, 0, 1100)} />
          <circle cx="49.15" cy="46.85" r="35.9" fill="none" stroke="var(--ink)" strokeWidth="1.44" strokeLinecap="round" transform="rotate(-70 48 48)" opacity=".4" style={brushDraw(182.5, 2 * Math.PI * 35.9, 260, 1100)} />
        </svg>
        <div className="rise flex flex-col gap-2" style={{ "--i": 2 } as React.CSSProperties}>
          <h1 className="font-mincho text-[38px] font-normal leading-[1.2] text-balance">Welcome back, {name}.</h1>
          <p className="text-[17px] leading-[1.6] text-ink-body">{account.place ? `Your field in ${account.place} is waiting.` : "Your field is waiting."}</p>
        </div>
        {ms ? (
          <div className="rise flex flex-col gap-1 border-t border-rule pt-[18px]" style={{ "--i": 4 } as React.CSSProperties}>
            {season ? (
              <>
                <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">Here in {account.place ?? table!.place}</span>
                <span className="font-mincho text-[24px]">{season.label}</span>
                <span className="font-mincho text-[16px] text-ink-soft">In Japan: {ms.english.toLowerCase()}.</span>
              </>
            ) : (
              <>
                <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">Today&apos;s microseason</span>
                <span className="font-mincho text-[24px]">{ms.english}.</span>
              </>
            )}
          </div>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-8">
        {account.provider === "google" ? (
          <>
            <GoogleButton variant="outline" />
            <button type="button" className="min-h-11 text-[17px] underline decoration-ink underline-offset-4" onClick={() => setEmailOpen(true)}>
              Email me a sign-in link
            </button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setEmailOpen(true)}>
            Email me a sign-in link
          </Button>
        )}
        <button
          type="button"
          className="min-h-11 text-[16px] text-ink-soft"
          onClick={() => {
            forgetRememberedAccount();
            onSomeoneElse();
          }}
        >
          Not {name}? Use another account
        </button>
      </div>
      <EmailSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
    </Column>
  );
}
