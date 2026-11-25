import { almanacDay, MICROSEASONS } from "../microseasons.ts";
import type { ClimateType, LocalSeason, SeasonTable } from "./types.ts";

/**
 * Local seasons from climate normals (the "仕組み How local seasons work" section
 * of the Spaces - Climates design):
 *   一 start from the climate: Köppen group + 30-year monthly normals;
 *   二 cut the year where growing changes (frost, rain, heat), snapping every
 *      boundary to the nearest microseason so seasons span whole microseasons;
 *   三 name each one in two halves from a per-climate table.
 * The live forecast never moves these lines; notices come from the forecast.
 */

export interface ClimateNormals {
  latitude: number;
  /** 12 monthly values, January first. °C and mm. */
  meanTemp: number[];
  meanMin: number[];
  meanMax: number[];
  precip: number[];
}

/** Köppen group, simplified to the climate types we write copy for. */
export function climateType(n: ClimateNormals): ClimateType {
  const t = n.meanTemp;
  const annualT = t.reduce((a, b) => a + b, 0) / 12;
  const annualP = n.precip.reduce((a, b) => a + b, 0);
  const north = n.latitude >= 0;
  const summerMonths = north ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
  const summerP = summerMonths.reduce((a, m) => a + n.precip[m], 0);
  const coldest = Math.min(...t);
  const warmest = Math.max(...t);

  // B (arid): annual rain under the Köppen threshold.
  const share = summerP / Math.max(annualP, 1);
  const threshold = 20 * annualT + (share >= 0.7 ? 280 : share <= 0.3 ? 0 : 140);
  if (annualP < threshold) return "arid";
  if (warmest < 10) return "polar";
  if (coldest >= 18) return Math.min(...n.precip) >= 60 ? "tropical-wet" : "tropical-wet-dry";
  if (coldest <= 0) return "continental";
  // Cs: a dry summer (driest summer month < 40 mm and under a third of the wettest winter month).
  const winterMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((m) => !summerMonths.includes(m));
  const driestSummer = Math.min(...summerMonths.map((m) => n.precip[m]));
  const wettestWinter = Math.max(...winterMonths.map((m) => n.precip[m]));
  if (driestSummer < 40 && driestSummer < wettestWinter / 3) return "mediterranean";
  return "temperate";
}

// ── Daily curves from monthly normals ───────────────────────────────────────

const MID = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349]; // mid-month day of year (non-leap)

/** Linear interpolation of a monthly series to 365 daily values (day 0 = 1 Jan), wrapping the year end. */
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

/** Days (0–364) where the curve crosses `level` going up (dir 1) or down (dir -1). */
function crossings(curve: number[], level: number, dir: 1 | -1): number[] {
  const out: number[] = [];
  for (let d = 0; d < 365; d++) {
    const a = curve[d];
    const b = curve[(d + 1) % 365];
    if (dir === 1 ? a < level && b >= level : a >= level && b < level) out.push((d + 1) % 365);
  }
  return out;
}

