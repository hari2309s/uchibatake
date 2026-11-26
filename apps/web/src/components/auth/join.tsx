"use client";

import { cropById } from "@uchibatake/content";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { AvatarStack } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { BrokenEnso, InkDropLoader } from "@/components/ui/enso";
import { Column } from "@/components/ui/shell";
import { getMeta, openFieldDB } from "@/lib/data/db";
import { useSession } from "@/lib/data/provider";
import { previewInvite, type InvitePreview } from "@/lib/data/remote";
import { live } from "@/lib/data/repo";
import { adoptMyField, joinFamily, rememberJoin } from "@/lib/data/sharing";
import { SHARING_KEY, type Sharing } from "@/lib/data/sync";
import type { MemberMark } from "@/lib/data/types";
import { supabase } from "@/lib/supabase";
import { listWords } from "@/lib/words";

const FACING: Record<string, string> = { N: "North", NE: "North-east", E: "East", SE: "South-east", S: "South", SW: "South-west", W: "West", NW: "North-west" };
const ROLE = {
  helper: { label: "Helper", hint: "Tick off jobs, log harvests, write in the journal." },
  editor: { label: "Can edit everything", hint: "Add and move plants and spaces too." },
} as const;

function Calm({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <Column className="page-enter items-center gap-2.5 px-8 pt-[130px] text-center">
      <BrokenEnso />
      <h1 className="pt-6 font-mincho text-[32px] font-normal">{title}</h1>
      <p className="text-[17px] leading-[1.6] text-ink-body">{body}</p>
      <div className="mt-6 flex w-full flex-col gap-2.5">{children}</div>
    </Column>
  );
}

