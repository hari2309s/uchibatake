"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { cropById, recipeById, RECIPES, regionOf, type Place, type Recipe, type Region } from "@uchibatake/content";
import { placeOf } from "@/lib/place-climate";
import { listWords } from "@/lib/words";
import Link from "next/link";
import { useState } from "react";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Mottainai } from "@/components/ui/notes";
import { Seal } from "@/components/ui/seal";
import { Sheet } from "@/components/ui/sheet";
import { useHousehold, usePlantings, useSpaces } from "@/lib/data/hooks";
import type { Planting, Space } from "@/lib/data/types";
import { growthStatus } from "@/lib/growth";
import { isIndoors } from "@/lib/space-words";
import { useToday } from "@/lib/use-today";
import { HarvestSheet } from "./harvest-sheet";

const NUMERALS = ["一", "二", "三", "四", "五", "六"];

/** Which of a recipe's field ingredients are growing here, and where. */
export function fromField(r: Recipe, plantings: Planting[], spaces: Space[]) {
  return r.field.map((f) => {
    const p = plantings.find((x) => x.crop_id === f.crop && x.status === "growing");
    return { ...f, planting: p, space: p ? spaces.find((s) => s.id === p.space_id) : undefined };
  });
}

const DIETS = ["vegetarian", "vegan", "gluten-free"] as const;
type Diet = (typeof DIETS)[number];
const kept = (diet: string[]) => DIETS.filter((d) => diet.includes(d));

/** A recipe suits a family when it lists every diet they keep. */
export const suitsDiet = (r: Recipe, diet: string[]) => kept(diet).every((d) => d in r.suits);

/** The changes a family's diets need ("Use gluten-free pasta."). */
export const dietNotes = (r: Recipe, diet: string[]) => kept(diet).map((d: Diet) => r.suits[d]).filter((x): x is string => !!x);

/** Which of a recipe's field ingredients are ready now, and which within two weeks (by name). */
export function readiness(r: Recipe, plantings: Planting[], spaces: Space[], today: string, place: Place | null): { ready: string[]; soon: string[] } {
  const ready: string[] = [];
  const soon: string[] = [];
  for (const f of fromField(r, plantings, spaces)) {
    if (!f.planting) continue;
    const days = growthStatus(f.planting, today, { indoors: isIndoors(f.space), place }).readyInDays;
    const name = cropById(f.crop)?.name.toLowerCase() ?? f.crop;
    if (days === 0) ready.push(name);
    else if (days !== null && days <= 14) soon.push(name);
  }
  return { ready, soon };
}

const popular = (r: Recipe, region: Region | null) => Number(!!region && !!r.popularIn?.includes(region));

/** "For the table this week": a recipe that suits the family and whose field ingredients are mostly ready now (dishes from where they live first); or none. */
export function recipeForThisWeek(plantings: Planting[], spaces: Space[], today: string, place: Place | null, diet: string[], region: Region | null = null): { recipe: Recipe; ready: string[] } | null {
  const scored = RECIPES.filter((r) => suitsDiet(r, diet))
    .map((r) => ({ r, ready: readiness(r, plantings, spaces, today, place).ready }))
    .filter((x) => x.ready.length >= Math.min(2, x.r.field.length))
    .sort((a, b) => b.ready.length - a.ready.length || popular(b.r, region) - popular(a.r, region));
  return scored[0] ? { recipe: scored[0].r, ready: scored[0].ready } : null;
}

