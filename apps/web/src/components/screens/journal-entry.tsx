"use client";

import { deletePhotos } from "@/lib/photos";
import { PhotoFrame } from "@/components/ui/photo";
import { usePhotos } from "@/components/ui/photo-picker";
import { JournalSheet } from "./journal-editor";
import { PageLoader } from "@/components/ui/page-loader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { remove } from "@/lib/data/repo";
import { useLiveQuery } from "dexie-react-hooks";
import { Avatar } from "@/components/ui/avatar";
import { BackBar } from "@/components/ui/bars";
import { Seal } from "@/components/ui/seal";
import { useMembers, usePlantings, useSpaces } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { longDate, plantName } from "./parts";

/** M15 Journal entry: the full page, its plants and place, and who wrote it. */
export function JournalEntryView({ id, editing: fromRoute = false }: { id: string; editing?: boolean }) {
  const [editing, setEditing] = useState(fromRoute);
  const { db } = useData();
  const router = useRouter();
  const entry = useLiveQuery(async () => (await db.journal_entries.get(id)) ?? null, [db, id]);
  const members = useMembers();
  const plantings = usePlantings();
  const spaces = useSpaces();
  const [asking, setAsking] = useState(false);
  if (entry === null || entry?.deleted_at) return <BackBar href="/journal" label="Journal" />;
  if (!entry) return <PageLoader back={{ href: "/journal", label: "Journal" }} />;
  const writer = members?.find((m) => m.id === entry.writer_id);
  const tags = [
    ...(plantings ?? []).filter((p) => entry.planting_ids.includes(p.id)).map((p) => ({ href: `/plants/${p.id}`, label: plantName(p) })),
    ...(spaces ?? []).filter((s) => entry.space_ids.includes(s.id)).map((s) => ({ href: `/spaces/${s.id}`, label: s.name })),
  ];
  return (
    <div className="pb-10">
      <BackBar
        href="/journal"
        label="Journal"
        right={
          <button type="button" onClick={() => setEditing(true)} className="tap flex min-h-11 items-center px-2 text-[17px]">
            Edit
          </button>
        }
      />
      <div className="rise flex flex-col gap-2 px-8 pt-3">
        <span className="text-[16px] text-ink-soft">{longDate(entry.written_on)}</span>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-mincho text-[32px] font-normal leading-[1.2]">{entry.title ?? "A page"}</h1>
          {entry.seal ? <Seal kind={entry.seal} size={44} press /> : null}
        </div>
      </div>
      <EntryPhotos ids={entry.photo_ids} />
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
      <div className="flex justify-center pt-10">
        <button type="button" className="tap min-h-11 px-4 text-[16px] text-ink-soft" onClick={() => setAsking(true)}>
          Delete
        </button>
      </div>
      <Sheet open={asking} onClose={() => setAsking(false)} title="Delete this page?">
        <div className="flex flex-col gap-4 px-8 pb-[34px] pt-3">
          <p className="text-[17px] leading-[1.6] text-ink-body">It goes from the journal and the plant&apos;s story{entry.photo_ids.length ? ", with its photos" : ""}. The harvests stay.</p>
          <Button
            variant="outline"
            onClick={async () => {
              await remove(db.journal_entries, entry.id);
              // Its photos are only on this phone: they go with the page.
              await deletePhotos(db, entry.photo_ids);
              router.replace("/journal");
            }}
          >
            Delete it
          </Button>
          <button type="button" className="min-h-11 text-[16px] text-ink-soft" onClick={() => setAsking(false)}>
            Keep it
          </button>
        </div>
      </Sheet>
      <JournalSheet
        id={entry.id}
        atOwnAddress={fromRoute}
        open={editing}
        onClose={() => {
          setEditing(false);
          if (fromRoute) router.replace(`/journal/${entry.id}`);
        }}
      />
    </div>
  );
}

/** M15: the page's photos in matted frames, the first one larger. */
function EntryPhotos({ ids }: { ids: string[] }) {
  const photos = usePhotos(ids);
  if (!photos.length) return null;
  return (
    <div className="rise flex flex-col gap-3 px-8 pt-5" style={{ "--i": 1 } as React.CSSProperties}>
      {photos.map((p, i) => (
        <PhotoFrame key={p.id} src={p.url} alt="" height={i === 0 ? 260 : 190} />
      ))}
    </div>
  );
}
