import { climateType, type ClimateNormals, type ClimateType } from "@uchibatake/content";
import { roughArea } from "./place";
import { dateWords } from "./words";

/*
 * What the location step (01 Location) shows, fetched once for the rough area
 * (coordinates rounded to about 1 km before anything leaves the phone):
 * - the place's name: OpenStreetMap Nominatim reverse lookup;
 * - the weather right now: Open-Meteo forecast;
 * - the climate: 30 years (1991–2020) of daily history from Open-Meteo's
 *   archive, summarised into monthly normals and typical frost dates.
 */

export interface PlaceName {
  name: string;
  detail: string | null;
}

/** Neighbourhood and town for a rough area. Null if the lookup fails. */
export async function nameArea(lat: number, lon: number, signal?: AbortSignal): Promise<PlaceName | null> {
  const a = roughArea(lat, lon);
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${a.lat}&lon=${a.lon}&zoom=14&addressdetails=1&accept-language=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const addr = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
  const town = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? null;
  const name = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.city_district ?? town;
  if (!name) return null;
  return { name, detail: [town !== name ? town : null, addr.country].filter(Boolean).join(", ") || null };
}

/** Weather words, as in the design's own weather code mapping. */
export function weatherWords(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Some sun";
  if (code === 3) return "Grey";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  return "Stormy";
}

export interface WeatherNow {
  tempC: number;
  words: string;
}

export async function weatherNow(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherNow> {
  const a = roughArea(lat, lon);
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${a.lat}&longitude=${a.lon}&current=temperature_2m,weather_code&timezone=auto`, { signal });
  if (!res.ok) throw new Error("forecast unavailable");
  const j = (await res.json()) as { current: { temperature_2m: number; weather_code: number } };
  return { tempC: j.current.temperature_2m, words: weatherWords(j.current.weather_code) };
}

export interface ClimateSummary {
  normals: ClimateNormals;
  type: ClimateType;
  /** "MM-DD" typical first autumn frost / last spring frost, or null when frost is rare. */
  firstFrost: string | null;
  lastFrost: string | null;
}

interface Daily {
  time: string[];
  temperature_2m_mean: (number | null)[];
  temperature_2m_min: (number | null)[];
  temperature_2m_max: (number | null)[];
  precipitation_sum: (number | null)[];
}

const md = (iso: string) => iso.slice(5);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Monthly normals and frost dates from daily history (pure: tested without the network). */
export function summarise(latitude: number, d: Daily): ClimateSummary {
  const sums = Array.from({ length: 12 }, () => ({ mean: 0, min: 0, max: 0, n: 0, precip: 0 }));
  const years = new Set<string>();
  d.time.forEach((t, i) => {
    const m = Number(t.slice(5, 7)) - 1;
    const mean = d.temperature_2m_mean[i];
    const min = d.temperature_2m_min[i];
    const max = d.temperature_2m_max[i];
    if (mean === null || min === null || max === null) return;
    sums[m].mean += mean;
    sums[m].min += min;
    sums[m].max += max;
    sums[m].n += 1;
    sums[m].precip += d.precipitation_sum[i] ?? 0;
    years.add(t.slice(0, 4));
  });
  const nYears = Math.max(1, years.size);
  const normals: ClimateNormals = {
    latitude,
    meanTemp: sums.map((s) => s.mean / Math.max(1, s.n)),
    meanMin: sums.map((s) => s.min / Math.max(1, s.n)),
    meanMax: sums.map((s) => s.max / Math.max(1, s.n)),
    precip: sums.map((s) => s.precip / nYears),
  };

  // Frost dates per growing year (from midsummer to midsummer, so winters aren't cut in two).
  const north = latitude >= 0;
  const firsts: number[] = [];
  const lasts: number[] = [];
  const byYear = new Map<number, { first: number | null; last: number | null }>();
  d.time.forEach((t, i) => {
    const min = d.temperature_2m_min[i];
    if (min === null || min > 0) return;
    const date = new Date(`${t}T12:00:00Z`);
    const mid = Date.UTC(date.getUTCFullYear(), north ? 6 : 0, 1);
    const startYear = date.getTime() >= mid ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
    const start = Date.UTC(startYear, north ? 6 : 0, 1);
    const day = Math.round((date.getTime() - start) / 86_400_000);
    const y = byYear.get(startYear) ?? { first: null, last: null };
    y.first = y.first === null ? day : Math.min(y.first, day);
    y.last = y.last === null ? day : Math.max(y.last, day);
    byYear.set(startYear, y);
  });
  for (const y of byYear.values()) {
    if (y.first !== null) firsts.push(y.first);
    if (y.last !== null) lasts.push(y.last);
  }
  // Frost in fewer than a third of years counts as rare: say so rather than give a date.
  const common = byYear.size >= nYears / 3;
  const back = (day: number) => md(new Date(Date.UTC(2001, north ? 6 : 0, 1) + day * 86_400_000).toISOString().slice(0, 10));
  return {
    normals,
    type: climateType(normals),
    firstFrost: common && firsts.length ? back(median(firsts)) : null,
    lastFrost: common && lasts.length ? back(median(lasts)) : null,
  };
}

export async function climateFor(lat: number, lon: number, signal?: AbortSignal): Promise<ClimateSummary> {
  const a = roughArea(lat, lon);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${a.lat}&longitude=${a.lon}&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_mean,temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=auto`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("climate unavailable");
  return summarise(a.lat, ((await res.json()) as { daily: Daily }).daily);
}

/** One plain line for the climate (01 Location: "Mild, damp, by the sea"). */
export function climateWords(c: ClimateSummary): string {
  const rain = c.normals.precip.reduce((a, b) => a + b, 0);
  switch (c.type) {
    case "temperate":
      return rain > 700 ? "Mild and damp" : "Mild";
    case "continental":
      return "Cold winters, warm summers";
    case "mediterranean":
      return "Dry summers, wet winters";
    case "tropical-wet-dry":
      return "Hot, with a wet and a dry season";
    case "tropical-wet":
      return "Hot and wet all year";
    case "arid":
      return "Dry";
    default:
      return "Cold, with short summers";
  }
}

export const frostWords = (mmdd: string | null) => (mmdd ? `Usually ${dateWords(mmdd)}` : "Rare here");