const dayToMd = (doy: number) => {
  const dt = new Date(Date.UTC(2023, 0, 1 + doy));
  return `${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

/** The microseason start nearest to a day of year. */
export function snapToMicroseason(doy: number): string {
  const pos = almanacDay(dayToMd(doy));
  let best = MICROSEASONS[0];
  let bestDist = Infinity;
  for (const m of MICROSEASONS) {
    const p = almanacDay(m.start);
    const dist = Math.min(Math.abs(p - pos), 366 - Math.abs(p - pos));
    if (dist < bestDist) [best, bestDist] = [m, dist];
  }
  return best.start;
}

// ── Names, written once per climate type ────────────────────────────────────

type Cut = { id: string; day: number };

const TEMPERATE_NAMES: Record<string, { name: string; poem: (frost: boolean) => string }> = {
  "late-winter": { name: "Late winter", poem: (f) => (f ? "frost most nights" : "the light returns") },
  spring: { name: "Spring", poem: (f) => (f ? "blossom and late frosts" : "blossom") },
  "late-spring": { name: "Late spring", poem: () => "tender plants go out" },
  "high-summer": { name: "High summer", poem: () => "long light evenings" },
  "late-summer": { name: "Late summer", poem: () => "heavy harvests" },
  autumn: { name: "Autumn", poem: () => "the leaves turn" },
  "late-autumn": { name: "Late autumn", poem: (f) => (f ? "first frosts" : "short days") },
  "deep-winter": { name: "Deep winter", poem: (f) => (f ? "still, cold air" : "the shortest days") },
};

function temperateCuts(n: ClimateNormals): { cuts: Cut[]; frost: boolean } {
  const mean = daily(n.meanTemp);
  const min = daily(n.meanMin);
  const frost = Math.min(...n.meanMin) < 5;
  const first = (xs: number[]) => (xs.length ? xs[0] : undefined);
  const coldest = mean.indexOf(Math.min(...mean));
  const warmest = mean.indexOf(Math.max(...mean));
  const raw: [string, number | undefined][] = [
    ["late-winter", coldest],
    ["spring", first(crossings(mean, 6, 1))],
    ["late-spring", frost ? first(crossings(min, 5, 1)) : first(crossings(mean, 10, 1))],
    ["high-summer", first(crossings(mean, 15, 1))],
    ["late-summer", (warmest + 10) % 365],
    ["autumn", first(crossings(mean, 15, -1))],
    ["late-autumn", frost ? first(crossings(min, 5, -1)) : first(crossings(mean, 10, -1))],
    ["deep-winter", first(crossings(mean, 5, -1))],
  ];
  return { cuts: raw.filter((r): r is [string, number] => r[1] !== undefined).map(([id, day]) => ({ id, day })), frost };
}

/** Tropical wet–dry (monsoon): wet ≥ 150 mm a month, dry ≤ 40 mm; the turns between are "before" and "after the rains". */
function wetDryCuts(n: ClimateNormals): Cut[] {
  const kind = n.precip.map((p) => (p >= 150 ? "wet" : p <= 40 ? "dry" : "turn"));
  const cuts: Cut[] = [];
  for (let m = 0; m < 12; m++) {
    const prev = kind[(m + 11) % 12];
    if (kind[m] === prev) continue;
    const id = kind[m] === "turn" ? (prev === "wet" ? "storms" : "build-up") : kind[m];
    cuts.push({ id, day: MID[m] - 14 });
  }
  return cuts;
}

const WETDRY_NAMES: Record<string, [string, string]> = {
  wet: ["The rainy season", "heavy rain"],
  storms: ["After the rains", "the rain eases"],
  dry: ["The dry season", "clear days"],
  "build-up": ["Before the rains", "heavy air"],
};

/** Everywhere warm all year: the wetter and drier stretches of the year. */
function rainThirdsCuts(n: ClimateNormals): Cut[] {
  const sorted = [...n.precip].sort((a, b) => a - b);
  const lo = sorted[3];
  const hi = sorted[8];
  const kind = n.precip.map((p) => (p >= hi ? "wetter" : p <= lo ? "drier" : "between"));
  const cuts: Cut[] = [];
  for (let m = 0; m < 12; m++) if (kind[m] !== kind[(m + 11) % 12]) cuts.push({ id: kind[m], day: MID[m] - 14 });
  return cuts;
}

const THIRDS_NAMES: Record<string, [string, string]> = {
  wetter: ["The wetter months", "heavy showers"],
  drier: ["The drier months", "steady sun"],
  between: ["Between seasons", "warm and changeable"],
};

/** Arid: the hot season where mean highs pass about 30°, a cool season under 22°, and mild seasons between. */
function aridCuts(n: ClimateNormals): Cut[] {
  const kind = n.meanMax.map((t) => (t >= 30 ? "hot" : t < 22 ? "cool" : "mild"));
  const cuts: Cut[] = [];
  for (let m = 0; m < 12; m++) if (kind[m] !== kind[(m + 11) % 12]) cuts.push({ id: kind[m], day: MID[m] - 14 });
  return cuts;
}

const ARID_NAMES: Record<string, [string, string]> = {
  hot: ["The hot season", "fierce sun"],
  cool: ["The cool season", "mild days"],
  mild: ["Between seasons", "warm days, cool nights"],
};

const ALL_YEAR: Record<ClimateType, [string, string]> = {
  temperate: ["All year", "mild and changeable"],
  continental: ["All year", "cold and changeable"],
  mediterranean: ["All year", "mild and dry"],
  "tropical-wet-dry": ["All year", "warm, with showers"],
  "tropical-wet": ["All year", "warm and wet"],
  arid: ["All year", "dry and bright"],
  polar: ["All year", "cold and short summers"],
};

/** Turns cut points into seasons that start on microseasons, in year order, dropping any that snap to the same day. */
function toSeasons(cuts: Cut[], name: (id: string) => [string, string]): LocalSeason[] {
  const seen = new Set<string>();
  const seasons: LocalSeason[] = [];
  for (const c of cuts) {
    const start = snapToMicroseason(c.day);
    if (seen.has(start)) continue;
    seen.add(start);
    const [n, poem] = name(c.id);
    seasons.push({ id: c.id, name: n, poem, start });
  }
  // Year order, from the almanac's start, and merge neighbours with the same id.
  seasons.sort((a, b) => almanacDay(a.start) - almanacDay(b.start));
  return seasons.filter((s, i) => s.id !== seasons[(i + seasons.length - 1) % seasons.length].id || seasons.length === 1);
}

/** Seasons for any place, from its normals. Amsterdam ships a hand-written table instead. */
export function seasonsFromNormals(n: ClimateNormals, place = "generic"): SeasonTable {
  const climate = climateType(n);
  const hemisphere = n.latitude >= 0 ? 1 : -1;
  let seasons: LocalSeason[];
  if (climate === "tropical-wet-dry") {
    seasons = toSeasons(wetDryCuts(n), (id) => WETDRY_NAMES[id]);
  } else if (climate === "tropical-wet") {
    seasons = toSeasons(rainThirdsCuts(n), (id) => THIRDS_NAMES[id]);
  } else if (climate === "arid") {
    seasons = toSeasons(aridCuts(n), (id) => ARID_NAMES[id]);
  } else {
    const { cuts, frost } = temperateCuts(n);
    seasons = toSeasons(cuts, (id) => [TEMPERATE_NAMES[id].name, TEMPERATE_NAMES[id].poem(frost)]);
    if (climate === "mediterranean") {
      // Winter is the rainy season there, summer the dry one.
      seasons = seasons.map((s) =>
        s.id === "deep-winter" ? { ...s, poem: "winter rains" } : s.id === "high-summer" ? { ...s, poem: "long dry days" } : s
      );
    }
  }
  // Where nothing changes enough to cut the year (a desert that's hot all year), say less: one season.
  if (seasons.length < 2) seasons = [{ id: "all-year", name: ALL_YEAR[climate][0], poem: ALL_YEAR[climate][1], start: "02-04" }];
  return { id: `computed:${place}`, place, climate, hemisphere, seasons };
}
