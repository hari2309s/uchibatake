"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { placeOf } from "@/lib/place-climate";
import { almanacDay, cropById, MICROSEASONS, microseasonEnd, microseasonFor, SEASON_TABLES, SOLAR_TERMS, windowMicroseasons, windowsFor, type SeasonTable } from "@uchibatake/content";
import { useId, useRef, useState } from "react";
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
  // Where the hand points, in degrees, counted on (not wrapped), so it always takes the short way round.
  const [turn, setTurn] = useState<number | null>(null);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const brushId = `yr-brush-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (!household || !today || !plantings) return <PageLoader />;
  const now = microseasonFor(today.slice(5)).index;
  const i = sel ?? now;
  // Following today (nothing chosen): the hand points at today, the nearest way from where it was,
  // so it also moves on by itself when the page stays open into a new microseason.
  const norm = (d: number) => (((d % 360) + 540) % 360) - 180;
  const angle = turn === null ? now * 5 : sel === null ? turn + norm(now * 5 - turn) : turn;
  /** Moves to a microseason (null = today): the hand turns the short way, the details slide that way. */
  const select = (k: number | null) => {
    const to = k ?? now;
    const steps = ((to - i + 108) % 72) - 36; // −36…35: the shorter way round
    if (steps === 0) return setSel(k);
    setDir(steps > 0 ? "next" : "prev");
    setTurn(angle + steps * 5);
    setSel(k);
  };
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
        <p className="text-[16px] text-ink-soft">Every microseason, and what your family does in each.</p>
      </div>
      <div className="rise flex justify-center pt-4" style={{ "--i": 1 } as React.CSSProperties}>
        <svg width="340" height="340" viewBox="0 0 340 340" className="block max-w-full" role="group" aria-label="The year as a ring">
          <defs>
            {/* The brush: one stroke sweeping the year round, clockwise from the top, revealing the band. */}
            <mask id={brushId} maskUnits="userSpaceOnUse" x="0" y="0" width="340" height="340">
              <circle cx={C} cy={C} r="130" fill="none" stroke="#fff" strokeWidth="90" pathLength={1} className="yr-sweep" transform={`rotate(-90 ${C} ${C})`} />
            </mask>
          </defs>
          <g mask={`url(#${brushId})`}>
          {/* Local seasons: the outer band. */}
          {seasons.map((s, k) => {
            const from = startIdx(s.start);
            const to = startIdx(seasons[(k + 1) % seasons.length].start);
            const st = STYLES[k % STYLES.length];
            // One season all year: the whole band.
            if (seasons.length === 1) return <circle key={s.id} cx={C} cy={C} r="160" fill="none" stroke="var(--ink)" strokeWidth="4" opacity="1" />;
            // The season you're in darkens gently as you move through the year.
            return <path key={s.id} d={arc(from, to, 160)} fill="none" stroke="var(--ink)" strokeWidth={st.w} strokeDasharray={st.dash} strokeLinecap="round" opacity={seasonAt?.id === s.id ? 1 : 0.45} style={{ transition: "opacity 600ms ease" }} />;
          })}
          {/* Frost months, dotted (Amsterdam's table). */}
          {table?.frost ? <path d={arc(table.frost.from, table.frost.to, 100)} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" /> : null}
          <circle cx={C} cy={C} r="88" fill="none" stroke="var(--rule)" strokeWidth="1" />
          </g>
          {/* The 72 microseasons: each tick draws outward, in a wave round the year after the brush. */}
          {MICROSEASONS.map((_, k) => {
            const isTerm = k % 3 === 0;
            if (k === now) return null;
            const [a1, b1] = P(k, isTerm ? 116 : 123);
            const [a2, b2] = P(k, isTerm ? 146 : 137);
            return <line key={k} x1={a1} y1={b1} x2={a2} y2={b2} pathLength={1} stroke="var(--ink)" strokeWidth={isTerm ? 1.6 : 1} strokeLinecap="round" opacity={isTerm ? 1 : 0.5} className="yr-tick" style={{ animationDelay: `${700 + k * 14}ms` }} />;
          })}
          {/* What this family sows and picks: dots press in, in order round the year. */}
          {pick.map((names, k) => (names.length ? <circle key={`p${k}`} cx={P(k, 153)[0]} cy={P(k, 153)[1]} r={Math.min(1.4 + names.length * 0.55, 4)} fill="var(--ink)" className="yr-dot" style={{ animationDelay: `${1300 + k * 16}ms` }} /> : null))}
          {sow.map((names, k) => (names.length ? <circle key={`s${k}`} cx={P(k, 108)[0]} cy={P(k, 108)[1]} r="2.6" fill="none" stroke="var(--ink)" strokeWidth="1.2" className="yr-dot" style={{ animationDelay: `${1300 + k * 16}ms` }} /> : null))}
          {/* Today: the vermilion tick presses in last, and ink spreads from it. */}
          {(() => {
            const [a1, b1] = P(now, 116);
            const [a2, b2] = P(now, 146);
            const [dx, dy] = P(now, 131);
            return (
              <g>
                <circle cx={dx} cy={dy} r="9" fill="none" stroke="var(--shu)" strokeWidth="1.2" className="yr-drop" style={{ animationDelay: "2300ms" }} />
                <line x1={a1} y1={b1} x2={a2} y2={b2} stroke="var(--shu)" strokeWidth="3.2" strokeLinecap="round" className="yr-today" style={{ animationDelay: "1900ms" }} />
              </g>
            );
          })()}
          {/* The hand: a faint line and the dot, turning round the ring (never across it) to the chosen microseason. */}
          <g className="yr-hand" style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${C}px ${C}px`, transformBox: "view-box", transition: "transform 700ms cubic-bezier(.2,.8,.3,1)" }}>
            {/* On opening, the hand sweeps from the top of the year round to today. */}
            <g className="yr-hand-in" style={{ "--a": `${now * 5}deg`, transformOrigin: `${C}px ${C}px`, transformBox: "view-box" } as React.CSSProperties}>
              <line x1={C} y1={C - 92} x2={C} y2={C - 158} stroke="var(--ink)" strokeWidth="1" opacity=".22" />
              <circle cx={C} cy={C - 163} r="5.5" fill="var(--ink)" />
            </g>
          </g>
          {MICROSEASONS.map((m, k) => {
            const [h1, k1] = P(k, 96);
            const [h2, k2] = P(k, 166);
            return <line key={`t${k}`} x1={h1} y1={k1} x2={h2} y2={k2} stroke="transparent" strokeWidth="14" className="cursor-pointer" onClick={() => select(k)} aria-label={m.english} />;
          })}
          {/* The season's words in the middle, crossfading when the season changes. */}
          <g key={seasonAt?.id ?? term.english} className="yr-centre" style={{ animationDelay: sel === null && turn === null ? "900ms" : "0ms" }}>
            <text x={C} y={C - 8} textAnchor="middle" fontSize="15" className="fill-ink-soft" style={{ fontFamily: "var(--font-gothic)" }}>
              {seasonAt ? seasonAt.name : term.english}
            </text>
            <text x={C} y={C + 16} textAnchor="middle" fontSize="18" className="fill-ink" style={{ fontFamily: "var(--font-mincho)" }}>
              {seasonAt ? seasonAt.poem : ""}
            </text>
          </g>
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
        <button type="button" aria-label="Previous microseason" className="tap flex h-11 w-11 items-center justify-center text-[22px]" onClick={() => select((i + 71) % 72)}>
          ‹
        </button>
        <button type="button" className="tap min-h-11 text-[16px] underline underline-offset-4 disabled:no-underline disabled:opacity-40" disabled={i === now} onClick={() => select(null)}>
          Back to today
        </button>
        <button type="button" aria-label="Next microseason" className="tap flex h-11 w-11 items-center justify-center text-[22px]" onClick={() => select((i + 1) % 72)}>
          ›
        </button>
      </div>
      {/* The details slide in from the way you moved; a sideways swipe moves a microseason. */}
      <section
        key={i}
        aria-live="polite"
        className={`${sel === null && turn === null ? "rise" : dir === "next" ? "yr-next" : "yr-prev"} mx-8 mt-4 flex touch-pan-y flex-col gap-3 border-t border-rule pt-5`}
        style={{ "--i": 3 } as React.CSSProperties}
        onPointerDown={(e) => {
          swipe.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s0 = swipe.current;
          swipe.current = null;
          if (!s0) return;
          const dx = e.clientX - s0.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s0.y) * 1.5) select(dx < 0 ? (i + 1) % 72 : (i + 71) % 72);
        }}
      >
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
