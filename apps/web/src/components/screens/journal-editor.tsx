"use client";

import { microseasonFor } from "@uchibatake/content";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Seal, SEAL_NAMES, type SealKind } from "@/components/ui/seal";
import { Sheet } from "@/components/ui/sheet";
import { useMembers, usePlantings, useSpaces } from "@/lib/data/hooks";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { addJournalEntry, update } from "@/lib/data/repo";
import { useToday } from "@/lib/use-today";
import { longDate, plantName } from "./parts";

/**
 * 12 New journal page (and M15's Edit), as a drawer like Log a harvest: a
 * notebook page on card paper, ruled, written in Mincho; who's writing; what
 * it's about; and a seal, outlined until chosen, then filled and tilted like a
 * real stamp. The form mounts only while open, so each opening starts fresh.
 */
export function JournalSheet({ open, onClose, id, atOwnAddress = false }: { open: boolean; onClose: () => void; id?: string; atOwnAddress?: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={id ? "Edit page" : "New page"} backCloses={!atOwnAddress}>
      {open ? <JournalForm id={id} onDone={onClose} /> : null}
    </Sheet>
  );
}

function JournalForm({ id, onDone }: { id?: string; onDone: () => void }) {
  const { db, session } = useData();
  const today = useToday();
  const members = useMembers();
  const plantings = usePlantings();
  const spaces = useSpaces();
  const existing = useLiveQuery(async () => (id ? ((await db.journal_entries.get(id)) ?? null) : null), [db, id]);
  const [draft, setDraft] = useState<{ writer?: string; text?: string; seal?: SealKind | null; plants?: string[]; places?: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagging, setTagging] = useState(false);
  if (!today || !members || (id && existing === undefined)) return <div className="min-h-[50dvh]" aria-busy="true" />;

  const on = existing?.written_on ?? today;
  const writer = draft?.writer ?? existing?.writer_id ?? meOf(members, session)?.id ?? members[0]?.id;
  const text = draft?.text ?? existing?.text ?? "";
  const seal = draft?.seal !== undefined ? draft.seal : (existing?.seal ?? null);
  const plants = draft?.plants ?? existing?.planting_ids ?? [];
  const places = draft?.places ?? existing?.space_ids ?? [];
  const set = (p: Partial<NonNullable<typeof draft>>) => setDraft((d) => ({ ...(d ?? {}), ...p }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    if (!text.trim() || !writer || saving) return;
    setSaving(true);
    try {
      // The first sentence, short enough, becomes the page's title in the journal.
      const fromText = (t: string) => {
        const first = t.trim().split(/(?<=[.!?])\s/)[0];
        return first.length <= 48 ? first.replace(/[.!?]$/, "") : null;
      };
      // A title someone (or an ending) wrote stays; one taken from the old text follows the new text.
      const title = existing?.title && existing.title !== fromText(existing.text) ? existing.title : fromText(text);
      if (existing) await update(db.journal_entries, existing.id, { writer_id: writer, text: text.trim(), title, seal, planting_ids: plants, space_ids: places });
      else await addJournalEntry(db, { writer_id: writer, written_on: on, title, text: text.trim(), seal, planting_ids: plants, space_ids: places, photo_ids: [], kind: "note" });
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const growing = (plantings ?? []).filter((p) => p.status === "growing" || plants.includes(p.id));
  const tagOptions = [...growing.map((p) => ({ id: p.id, label: plantName(p), kind: "plant" as const })), ...(spaces ?? []).map((s) => ({ id: s.id, label: s.name, kind: "space" as const }))];
  const isOn = (t: (typeof tagOptions)[number]) => (t.kind === "plant" ? plants.includes(t.id) : places.includes(t.id));
  const flip = (t: (typeof tagOptions)[number]) => (t.kind === "plant" ? set({ plants: toggle(plants, t.id) }) : set({ places: toggle(places, t.id) }));

  return (
    <div className="flex flex-col pb-[34px]">
      <div className="relative mt-3 border-y border-rule bg-card pb-6">
        <span aria-hidden className="absolute bottom-0 left-[30px] top-0 w-px bg-rule" />
        <div className="pl-[46px] pr-8 pt-4 font-mincho text-[17px] text-ink-soft">
          {longDate(on)} · {microseasonFor(on.slice(5)).english}
        </div>
        <fieldset className="flex flex-wrap items-center gap-2 pl-[46px] pr-8 pt-3.5">
          <legend className="sr-only">Who&apos;s writing</legend>
          <span aria-hidden className="mr-1 text-[16px] text-ink-soft">
            Writing:
          </span>
          {members.map((m) => (
            <label key={m.id} className="tap cursor-pointer rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
              <input type="radio" name="writer" className="sr-only" checked={writer === m.id} onChange={() => set({ writer: m.id })} aria-label={m.name} />
              <Avatar mark={m.mark} size={44} selected={writer === m.id} className={writer === m.id ? "pop" : undefined} />
            </label>
          ))}
        </fieldset>
        <label className="block pl-[46px] pr-8 pt-4">
          <span className="sr-only">The page</span>
          <textarea
            value={text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="What happened in the field today?"
            rows={4}
            className="block min-h-[144px] w-full resize-none bg-transparent font-mincho text-[19px] leading-[36px] text-ink placeholder:text-ink-soft focus-visible:rounded-none"
            style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 35px, var(--rule) 35px 36px)", backgroundAttachment: "local" }}
          />
        </label>
        {/* What it's about: chosen tags, then (on "+ tag") every plant and space, right here in the drawer. */}
        <div className="flex flex-wrap gap-2 pl-[46px] pr-8 pt-4">
          {(tagging ? tagOptions : tagOptions.filter(isOn)).map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tagging ? isOn(t) : undefined}
              aria-label={tagging ? undefined : `Remove tag ${t.label}`}
              onClick={() => flip(t)}
              className={cn("tap flex h-11 items-center rounded-[22px] border-[1.5px] px-3.5 text-[16px] transition-colors duration-300", isOn(t) ? "border-ink bg-ink text-on-ink" : "border-rule-strong")}
            >
              {t.label}
            </button>
          ))}
          <button type="button" onClick={() => setTagging((x) => !x)} className="tap flex h-11 items-center rounded-[22px] border-[1.5px] border-dashed border-rule-dash px-3.5 text-[16px] text-ink-soft">
            {tagging ? "Done" : "+ tag"}
          </button>
        </div>
        <fieldset className="pl-[46px] pr-8 pt-6">
          <legend className="pb-2.5 text-[16px] text-ink-soft">Add a seal</legend>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(SEAL_NAMES) as SealKind[]).map((k) => (
              <label key={k} className="tap flex min-h-11 cursor-pointer flex-col items-center gap-[5px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
                <input type="checkbox" className="sr-only" checked={seal === k} onChange={() => set({ seal: seal === k ? null : k })} aria-label={SEAL_NAMES[k]} />
                <Seal key={`${k}-${seal === k}`} kind={k} size={48} outline={seal !== k} press={seal === k} />
                <span className={seal === k ? "text-[16px] font-bold" : "text-[16px]"}>{SEAL_NAMES[k]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="px-8 pt-5">
        <Button variant="accent" onClick={save} disabled={!text.trim() || saving}>
          {saving ? "Saving…" : "Save the page"}
        </Button>
      </div>
    </div>
  );
}
