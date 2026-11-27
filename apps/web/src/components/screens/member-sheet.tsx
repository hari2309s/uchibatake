"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Mark, type KidMark } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceList, Segmented } from "@/components/ui/choice";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { getMeta } from "@/lib/data/db";
import { useMembers } from "@/lib/data/hooks";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { removeMember, setMemberRole } from "@/lib/data/remote";
import { create, remove, update } from "@/lib/data/repo";
import { SHARING_KEY, type Sharing } from "@/lib/data/sync";
import type { Member, Role } from "@/lib/data/types";
import { supabase } from "@/lib/supabase";

const KID_MARKS: { value: KidMark; label: string }[] = [
  { value: "leaf", label: "Leaf" },
  { value: "bean", label: "Bean" },
  { value: "sprout", label: "Sprout" },
];

/**
 * Someone in the family (10): add a grown-up or a child, change a name, mark,
 * age, part or role, or take someone out. Owners and editors manage; the
 * owner stays the owner. For someone on their own phone (shared field), a new
 * role or removal goes to the server first, so their permissions follow.
 */
export function MemberSheet({ open, onClose, member }: { open: boolean; onClose: () => void; member: Member | null }) {
  const [asking, setAsking] = useState(false);
  const close = () => {
    setAsking(false);
    onClose();
  };
  const title = asking && member ? `Take ${member.name} out?` : member ? member.name : "Add someone";
  return (
    <Sheet open={open} onClose={close} title={title}>
      {open ? <MemberForm member={member} onDone={close} asking={asking} setAsking={setAsking} /> : null}
    </Sheet>
  );
}

