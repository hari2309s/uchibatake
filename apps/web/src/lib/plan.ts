import { almanacDay, CROPS, inWindows, windowsFor, type Place, type Region, type Crop, type Window } from "@uchibatake/content";
import type { SpaceType } from "./data/types";
import { capitalise, dateWords, listWords } from "./words";

/*
 * "Your first season" (A 07): up to three gentle plants that can start today,
 * one per space where possible. Built only from the curated crop data: what
 * can start now (window or scraps), what suits the space, easiest first, the
 * family's favourites breaking ties. Nothing is said that the data doesn't say.
 */

export interface PlanSpace {
  key: string;
  type: SpaceType;
  name: string;
}

export interface PlanItem {
  crop: Crop;
  space: PlanSpace;
  how: "scraps" | "sowIndoors" | "sow" | "plantOut";
  /** Job title for Home ("Sow pea shoots"). */
  title: string;
  /** One or two plain sentences, all from the data. */
  line: string;
}

export interface FirstSeason {
  items: PlanItem[];
  /** Favourites that can't start yet, with when they can: "Tomatoes and basil … from late May". */
  later: { crops: Crop[]; from: string; line: string } | null;
}

const INDOORS: SpaceType[] = ["windowsill", "rack"];
const EASE: Record<NonNullable<Crop["difficulty"]> | "unknown", number> = { "very-easy": 0, easy: 1, unknown: 2, "some-care": 3 };

/** What each food choice from onboarding (A 05) means in the catalogue. */
export const LIKES: Record<string, (c: Crop) => boolean> = {
  tomatoes: (c) => c.id === "tomatoes",
  herbs: (c) => c.kind === "herb",
  greens: (c) => ["kale", "spinach", "lettuce", "lambs-lettuce", "chard", "mizuna", "winter-purslane", "pea-shoots"].includes(c.id),
  strawberries: (c) => c.id === "strawberries",
  beans: (c) => ["broad-beans", "garden-pea", "sugar-snap"].includes(c.id),
  miso: (c) => ["green-onions", "spinach", "mizuna"].includes(c.id),
  roots: (c) => ["radish"].includes(c.id),
};

const liked = (c: Crop, likes: string[]) => likes.some((l) => LIKES[l]?.(c));

/** How this crop could start in this space today, if it can. */
export function startsNow(crop: Crop, space: PlanSpace, md: string, place: Place): PlanItem["how"] | null {
  const w = windowsFor(crop, place);
  const indoors = INDOORS.includes(space.type);
  if (indoors) {
    if (crop.start.scraps.ok && crop.start.scraps.why) return "scraps";
    // Small indoor spots: herbs and small leaves only.
    const small = crop.kind === "herb" || crop.id === "pea-shoots";
    if (small && inWindows(md, w?.sowIndoors)) return "sowIndoors";
    return null;
  }
  // Outside, in pots on a balcony: only crops the sources say suit containers.
  if (space.type === "balcony" && !crop.pot) return null;
  if (inWindows(md, w?.sow)) return "sow";
  if (inWindows(md, w?.plantOut)) return "plantOut";
  return null;
}

const windowEnd = (ws: Window[] | undefined, md: string) => ws?.find((x) => inWindows(md, [x]))?.to;

function describe(crop: Crop, how: PlanItem["how"], md: string, place: Place): { title: string; line: string } {
  const w = windowsFor(crop, place);
  const name = crop.name.toLowerCase();
  const parts: string[] = [];
  let title: string;
  if (how === "scraps") {
    title = `Regrow ${name}`;
    parts.push(crop.start.scraps.why!);
  } else {
    const verb = crop.sowVerb ?? (how === "plantOut" ? "Plant" : "Sow");
    title = `${verb} ${name}`;
    const ws = how === "sowIndoors" ? w?.sowIndoors : how === "sow" ? w?.sow : w?.plantOut;
    const end = windowEnd(ws, md);
    const allYear = ws?.some((x) => x.from === "01-01" && x.to === "12-31");
    parts.push(allYear ? `${verb} any time${how === "sowIndoors" ? ", indoors" : ""}.` : end ? `${verb} before ${dateWords(end)}.` : `${verb} now.`);
  }
  const h = w?.harvest?.find((x) => !(x.from === "01-01" && x.to === "12-31"));
  if (how !== "scraps" && h) {
    // The next harvest window after today.
    const until = (from: string) => (almanacDay(from) - almanacDay(md) + 366) % 366;
    const next = (w?.harvest ?? []).map((x) => x.from).sort((a, b) => until(a) - until(b))[0];
    parts.push(`Ready from ${dateWords(next)}.`);
  } else if (crop.care?.pick) parts.push(crop.care.pick);
  return { title, line: parts.join(" ") };
}

