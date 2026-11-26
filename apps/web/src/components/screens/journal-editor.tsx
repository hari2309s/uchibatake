"use client";

import { microseasonFor } from "@uchibatake/content";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
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
 * 12 New journal page (and M15's Edit): a notebook page on card paper, ruled,
 * written in Mincho; who's writing; what it's about; and a seal, outlined until
 * chosen, then filled and tilted like a real stamp.
 */
export function JournalEditor({ id }: { id?: string }) {
  const { db, session } = useData();
  const router = useRouter();
  const today = useToday();
  const members = useMembers();
  const plantings = usePlantings();
  const spaces = useSpaces();
  const existing = useLiveQuery(async () => (id ? ((await db.journal_entries.get(id)) ?? null) : null), [db, id]);
  const [draft, setDraft] = useState<{ writer?: string; text?: string; seal?: SealKind | null; plants?: string[]; places?: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagging, setTagging] = useState(false);
  if (!today || !members || (id && existing === undefined)) return null;

  const on = existing?.written_on ?? today;
  const writer = draft?.writer ?? existing?.writer_id ?? meOf(members, session)?.id ?? members[0]?.id;
  const text = draft?.text ?? existing?.text ?? "";
  const seal = draft?.seal !== undefined ? draft.seal : (existing?.seal ?? null);
  const plants = draft?.plants ?? existing?.planting_ids ?? [];
  const places = draft?.places ?? existing?.space_ids ?? [];
  const set = (p: Partial<NonNullable<typeof draft>>) => setDraft((d) => ({ ...(d ?? {}), ...p }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const back = id ? `/journal/${id}` : "/journal";

  const save = async () => {
    if (!text.trim() || !writer || saving) return;
    setSaving(true);
    // The first sentence, short enough, becomes the page's title in the journal.
    const fromText = (t: string) => {
      const first = t.trim().split(/(?<=[.!?])\s/)[0];
      return first.length <= 48 ? first.replace(/[.!?]$/, "") : null;
    };
    // A title someone (or an ending) wrote stays; one taken from the old text follows the new text.
    const title = existing?.title && existing.title !== fromText(existing.text) ? existing.title : fromText(text);
    if (existing) {
      await update(db.journal_entries, existing.id, { writer_id: writer, text: text.trim(), title, seal, planting_ids: plants, space_ids: places });
      router.replace(`/journal/${existing.id}`);
    } else {
      const e = await addJournalEntry(db, { writer_id: writer, written_on: on, title, text: text.trim(), seal, planting_ids: plants, space_ids: places, photo_ids: [], kind: "note" });
      router.replace(`/journal/${e.id}`);
    }
  };

  const growing = (plantings ?? []).filter((p) => p.status === "growing" || plants.includes(p.id));
  const tagOptions = [...growing.map((p) => ({ id: p.id, label: plantName(p), kind: "plant" as const })), ...(spaces ?? []).map((s) => ({ id: s.id, label: s.name, kind: "space" as const }))];
  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col">
      <div className="flex h-[52px] items-center justify-between px-5">
        <Link href={back} className="tap flex min-h-11 items-center px-2 text-[17px] text-ink-soft">
          Cancel
        </Link>
        <span className="font-mincho text-[18px]">{existing ? "Edit page" : "New page"}</span>
        <button type="button" onClick={save} disabled={!text.trim() || saving} className="tap flex min-h-11 items-center px-2 text-[17px] font-bold text-shu disabled:opacity-40">
          Save
        </button>
      </div>
      <div className="rise relative flex-1 border-t border-rule bg-card pb-10" style={{ "--i": 0 } as React.CSSProperties}>
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
            rows={6}
            className="block min-h-[216px] w-full resize-none bg-transparent font-mincho text-[19px] leading-[36px] text-ink placeholder:text-ink-soft focus-visible:rounded-none"
            style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 35px, var(--rule) 35px 36px)", backgroundAttachment: "local" }}
          />
        </label>
        <div className="flex flex-wrap gap-2 pl-[46px] pr-8 pt-4">
          {tagOptions
            .filter((t) => (t.kind === "plant" ? plants.includes(t.id) : places.includes(t.id)))
            .map((t) => (
              <button key={t.id} type="button" aria-label={`Remove tag ${t.label}`} onClick={() => (t.kind === "plant" ? set({ plants: toggle(plants, t.id) }) : set({ places: toggle(places, t.id) }))} className="pop tap flex h-11 items-center rounded-[22px] border-[1.5px] border-ink px-3.5 text-[16px]">
                {t.label}
              </button>
            ))}
          <button type="button" onClick={() => setTagging(true)} className="tap flex h-11 items-center rounded-[22px] border-[1.5px] border-dashed border-rule-dash px-3.5 text-[16px] text-ink-soft">
            + tag
          </button>
        </div>
        <Sheet open={tagging} onClose={() => setTagging(false)} title="What's it about?">
          <fieldset className="flex flex-wrap gap-2 px-8 pb-[34px] pt-3">
            <legend className="sr-only">Plants and spaces</legend>
            {tagOptions.map((t) => {
              const on = t.kind === "plant" ? plants.includes(t.id) : places.includes(t.id);
              return (
                <label key={t.id} className={cn("tap flex h-11 cursor-pointer items-center rounded-[22px] border-[1.5px] px-3.5 text-[16px] transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink", on ? "pop border-ink bg-ink text-on-ink" : "border-rule-strong")}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => (t.kind === "plant" ? set({ plants: toggle(plants, t.id) }) : set({ places: toggle(places, t.id) }))} />
                  {t.label}
                </label>
              );
            })}
          </fieldset>
        </Sheet>
        <fieldset className="pl-[46px] pr-8 pt-7">
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
    </div>
  );
}
