"use client";

import { useEffect, useState } from "react";
import { getMeta, setMeta, type FieldDB } from "./data/db";
import { weatherNow, type WeatherNow } from "./climate";

/*
 * The weather right now for the household's rough area, kept on the device:
 * shown at once from the last fetch, refreshed when it's older than half an
 * hour (and when the app comes back online). Offline, the last one stays.
 */

interface Cached extends WeatherNow {
  at: number;
  lat: number;
  lon: number;
}

const KEY = "weatherNow";
const FRESH_MS = 30 * 60_000;

export function useWeatherNow(db: FieldDB, area: { lat: number; lon: number } | null): (WeatherNow & { at: number }) | null {
  const [w, setW] = useState<Cached | null>(null);

  useEffect(() => {
    if (!area) return;
    let cancelled = false;
    const ac = new AbortController();
    const refresh = async () => {
      const cached = await getMeta<Cached>(db, KEY);
      const same = cached && cached.lat === area.lat && cached.lon === area.lon;
      if (same && !cancelled) setW(cached);
      if (same && Date.now() - cached.at < FRESH_MS) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        const now = await weatherNow(area.lat, area.lon, ac.signal);
        const next: Cached = { ...now, at: Date.now(), lat: area.lat, lon: area.lon };
        await setMeta(db, KEY, next);
        if (!cancelled) setW(next);
      } catch {
        // Keep the last one; the header just shows what we had.
      }
    };
    void refresh();
    const t = setInterval(refresh, FRESH_MS);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      ac.abort();
      clearInterval(t);
      window.removeEventListener("online", refresh);
    };
  }, [db, area?.lat, area?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  return w && area && w.lat === area.lat && w.lon === area.lon ? w : null;
}
