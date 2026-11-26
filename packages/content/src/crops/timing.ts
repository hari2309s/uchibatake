import type { ClimateType } from "../seasons/types.ts";
import type { ClimateWindows, Crop, Window } from "./types.ts";

/*
 * Sowing and planting dates for any place, worked out from its own climate.
 *
 * Mild maritime places (cool summers, mild winters: the UK, the Netherlands,
 * the Pacific Northwest…) use the RHS dates in each crop, which were written
 * for exactly that climate. Everywhere else, dates come from the crop's
 * `timing` and the place's 30-year normals and typical frost dates:
 *
 * - Weeks before or after the average last spring frost: UNH Extension,
 *   "Growing Vegetables: When to Plant Your Vegetable Garden".
 * - Minimum air temperatures for setting plants out: 40 °F (4.4 °C) for
 *   cool-season crops, 50 °F (10 °C) for warm-season crops (Purdue Vegetable
 *   Crops Hotline, "Setting Your Transplants Up for Success"). Daily normal
 *   lows stand in for the nights.
 * - "Once the soil warms to …" (UNH) is read from the daily normal mean air
 *   temperature, a rough stand-in for soil temperature.
 * - Heat: cool-season crops are only sown when the following three weeks
 *   (germination and seedlings) average 24 °C or less (Johnny's Selected
 *   Seeds: lettuce germinates poorly above 75 °F / 24 °C). Crops whose source
 *   lists bolting (lettuce, spinach, coriander: "bolts in midsummer heat")
 *   need the whole time to a first picking to stay under it. Our rule built
 *   on those figures.
 * - "Sow whenever it suits" crops aren't sown between the first and the last
 *   frost where frost happens.
 * - Autumn sowing (where the crop's source gives one): counted back from the
 *   typical first autumn frost by the days to a first picking.
 * Places without frost use the temperature rules alone.
 * When a crop has no timing and the place isn't maritime: no dates (say less).
 */

export interface GrowClimate {
  /** "MM-DD", or null where frost is rare. */
  lastFrost: string | null;
  firstFrost: string | null;
  /** 12 monthly normals, January first, °C. */
  meanTemp: number[];
  meanMin: number[];
  meanMax: number[];
}

export interface Place {
  climate: ClimateType;
  hemisphere: 1 | -1;
  /** Null for older fields saved before this existed: then only maritime (RHS) dates are given. */
  grow: GrowClimate | null;
}

export interface Timing {
  season: "cool" | "warm";
  /** UNH "time from seed to transplant", weeks [min, max]: sow indoors this long before setting out. */
  indoorWeeks?: [number, number];
  /** UNH: set out, weeks relative to the last frost (negative = before), [from, to]. */
  plantOut?: [number, number];
  /** UNH: sow outside, weeks relative to the last frost, [from, to]. */
  sow?: [number, number];
  /** UNH: sow outside once the soil warms to this (°C). */
  sowWarmC?: number;
  /** Sources say sow little and often (UNH "sequence plantings", Johnny's "spring through midsummer"). */
  succession?: boolean;
  /** The crop's source gives a late-summer / autumn sowing. */
  autumn?: boolean;
  /**
   * The source gives seasons, not frost weeks ("sow from early spring through
   * midsummer", Johnny's): sow whenever the temperature rules allow.
   */
  whenever?: boolean;
}

const COOL_MIN_C = 4.4;
const WARM_MIN_C = 10;
const COOL_HEAT_C = 24;
const MID = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];

