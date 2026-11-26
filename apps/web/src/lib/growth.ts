import { almanacDay, cropById, inWindows, windowsFor, type Place } from "@uchibatake/content";
import { parseIsoDate } from "./dates";
import type { Planting } from "./data/types";
import { dateWords } from "./words";

/*
 * Where a plant is in its season, from the crop data only: inside its harvest
 * window it's ready; otherwise it's on its way to the next window. The ensō
 * fills with the time from starting to that window. No window, no claim.
 */

export interface GrowthStatus {
  /** 0–100 for the ensō. */
  progress: number;
  closed: boolean;
  /** Short plain words under the name. */
  label: string;
  /** Shorter still, for the two-column cells on Home ("Ready", "Ready late May"). */
  short: string;
  /** Days until it's ready: 0 = now, null = we can't say. */
  readyInDays: number | null;
}

const daysBetween = (a: string, b: string) => Math.round((parseIsoDate(b).getTime() - parseIsoDate(a).getTime()) / 86_400_000);

const JUST: Record<Planting["start_method"], string> = { seed: "Just sown", plant: "Just planted", scraps: "Just started", existing: "Growing" };

/**
 * `indoors`: on a windowsill or rack. The crop windows are written for growing
 * outside, so indoors we only use them when they're all-year (pea shoots);
 * otherwise we say less. Scraps regrow on their own clock: no window either.
 */
export function growthStatus(p: Planting, today: string, opts: { indoors?: boolean; place?: Place | null } = {}): GrowthStatus {
  const { indoors = false, place = null } = opts;
  if (p.status === "ended") return { progress: 100, closed: true, label: "Done for the season", short: "Done", readyInDays: null };
  if (p.status === "lost") return { progress: 96, closed: false, label: "Didn't make it", short: "Lost", readyInDays: null };
  if (p.status === "planned") {
    const label = p.started_on > today ? `Planned for ${dateWords(p.started_on.slice(5))}` : "Planned";
    return { progress: 2, closed: false, label, short: "Planned", readyInDays: null };
  }

  const age = Math.max(0, daysBetween(p.started_on, today));
  const young = age < 14 && p.start_method !== "existing";
  const crop = p.crop_id ? cropById(p.crop_id) : undefined;
  const all = crop ? windowsFor(crop, place)?.harvest : undefined;
  const allYear = !!all?.some((w) => w.from === "01-01" && w.to === "12-31");
  const harvest = p.start_method === "scraps" || (indoors && !allYear) ? undefined : all;

  if (!harvest?.length) {
    const label = young ? JUST[p.start_method] : "Growing";
    return { progress: Math.min(80, 10 + age), closed: false, label, short: label, readyInDays: null };
  }

  const md = today.slice(5);
  // Sown here: the source's days to a first picking, when it gives one. Otherwise we can't say how ready it is.
  const toPick = p.start_method === "seed" ? crop?.daysToFirstPick : undefined;
  const waitForGrowth = toPick !== undefined ? Math.max(0, toPick - age) : null;

  if (inWindows(md, harvest)) {
    if (waitForGrowth === 0 || p.start_method === "existing") return { progress: 95, closed: false, label: "Ready to pick", short: "Ready", readyInDays: 0 };
    if (waitForGrowth !== null) {
      const progress = Math.round(Math.min(90, Math.max(8, (age / toPick!) * 90)));
      return { progress, closed: false, label: young ? JUST[p.start_method] : `Ready ${readyWords(waitForGrowth)}`, short: young ? JUST[p.start_method] : "Nearly", readyInDays: waitForGrowth };
    }
    // In its picking season, but we don't know how far along it is: say just that.
    return { progress: young ? Math.min(40, 10 + age) : 80, closed: false, label: young ? JUST[p.start_method] : "In its picking season", short: young ? JUST[p.start_method] : "In season", readyInDays: null };
  }

  // Days to the next harvest window start (or longer, if the plant needs more time to grow).
  const until = (from: string) => (almanacDay(from) - almanacDay(md) + 366) % 366;
  const next = harvest.map((w) => w.from).sort((x, y) => until(x) - until(y))[0];
  const dn = Math.max(until(next), waitForGrowth ?? 0);
  const progress = Math.round(Math.min(90, Math.max(8, (age / Math.max(1, age + dn)) * 90)));
  return { progress, closed: false, label: young ? JUST[p.start_method] : `Ready from ${dateWords(next)}`, short: young ? JUST[p.start_method] : `Ready ${dateWords(next)}`, readyInDays: dn };
}

/** "now", "in about 5 days", "in about 3 weeks". */
export function readyWords(days: number): string {
  if (days <= 0) return "now";
  if (days < 14) return `in about ${days} days`;
  return `in about ${Math.round(days / 7)} weeks`;
}
