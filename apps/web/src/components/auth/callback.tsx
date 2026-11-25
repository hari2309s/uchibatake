"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { BrokenEnso } from "@/components/ui/enso";
import { Column } from "@/components/ui/shell";
import { finishSignIn } from "@/lib/auth";
import { openFieldDB } from "@/lib/data/db";
import { moveGuestIntoAccount } from "@/lib/data/migrate";
import { live } from "@/lib/data/repo";
import { forgetGuestId, readSession, startAccount } from "@/lib/data/session";

/**
 * Where the email link and Google send people back. Finishes the sign-in in
 * this browser, carries the active guest field into the account (M03's
 * promise), then goes Home, or to onboarding for a new field.
 */
export function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState<"link" | "device" | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // the code works once; StrictMode runs effects twice
    started.current = true;
    (async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const user = code ? await finishSignIn(code) : null;
      if (!user) return setFailed("link");
      try {
        // Only the field this browser is using as a guest right now moves into the account.
        const prev = readSession();
        const account = openFieldDB(user.id);
        if (prev?.kind === "guest") {
          await moveGuestIntoAccount(openFieldDB(prev.id), account, prev.id);
          forgetGuestId();
        }
        startAccount(user);
        const household = (await live(account.households))[0];
        router.replace(household?.onboarded_at ? "/" : "/start/where");
      } catch {
        // The guest field is only deleted after a successful move, so nothing is lost.
        setFailed("device");
      }
    })();
  }, [router]);

  if (!failed) return null;
  return (
    <Column className="items-center gap-2.5 px-8 pt-[130px] text-center">
      <BrokenEnso />
      <h1 className="pt-6 font-mincho text-[32px] font-normal">{failed === "link" ? "That link didn't work" : "Something slipped"}</h1>
      <p className="text-[17px] leading-[1.6] text-ink-body">
        {failed === "link"
          ? "A sign-in link works once, for a little while, in the browser that asked for it. Nothing in your field has changed."
          : "You're signed in, but this browser wouldn't let us open your field. Nothing in your field has changed."}
      </p>
      <div className="mt-6 flex w-full flex-col gap-2.5">
        {failed === "link" ? (
          <ButtonLink href="/sign-in?email=1">Send a new link</ButtonLink>
        ) : (
          <Button onClick={() => location.reload()}>Try again</Button>
        )}
        <ButtonLink href="/sign-in" variant="outline" size="sm">
          Back
        </ButtonLink>
      </div>
    </Column>
  );
}
