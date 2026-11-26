"use client";

import { useEffect, useState } from "react";
import { getMeta, setMeta, type FieldDB } from "./data/db";
import { weatherWords } from "./climate";
import { roughArea } from "./place";

/*
 * The forecast for the household's rough area (Open-Meteo, no key): now, and
 * seven days. Kept on the device; refreshed when older than half an hour or
 * when the app comes back online. Offline, the last forecast stays, with its
 * time ("Last forecast: this morning, 7:10").
 */

export interface Day {
  date: string;
  code: number;
  words: string;
  hi: number;
  lo: number;
  /** % chance of rain, and mm expected over the whole day. */
  rainChance: number;
  rainMm: number;
  /** mm that had already fallen today when the forecast was fetched (today only). */
  rainSoFarMm?: number;
  sunrise: string;
  sunset: string;
  /** Seconds of sunshine and of daylight. */
  sunshine: number;
  daylight: number;
}

export interface Forecast {
  at: number;
  lat: number;
  lon: number;
  now: { tempC: number; words: string; windKmh: number };
  days: Day[];
}

const KEY = "forecast";
const FRESH_MS = 30 * 60_000;

export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const a = roughArea(lat, lon);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${a.lat}&longitude=${a.lon}` +
    "&current=temperature_2m,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,sunshine_duration,daylight_duration" +
    "&hourly=precipitation&timezone=auto&forecast_days=7";
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("forecast unavailable");
  const j = await res.json();
  const d = j.daily;
  // Rain that has already fallen today: the hours before now (local time at the place).
  const nowLocal = new Date(Date.now() + (j.utc_offset_seconds ?? 0) * 1000).toISOString().slice(0, 13);
  const today = d.time?.[0] as string;
  const hours = (j.hourly?.time ?? []) as string[];
  const rainSoFar = hours.reduce((sum: number, t: string, i: number) => (t.startsWith(today) && t.slice(0, 13) < nowLocal ? sum + (j.hourly.precipitation?.[i] ?? 0) : sum), 0);
  return {
    at: Date.now(),
    lat: a.lat,
    lon: a.lon,
    now: { tempC: j.current?.temperature_2m ?? d.temperature_2m_max[0], words: weatherWords(j.current?.weather_code ?? d.weather_code[0]), windKmh: j.current?.wind_speed_10m ?? 0 },
    days: (d.time as string[]).map((date, i) => ({
      date,
      code: d.weather_code[i],
      words: weatherWords(d.weather_code[i]),
      hi: d.temperature_2m_max[i],
      lo: d.temperature_2m_min[i],
      rainChance: d.precipitation_probability_max?.[i] ?? 0,
      rainMm: d.precipitation_sum?.[i] ?? 0,
      sunrise: String(d.sunrise?.[i] ?? "").slice(11, 16),
      sunset: String(d.sunset?.[i] ?? "").slice(11, 16),
      sunshine: d.sunshine_duration?.[i] ?? 0,
      daylight: d.daylight_duration?.[i] ?? 0,
      ...(i === 0 ? { rainSoFarMm: rainSoFar } : {}),
    })),
  };
}

export type ForecastState = { forecast: Forecast | null; offline: boolean; failed: boolean; retry: () => void };

/** The forecast for an area: the kept one at once, a fresh one when due. */
export function useForecast(db: FieldDB, area: { lat: number; lon: number } | null): ForecastState {
  const [f, setF] = useState<Forecast | null>(null);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!area) return;
    let cancelled = false;
    const ac = new AbortController();
    const refresh = async (force = false) => {
      const kept = await getMeta<Forecast>(db, KEY);
      const same = kept && kept.lat === roughArea(area.lat, area.lon).lat && kept.lon === roughArea(area.lat, area.lon).lon;
      if (same && !cancelled) setF(kept);
      if (same && !force && Date.now() - kept.at < FRESH_MS) return;
      if (!navigator.onLine) {
        if (!cancelled) setOffline(true);
        return;
      }
      try {
        const next = await fetchForecast(area.lat, area.lon, ac.signal);
        await setMeta(db, KEY, next);
        if (!cancelled) {
          setF(next);
          setFailed(false);
          setOffline(false);
        }
      } catch (e) {
        if (!cancelled && (e as Error).name !== "AbortError") setFailed(true);
      }
    };
    void refresh(tick > 0);
    const t = setInterval(() => void refresh(), FRESH_MS);
    const on = () => void refresh(true);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      cancelled = true;
      ac.abort();
      clearInterval(t);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [db, area?.lat, area?.lon, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only this area's forecast: after the place changes (or is cleared), the old one isn't shown.
  const mine = f && area && f.lat === roughArea(area.lat, area.lon).lat && f.lon === roughArea(area.lat, area.lon).lon ? f : null;
  return { forecast: mine, offline, failed, retry: () => setTick((x) => x + 1) };
}

/** "3 h 10 min", "40 min", "barely any" (as the design's own duration words). */
export function durationWords(seconds: number, short = false): string {
  const m = Math.round(seconds / 600) * 10;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (m < 15) return short ? "none" : "barely any";
  if (short) return h ? `${h}h${r ? ` ${r}m` : ""}` : `${r}m`;
  return h ? `${h} h${r ? ` ${r} min` : ""}` : `${r} min`;
}

export const toUnits = (c: number, units: "C" | "F" | undefined) => Math.round(units === "F" ? (c * 9) / 5 + 32 : c);

/** A temperature with a real minus sign: "−2°". */
export const deg = (c: number, units: "C" | "F" | undefined) => `${String(toUnits(c, units)).replace("-", "−")}°`;
