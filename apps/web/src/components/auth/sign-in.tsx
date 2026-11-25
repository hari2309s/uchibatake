"use client";

import { microseasonFor } from "@uchibatake/content";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Column } from "@/components/ui/shell";
import { Sheet } from "@/components/ui/sheet";
import { startDemo, startGuest } from "@/lib/data/session";
import { parseIsoDate } from "@/lib/dates";
import { AUTH_CONFIGURED } from "@/lib/supabase";
import { useToday } from "@/lib/use-today";
import { BrandMark, VerticalWordmark } from "./brand";
import { EmailSheet, GoogleButton } from "./sign-in-actions";

/** A 01: the front door. Google or an email link; or explore without an account. */
export function SignIn({ openEmail = false }: { openEmail?: boolean }) {
  const router = useRouter();
  const today = useToday();
  const [emailOpen, setEmailOpen] = useState(openEmail && AUTH_CONFIGURED);
  const [exploreOpen, setExploreOpen] = useState(false);
  const ms = today ? microseasonFor(today.slice(5)) : null;
  const dateLabel = today ? parseIsoDate(today).toLocaleDateString("en-GB", { day: "numeric", month: "long" }).toUpperCase() : "";

  return (
    <Column className="relative">
      <VerticalWordmark />
      <div className="flex flex-col gap-5 px-8 pt-[86px]">
        <BrandMark />
        <h1 className="font-mincho text-[44px] font-medium leading-none tracking-[-.01em]">Uchibatake</h1>
        <p className="max-w-[290px] text-[18px] leading-[1.6] text-ink-body text-pretty">Grow a little food for the people you love — on a balcony, a windowsill, wherever you are.</p>
      </div>
      <div className="mx-8 mt-8 flex min-h-[118px] flex-col gap-1.5 border-t border-rule pt-5">
        {ms ? (
          <>
            <div className="text-[15px] tracking-[.16em] text-ink-soft">TODAY · {dateLabel}</div>
            <div className="font-mincho text-[24px]">{ms.english}.</div>
            {/* Design adds "Here in Amsterdam…"; we don't know where you are yet, so we don't say. */}
            <div className="text-[16px] leading-[1.55] text-ink-soft">Today&apos;s microseason, from the old Japanese almanac.</div>
          </>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[30px] pt-8">
        {AUTH_CONFIGURED ? (
          <>
            <GoogleButton />
            <Button variant="outline" className="h-[54px] border-rule" onClick={() => setEmailOpen(true)}>
              Email me a sign-in link
            </Button>
          </>
        ) : null}
        <div className="flex min-h-12 flex-wrap items-center justify-center gap-x-1.5 text-[17px]">
          <span>Just looking?</span>
          <button type="button" onClick={() => setExploreOpen(true)} className="min-h-11 underline decoration-ink underline-offset-4">
            Explore without an account
          </button>
        </div>
      </div>
      <EmailSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
      <Sheet open={exploreOpen} onClose={() => setExploreOpen(false)} title="Explore without an account">
        <div className="flex flex-col gap-2.5 px-8 pb-[34px] pt-4">
          <p className="pb-2 text-[17px] leading-[1.6] text-ink-body">Everything stays on this phone.</p>
          <Button
            onClick={() => {
              startGuest();
              // A returning guest goes straight Home; a new one is sent to onboarding by the gate.
              router.push("/");
            }}
          >
            Start my own field
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await startDemo();
              router.push("/");
            }}
          >
            Look around a family&apos;s field
          </Button>
        </div>
      </Sheet>
    </Column>
  );
}
