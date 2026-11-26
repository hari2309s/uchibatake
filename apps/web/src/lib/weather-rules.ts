import { cropById, windowsFor } from "@uchibatake/content";
import type { FieldDB } from "./data/db";
import { addTask, create, live, update } from "./data/repo";
import type { Notice, Planting, Space } from "./data/types";
import type { Forecast } from "./forecast";
import { parseIsoDate } from "./dates";
import { deg, durationWords } from "./forecast";
import { listWords } from "./words";

/*
 * What the forecast means for this family's plants, as plain rules anyone
 * can check: thresholds on the forecast, applied to what's actually growing
 * where. Notices (霜 暑 雨) and their jobs come from here; seasons don't.
 */

export const FROST_AT = 0; // °C, tonight's low
export const HEAT_AT = 30; // °C, today's high
export const HEAVY_RAIN_MM = 15; // mm today
export const RAINED_MM = 5; // mm today: enough that outdoor pots don't need watering

const OUTDOOR = (s: Space | undefined) => !!s && (s.type === "balcony" || s.type === "backyard");

/** Tender: the crop's windows only open after mid-May (planted out after the last frosts), e.g. basil, tomatoes. */
function tender(cropId: string | null): boolean {
  const c = cropId ? cropById(cropId) : undefined;
  const w = c ? windowsFor(c, "temperate") : undefined;
  const starts = [...(w?.sow ?? []), ...(w?.plantOut ?? [])].map((x) => x.from);
  return starts.length > 0 && starts.every((s) => s >= "05-15" && s <= "07-31");
}

const nameOf = (p: Planting) => (p.nickname ?? (p.crop_id ? cropById(p.crop_id)?.name : p.own_name) ?? "plants").toLowerCase();
const weekday = (iso: string) => parseIsoDate(iso).toLocaleDateString("en-GB", { weekday: "long" });

export interface Reading {
  frostTonight: boolean;
  /** Index of the first day whose night freezes (0 = tonight), or -1. */
  frostNight: number;
  heatToday: boolean;
  heavyRainToday: boolean;
  /** Rain that has already fallen today (not just forecast). */
  rainedToday: boolean;
  rainDueToday: boolean;
  low: number;
}

export function read(f: Forecast): Reading {
  // Tonight's low is tomorrow morning's minimum.
  const nights = f.days.slice(1).map((d) => d.lo);
  const frostNight = nights.findIndex((lo) => lo <= FROST_AT);
  const today = f.days[0];
  return {
    frostTonight: frostNight === 0,
    frostNight,
    heatToday: !!today && today.hi >= HEAT_AT,
    heavyRainToday: !!today && today.rainMm >= HEAVY_RAIN_MM,
    rainedToday: !!today && (today.rainSoFarMm ?? 0) >= RAINED_MM,
    rainDueToday: !!today && today.rainMm >= RAINED_MM,
    low: f.days[1]?.lo ?? today?.lo ?? 0,
  };
}

/** The jobs for a notice, only the ones that apply to what's growing (empty: no notice). */
export function noticeJobs(kind: Notice["kind"], plantings: Planting[], spaces: Space[]): string[] {
  const growing = plantings.filter((p) => p.status === "growing");
  const where = (p: Planting) => spaces.find((s) => s.id === p.space_id);
  const outside = growing.filter((p) => OUTDOOR(where(p)));
  const hasBalcony = outside.some((p) => where(p)?.type === "balcony");
  const greenhouse = spaces.some((s) => s.type === "greenhouse" && growing.some((p) => p.space_id === s.id));
  const jobs: string[] = [];
  if (kind === "frost") {
    const soft = outside.filter((p) => tender(p.crop_id));
    if (soft.length) jobs.push(`Bring the ${listWords([...new Set(soft.map(nameOf))])} in, or against the house wall`);
    const young = outside.filter((p) => !tender(p.crop_id) && Date.now() - parseIsoDate(p.started_on).getTime() < 42 * 86_400_000);
    if (young.length) jobs.push(`Fleece over the young ${listWords([...new Set(young.map(nameOf))])}`);
    if (hasBalcony) jobs.push("Move the balcony pots against the wall");
    if (greenhouse) jobs.push("Close the greenhouse vents before dark");
  } else if (kind === "heat") {
    if (outside.length) jobs.push("Water deeply early tomorrow, not in the heat of the day");
    if (hasBalcony) jobs.push("Move the pots out of the afternoon sun");
    if (greenhouse) jobs.push("Open the greenhouse vents wide");
  } else {
    if (hasBalcony) jobs.push("Tip out the saucers after the rain");
    if (outside.length) jobs.push("Raise pots onto bricks so the water drains away");
  }
  return jobs.slice(0, 3);
}

