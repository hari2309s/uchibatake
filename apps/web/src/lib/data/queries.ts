import { isoDate } from "../dates";
import type { Harvest, Planting, Task } from "./types";

/*
 * Pure reads over rows already loaded. No dates from the clock here: callers
 * pass "today", so screens and tests agree.
 */

/**
 * The jobs for a day. Open jobs show from their due day (or the day they were
 * moved to) and carry forward until done. Done jobs show on the day they were
 * done, so a carried-over job keeps its 済 where it was ticked.
 */
export function tasksForDay(tasks: Task[], day: string): Task[] {
  return tasks
    .filter((t) => !t.deleted_at && !t.skipped_at)
    .filter((t) => {
      if (t.done_at) return isoDate(new Date(t.done_at)) === day;
      const due = t.snoozed_until && t.snoozed_until > t.due_on ? t.snoozed_until : t.due_on;
      return due <= day;
    })
    .sort((a, b) => Number(!!a.done_at) - Number(!!b.done_at) || (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.created_at - b.created_at);
}

export interface HarvestTotal {
  cropId: string | null;
  plantingId: string | null;
  pickings: number;
  count: number;
  grams: number;
  /** member id → number of pickings they took part in */
  pickers: Record<string, number>;
  first: string | null;
  last: string | null;
}

/** Totals per crop (or per planting with `by = "planting"`): pickings, counts and grams, who picked, first and last. */
export function harvestTotals(harvests: Harvest[], by: "crop" | "planting" = "crop"): HarvestTotal[] {
  const map = new Map<string, HarvestTotal>();
  for (const h of harvests) {
    if (h.deleted_at) continue;
    const key = (by === "crop" ? h.crop_id : h.planting_id) ?? "(own)";
    const t = map.get(key) ?? { cropId: h.crop_id, plantingId: by === "planting" ? h.planting_id : null, pickings: 0, count: 0, grams: 0, pickers: {}, first: null, last: null };
    t.pickings += 1;
    if (h.unit === "count") t.count += h.amount;
    else t.grams += h.amount;
    for (const p of new Set(h.picked_by)) t.pickers[p] = (t.pickers[p] ?? 0) + 1;
    if (!t.first || h.picked_on < t.first) t.first = h.picked_on;
    if (!t.last || h.picked_on > t.last) t.last = h.picked_on;
    map.set(key, t);
  }
  return [...map.values()].sort((a, b) => (a.first ?? "").localeCompare(b.first ?? ""));
}

/** The first picking of each crop in a period, in date order (初物). */
export function firstOfEach(harvests: Harvest[], from: string, to: string): Harvest[] {
  const firsts = new Map<string, Harvest>();
  for (const h of harvests) {
    if (h.deleted_at || !h.crop_id || h.picked_on < from || h.picked_on > to) continue;
    const prev = firsts.get(h.crop_id);
    if (!prev || h.picked_on < prev.picked_on) firsts.set(h.crop_id, h);
  }
  return [...firsts.values()].sort((a, b) => a.picked_on.localeCompare(b.picked_on));
}

export function growingIn(plantings: Planting[], spaceId: string): Planting[] {
  return plantings.filter((p) => !p.deleted_at && p.status === "growing" && p.space_id === spaceId);
}
