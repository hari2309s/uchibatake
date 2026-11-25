"use client";

import { cropById, CROPS, type Crop } from "@uchibatake/content";
import Link from "next/link";
import { BackBar } from "@/components/ui/bars";
import { useHousehold, usePlantings, useSpace } from "@/lib/data/hooks";
import type { Space } from "@/lib/data/types";
import { startsNow } from "@/lib/plan";
import { FACING_WORDS, isIndoors, SIZE_WORDS, SUN_WORDS } from "@/lib/space-words";
import { useToday } from "@/lib/use-today";
import { listWords } from "@/lib/words";
import { plantName, PlantCell, Section } from "./parts";

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-rule py-3 last:border-b">
      <span className="flex-none text-[16px] text-ink-soft">{k}</span>
      <span className="text-right text-[17px]">{v}</span>
    </div>
  );
}

/** What could start in this space on a given day, from the crop data. */
function goodFor(space: Space, md: string): Crop[] {
  const s = { key: space.id, type: space.type, name: space.name };
  return CROPS.filter((c) => c.sources.length && startsNow(c, s, md, "temperate", 1) !== null).slice(0, 4);
}

/** The ink-line plan seen from above (01): house wall thick, railing double, pots as drawn. Tap a pot. */
function InkPlan({ space }: { space: Space }) {
  const plantings = usePlantings(space.id);
  if (!space.plan.length || !plantings) return null;
  return (
    <Section title="From above" aside="Tap a pot" className="pt-[30px]" i={2}>
      <div className="relative mt-3 h-[230px] border-x-[1.5px] border-t-[5px] border-ink" style={{ borderBottom: "4px double var(--ink)" }}>
        <span aria-hidden className="absolute inset-0" style={{ background: "repeating-linear-gradient(135deg, color-mix(in srgb, var(--ink) 16%, transparent) 0 1.5px, transparent 1.5px 8px)", clipPath: "polygon(0 30%, 62% 100%, 0 100%)" }} />
        {space.plan.map((pos) => {
          const p = plantings.find((x) => x.id === pos.planting_id);
          if (!p) return null;
          return (
            <Link
              key={pos.planting_id}
              href={`/plants/${p.id}`}
              className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[3px] border-[1.5px] border-ink bg-washi px-2.5 text-[15px] font-medium"
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
            >
              {(p.crop_id && cropById(p.crop_id)?.name) || plantName(p)}
            </Link>
          );
        })}
        {space.facing ? <span className="absolute bottom-2.5 left-3 text-[15px]">{space.facing.includes("W") ? "afternoon sun" : space.facing.includes("E") ? "morning sun" : "sun"}</span> : null}
      </div>
      <div className="mt-2 flex justify-between text-[16px] text-ink-soft">
        <span>house wall</span>
        {space.facing ? <span>railing faces {FACING_WORDS[space.facing].toLowerCase()}</span> : null}
      </div>
    </Section>
  );
}

/** 01 Space detail. */
export function SpaceDetail({ id }: { id: string }) {
  const space = useSpace(id);
  const household = useHousehold();
  const plantings = usePlantings(id);
  const today = useToday();
  if (space === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!space || !today) return null;
  const growing = (plantings ?? []).filter((p) => p.status === "growing");
  const ended = (plantings ?? []).filter((p) => p.status !== "growing");
  const facts: [string, string][] = [];
  if (space.facing) facts.push(["Faces", FACING_WORDS[space.facing]]);
  if (space.size_note || space.size) facts.push(["Size", space.size_note ?? SIZE_WORDS[space.size!]]);
  if (space.sun) facts.push(["Sun", SUN_WORDS[space.sun]]);
  if (space.rack) {
    facts.push(["Shelves", String(space.rack.shelves)]);
    facts.push(["Roots in", space.rack.medium === "water" ? "Water" : "Soil"]);
    if (space.rack.light === "yes" && space.rack.light_on) facts.push(["Grow light", `${space.rack.light_on} – ${space.rack.light_off}`]);
  }
  if (space.greenhouse) {
    facts.push(["Heated", space.greenhouse.heated === "no" ? "No" : space.greenhouse.heated === "frost" ? "A little, frost only" : "Yes, kept warm"]);
    if (space.greenhouse.vents.length) facts.push(["Vents", space.greenhouse.vents.map((v) => (v === "roof" ? "Roof vent" : "Side vents")).join(", ")]);
  }
  if (space.ground) facts.push(["Ground", space.ground]);

  // Good for: now, and the next two seasons, from the crop windows (temperate data only).
  const now = household?.climate === "temperate" ? goodFor(space, today.slice(5)) : [];
  const spring = household?.climate === "temperate" ? goodFor(space, "04-15") : [];
  const summer = household?.climate === "temperate" ? goodFor(space, "06-15") : [];

  return (
    <div className="pb-6">
      <BackBar href="/spaces" label="Spaces" />
      <div className="rise px-8 pt-3">
        <h1 className="font-mincho text-[38px] font-normal leading-[1.1]">{space.name}</h1>
      </div>
      {facts.length ? (
        <div className="rise flex flex-col px-8 pt-[18px]" style={{ "--i": 1 } as React.CSSProperties}>
          {facts.map(([k, v]) => (
            <Fact key={k} k={k} v={v} />
          ))}
        </div>
      ) : null}
      <InkPlan space={space} />
      <Section title="Growing here" i={3} className="pt-[34px]">
        {growing.length ? (
          <ul className="pt-2">
            {growing.map((p) => (
              <li key={p.id} className="border-b border-rule last:border-b-0">
                <PlantCell p={p} today={today} indoors={isIndoors(space)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="pt-2 text-[16px] text-ink-soft">Nothing growing here yet.</p>
        )}
      </Section>
      {now.length || spring.length || summer.length ? (
        <Section title="What this spot is good for" i={4} className="pt-[34px]">
          <div className="flex flex-col pt-2">
            {(
              [
                ["Now", now],
                ["Spring", spring],
                ["Summer", summer],
              ] as const
            )
              .filter(([, cs]) => cs.length)
              .map(([k, cs]) => (
                <div key={k} className="grid grid-cols-[80px_1fr] gap-3 border-t border-rule py-3.5 last:border-b">
                  <span className="text-[16px] text-ink-soft">{k}</span>
                  <span className="text-[17px] leading-normal">{listWords(cs.map((c, i) => (i ? c.name.toLowerCase() : c.name)))}</span>
                </div>
              ))}
          </div>
        </Section>
      ) : null}
      {ended.length ? (
        <Section title="Earlier this year" i={5} className="pt-[34px]">
          <ul className="pt-2">
            {ended.map((p) => (
              <li key={p.id} className="border-b border-rule last:border-b-0">
                <PlantCell p={p} today={today} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
