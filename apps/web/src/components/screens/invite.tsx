"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useMembers } from "@/lib/data/hooks";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { create } from "@/lib/data/repo";
import { engineFor, inviteLink, isSharing, turnOnSharing } from "@/lib/data/sharing";
import { AUTH_CONFIGURED } from "@/lib/supabase";

const NEW = "new";
type Role = "helper" | "editor";

/**
 * "Send a link" (10 → M13). An invite is always for one person in the family
 * (someone listed, or someone new), so joining links them on every phone.
 * The first invite turns sharing on, and says so before it does.
 */
export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, session, householdId } = useData();
  const members = useMembers();
  const [who, setWho] = useState<string>(NEW);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("helper");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setLink(null);
    setNote(null);
    setCopied(false);
    onClose();
  };

  if (session.kind !== "account" || !AUTH_CONFIGURED)
    return (
      <Sheet open={open} onClose={close} title="Invite someone">
        <div className="flex flex-col gap-4 px-8 pb-[34px] pt-3">
          <p className="text-[17px] leading-[1.6] text-ink-body">
            {session.kind === "demo"
              ? "The demo can't send invites. Start your own field and sign in to share it."
              : !AUTH_CONFIGURED
                ? "Sharing isn't set up on this copy of Uchibatake."
                : "Invites need an account, so your field can be shared between phones. Your plants come with you when you sign in."}
          </p>
          {session.kind === "guest" && AUTH_CONFIGURED ? <ButtonLink href="/sign-in">Sign in</ButtonLink> : null}
        </div>
      </Sheet>
    );

  const me = meOf(members, session);
  if (me?.role === "helper")
    return (
      <Sheet open={open} onClose={close} title="Invite someone">
        <p className="px-8 pb-[34px] pt-3 text-[17px] leading-[1.6] text-ink-body">Invites come from whoever looks after the field. Ask them to send a link.</p>
      </Sheet>
    );
  // Adults who aren't on a phone of their own yet.
  const invitable = (members ?? []).filter((m) => m.kind === "adult" && !m.user_id && m.id !== me?.id);

  const make = async () => {
    if (busy) return;
    if (who === NEW && !name.trim()) return setNote("Add their name, so the family knows who's who.");
    setBusy(true);
    setNote(null);
    try {
      if (!(await isSharing(db))) {
        const r = await turnOnSharing(db, session, householdId);
        if ("other" in r) {
          setNote("This account already shares a different field. Open Settings › Share between phones to use it here.");
          return;
        }
      }
      let memberId = who;
      if (who === NEW) {
        const n = name.trim();
        const sort = Math.max(0, ...(members ?? []).map((m) => m.sort)) + 1;
        memberId = (await create(db.members, { name: n, role, kind: "adult", mark: { kind: "initial", letter: n[0].toUpperCase() }, age: null, note: null, user_id: null, sort }, householdId)).id;
        setWho(memberId); // a retry invites the same person, not another one
      }
      // The invite names a member the server must already have.
      const engine = engineFor(db);
      await engine?.sync();
      if (engine && engine.getStatus().state !== "idle") throw new Error(engine.getStatus().note ?? "not shared");
      setLink(await inviteLink(role, memberId, me?.name ?? null));
    } catch {
      setNote(typeof navigator !== "undefined" && !navigator.onLine ? "You're offline. Making a link needs a connection." : "We couldn't make the link just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Our family's field", text: "Come and help with our field in Uchibatake.", url: link });
        return;
      } catch {
        // Closed the share sheet, or it isn't allowed: copy instead.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setNote("Copy the link above and send it to them.");
    }
  };

  return (
    <Sheet open={open} onClose={close} title={link ? "Your link is ready" : "Invite someone"}>
      {link ? (
        <div className="flex flex-col gap-4 px-8 pb-[34px] pt-3">
          <p className="text-[17px] leading-[1.6] text-ink-body">Send it to them. It works once, for two weeks. They&apos;ll sign in, see your field, and join.</p>
          <p className="break-all rounded-[4px] border border-rule px-3 py-2.5 text-[15px] text-ink-soft">{link}</p>
          <Button onClick={send}>{copied ? "Copied" : "Send the link"}</Button>
          {note ? (
            <p role="status" className="text-[16px] text-ink-soft">
              {note}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-8 pb-[34px] pt-3">
          {invitable.length ? (
            <ChoiceList legend="Who is it for?" variant="radio" value={[who]} onChange={([v]) => setWho(v)} options={[...invitable.map((m) => ({ value: m.id, label: m.name })), { value: NEW, label: "Someone new" }]} />
          ) : null}
          {who === NEW ? <Field label="Their name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" /> : null}
          <ChoiceList
            legend="They'll join as"
            variant="radio"
            value={[role]}
            onChange={([v]) => setRole(v)}
            options={[
              { value: "helper", label: "Helper", hint: "Tick off jobs, log harvests, write in the journal." },
              { value: "editor", label: "Can edit everything", hint: "Add and move plants and spaces too." },
            ]}
          />
          {/* True of the code: the first invite turns sharing on (Settings › Share between phones). */}
          <p className="text-[16px] leading-normal text-ink-soft">
            Inviting someone shares your field between phones: it&apos;s copied to our server (Supabase), with your rough area for the weather, so they can open it. Photos and your street address stay on this phone.
          </p>
          <Button onClick={make} disabled={busy}>
            {busy ? "Making the link…" : "Make the link"}
          </Button>
          {note ? (
            <p role="status" className="text-[16px] text-ink-soft">
              {note}
            </p>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
