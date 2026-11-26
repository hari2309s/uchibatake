"use client";

import { placeOf } from "@/lib/place-climate";
import { almanacDay, cropById, MICROSEASONS, microseasonEnd, microseasonFor, SEASON_TABLES, SOLAR_TERMS, windowMicroseasons, windowsFor, type SeasonTable } from "@uchibatake/content";
import { useState } from "react";
import { useHousehold, usePlantings } from "@/lib/data/hooks";
import { parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { listWords } from "@/lib/words";

const C = 170;
const P = (i: number, r: number) => {
  const a = (i / 72) * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = P(from, r);
  const [x2, y2] = P(to, r);
  const span = (to - from + 72) % 72 || 72;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${span > 36 ? 1 : 0} 1 ${x2} ${y2}`;
};
const md = (s: string) => parseIsoDate(`2001-${s}`).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
// Seasons told apart by line, never colour: solid, thin, dashed, dotted (C05).
const STYLES = [
  { w: 7, dash: undefined },
  { w: 2, dash: undefined },
  { w: 4, dash: "10 6" },
  { w: 4, dash: "1 7" },
];

/** 08 / C05 The growing year: local seasons as the outer band, 72 microseasons as ticks, sow and harvest dots. */
export function GrowingYear() {
  const household = useHousehold();
  const plantings = usePlantings();
  const today = useToday();
  const [sel, setSel] = useState<number | null>(null);
  if (!household || !today || !plantings) return null;
  const now = microseasonFor(today.slice(5)).index;
  const i = sel ?? now;
  const table: SeasonTable | undefined = (household.season_table ? SEASON_TABLES[household.season_table] : undefined) ?? household.seasons ?? undefined;
  const place = placeOf(household);

  // Sow and harvest dots from what this family grows (and grew this year).
  const crops = [...new Set(plantings.filter((p) => p.crop_id && p.status === "growing").map((p) => p.crop_id!))].map((id) => cropById(id)!).filter(Boolean);
  const sow: string[][] = Array.from({ length: 72 }, () => []);
  const pick: string[][] = Array.from({ length: 72 }, () => []);
  if (place)
    for (const c of crops) {
      const w = windowsFor(c, place);
      for (const k of windowMicroseasons([...(w?.sow ?? []), ...(w?.sowIndoors ?? []), ...(w?.plantOut ?? [])])) sow[k].push(c.name);
      for (const k of windowMicroseasons(w?.harvest)) pick[k].push(c.name);
    }

  const seasons = table ? [...table.seasons].sort((a, b) => almanacDay(a.start) - almanacDay(b.start)) : [];
  const startIdx = (s: string) => MICROSEASONS.findIndex((m) => m.start === s);
  const ms = MICROSEASONS[i];
  const term = SOLAR_TERMS[ms.term];
  const seasonAt = seasons.length ? seasons.filter((s) => startIdx(s.start) <= i).at(-1) ?? seasons.at(-1)! : null;
  const note = table?.termNotes?.[ms.term] ?? (seasonAt ? `${seasonAt.name} · ${seasonAt.poem}.` : null);

  return (
    <div className="pb-9">
      <div className="rise flex flex-col gap-2 px-8 pt-[30px]">
        <h1 className="font-mincho text-[34px] font-normal">The growing year</h1>
        <p className="text-[16px] text-ink-soft">{table ? `${table.place === "generic" ? "Your" : `${household.place || table.place}'s`} seasons outside, Japan's microseasons within.` : "Every microseason, and what your family grows in each."}</p>
      </div>
      <div className="rise flex justify-center pt-4" style={{ "--i": 1 } as React.CSSProperties}>
        <svg width="340" height="340" viewBox="0 0 340 340" className="block max-w-full" role="group" aria-label="The year as a ring">
          {/* Local seasons: the outer band. */}
          {seasons.map((s, k) => {
            const from = startIdx(s.start);
            const to = startIdx(seasons[(k + 1) % seasons.length].start);
            const st = STYLES[k % STYLES.length];
            // One season all year: the whole band.
            if (seasons.length === 1) return <circle key={s.id} cx={C} cy={C} r="160" fill="none" stroke="var(--ink)" strokeWidth="4" opacity="1" className="fade-in" />;
            return <path key={s.id} d={arc(from, to, 160)} fill="none" stroke="var(--ink)" strokeWidth={st.w} strokeDasharray={st.dash} strokeLinecap="round" opacity={seasonAt?.id === s.id ? 1 : 0.55} className="fade-in" style={{ animationDelay: `${k * 90}ms` }} />;
          })}
          {/* Frost months, dotted (Amsterdam's table). */}
          {table?.frost ? <path d={arc(table.frost.from, table.frost.to, 100)} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" /> : null}
          <circle cx={C} cy={C} r="88" fill="none" stroke="var(--rule)" strokeWidth="1" />
          {MICROSEASONS.map((_, k) => {
            const isTerm = k % 3 === 0;
            const isNow = k === now;
            const [a1, b1] = P(k, isTerm ? 116 : 123);
            const [a2, b2] = P(k, isTerm ? 146 : 137);
            return <line key={k} x1={a1} y1={b1} x2={a2} y2={b2} stroke={isNow ? "var(--shu)" : "var(--ink)"} strokeWidth={isNow ? 3.2 : isTerm ? 1.6 : 1} strokeLinecap="round" opacity={isNow || isTerm ? 1 : 0.5} className="fade-in" style={{ animationDelay: `${300 + k * 8}ms` }} />;
          })}
          {pick.map((names, k) => (names.length ? <circle key={`p${k}`} cx={P(k, 153)[0]} cy={P(k, 153)[1]} r={Math.min(1.4 + names.length * 0.55, 4)} fill="var(--ink)" /> : null))}
          {sow.map((names, k) => (names.length ? <circle key={`s${k}`} cx={P(k, 108)[0]} cy={P(k, 108)[1]} r="2.6" fill="none" stroke="var(--ink)" strokeWidth="1.2" /> : null))}
          {/* The selection, then the taps. */}
          <circle cx={P(i, 163)[0]} cy={P(i, 163)[1]} r="5.5" fill="var(--ink)" style={{ transition: "cx 400ms ease, cy 400ms ease" }} />
          {MICROSEASONS.map((m, k) => {
            const [h1, k1] = P(k, 96);
            const [h2, k2] = P(k, 166);
            return <line key={`t${k}`} x1={h1} y1={k1} x2={h2} y2={k2} stroke="transparent" strokeWidth="14" className="cursor-pointer" onClick={() => setSel(k)} aria-label={m.english} />;
          })}
          <text x={C} y={C - 8} textAnchor="middle" fontSize="15" className="fill-ink-soft" style={{ fontFamily: "var(--font-gothic)" }}>
            {seasonAt ? seasonAt.name : term.english}
          </text>
          <text x={C} y={C + 16} textAnchor="middle" fontSize="18" className="fill-ink" style={{ fontFamily: "var(--font-mincho)" }}>
            {seasonAt ? seasonAt.poem : ""}
          </text>
        </svg>
      </div>
      <div className="flex items-center justify-center gap-4 pt-1 text-[15px] text-ink-soft" aria-hidden>
        <span>○ sow</span>
        <span>● harvest</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-[3px] rounded-full bg-shu" />
          today
        </span>
        {table?.frost ? <span>··· frost here</span> : null}
      </div>
      <div className="flex items-center justify-between px-6 pt-3">
        <button type="button" aria-label="Previous microseason" className="tap flex h-11 w-11 items-center justify-center text-[22px]" onClick={() => setSel((i + 71) % 72)}>
          ‹
        </button>
        <button type="button" className="tap min-h-11 text-[16px] underline underline-offset-4 disabled:no-underline disabled:opacity-40" disabled={i === now} onClick={() => setSel(null)}>
          Back to today
        </button>
        <button type="button" aria-label="Next microseason" className="tap flex h-11 w-11 items-center justify-center text-[22px]" onClick={() => setSel((i + 1) % 72)}>
          ›
        </button>
      </div>
      <section key={i} aria-live="polite" className="fade-in mx-8 mt-4 flex flex-col gap-3 border-t border-rule pt-5">
        <div className="flex gap-4">
          <span lang="ja" aria-hidden className="vertical font-mincho text-[20px] tracking-[.3em]">
            {ms.kanji}
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">
              {i === now ? "Now" : "Microseason"} · {md(ms.start)} to {md(microseasonEnd(i))}
            </span>
            <span className="font-mincho text-[24px] leading-tight">{ms.english}</span>
            <span className="text-[16px] text-ink-soft">
              In {term.english.toLowerCase()} ({term.romaji})
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          {(
            [
              ["Sow", sow[i].length ? listWords(sow[i]) : "—"],
              ["Harvest", pick[i].length ? listWords(pick[i]) : "—"],
              ...(note ? ([["Here", note]] as const) : []),
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[80px_1fr] gap-3 border-t border-rule py-3 last:border-b">
              <span className="text-[16px] text-ink-soft">{k}</span>
              <span className="text-[17px] leading-normal">{v}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
