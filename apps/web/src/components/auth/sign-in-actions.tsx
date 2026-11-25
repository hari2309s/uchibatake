"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { sendSignInLink, signInWithGoogle } from "@/lib/auth";

/** "Continue with Google" — the sumi primary on A 01 (Apple is not offered). */
export function GoogleButton({ variant = "primary" }: { variant?: "primary" | "outline" }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button variant={variant} className="h-[54px]" onClick={async () => setError(await signInWithGoogle())}>
        <span aria-hidden className="font-mincho text-[18px] font-bold">
          G
        </span>
        Continue with Google
      </Button>
      {error ? (
        <p role="status" className="text-center text-[16px] text-ink-soft">
          {error}
        </p>
      ) : null}
    </>
  );
}

/** The email field, in a sheet: one address, one link. */
export function EmailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} title="Email me a sign-in link">
      <form
        className="flex flex-col gap-5 px-8 pb-[34px] pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await sendSignInLink(email.trim());
          setBusy(false);
          if (err) return setError(err);
          onClose();
          router.push("/sign-in/sent");
        }}
      >
        <p className="text-[17px] leading-[1.6] text-ink-body">We&apos;ll email you a link. Open it on this phone and you&apos;re in. No password.</p>
        <Field label="Your email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error ? (
          <p role="status" className="text-[16px] text-ink-soft">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          Send the link
        </Button>
      </form>
    </Sheet>
  );
}
