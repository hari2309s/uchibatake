import { byRegion, CROPS, eatByMonth, isSourced, PROTECTIONS, protectionById, type Place, type ProtectionId, type Region, type Shelter } from "@uchibatake/content";
import type { Planting, Reading, Space } from "./data/types";
import { fitFor } from "./fit";
import { isIndoors } from "./space-words";

/*
 * Microclimates (MC01–MC14), without sensors: what a space's shelter does to
 * its year, from the curated protections (packages/content/src/shelter.ts),
 * and what the family's own readings say about it.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The space's shelter, as the engine reads it (a heated greenhouse counts as frost-free). */
export function shelterOf(space: Space): Shelter {
  return { protections: space.shelter?.protections ?? [], frostFree: space.greenhouse ? space.greenhouse.heated !== "no" : false };
}

export const hasShelter = (space: Space) => !!space.shelter?.protections.length || (!!space.greenhouse && space.greenhouse.heated !== "no");

/** Crops that can grow in this space at all (pots on a balcony, small things indoors…). */
export function suitedCrops(space: Space, place: Place | null, region: Region | null): string[] {
  return byRegion(CROPS, region)
    .filter((c) => c.sources.length && fitFor(c, space, "06-15", place).score > 0)
    .map((c) => c.id);
}

/** What the family grows (or plans) in this space. */
export const familyCrops = (space: Space, plantings: Planting[]) => [...new Set(plantings.filter((p) => p.space_id === space.id && (p.status === "growing" || p.status === "planned") && p.crop_id).map((p) => p.crop_id!))];

export interface YearPlan {
  /** Months (0–11) with something of theirs to pick, outside as it is. */
  outside: boolean[];
  /** …and with the shelter. */
  sheltered: boolean[];
  /** One or two crop ids per month: theirs first, then what could grow here. */
  eat: string[][];
}

/** The space's year: their own crops' months, outside and sheltered; suggestions fill the empty months. */
export function yearPlan(space: Space, plantings: Planting[], place: Place | null, region: Region | null, shelter: Shelter = shelterOf(space), suggest = true): YearPlan {
  const theirs = familyCrops(space, plantings);
  const own = eatByMonth(theirs, place, shelter);
  // Suggestions for empty months (MC06) are the costly part: skipped where they aren't shown (Home's card).
  const could = suggest ? eatByMonth(suitedCrops(space, place, region), place, shelter) : { outside: [], sheltered: own.sheltered.map(() => []) };
  return {
    outside: own.outside.map((m) => m.length > 0),
    sheltered: own.sheltered.map((m) => m.length > 0),
    eat: own.sheltered.map((m, i) => (m.length ? m : could.sheltered[i]).slice(0, 2)),
  };
}

/** How much warmer the space is than outside at night, from recent readings (about, rounded); null if unknown. */
export function warmerBy(readings: Reading[]): number | null {
  const pairs = readings.filter((r) => r.low !== null && r.outside_low !== null).slice(0, 14);
  if (!pairs.length) return null;
  return Math.round(pairs.reduce((a, r) => a + (r.low! - r.outside_low!), 0) / pairs.length);
}

/** MC02: spaces warmest first, from what they are, where they face, and readings; with the reason line. */
export function rankForShelter(spaces: Space[], readings: Record<string, Reading[]>): { space: Space; reason: string; rank: number }[] {
  return spaces
    .map((s) => {
      const warm = warmerBy(readings[s.id] ?? []);
      const southish = !!s.facing && ["S", "SE", "SW"].includes(s.facing);
      if (s.type === "greenhouse") return { space: s, rank: 0, reason: warm !== null && warm > 0 ? `About ${warm}° warmer than outside at night, from your readings.` : "Already under glass. Ready for winter salads." };
      if (isIndoors(s)) return { space: s, rank: 3, reason: "Already indoors. Good for herbs and small leaves." };
      if (s.type === "balcony" && southish) return { space: s, rank: 1, reason: `Your ${s.facing === "SW" ? "south-west" : s.facing === "SE" ? "south-east" : "south"} wall stays warmest. A good place for a cold frame.` };
      if (s.type === "backyard") return { space: s, rank: 2, reason: "Open to the wind in winter. Fleece or a cloche works well here." };
      return { space: s, rank: 2, reason: southish ? "Sunny. A cloche or a cold frame would suit it." : "A cloche or fleece is a small start here." };
    })
    .sort((a, b) => a.rank - b.rank || a.space.sort - b.space.sort);
}

/** Protections to offer for a space (cooling ones only where summers are hot). */
export function protectionsFor(space: Space, hotSummer: boolean): ProtectionId[] {
  if (isIndoors(space)) return [];
  const all = PROTECTIONS.filter((p) => (space.type === "greenhouse" ? p.id === "bubble-wrap" || p.id === "fleece" || p.id === "shade-cloth" : p.id !== "bubble-wrap")).filter((p) => !p.cooling || hotSummer);
  return all.map((p) => p.id);
}

/** The words for a space's shelter ("Cold frame · warm wall · about 3–4 weeks longer"). */
export function shelterWords(space: Space): string | null {
  if (!space.shelter?.protections.length && !space.shelter?.warm_wall) return null;
  const ps = (space.shelter?.protections ?? []).map(protectionById).filter((p) => !!p);
  const names = ps.map((p) => p!.name.toLowerCase());
  const best = ps.filter((p) => isSourced(p!)).map((p) => p!.effect!)[0];
  const parts = [...names, ...(space.shelter?.warm_wall ? ["warm wall"] : [])];
  return [parts.join(" · ").replace(/^./, (c) => c.toUpperCase()), best ? best.split(";")[0].toLowerCase() : null].filter(Boolean).join(" · ");
}

/** A hot summer: a month averaging 29° or more by day (so many of its days pass the 30° the heat notices use). */
export const hotSummer = (place: Place | null) => !!place?.grow && Math.max(...place.grow.meanMax) >= 29;
