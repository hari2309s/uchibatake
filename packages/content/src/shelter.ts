import { cropById, windowMonths, windowsFor } from "./crops/index.ts";
import { doyToMd, mdToDoy, type Place } from "./crops/timing.ts";
import type { ClimateWindows, Crop, Source, Window } from "./crops/types.ts";

/*
 * Shelter: what a cold frame, cloche, fleece… does for a crop's season.
 * Every number here is from a source (RHS, read November 2026); where there
 * isn't one, the protection says "We don't know how much this helps yet" and
 * changes nothing (MC12).
 *
 * - Cloches: "increasing the length of the cropping season (3-4 weeks at either
 *   end)"; "earlier harvest dates (3-4 weeks with most crops)". We use the low
 *   end, 3 weeks.
 * - Fleece and crop covers: "Heavier grades of fleece give about 2°C of
 *   protection from frost"; covered tender plants "can be sown or planted out
 *   earlier … by about two weeks in spring"; covered crops "can be harvested two
 *   weeks ahead".
 * - Cold frames: protect from "the first frosts (but only mild frosts)"; no
 *   weeks given.
 * - Growing for winter: corn salad (lamb's lettuce), land cress and oriental
 *   salad leaves give leaves "through the autumn, and winter if covered with a
 *   cloche, coldframe or fleece"; chard, parsley and rocket "should also
 *   over-winter with a little protection".
 * - Polytunnels: "can be used for growing hardy winter crops such as lettuces".
 * - Greenhouses: frost-free is 4°C; ventilate "on mild and sunny days"; damage
 *   when temperatures build up past about 27°C; shading mid-spring to early autumn.
 */

const rhs = (path: string, title: string): Source => ({ title: `RHS: ${title}`, url: `https://www.rhs.org.uk/${path}` });
export const RHS_CLOCHES = rhs("prevention-protection/cloches", "Cloches");
export const RHS_FLEECE = rhs("prevention-protection/fleece-and-crop-covers", "Fleece and crop covers");
export const RHS_COLD_FRAMES = rhs("garden-features/coldframes-and-mini-greenhouses", "Cold frames and mini-greenhouses");
export const RHS_WINTER = rhs("vegetables/growing-for-winter", "Vegetables: growing for winter");
export const RHS_GREENHOUSE_CHOICE = rhs("garden-features/choosing-greenhouses", "Choosing a greenhouse");
export const RHS_GREENHOUSE_HEAT = rhs("garden-features/heating-greenhouses-efficiently", "Heating greenhouses");
export const RHS_GREENHOUSE_AIR = rhs("garden-features/ventilation-and-shading-greenhouses", "Ventilation and shading");

export type ProtectionId = "cold-frame" | "cloche" | "fleece" | "mini-greenhouse" | "polytunnel" | "bubble-wrap" | "shade-cloth";

export interface Protection {
  id: ProtectionId;
  name: string;
  /** One everyday line. */
  line: string;
  /** A homemade or cheap way, and the effort ("Homemade: an old window on bricks · cheap"). */
  how: string;
  /** Days earlier at the start (sowing, planting, first picking), from the source. */
  earlierDays?: number;
  /** Days longer at the end of the season, from the source. */
  laterDays?: number;
  /** About how many degrees of frost it keeps off, from the source. */
  frostC?: number;
  /** Keeps winter salad leaves going (RHS: growing for winter). */
  winterLeaves?: boolean;
  /** What the source says, in one short line; absent = we don't know yet. */
  effect?: string;
  /** For hot places: it cools rather than warms. */
  cooling?: boolean;
  sources: Source[];
}

export const PROTECTIONS: Protection[] = [
  {
    id: "cold-frame",
    name: "Cold frame",
    line: "A low box with a clear lid.",
    how: "Homemade: an old window on bricks · cheap",
    winterLeaves: true,
    effect: "Keeps off mild frosts, and keeps salad leaves going through winter",
    sources: [RHS_COLD_FRAMES, RHS_WINTER],
  },
  {
    id: "cloche",
    name: "Cloche",
    line: "A clear cover for one plant or a short row.",
    how: "Homemade: a cut water bottle · minutes · free",
    earlierDays: 21,
    laterDays: 21,
    winterLeaves: true,
    effect: "About 3–4 weeks longer at each end",
    sources: [RHS_CLOCHES, RHS_WINTER],
  },
  {
    id: "fleece",
    name: "Fleece",
    line: "A thin white cloth laid over plants on cold nights.",
    how: "Bought · minutes · low cost",
    earlierDays: 14,
    frostC: 2,
    winterLeaves: true,
    effect: "About 2 weeks earlier in spring; keeps off about 2° of frost",
    sources: [RHS_FLEECE, RHS_WINTER],
  },
  {
    id: "polytunnel",
    name: "Polytunnel",
    line: "A walk-in tunnel of clear plastic over hoops.",
    how: "Bought or built · a weekend",
    winterLeaves: true,
    effect: "Hardy winter salads, such as lettuce, through winter",
    sources: [RHS_GREENHOUSE_CHOICE],
  },
  { id: "mini-greenhouse", name: "Mini greenhouse", line: "Shelves under a clear zip-up cover.", how: "Bought · an hour · low cost", sources: [] },
  { id: "bubble-wrap", name: "Bubble wrap on the glass", line: "A layer inside the glass that holds a little warmth.", how: "Re-used · minutes · free", sources: [] },
  { id: "shade-cloth", name: "Shade cloth", line: "A loose net that softens strong sun. Hang it above the plants, not on them.", how: "Bought · minutes · low cost", cooling: true, sources: [] },
];

