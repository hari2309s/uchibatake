"use client";

import { almanacDay, CROPS, inWindows, searchCrops, windowsFor, type Crop } from "@uchibatake/content";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { useHousehold, useSpaces } from "@/lib/data/hooks";
import { startsNow } from "@/lib/plan";
import { useToday } from "@/lib/use-today";
import { dateWords } from "@/lib/words";

const EASE = { "very-easy": "Very easy", easy: "Easy", "some-care": "Needs some care" } as const;

/** 06 / M07: what you could grow, searched or suggested for today. Starting a plant comes in Phase 4. */
export function AddPlant() {
  const household = useHousehold();
  const spaces = useSpaces();
  const today = useToday();
  const [q, setQ] = useState("");
  if (!today || !household || !spaces) return null;
  const md = today.slice(5);
  const known = household.climate === "temperate";
  const where = (c: Crop) => spaces.find((s) => startsNow(c, { key: s.id, type: s.type, name: s.name }, md, "temperate", 1));
  const line = (c: Crop) => {
    if (!known) return null;
    const s = where(c);
    if (s) return { now: true, text: `A good time to start, in the ${s.name.toLowerCase()}.` };
    const w = windowsFor(c, "temperate");
    const windows = [...(w?.sow ?? []), ...(w?.sowIndoors ?? []), ...(w?.plantOut ?? [])];
    if (windows.some((x) => inWindows(md, [x]))) return { now: false, text: "Its season is now, but not in your spaces." };
    const until = (from: string) => (almanacDay(from) - almanacDay(md) + 366) % 366;
    const next = windows.map((x) => x.from).sort((a, b) => until(a) - until(b))[0];
    return next ? { now: false, text: `Wait until ${dateWords(next)}.` } : null;
  };
  const list = q.trim() ? searchCrops(q) : CROPS.filter((c) => c.sources.length && known && where(c)).slice(0, 8);

  return (
    <div className="pb-9">
      <div className="rise flex flex-col gap-2 px-8 pt-[30px]">
        <h1 className="font-mincho text-[34px] font-normal">Add a plant</h1>
        <p className="text-[16px] text-ink-soft">What would you like to grow?</p>
      </div>
      <div className="rise px-8 pt-4" style={{ "--i": 1 } as React.CSSProperties}>
        <Field label="Search plants" hideLabel placeholder="Search: leeks, mint, peas…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!q.trim() && known ? <h2 className="px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">Good to start now{household.place ? ` in ${household.place}` : ""}</h2> : null}
      <ul className="px-8 pt-2">
        {list.map((c, i) => {
          const l = line(c);
          return (
            <li key={c.id} className="rise flex flex-col gap-1 border-b border-rule py-4" style={{ "--i": i + 2 } as React.CSSProperties}>
              <span className="font-mincho text-[21px]">{c.name}</span>
              {c.difficulty ? <span className="text-[16px] text-ink-soft">{EASE[c.difficulty]}</span> : null}
              {l ? <span className={l.now ? "text-[16px]" : "text-[16px] text-ink-soft"}>{l.text}</span> : null}
            </li>
          );
        })}
        {q.trim() && !list.length ? <li className="py-4 text-[17px] text-ink-body">We don&apos;t know &lsquo;{q.trim()}&rsquo; yet.</li> : null}
      </ul>
      <p className="px-8 pt-5 text-[16px] text-ink-soft">Starting a plant from here, with its grow guide, is coming next.</p>
    </div>
  );
}
