"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { placeOf } from "@/lib/place-climate";
import { BackBar } from "@/components/ui/bars";
import { Seal } from "@/components/ui/seal";
import { useHarvests, useHousehold, useJournal, usePlanting, useSpace } from "@/lib/data/hooks";
import type { SealKind } from "@/lib/data/types";
import { growthStatus } from "@/lib/growth";
import { isIndoors } from "@/lib/space-words";
import { useToday } from "@/lib/use-today";
import { plantName, shortDate } from "./parts";

const START = { seed: "Sown", plant: "Planted", scraps: "Started from scraps", existing: "Already growing" } as const;

/** M16 Plant timeline: a film strip. One thin rule as the spine, dates on the left, seals for 芽 and 収. */
export function Timeline({ id }: { id: string }) {
  const p = usePlanting(id);
  const space = useSpace(p?.space_id ?? "");
  const household = useHousehold();
  const journal = useJournal();
  const harvests = useHarvests(id);
  const today = useToday();
  if (p === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!p || !today) return <PageLoader back={{ href: "/spaces", label: "Spaces" }} />;
  const name = plantName(p);
  const pages = (journal ?? []).filter((j) => j.planting_ids.includes(p.id));
  const told = new Set(pages.filter((j) => j.seal === "収").map((j) => j.written_on));
  type M = { on: string; seal?: SealKind; title: string; sub?: string };
  // A page written the day it started tells the start: one moment, not two.
  const startPage = pages.find((j) => j.written_on === p.started_on);
  // Don't repeat a page's title at the start of its text ("Full and dark. Full and dark, and…").
  const body = (title: string | null, text: string) => (title && text.toLowerCase().startsWith(title.toLowerCase()) ? text.slice(title.length).replace(/^[\s,.;:–-]+/, "").replace(/^./, (c) => c.toUpperCase()) : text);
  const moments: M[] = [
    ...(startPage ? [] : [{ on: p.started_on, seal: "芽" as const, title: START[p.start_method], sub: p.quantity_note ?? undefined }]),
    ...pages.map((j) => ({
      on: j.written_on,
      seal: j === startPage ? ("芽" as const) : (j.seal ?? undefined),
      title: j.title ?? (j === startPage ? START[p.start_method] : j.text),
      sub: [j === startPage ? p.quantity_note : null, j.title ? body(j.title, j.text) : null].filter(Boolean).join(". ") || undefined,
    })),
    ...(harvests ?? []).filter((h) => !told.has(h.picked_on)).map((h) => ({ on: h.picked_on, seal: "収" as const, title: "Picked", sub: h.note ?? (h.unit === "g" ? `about ${h.amount} g` : `${h.amount}`) })),
  ].sort((a, b) => a.on.localeCompare(b.on));
  const g = growthStatus(p, today, { indoors: isIndoors(space), place: placeOf(household) });

  return (
    <div className="pb-9">
      <BackBar href={`/plants/${p.id}`} label={name} />
      <div className="rise flex flex-col gap-2 px-8 pb-2.5">
        <h1 className="font-mincho text-[30px] font-normal leading-[1.2]">{name}, so far</h1>
        <p className="text-[17px] leading-[1.6] text-ink-body">{[space?.name, `since ${shortDate(p.started_on)}`].filter(Boolean).join(" · ")}</p>
      </div>
      <ol className="relative flex flex-col px-8 pt-3">
        <span aria-hidden className="absolute bottom-0 left-[96px] top-0 w-[1.5px] bg-rule" />
        {[...moments, { on: today, title: "Today", sub: g.label }].sort((a, b) => a.on.localeCompare(b.on) || (a.title === "Today" ? 1 : -1)).map((m, i) => (
          <li key={i} className="rise relative grid grid-cols-[56px_1fr] gap-5 pb-6" style={{ "--i": i + 1 } as React.CSSProperties}>
            <div className="flex flex-col items-start gap-1.5 pt-0.5">
              <span className="font-mincho text-[18px] leading-tight">{m.title === "Today" ? "Today" : shortDate(m.on)}</span>
              {"seal" in m && m.seal ? <Seal kind={m.seal} size={28} /> : null}
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mincho text-[19px] leading-snug">{m.title === "Today" ? g.label : m.title}</span>
              {m.title !== "Today" && m.sub ? <span className="text-[16px] leading-normal text-ink-soft">{m.sub}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
