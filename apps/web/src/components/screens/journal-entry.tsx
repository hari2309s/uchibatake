"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Avatar } from "@/components/ui/avatar";
import { BackBar } from "@/components/ui/bars";
import { Seal } from "@/components/ui/seal";
import { useMembers, usePlantings, useSpaces } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { longDate, plantName } from "./parts";

/** M15 Journal entry: the full page, its plants and place, and who wrote it. */
export function JournalEntryView({ id }: { id: string }) {
  const { db } = useData();
  const entry = useLiveQuery(async () => (await db.journal_entries.get(id)) ?? null, [db, id]);
  const members = useMembers();
  const plantings = usePlantings();
  const spaces = useSpaces();
  if (entry === null || entry?.deleted_at) return <BackBar href="/journal" label="Journal" />;
  if (!entry) return null;
  const writer = members?.find((m) => m.id === entry.writer_id);
  const tags = [
    ...(plantings ?? []).filter((p) => entry.planting_ids.includes(p.id)).map((p) => ({ href: `/plants/${p.id}`, label: plantName(p) })),
    ...(spaces ?? []).filter((s) => entry.space_ids.includes(s.id)).map((s) => ({ href: `/spaces/${s.id}`, label: s.name })),
  ];
  return (
    <div className="pb-10">
      <BackBar href="/journal" label="Journal" />
      <div className="rise flex flex-col gap-2 px-8 pt-3">
        <span className="text-[16px] text-ink-soft">{longDate(entry.written_on)}</span>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-mincho text-[32px] font-normal leading-[1.2]">{entry.title ?? "A page"}</h1>
          {entry.seal ? <Seal kind={entry.seal} size={44} press /> : null}
        </div>
      </div>
      <p className="rise px-8 pt-5 font-mincho text-[19px] leading-[1.7]" style={{ "--i": 1 } as React.CSSProperties}>
        {entry.text}
      </p>
      {tags.length ? (
        <div className="rise flex flex-wrap gap-2 px-8 pt-6" style={{ "--i": 2 } as React.CSSProperties}>
          {tags.map((t) => (
            <Link key={t.href} href={t.href} className="flex h-11 items-center rounded-[22px] border-[1.5px] border-rule-strong px-4 text-[16px]">
              {t.label}
            </Link>
          ))}
        </div>
      ) : null}
      {writer ? (
        <div className="rise mx-8 mt-8 flex items-center gap-3 border-t border-rule pt-5" style={{ "--i": 3 } as React.CSSProperties}>
          <Avatar mark={writer.mark} size={44} quiet />
          <span className="text-[16px] text-ink-soft">Written by {writer.name}</span>
        </div>
      ) : null}
    </div>
  );
}