export function firstSeason(opts: { spaces: PlanSpace[]; today: string; place: Place; likes?: string[]; region?: Region | null }): FirstSeason {
  const { spaces, today, place, likes = [], region = null } = opts;
  const md = today.slice(5);
  const used = new Set<string>();
  const items: PlanItem[] = [];

  const ranked = (space: PlanSpace) =>
    CROPS.filter((c) => c.sources.length && !used.has(c.id))
      .map((c) => ({ c, how: startsNow(c, space, md, place) }))
      .filter((x): x is { c: Crop; how: PlanItem["how"] } => x.how !== null)
      .sort((a, b) => EASE[a.c.difficulty ?? "unknown"] - EASE[b.c.difficulty ?? "unknown"] || Number(liked(b.c, likes)) - Number(liked(a.c, likes)) || Number(!!region && !!b.c.popularIn?.includes(region)) - Number(!!region && !!a.c.popularIn?.includes(region)) || a.c.name.localeCompare(b.c.name));

  // The most particular spaces choose first (indoors, then the ground, then pots),
  // so a crop that suits the garden isn't used up by the balcony. One per space, then fill up to three.
  const ORDER: SpaceType[] = ["windowsill", "rack", "backyard", "greenhouse", "balcony"];
  const ordered = [...spaces].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  for (let round = 0; round < 3 && items.length < 3; round++) {
    for (const space of ordered) {
      if (items.length >= 3) break;
      if (round === 0 && items.some((i) => i.space.key === space.key)) continue;
      const best = ranked(space)[0];
      if (!best) continue;
      used.add(best.c.id);
      items.push({ crop: best.c, space, how: best.how, ...describe(best.c, best.how, md, place) });
    }
  }

  // Favourites that can't start in any chosen space yet: the soonest next start date in the data.
  const daysUntil = (from: string) => (almanacDay(from) - almanacDay(md) + 366) % 366;
  const waiting = CROPS.filter((c) => c.sources.length && liked(c, likes) && !used.has(c.id) && !spaces.some((s) => startsNow(c, s, md, place)))
    .map((c) => {
      const w = windowsFor(c, place);
      const starts = [...(w?.sow ?? []), ...(w?.plantOut ?? [])].map((x) => x.from).sort((x, y) => daysUntil(x) - daysUntil(y));
      return starts[0] ? { c, from: starts[0] } : null;
    })
    .filter((x): x is { c: Crop; from: string } => !!x)
    // Only promise a reminder for what could actually start in one of the chosen spaces then.
    .filter((x) => spaces.some((s) => startsNow(x.c, s, x.from, place)))
    .sort((x, y) => daysUntil(x.from) - daysUntil(y.from) || x.c.name.localeCompare(y.c.name));
  let later: FirstSeason["later"] = null;
  if (waiting.length) {
    // The soonest one, and a second favourite if it starts within the same few weeks.
    const first = waiting[0];
    const crops = waiting.filter((x) => daysUntil(x.from) - daysUntil(first.from) <= 21).slice(0, 2).map((x) => x.c);
    const names = listWords(crops.map((c) => c.name.toLowerCase()));
    // "Tomatoes come", "Basil comes".
    const plural = crops.length > 1 || crops[0].name.endsWith("s");
    later = { crops, from: first.from, line: `${capitalise(names)} ${plural ? "come" : "comes"} later. Here that's from ${dateWords(first.from)}, and we'll remind you.` };
  }
  return { items, later };
}