/** A monthly series as 365 daily values (day 0 = 1 Jan). */
function daily(series: number[]): number[] {
  const out: number[] = [];
  for (let d = 0; d < 365; d++) {
    let a = 11;
    for (let m = 0; m < 12; m++) if (MID[m] <= d) a = m;
    const b = (a + 1) % 12;
    const da = MID[a] <= d ? MID[a] : MID[a] - 365;
    const db = MID[b] > da ? MID[b] : MID[b] + 365;
    out.push(series[a] + (series[b] - series[a]) * ((d - da) / (db - da)));
  }
  return out;
}

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function mdToDoy(md: string): number {
  const [m, d] = md.split("-").map(Number);
  return DAYS.slice(0, m - 1).reduce((a, b) => a + b, 0) + Math.min(d, DAYS[m - 1]) - 1;
}
export function doyToMd(doy: number): string {
  let d = ((doy % 365) + 365) % 365;
  let m = 0;
  while (d >= DAYS[m]) d -= DAYS[m++];
  return `${String(m + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
}
const mod = (d: number) => ((d % 365) + 365) % 365;

/** Runs of chosen days as windows (wrapping the year end). */
function toWindows(days: boolean[]): Window[] {
  if (days.every(Boolean)) return [{ from: "01-01", to: "12-31" }];
  if (!days.some(Boolean)) return [];
  // Start from a day that isn't chosen, so a run across the year end stays whole.
  const start = days.findIndex((x) => !x);
  const out: Window[] = [];
  let runFrom: number | null = null;
  for (let k = 1; k <= 365; k++) {
    const d = mod(start + k);
    if (days[d] && runFrom === null) runFrom = d;
    if (!days[d] && runFrom !== null) {
      out.push({ from: doyToMd(runFrom), to: doyToMd(d - 1) });
      runFrom = null;
    }
  }
  return out;
}

/** Mild maritime: no cold winters, cool summers. The RHS dates fit here. */
export function isMaritime(place: Place): boolean {
  if (!place.grow) return place.climate === "temperate";
  return (place.climate === "temperate" || place.climate === "mediterranean") && Math.max(...place.grow.meanMax) <= 25 && Math.min(...place.grow.meanTemp) > 0;
}

/** Windows worked out from the crop's timing and the place's climate. */
export function computeWindows(crop: Crop, grow: GrowClimate): ClimateWindows | undefined {
  const t = crop.timing;
  if (!t) return undefined;
  const mean = daily(grow.meanTemp);
  const low = daily(grow.meanMin);
  const lf = grow.lastFrost ? mdToDoy(grow.lastFrost) : null;
  const ff = grow.firstFrost ? mdToDoy(grow.firstFrost) : null;
  const grows = crop.daysToFirstPick ?? 42;
  // Days from the last frost to a day (0–364), so ranges never wrap in the middle of the season.
  const afterLf = (d: number) => (lf === null ? 0 : mod(d - lf));
  const frostFreeDays = lf !== null && ff !== null ? mod(ff - lf) : 365;

  const coolOk = (d: number) => {
    if (low[d] < COOL_MIN_C && lf === null) return false;
    // Late in the season, the first picking should come before the first frost.
    if (lf !== null && ff !== null && afterLf(d) > frostFreeDays / 2 && afterLf(d) <= frostFreeDays && afterLf(d) + grows > frostFreeDays) return false;
    const heatDays = crop.problems?.some((p) => p.id === "bolting") ? grows : 21;
    for (let k = 0; k <= heatDays; k++) if (mean[mod(d + k)] > COOL_HEAT_C) return false;
    return true;
  };
  const warmOk = (d: number) => {
    if (low[d] < WARM_MIN_C) return false;
    // Picking has to start before the first frost.
    if (lf !== null && afterLf(d) + grows > frostFreeDays) return false;
    if (lf === null) for (let k = 0; k <= grows; k++) if (low[mod(d + k)] < WARM_MIN_C) return false;
    return true;
  };
  const ok = t.season === "cool" ? coolOk : warmOk;

  const empty = () => Array<boolean>(365).fill(false);
  const sow = empty();
  const plantOut = empty();
  const sowIndoors = empty();
  const starts = empty(); // when plants start growing outside (for the harvest)

  /** A range relative to the last frost; with `succession`, it carries on while the weather allows. */
  const mark = (into: boolean[], range: [number, number], extend: boolean, extra?: (d: number) => boolean) => {
    if (lf === null) return;
    const from = lf + range[0] * 7;
    const to = lf + range[1] * 7;
    let first: number | null = null;
    // The UNH weeks, but never before the weather allows: the start moves later if needed.
    for (let d = from; d <= lf + 365 - 1; d++) {
      const day = mod(d);
      const fits = ok(day) && (!extra || extra(day));
      if (first === null) {
        if (fits) first = d;
        // Keep looking until the frost-free season is over (a late spring moves the start later).
        else if (d > to && d - lf > frostFreeDays) break;
        continue;
      }
      if (!fits || (!extend && d > first + (to - from))) break;
      into[day] = true;
      starts[day] = true;
    }
    if (first !== null) {
      into[mod(first)] = true;
      starts[mod(first)] = true;
    }
  };

  if (t.whenever) {
    for (let d = 0; d < 365; d++) {
      // Cool crops: nights at least 4.4 °C even where frost happens (the early-spring start).
      if (!ok(d) || (t.season === "cool" && low[d] < COOL_MIN_C)) continue;
      if (lf !== null && afterLf(d) > frostFreeDays) continue;
      sow[d] = true;
      starts[d] = true;
    }
  } else if (lf !== null) {
    const warmSoil = t.sowWarmC !== undefined ? (d: number) => mean[d] >= t.sowWarmC! : undefined;
    if (t.sow) mark(sow, t.sow, !!t.succession, warmSoil);
    // Only "once the soil warms" / "as soon as it thaws": look from six weeks before the last frost.
    else if (t.sowWarmC !== undefined) mark(sow, [-6, -4], !!t.succession, warmSoil);
    if (t.plantOut) mark(plantOut, t.plantOut, !!t.succession && t.season === "warm");
    // Autumn: counted back from the first frost by the days to a first picking.
    if (t.autumn && t.season === "cool" && ff !== null && crop.daysToFirstPick) {
      for (let k = 0; k <= 42; k++) {
        const d = mod(ff - crop.daysToFirstPick - k);
        if (coolOk(d) && afterLf(d) > 60) {
          sow[d] = true;
          starts[d] = true;
        }
      }
    }
  } else {
    // No frost: whenever the temperatures suit it.
    for (let d = 0; d < 365; d++) {
      if (!ok(d)) continue;
      if (t.sow || t.sowWarmC !== undefined) sow[d] = true;
      if (t.plantOut) plantOut[d] = true;
      starts[d] = true;
    }
  }

  // Sow indoors this many weeks before each setting-out day.
  if (t.indoorWeeks && t.plantOut) {
    for (let d = 0; d < 365; d++) {
      if (!plantOut[d]) continue;
      for (let w = t.indoorWeeks[0] * 7; w <= t.indoorWeeks[1] * 7; w++) sowIndoors[mod(d - w)] = true;
    }
  }

  // Harvest: warm crops pick from the first picking until the first frost. Cool crops' picking
  // seasons vary too much (radishes weeks, leeks months) and aren't in the sources: say less.
  const harvest = empty();
  if (crop.daysToFirstPick && t.season === "warm" && ff !== null) {
    for (let d = 0; d < 365; d++) {
      if (!starts[d]) continue;
      const from = d + crop.daysToFirstPick;
      for (let x = 0; x <= Math.min(mod(ff - from), 200); x++) harvest[mod(from + x)] = true;
    }
  }

  const out: ClimateWindows = {};
  const put = (k: keyof ClimateWindows, days: boolean[]) => {
    const ws = toWindows(days);
    if (ws.length) out[k] = ws;
  };
  put("sowIndoors", sowIndoors);
  put("sow", sow);
  put("plantOut", plantOut);
  put("harvest", harvest);
  return Object.keys(out).length ? out : undefined;
}