/** One line for Home's weather row (02 Home's "advice"). */
export function adviceLine(f: Forecast, r: Reading, hasOutdoor: boolean, units?: "C" | "F"): string {
  let a: string;
  if (r.frostTonight) a = `Frost tonight, down to ${deg(r.low, units)}.${hasOutdoor ? " Have the fleece ready before dark." : ""}`;
  else if (r.frostNight > 0) a = `Mild for now, but frost is coming on ${weekday(f.days[r.frostNight].date)} night.${hasOutdoor ? " Keep the fleece by the door." : ""}`;
  else if (r.heatToday) a = `Hot today. Water early, and again at dusk if the pots feel light.`;
  else a = hasOutdoor ? "No frost this week. Everything outside can stay uncovered." : "No frost this week.";
  if (r.rainedToday && hasOutdoor) a += " No watering outside today. The rain has it.";
  else if (r.rainDueToday && hasOutdoor) a += " Rain is due today: feel the pots before you water.";
  return a;
}

/** "What it means for your plants" (03 Weather): three numbered lines. */
export function meanings(f: Forecast, r: Reading, hasOutdoor: boolean, units?: "C" | "F"): { t: string; x: string }[] {
  const rainy = f.days.filter((d) => d.rainChance >= 60).length;
  const frost =
    r.frostNight >= 0
      ? { t: `Frost ${r.frostNight === 0 ? "tonight" : `on ${weekday(f.days[r.frostNight].date)} night`}`, x: `Down to ${deg(f.days[r.frostNight + 1].lo, units)}.${hasOutdoor ? " Fleece over young and tender plants outside." : ""}` }
      : { t: "No frost this week", x: hasOutdoor ? "Everything outside can stay uncovered." : "Nothing to cover." };
  const rain = rainy
    ? { t: `Rain on ${rainy} ${rainy === 1 ? "day" : "days"}`, x: hasOutdoor ? "Skip watering outside on those days, and tip out the saucers afterwards." : "The windowsill still needs its water." }
    : { t: "A dry week", x: hasOutdoor ? "Water outside once or twice, in the morning." : "Keep the indoor pots to their usual rhythm." };
  const light = { t: `${durationWords(f.days[0].daylight)} of daylight`, x: f.days[0].daylight < 10 * 3600 ? "Things grow slowly now, and that's normal." : "Long days: things grow fast." };
  return [frost, rain, light];
}

/**
 * Applies the forecast to the field, once per forecast: a notice (with its
 * jobs) for frost, heat or heavy rain, a fleece job before a frost night,
 * and outdoor watering skipped when it has already rained.
 */
export async function applyForecast(db: FieldDB, f: Forecast, householdId: string, today: string, units?: "C" | "F"): Promise<void> {
  const [plantings, spaces] = await Promise.all([live(db.plantings), live(db.spaces)]);
  const r = read(f);
  const kinds: Notice["kind"][] = [...(r.frostTonight ? (["frost"] as const) : []), ...(r.heatToday ? (["heat"] as const) : []), ...(r.heavyRainToday ? (["rain"] as const) : [])];
  for (const kind of kinds) {
    const id = `weather:${kind}:${today}`;
    if (await db.notices.get(id)) continue;
    const jobs = noticeJobs(kind, plantings, spaces);
    if (!jobs.length) continue; // nothing growing it applies to: no notice
    // Two runs at once: the second finds the notice already there (a ConstraintError), which is fine.
    await create(
      db.notices,
      { id, kind, for_date: today, low: kind === "frost" ? Math.round(r.low) : null, high: kind === "heat" ? Math.round(f.days[0].hi) : null, remind_at: kind === "frost" ? (f.days[0].sunset ? `${String(Math.max(0, Number(f.days[0].sunset.slice(0, 2)) - 1)).padStart(2, "0")}:00` : null) : null, checklist: jobs.map((text, i) => ({ id: String(i), text, done_at: null, done_by: null })) },
      householdId,
      { madeByRule: true }
    ).catch((e) => {
      if ((e as Error).name !== "ConstraintError") throw e;
    });
  }
  const outdoorGrowing = plantings.some((p) => p.status === "growing" && OUTDOOR(spaces.find((s) => s.id === p.space_id)));
  if (r.frostTonight && outdoorGrowing) {
    await addTask(db, {
      title: "Put the fleece by the door",
      detail: `Frost tonight, down to ${deg(r.low, units)}.`,
      how: "Lay it over young and tender plants before dark, and take it off in the morning.",
      why: `The forecast says ${deg(r.low, units)} tonight.`,
      space_id: null,
      planting_ids: [],
      due_on: today,
      due_time: null,
      slot: "evening",
      assignee_id: null,
      done_at: null,
      done_by: null,
      snoozed_until: null,
      skipped_at: null,
      source: "weather",
      rule_key: `weather:fleece:${today}`,
    });
  }
  if (r.rainedToday) {
    for (const t of await live(db.tasks)) {
      if (t.done_at || t.skipped_at || t.due_on > today || !/^water/i.test(t.title)) continue;
      if (!OUTDOOR(spaces.find((s) => s.id === t.space_id))) continue;
      await update(db.tasks, t.id, { skipped_at: Date.now(), why: "It rained today. The rain has it." });
    }
  }
}