function MemberForm({ member, onDone, asking, setAsking }: { member: Member | null; onDone: () => void; asking: boolean; setAsking: (v: boolean) => void }) {
  const { db, session, householdId } = useData();
  const members = useMembers();
  const me = meOf(members, session);
  const [name, setName] = useState(member?.name ?? "");
  const [kind, setKind] = useState<Member["kind"]>(member?.kind ?? "adult");
  const [mark, setMark] = useState<KidMark>(member?.mark.kind !== "initial" && member?.mark ? member.mark.kind : "leaf");
  const [age, setAge] = useState(member?.age ? String(member.age) : "");
  const [note, setNote] = useState(member?.note ?? "");
  const [role, setRole] = useState<Role>(member?.role ?? "helper");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const isOwner = member?.role === "owner";
  const isMe = !!member && member.id === me?.id;
  const onAPhone = !!member?.user_id;
  // In a shared field, "me" is only the member linked to this account (canManageFamily's rule).
  const iAmOwner = (session.kind === "account" && (members ?? []).some((m) => m.user_id) ? (members ?? []).find((m) => m.user_id === session.id) : me)?.role === "owner";
  // Someone on their own phone: only the owner can change what they may do (the server checks too).
  const roleLocked = isOwner || (onAPhone && !iAmOwner) || kind === "child";

  const shared = async () => (session.kind === "account" ? await getMeta<Sharing>(db, SHARING_KEY) : undefined);
  const calm = () => setProblem(typeof navigator !== "undefined" && !navigator.onLine ? "You're offline. This needs a connection, because they're on their own phone." : "That didn't work just now. Nothing has changed; try again.");

  const save = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const fields = {
        name: n,
        kind,
        mark: kind === "child" ? ({ kind: mark } as const) : ({ kind: "initial", letter: n[0].toUpperCase() } as const),
        age: kind === "child" && /^\d{1,2}$/.test(age) ? Number(age) : null,
        note: note.trim() || null,
        role: kind === "child" ? ("helper" as const) : role,
      };
      if (member) {
        // A role change for someone on their own phone goes to the server first.
        if (fields.role !== member.role && member.user_id && (await shared())) {
          const sb = supabase();
          if (sb) await setMemberRole(sb, member.user_id, fields.role === "editor" ? "editor" : "helper");
        }
        await update(db.members, member.id, fields);
      } else {
        const sort = Math.max(0, ...(members ?? []).map((m) => m.sort)) + 1;
        await create(db.members, { ...fields, user_id: null, sort }, householdId);
      }
      onDone();
    } catch {
      calm();
    } finally {
      setBusy(false);
    }
  };

  const takeOut = async () => {
    if (!member || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      if (member.user_id && (await shared())) {
        const sb = supabase();
        if (sb) await removeMember(sb, member.user_id);
      }
      await remove(db.members, member.id);
      onDone();
    } catch {
      calm();
    } finally {
      setBusy(false);
    }
  };

  if (asking && member)
    return (
      <div className="flex flex-col gap-4 px-8 pb-[34px] pt-3">
        <p className="text-[17px] leading-[1.6] text-ink-body">
          {member.name} leaves the family list. Pages they wrote and harvests they picked stay.
          {onAPhone ? ` They also leave the shared field: what's already on their phone stays there, but they won't see new changes.` : ""}
        </p>
        {problem ? (
          <p role="status" className="text-[16px] text-ink-soft">
            {problem}
          </p>
        ) : null}
        <Button variant="outline" disabled={busy} onClick={takeOut}>
          Take {member.name} out
        </Button>
        <button type="button" className="min-h-11 text-[16px] text-ink-soft" onClick={() => setAsking(false)}>
          Keep {member.name}
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-5 px-8 pb-[34px] pt-3">
      <div className="flex items-center gap-4">
        <Avatar mark={kind === "child" ? { kind: mark } : { kind: "initial", letter: (name.trim()[0] ?? "?").toUpperCase() }} size={56} selected={isOwner} />
        <div className="flex-1">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" />
        </div>
      </div>
      {isOwner || (onAPhone && !iAmOwner) ? null : <Segmented className="self-start" label="Grown-up or child" value={kind} onChange={setKind} options={[{ value: "adult", label: "Grown-up" }, { value: "child", label: "Child" }]} />}
      {kind === "child" ? (
        <>
          <fieldset>
            <legend className="mb-2 text-[17px]">Their mark</legend>
            <div className="flex gap-3">
              {KID_MARKS.map((k) => (
                <label key={k.value} className="tap flex cursor-pointer flex-col items-center gap-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
                  <input type="radio" name="kid-mark" className="sr-only" checked={mark === k.value} onChange={() => setMark(k.value)} aria-label={k.label} />
                  <span className={cn("flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] transition-colors duration-300", mark === k.value ? "pop border-ink bg-ink text-on-ink" : "border-rule-strong")}>
                    <Mark mark={{ kind: k.value }} />
                  </span>
                  <span className="text-[15px]">{k.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))} />
        </>
      ) : null}
      <Field label="Their part in the field (if any)" placeholder="Seed keeper, snail patrol…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={40} />
      {kind === "adult" ? (
        isOwner ? (
          <p className="text-[16px] text-ink-soft">Looks after it all. The owner stays the owner.</p>
        ) : (
          <div className={roleLocked ? "pointer-events-none opacity-60" : undefined}>
            <ChoiceList
              legend="What they can do"
              variant="radio"
              value={[role]}
              onChange={([v]) => setRole(v as Role)}
              options={[
                { value: "helper", label: "Helper", hint: "Tick off jobs, log harvests, write in the journal." },
                { value: "editor", label: "Can edit everything", hint: "Add and move plants and spaces too." },
              ]}
            />
            {onAPhone && !iAmOwner ? <p className="pt-2 text-[15px] text-ink-soft">Only the owner can change this, because they&apos;re on their own phone.</p> : null}
          </div>
        )
      ) : null}
      {member?.kind === "child" ? (
        <Link href={`/kid/${member.id}`} className="tap inline-flex min-h-11 items-center text-[16px] font-medium underline underline-offset-4">
          Open {member.name}&apos;s jobs
        </Link>
      ) : null}
      {problem ? (
        <p role="status" className="text-[16px] text-ink-soft">
          {problem}
        </p>
      ) : null}
      <div className="flex flex-col gap-2.5 pt-1">
        <Button onClick={save} disabled={!name.trim() || busy}>
          {member ? "Save" : "Add to the family"}
        </Button>
        {member && !isOwner && !isMe ? (
          onAPhone && !iAmOwner ? (
            <p className="text-[15px] text-ink-soft">Only the owner can take {member.name} out, because they&apos;re on their own phone.</p>
          ) : (
            <button type="button" className="tap min-h-11 text-[16px] text-ink-soft" onClick={() => setAsking(true)}>
              Take {member.name} out of the family
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