export const protectionById = (id: string) => PROTECTIONS.find((p) => p.id === id);
/** The protection has a sourced effect (otherwise: "We don't know how much this helps yet"). */
export const isSourced = (p: Protection) => !!p.effect && p.sources.length > 0;

/** Salad leaves the RHS says keep going through winter under cover (corn salad, oriental salad leaves). */
const WINTER_LEAVES = ["lambs-lettuce", "mizuna", "pak-choi", "komatsuna"];
/** Leafy crops that "over-winter with a little protection" (chard, parsley, rocket); lettuce in a polytunnel. */
const OVERWINTER = ["chard", "parsley", "rocket"];

export interface Shelter {
  protections: ProtectionId[];
  /** A greenhouse kept frost-free (4°C or more). */
  frostFree?: boolean;
}

/** Coldest-month average at or above this: a winter as mild as the UK's, where the RHS winter advice holds. */
export const MILD_WINTER_C = 3;

const shift = (md: string, days: number) => doyToMd(mdToDoy(md) + days);
const span = (w: Window) => ((mdToDoy(w.to) - mdToDoy(w.from) + 365) % 365) + 1;
/** Earlier and later by some days; a window that would reach a whole year (or more) becomes the whole year. */
const widen = (ws: Window[] | undefined, earlier: number, later: number) =>
  ws?.map((w) => (w.from === "01-01" && w.to === "12-31") || span(w) + earlier + later >= 365 ? { from: "01-01", to: "12-31" } : { from: shift(w.from, -earlier), to: shift(w.to, later) });
/** Without harvest windows: the first picking after each start (the days to a first picking, from the source). */
const firstPicks = (crop: Crop, w: ClimateWindows) =>
  crop.daysToFirstPick ? [...(w.sow ?? []), ...(w.plantOut ?? [])].map((s) => ({ from: shift(s.from, crop.daysToFirstPick!), to: shift(s.to, crop.daysToFirstPick!) })) : [];

/** A crop's dates in a place with shelter: earlier and later by the sourced weeks, plus winter leaves under cover. */
export function shelteredWindows(crop: Crop, place: Place | null, shelter: Shelter): ClimateWindows | undefined {
  const base = windowsFor(crop, place);
  const ps = shelter.protections.map(protectionById).filter((p): p is Protection => !!p && isSourced(p));
  // Protections don't stack: the strongest sourced one counts.
  const earlier = Math.max(0, ...ps.map((p) => p.earlierDays ?? 0));
  // Tender (warm-season) crops get the earlier start only: the RHS gives no weeks for keeping them going
  // later (cloches only "buffer" the first frosts for them), so we don't claim any.
  const tender = crop.timing?.season === "warm";
  const later = tender ? 0 : Math.max(0, ...ps.map((p) => p.laterDays ?? 0));
  // The RHS winter advice is written for UK winters: it only applies where winters are about as mild
  // (the coldest month averaging 3°C or more, like the UK and the Netherlands). Colder places rest in deep winter.
  const mildWinter = !place?.grow || Math.min(...place.grow.meanTemp) >= MILD_WINTER_C;
  const winter = mildWinter && (shelter.frostFree || ps.some((p) => p.winterLeaves));
  const polytunnel = ps.some((p) => p.id === "polytunnel");
  const leafy = WINTER_LEAVES.includes(crop.id) || OVERWINTER.includes(crop.id) || (polytunnel && crop.id === "lettuce");
  if (!base && !(winter && leafy)) return undefined;
  const out: ClimateWindows = {
    sowIndoors: base?.sowIndoors,
    sow: widen(base?.sow, earlier, later),
    plantOut: widen(base?.plantOut, earlier, later),
    harvest: widen(base?.harvest, earlier, later),
  };
  // No harvest windows (worked-out cool crops, chard…): picking follows each start, as outside.
  if (!out.harvest?.length) out.harvest = firstPicks(crop, out);
  if (winter && leafy) {
    const south = place?.hemisphere === -1;
    // Winter: December to February in the north (June to August in the south).
    const w: Window = south ? { from: "06-01", to: "08-31" } : { from: "12-01", to: "02-28" };
    out.harvest = [...(out.harvest ?? []), w];
  }
  return out;
}

/** Months (0–11) a crop can be picked in: its harvest windows, or (without them) a first picking after each start. */
export function pickMonths(crop: Crop, w: ClimateWindows | undefined): number[] {
  if (!w) return [];
  if (w.harvest?.length) return windowMonths(w.harvest);
  if (!crop.daysToFirstPick) return [];
  const starts = [...(w.sow ?? []), ...(w.plantOut ?? [])];
  const firsts = starts.map((s) => ({ from: shift(s.from, crop.daysToFirstPick!), to: shift(s.to, crop.daysToFirstPick!) }));
  return windowMonths(firsts);
}

/** What could be picked in each month (0–11), from these crops: outside as it is, and with the shelter. */
export function eatByMonth(cropIds: string[], place: Place | null, shelter: Shelter): { outside: string[][]; sheltered: string[][] } {
  const outside: string[][] = Array.from({ length: 12 }, () => []);
  const sheltered: string[][] = Array.from({ length: 12 }, () => []);
  for (const id of cropIds) {
    const c = cropById(id);
    if (!c) continue;
    for (const m of pickMonths(c, windowsFor(c, place))) outside[m].push(c.id);
    for (const m of pickMonths(c, shelteredWindows(c, place, shelter))) sheltered[m].push(c.id);
  }
  return { outside, sheltered };
}
