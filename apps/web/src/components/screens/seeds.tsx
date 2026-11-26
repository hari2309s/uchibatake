"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { usePlace } from "@/lib/place-climate";
import { cropById, inWindows, windowsFor, type Place } from "@uchibatake/content";
import { useState } from "react";
import { BackBar } from "@/components/ui/bars";
import { AddSeedSheet } from "./sheets";
import { Seal } from "@/components/ui/seal";
import { useMembers, useSeeds } from "@/lib/data/hooks";
import type { Seed } from "@/lib/data/types";
import { useToday } from "@/lib/use-today";

/** Can this packet go in now? From the crop's windows for this climate; none known, no claim. */
function sowNow(seed: Seed, md: string, place: Place | null): boolean {
  const crop = seed.crop_id ? cropById(seed.crop_id) : undefined;
  const w = crop ? windowsFor(crop, place) : undefined;
  return !!w && (inWindows(md, w.sow) || inWindows(md, w.sowIndoors) || inWindows(md, w.plantOut));
}

function Envelope({ seed, line, saved, i }: { seed: Seed; line: string; saved: string | null; i: number }) {
  return (
    <div className="rise relative flex min-h-[150px] flex-col gap-1 border border-rule bg-card px-3.5 pb-3.5 pt-[34px]" style={{ "--i": i } as React.CSSProperties}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-[22px] bg-wash" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      {seed.source === "saved" ? (
        <span className="absolute -right-1.5 -top-2">
          <Seal kind="種" size={28} label="Saved by us" />
        </span>
      ) : null}
      <span className="font-mincho text-[18px] leading-[1.2]">{seed.name}</span>
      {seed.variety || seed.from_note ? <span className="text-[16px] text-ink-soft">{seed.variety ?? seed.from_note}</span> : null}
      <span className="mt-auto text-[16px]">{saved ?? `Bought · ${seed.year}`}</span>
      <span className="text-[16px]">{line}</span>
    </div>
  );
}

/** 11 Seed box: paper envelopes, kept cool and dark. */
export function SeedBox() {
  const seeds = useSeeds();
  const [adding, setAdding] = useState(false);
  const climate = usePlace();
  const members = useMembers();
  const today = useToday();
  if (!seeds || !today) return <PageLoader />;
  const md = today.slice(5);
  const year = Number(today.slice(0, 4));
  const savedBy = (s: Seed) => (s.source === "saved" ? `Saved by ${members?.find((m) => m.id === s.saved_by)?.name ?? "us"} · ${s.year}` : null);
  const goodLine = (s: Seed) => (sowNow(s, md, climate) ? (cropById(s.crop_id ?? "")?.sowVerb === "Plant" ? "Plant this month" : "Sow this month") : s.good_until ? `Good until ${s.good_until}` : "");
  const soon = seeds.filter((s) => s.source === "bought" && sowNow(s, md, climate));
  const saved = seeds.filter((s) => s.source === "saved");
  const old = seeds.filter((s) => s.source === "bought" && !sowNow(s, md, climate) && year - s.year >= 2);
  const rest = seeds.filter((s) => !soon.includes(s) && !saved.includes(s) && !old.includes(s));

  const group = (title: string, list: Seed[], start: number) =>
    list.length ? (
      <section aria-label={title}>
        <div className="flex items-baseline gap-3 px-8 pt-7">
          <h2 className="font-mincho text-[21px] font-normal">{title}</h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>
        <div className="grid grid-cols-2 gap-3 px-8 pt-3.5">
          {list.map((s, i) => (
            <Envelope key={s.id} seed={s} line={goodLine(s)} saved={savedBy(s)} i={start + i} />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="pb-9">
      <BackBar href="/journal" label="Journal" />
      <div className="rise flex flex-col gap-2 px-8 pt-3">
        <h1 className="font-mincho text-[34px] font-normal">Seed box</h1>
        {seeds.length ? <p className="text-[16px] text-ink-soft">Paper envelopes, kept cool and dark.</p> : null}
      </div>
      {seeds.length === 0 ? <EmptyState line="Keep a few seeds from what you grow, and they'll live here." action="Add a seed packet" onAction={() => setAdding(true)} /> : null}
      {group("Sow soon", soon, 1)}
      {group("Saved by us", saved, 3)}
      {group("In the box", rest, 5)}
      {old.length ? (
        <section aria-label="Use before spring">
          <div className="flex items-baseline gap-3 px-8 pt-7">
            <h2 className="font-mincho text-[21px] font-normal">Use before spring</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          <ul className="px-8 pt-2">
            {old.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 border-b border-rule py-[13px] last:border-b-0">
                <span className="text-[17px]">
                  {s.name}
                  {s.variety ? ` · ${s.variety}` : ""}
                </span>
                <span className="text-[16px] text-ink-soft">Bought {s.year}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className={seeds.length ? "rise px-8 pt-6" : "hidden"} style={{ "--i": 8 } as React.CSSProperties}>
        <button type="button" onClick={() => setAdding(true)} className="tap flex min-h-16 w-full items-center justify-center gap-2.5 border-[1.5px] border-dashed border-rule-dash text-[17px] font-medium">
          <span aria-hidden className="text-[22px]">
            +
          </span>
          {seeds.length ? "Add seeds" : "Add a seed packet"}
        </button>
      </div>
      <AddSeedSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
