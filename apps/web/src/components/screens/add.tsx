"use client";

import { CROPS, searchCrops, windowsFor, almanacDay, inWindows, type Crop } from "@uchibatake/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/choice";
import { Enso } from "@/components/ui/enso";
import { Field } from "@/components/ui/field";
import { useHousehold, useSpaces } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { addPlanting } from "@/lib/data/repo";
import { DIFFICULTY_WORDS, rankSpaces } from "@/lib/fit";
import { firstSeason, startsNow } from "@/lib/plan";
import { useToday } from "@/lib/use-today";
import { dateWords } from "@/lib/words";

/** How far through its starting season a crop is today (for the search row's ensō), 0 when not in season. */
function seasonProgress(c: Crop, md: string, climate: "temperate" | null): number {
  if (!climate) return 6;
  const w = windowsFor(c, climate);
  const win = [...(w?.sow ?? []), ...(w?.sowIndoors ?? []), ...(w?.plantOut ?? [])].find((x) => inWindows(md, [x]));
  if (!win) return 6;
  if (win.from === "01-01" && win.to === "12-31") return 60;
  const len = (almanacDay(win.to) - almanacDay(win.from) + 366) % 366 || 1;
  const done = (almanacDay(md) - almanacDay(win.from) + 366) % 366;
  return Math.max(10, Math.min(92, (done / len) * 100));
}

/** M08: a plant we don't know yet. Name, where, and it joins the field with its own story. */
function OwnPlant({ name: initial }: { name: string }) {
  const { db } = useData();
  const router = useRouter();
  const spaces = useSpaces();
  const today = useToday();
  const [name, setName] = useState(initial);
  const [picked, setSpace] = useState<string[]>([]);
  if (!spaces || !today) return null;
  const space = picked.length ? picked : spaces[0] ? [spaces[0].id] : [];
  return (
    <div className="rise flex flex-col gap-5 px-8 pt-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-mincho text-[26px] font-normal">We don&apos;t know &lsquo;{initial}&rsquo; yet.</h2>
        <p className="text-[17px] leading-[1.6] text-ink-body">Add it as your own plant. We&apos;ll keep its story with yours, and won&apos;t guess how to grow it.</p>
      </div>
      <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      {spaces.length ? (
        <Chips legend="Where is it?" multiple={false} value={space} onChange={setSpace} options={spaces.map((s) => ({ value: s.id, label: s.name }))} />
      ) : (
        <p className="text-[16px] text-ink-soft">Add a space first, so it has somewhere to live.</p>
      )}
      <Button
        disabled={!name.trim() || !space[0]}
        onClick={async () => {
          const p = await addPlanting(db, { crop_id: null, own_name: name.trim(), nickname: null, space_id: space[0], start_method: "existing", started_on: today, status: "growing", ended_on: null, lost_cause: null, quantity_note: null });
          router.push(`/plants/${p.id}`);
        }}
      >
        Add {name.trim() || "it"}
      </Button>
    </div>
  );
}

/** 06 Add plant / M07 search / M08 no results. */
export function AddPlant() {
  const household = useHousehold();
  const spaces = useSpaces();
  const today = useToday();
  const [q, setQ] = useState("");
  if (!today || !household || !spaces) return null;
  const md = today.slice(5);
  const climate = household.climate === "temperate" ? ("temperate" as const) : null;
  const bestSpace = (c: Crop) => (climate ? rankSpaces(c, spaces, md, climate)[0] : undefined);
  const line = (c: Crop) => {
    if (!climate) return null;
    const s = spaces.find((sp) => startsNow(c, { key: sp.id, type: sp.type, name: sp.name }, md, climate, 1));
    if (s) return { now: true, text: "A good time to start." };
    const w = windowsFor(c, climate);
    const windows = [...(w?.sow ?? []), ...(w?.sowIndoors ?? []), ...(w?.plantOut ?? [])];
    if (windows.some((x) => inWindows(md, [x]))) return { now: false, text: "Its season is now, but not in your spaces." };
    const until = (from: string) => (almanacDay(from) - almanacDay(md) + 366) % 366;
    const next = windows.map((x) => x.from).sort((a, b) => until(a) - until(b))[0];
    return next ? { now: false, text: `Wait until ${dateWords(next)}.` } : null;
  };
  const query = q.trim();
  const list = query ? searchCrops(query) : CROPS.filter((c) => c.sources.length && climate && spaces.some((s) => startsNow(c, { key: s.id, type: s.type, name: s.name }, md, climate, 1))).slice(0, 8);
  const later = climate ? firstSeason({ spaces: spaces.map((s) => ({ key: s.id, type: s.type, name: s.name })), today, climate, likes: household.likes }).later : null;

  return (
    <div className="pb-9">
      <div className="rise flex flex-col gap-2 px-8 pt-[30px]">
        <h1 className="font-mincho text-[34px] font-normal">Add a plant</h1>
        <p className="text-[16px] text-ink-soft">What would you like to grow?</p>
      </div>
      <div className="rise px-8 pt-4" style={{ "--i": 1 } as React.CSSProperties}>
        <Field label="Search plants" hideLabel placeholder="Search: leeks, mint, peas…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!query && climate ? <h2 className="rise px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">Good to start now{household.place ? ` in ${household.place}` : ""}</h2> : null}
      {query && !list.length ? (
        <OwnPlant key={query} name={query} />
      ) : (
        <ul className="px-8 pt-2">
          {list.map((c, i) => {
            const l = line(c);
            const best = bestSpace(c);
            const meta = [c.difficulty ? DIFFICULTY_WORDS[c.difficulty] : null, best && best.score > 0 ? `best on the ${best.space.name.toLowerCase()}` : null].filter(Boolean).join(" · ");
            return (
              <li key={c.id} className="rise border-b border-rule" style={{ "--i": i + 2 } as React.CSSProperties}>
                <Link href={`/crops/${c.id}`} className="tap flex items-center gap-4 py-4">
                  <Enso value={seasonProgress(c, md, climate)} size={44} label={l?.now ? "In its starting season" : undefined} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-mincho text-[21px]">{c.name}</span>
                    {meta ? <span className="text-[16px] text-ink-soft">{meta.replace(/^./, (x) => x.toUpperCase())}</span> : null}
                    {l ? <span className={l.now ? "text-[16px]" : "text-[16px] text-ink-soft"}>{l.text}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {!query && later ? <p className="rise px-8 pt-5 text-[16px] leading-normal text-ink-soft">{later.line}</p> : null}
      {!climate && !query ? <p className="px-8 pt-6 text-[16px] text-ink-soft">Search for a plant. Once we know your climate, we&apos;ll suggest what to start now.</p> : null}
    </div>
  );
}