/** M13 Join a family: who asked, where, the spaces, the role; then the field comes to this phone. */
export function JoinRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const session = useSession();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null | "failed" | undefined>(undefined);
  const [hasField, setHasField] = useState(false);
  const [here, setHere] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const valid = /^[0-9a-f]{32,80}$/.test(code);

  useEffect(() => {
    if (session?.kind !== "account" || !valid) return;
    const sb = supabase();
    let gone = false;
    if (!sb) {
      queueMicrotask(() => !gone && setPreview("failed"));
      return () => {
        gone = true;
      };
    }
    previewInvite(sb, code).then(
      (p) => !gone && setPreview(p),
      () => !gone && setPreview("failed")
    );
    // Anything growing on this phone already? Joining replaces it, so we say so.
    const db = openFieldDB(session.id);
    Promise.all([live(db.spaces), live(db.plantings), getMeta<Sharing>(db, SHARING_KEY)]).then(([s, p, sh]) => {
      if (gone) return;
      setHasField(s.length + p.length > 0);
      setHere(sh?.household ?? null);
    });
    return () => {
      gone = true;
    };
  }, [session, code, valid]);

  if (session === undefined) return null;
  if (!valid) return <Calm title="That link isn't quite right" body="Ask for the link again, and open it just as it came." />;

  if (session?.kind !== "account")
    return (
      <Column className="page-enter px-8 pt-24">
        <h1 className="rise font-mincho text-[32px] font-normal leading-[1.2]">You&apos;re invited to a family&apos;s field</h1>
        <p className="rise pt-4 text-[17px] leading-[1.6] text-ink-body" style={{ "--i": 1 } as React.CSSProperties}>
          Sign in to see it and join. Google or an email link: no password.
        </p>
        <div className="rise mt-auto flex flex-col gap-2.5 pb-[34px] pt-10" style={{ "--i": 2 } as React.CSSProperties}>
          <Button
            onClick={() => {
              rememberJoin(code);
              router.push("/sign-in");
            }}
          >
            Sign in to join
          </Button>
        </div>
      </Column>
    );

  if (preview === undefined)
    return (
      <Column className="items-center pt-[200px]">
        <InkDropLoader />
      </Column>
    );
  if (preview === "failed")
    return (
      <Calm title="We couldn't open the invite" body="Check you're online, then try again. Nothing has changed.">
        <Button onClick={() => location.reload()}>Try again</Button>
      </Calm>
    );
  if (preview === null)
    return (
      <Calm title="This invite has been used" body="Each link works once, for two weeks. Ask your family for a new one.">
        <ButtonLink href="/" variant="outline">
          Go to Uchibatake
        </ButtonLink>
      </Calm>
    );
  if (preview.already && here)
    return (
      <Calm title="You're already in this field" body="It's on this phone. Nothing more to do.">
        <ButtonLink href="/">Go to the field</ButtonLink>
      </Calm>
    );
  if (preview.already)
    return (
      <Calm title="You're already in this field" body={hasField ? "It isn't on this phone yet. Bringing it here replaces the field on this phone." : "It isn't on this phone yet."}>
        {note ? <p role="status" className="text-[16px] text-ink-soft">{note}</p> : null}
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNote(null);
            try {
              await adoptMyField(openFieldDB(session.id));
              location.replace("/");
            } catch {
              setNote("We couldn't bring it here just now. Check you're online and try again.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Bringing the field here…" : "Bring it to this phone"}
        </Button>
      </Calm>
    );

  const who = preview.inviter ?? "Your family";
  const role = ROLE[preview.role];
  return (
    <Column className="page-enter pb-[34px]">
      <div className="rise px-8 pt-20">
        <AvatarStack marks={preview.members.slice(0, 5).map((m) => m.mark as MemberMark)} size={52} />
      </div>
      <h1 className="rise px-8 pt-6 font-mincho text-[30px] font-normal leading-[1.3]" style={{ "--i": 1 } as React.CSSProperties}>
        {who} invited you to help with their field{preview.place ? ` in ${preview.place}` : ""}.
      </h1>
      {preview.spaces.length ? (
        <ul className="px-8 pt-6">
          {preview.spaces.map((s, i) => {
            const crops = s.crops.map((c) => cropById(c)?.name.toLowerCase()).filter((x): x is string => !!x);
            return (
              <li key={i} className="rise flex flex-col gap-1 border-t border-rule py-3.5 last:border-b" style={{ "--i": i + 2 } as React.CSSProperties}>
                <span className="font-mincho text-[20px]">{s.name}</span>
                <span className="text-[16px] text-ink-soft">{[s.facing ? FACING[s.facing] : null, crops.length ? listWords(crops) : null].filter(Boolean).join(" · ") || "Nothing growing yet"}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="rise px-8 pt-7" style={{ "--i": 6 } as React.CSSProperties}>
        <p className="text-[16px] text-ink-soft">You&apos;ll join as</p>
        <p className="pt-1 font-mincho text-[22px]">{role.label}</p>
        <p className="pt-1 text-[17px] leading-[1.6] text-ink-body">{role.hint}</p>
        <p className="pt-2 text-[16px] text-ink-soft">{who} chose this.</p>
      </div>
      {hasField || preview.elsewhere ? (
        <div className="rise px-8 pt-6" style={{ "--i": 7 } as React.CSSProperties}>
          <p className="text-[17px] leading-[1.6] text-ink-body">
            {hasField ? "Joining brings this field to your phone in place of the one here. " : ""}
            {preview.elsewhere ? "You'll leave the field you share now; if no one else is in it, its shared copy is removed. " : ""}
            You could export yours first (Settings › Export my field).
          </p>
        </div>
      ) : null}
      <div className="rise mt-auto flex flex-col gap-2.5 px-8 pt-8" style={{ "--i": 8 } as React.CSSProperties}>
        {note ? (
          <p role="status" className="text-[16px] text-ink-soft">
            {note}
          </p>
        ) : null}
        <Button
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            setNote(null);
            try {
              await joinFamily(openFieldDB(session.id), code);
              // A fresh start on the family's field (the app reopens on it).
              location.replace("/");
            } catch {
              setNote("We couldn't bring the field here just now. Check you're online, then open the link again.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Bringing the field here…" : "Join the field"}
        </Button>
        {hasField ? (
          <ButtonLink href="/settings" variant="outline" size="sm">
            Export mine first
          </ButtonLink>
        ) : null}
      </div>
    </Column>
  );
}
