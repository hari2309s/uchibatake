"use client";

import { ShelterBlock } from "./grow";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { byRegion, regionOf, type Place, type Region } from "@uchibatake/content";
import { placeOf } from "@/lib/place-climate";
import { cropById, CROPS, type Crop } from "@uchibatake/content";
import Link from "next/link";
import { BackBar } from "@/components/ui/bars";
import { useHousehold, usePlantings, useSpace } from "@/lib/data/hooks";
import type { Space } from "@/lib/data/types";
import { startsNow } from "@/lib/plan";
import { FACING_WORDS, isIndoors, SIZE_WORDS, spaceLine, SUN_WORDS } from "@/lib/space-words";
import { GreenhousePanel, LightShelfPanel, RackPanel } from "./space-kinds";
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
function goodFor(space: Space, md: string, place: Place, region: Region | null): Crop[] {
  const s = { key: space.id, type: space.type, name: space.name };
  return byRegion(CROPS, region).filter((c) => c.sources.length && startsNow(c, s, md, place) !== null).slice(0, 4);
}

/** The ink-line plan seen from above (01): house wall thick, railing double, pots as drawn. Tap a pot. */
function InkPlan({ space }: { space: Space }) {
  const plantings = usePlantings(space.id);
  // Only what's growing has a pot on the plan; with none (all ended, lost or removed), no empty drawing.
  const growing = (plantings ?? []).filter((p) => p.status === "growing");
  const pots = space.plan.filter((pos) => growing.some((p) => p.id === pos.planting_id));
  if (!pots.length || !plantings) return null;
  return (
    <Section title="From above" aside="Tap a pot" className="pt-[30px]" i={2}>
      <div className="relative mt-3 h-[230px] border-x-[1.5px] border-t-[5px] border-ink" style={{ borderBottom: "4px double var(--ink)" }}>
        <span aria-hidden className="absolute inset-0" style={{ background: "repeating-linear-gradient(135deg, color-mix(in srgb, var(--ink) 16%, transparent) 0 1.5px, transparent 1.5px 8px)", clipPath: "polygon(0 30%, 62% 100%, 0 100%)" }} />
        {pots.map((pos) => {
          const p = growing.find((x) => x.id === pos.planting_id);
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
  if (!space || !today) return <PageLoader back={{ href: "/spaces", label: "Spaces" }} />;
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
  // A greenhouse's heating and vents are in its own panel (S04); facing, size and sun stay here.
  if (space.ground) facts.push(["Ground", space.ground]);

  // Good for: now, and the next two seasons, from the crop dates for this place (spring and summer flip in the south).
  const place = placeOf(household);
  const region = regionOf(household?.country);
  const south = place?.hemisphere === -1;
  const now = place ? goodFor(space, today.slice(5), place, region) : [];
  const spring = place ? goodFor(space, south ? "10-15" : "04-15", place, region) : [];
  const summer = place ? goodFor(space, south ? "12-15" : "06-15", place, region) : [];

  return (
    <div className="pb-6">
      <BackBar href="/spaces" label="Spaces" />
      <div className="rise px-8 pt-3">
        <h1 className="font-mincho text-[38px] font-normal leading-[1.1]">{space.name}</h1>
      </div>
      {space.rack && space.rack.shelves > 1 ? <p className="rise px-8 pt-2 text-[16px] text-ink-soft">{spaceLine(space)}</p> : null}
      {space.rack && space.rack.shelves > 1 ? <RackPanel space={space} plants={growing} /> : null}
      {space.rack && space.rack.shelves <= 1 && space.rack.light === "yes" ? <LightShelfPanel space={space} /> : null}
      {space.greenhouse ? <GreenhousePanel space={space} /> : null}
      {facts.length && !(space.rack && (space.rack.shelves > 1 || space.rack.light === "yes")) ? (
        <div className="rise flex flex-col px-8 pt-[18px]" style={{ "--i": 1 } as React.CSSProperties}>
          {facts.map(([k, v]) => (
            <Fact key={k} k={k} v={v} />
          ))}
        </div>
      ) : null}
      <ShelterBlock space={space} />
      <InkPlan space={space} />
      {growing.length ? (
        <Section title="Growing here" i={3} className="pt-[34px]">
          <ul className="pt-2">
            {growing.map((p, i) => (
              <li key={p.id} className="border-b border-rule last:border-b-0">
                <PlantCell p={p} today={today} indoors={isIndoors(space)} i={i} />
              </li>
            ))}
          </ul>
        </Section>
      ) : plantings === undefined ? null : (
        // An empty space (M18 style): one open ensō, one sentence, one action; the plant comes back here.
        <section aria-labelledby="growing-here">
          <h2 id="growing-here" className="sr-only">
            Growing here
          </h2>
          <EmptyState line="Nothing growing here yet." action="Add a plant" href={`/add?space=${encodeURIComponent(space.id)}`} top={48} />
        </section>
      )}
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