/** Recipes: what the field can make now, what it can make soon, and the rest (dishes from where they live first). */
export function RecipesView() {
  const plantings = usePlantings();
  const spaces = useSpaces();
  const household = useHousehold();
  const today = useToday();
  if (!plantings || !spaces || !household || !today) return <PageLoader />;
  const place = placeOf(household);
  const region = regionOf(household.country);
  const rows = RECIPES.filter((r) => suitsDiet(r, household.diet))
    .map((r) => ({ r, ...readiness(r, plantings, spaces, today, place) }))
    .sort((a, b) => popular(b.r, region) - popular(a.r, region) || a.r.name.localeCompare(b.r.name));
  const now = rows.filter((x) => x.ready.length).sort((a, b) => b.ready.length - a.ready.length);
  const soon = rows.filter((x) => !x.ready.length && x.soon.length);
  const rest = rows.filter((x) => !x.ready.length && !x.soon.length);
  const group = (title: string, list: typeof rows, i: number, why: (x: (typeof rows)[number]) => string | null) =>
    list.length ? (
      <section aria-label={title} className="rise px-8 pt-8" style={{ "--i": i } as React.CSSProperties}>
        <h2 className="text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">{title}</h2>
        <ul className="pt-2">
          {list.map((x) => (
            <li key={x.r.id} className="border-t border-rule last:border-b">
              <Link href={`/recipes/${x.r.id}`} className="tap flex flex-col gap-1 py-3.5">
                <span className="font-mincho text-[20px]">{x.r.name}</span>
                <span className="text-[16px] leading-normal text-ink-soft">{why(x) ?? x.r.line}</span>
                {x.r.kids ? <span className="text-[15px] text-ink-soft">Children can help</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null;
  return (
    <div className="pb-10">
      <BackBar href="/" label="Home" />
      <div className="rise flex flex-col gap-2 px-8 pt-5">
        <h1 className="font-mincho text-[34px] font-normal">For the table</h1>
        <p className="text-[16px] text-ink-soft">Everyday dishes for what grows{household.diet.length ? `, for the way you eat` : ""}.</p>
      </div>
      {group("Ready from your field", now, 1, (x) => `Ready now: ${listWords(x.ready)}.`)}
      {group("Soon", soon, 2, (x) => `In the next two weeks: ${listWords(x.soon)}.`)}
      {group(now.length || soon.length ? "More to cook" : "Recipes", rest, 3, () => null)}
    </div>
  );
}

/** 09 Recipe: from your field (a vermilion dot and where it grows) and from the shop; method; もったいない. */
export function RecipeView({ id }: { id: string }) {
  const r = recipeById(id);
  const plantings = usePlantings();
  const spaces = useSpaces();
  const household = useHousehold();
  const today = useToday();
  const [choosing, setChoosing] = useState(false);
  const [logging, setLogging] = useState<Planting | null>(null);
  if (!r) return <BackBar href="/" label="Home" />;
  if (!plantings || !spaces || !today) return <PageLoader back={{ href: "/recipes", label: "Recipes" }} />;
  const field = fromField(r, plantings, spaces);
  const growing = field.filter((f) => f.planting);
  const notes = household ? dietNotes(r, household.diet) : [];

  return (
    <div className="pb-10">
      <BackBar href="/recipes" label="Recipes" />
      <div className="rise flex flex-col gap-2 px-8 pt-5" style={{ "--i": 1 } as React.CSSProperties}>
        <h1 className="font-mincho text-[32px] font-normal leading-[1.2]">{r.name}</h1>
        <p className="text-[16px] text-ink-soft">
          Serves {r.serves}
          {household?.people_count ? (household.people_count === r.serves ? " · the whole household" : "") : ""} · about {r.minutes} minutes
        </p>
      </div>
      <section aria-label="From your field" className="rise px-8 pt-7" style={{ "--i": 2 } as React.CSSProperties}>
        <h2 className="font-mincho text-[22px] font-normal">From your field</h2>
        <ul className="pt-2">
          {field.map((f) => (
            <li key={f.crop} className="flex items-baseline justify-between gap-3 border-t border-rule py-3 last:border-b">
              <span className="flex items-baseline gap-2.5 text-[17px]">
                {f.planting ? <span aria-label="from your field" className="inline-block h-2 w-2 flex-none translate-y-[-2px] rounded-full bg-shu" /> : <span className="inline-block h-2 w-2 flex-none" />}
                {cropById(f.crop)?.name}, {f.amount}
              </span>
              <span className="text-right text-[16px] text-ink-soft">{f.space ? f.space.name : "not growing now"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="From the shop" className="rise px-8 pt-6" style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="font-mincho text-[22px] font-normal">From the shop</h2>
        <ul className="pt-2">
          {r.shop.map((s) => (
            <li key={s} className="border-t border-rule py-3 text-[17px] last:border-b">
              {s}
            </li>
          ))}
        </ul>
        {notes.map((n) => (
          <p key={n} className="pt-2 text-[16px] text-ink-soft">
            {n}
          </p>
        ))}
      </section>
      <section aria-label="Method" className="rise px-8 pt-7" style={{ "--i": 4 } as React.CSSProperties}>
        <h2 className="font-mincho text-[22px] font-normal">Method</h2>
        <ol className="pt-2">
          {r.method.map((m, i) => (
            <li key={i} className="flex gap-4 border-t border-rule py-3.5 last:border-b">
              <span aria-hidden className="w-6 font-mincho text-[22px] leading-none">
                {NUMERALS[i]}
              </span>
              <span className="text-[17px] leading-normal">{m}</span>
            </li>
          ))}
        </ol>
      </section>
      {r.kids ? <p className="rise px-8 pt-6 text-[17px] leading-[1.6] text-ink-body">Children can help: {r.kids.charAt(0).toLowerCase() + r.kids.slice(1)}</p> : null}
      {r.mottainai ? <Mottainai className="rise mx-8 mt-6">{r.mottainai}</Mottainai> : null}
      {growing.length ? (
        <div className="rise px-8 pt-7" style={{ "--i": 5 } as React.CSSProperties}>
          <Button onClick={() => (growing.length === 1 ? setLogging(growing[0].planting!) : setChoosing(true))}>
            <Seal kind="収" size={28} />
            Log what we picked for this
          </Button>
          {/* One harvest per plant picked from: choose which (and come back for the next). */}
          <Sheet open={choosing} onClose={() => setChoosing(false)} title="Which did you pick?">
            <ul className="px-8 pb-[34px] pt-2">
              {growing.map((f) => (
                <li key={f.crop} className="border-b border-rule last:border-b-0">
                  <button
                    type="button"
                    className="tap flex min-h-14 w-full items-center justify-between text-left text-[17px]"
                    onClick={() => {
                      setChoosing(false);
                      setLogging(f.planting!);
                    }}
                  >
                    {cropById(f.crop)?.name}
                    <span className="text-[16px] text-ink-soft">{f.space?.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>
          {logging ? <HarvestSheet planting={logging} spaceName={spaces.find((s) => s.id === logging.space_id)?.name ?? ""} open onClose={() => setLogging(null)} /> : null}
        </div>
      ) : (
        <p className="px-8 pt-6 text-[16px] text-ink-soft">
          Nothing for this is growing right now. <Link href="/add" className="underline underline-offset-4">Add a plant</Link>.
        </p>
      )}
    </div>
  );
}
