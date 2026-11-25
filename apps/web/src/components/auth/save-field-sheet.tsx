"use client";

import { useState } from "react";
import { Enso } from "@/components/ui/enso";
import { Sheet } from "@/components/ui/sheet";
import { getMeta, setMeta } from "@/lib/data/db";
import { usePlantings } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { AUTH_CONFIGURED } from "@/lib/supabase";
import { numberWord } from "@/lib/words";
import { useLiveQuery } from "dexie-react-hooks";
import { EmailSheet, GoogleButton } from "./sign-in-actions";

const DISMISSED = "saveFieldDismissedAt";

/**
 * M03: a soft gate after a guest's second plant. "Maybe later" always closes
 * it; it never blocks. Signing in moves the guest's field into the account
 * (see migrate.ts), so "your plants come with you" is true.
 */
export function SaveFieldSheet() {
  const { db, session } = useData();
  const plantings = usePlantings();
  const dismissed = useLiveQuery(() => getMeta<number>(db, DISMISSED), [db], 0);
  const [emailOpen, setEmailOpen] = useState(false);
  const growing = plantings?.filter((p) => p.status === "growing").length ?? 0;
  const open = AUTH_CONFIGURED && session.kind === "guest" && growing >= 2 && dismissed === undefined && !emailOpen;

  return (
    <>
      <Sheet open={open} onClose={() => void setMeta(db, DISMISSED, Date.now())} title="Keep your field with you" hideClose>
        <div className="flex flex-col gap-[18px] px-8 pb-[34px] pt-3">
          <div className="flex items-center gap-4">
            <Enso value={45} size={64} />
            {/* Design: "Make an account so it's here tomorrow." A guest field already stays on this phone, and there's
                no online copy until sync exists, so we say what an account really does today. */}
            <p className="text-[17px] leading-[1.6] text-ink-body">
              Make an account and your {numberWord(growing)} plants come with you. For now your field stays on this phone; a copy for your other devices comes later.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <GoogleButton variant="outline" />
            <button type="button" className="min-h-11 text-[17px] underline decoration-ink underline-offset-4" onClick={() => setEmailOpen(true)}>
              Email me a sign-in link
            </button>
          </div>
          <button type="button" className="min-h-11 text-[16px] text-ink-soft" onClick={() => void setMeta(db, DISMISSED, Date.now())}>
            Maybe later
          </button>
        </div>
      </Sheet>
      <EmailSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
    </>
  );
}
