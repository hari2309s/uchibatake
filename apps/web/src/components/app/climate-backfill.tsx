"use client";

import { seasonsFromNormals } from "@uchibatake/content";
import { useEffect } from "react";
import { getMeta, setMeta } from "@/lib/data/db";
import { useHousehold } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { update } from "@/lib/data/repo";
import type { Household } from "@/lib/data/types";
import { climateFor } from "@/lib/climate";
import { isoDate } from "@/lib/dates";
import { growOf } from "@/lib/onboarding";
import { distanceKm, searchPlaces } from "@/lib/place";

/**
 * Fills in what crop dates need, for fields saved before they were worked
 * out per place (or whose climate lookup failed): the climate from 30 years
 * of history for the rough area (Open-Meteo archive, as in onboarding), and
 * the country from the place name (Open-Meteo geocoding, as when typing a
 * town). Only what's missing, at most once a day.
 */
export function ClimateBackfill() {
  const { db, session, householdId } = useData();
  const h = useHousehold();
  const missingClimate = !!h?.area && (!h.grow || !h.climate);
  const missingCountry = !!h?.area && h.country === undefined;
  const needs = session.kind !== "demo" && (missingClimate || missingCountry);
  const lat = h?.area?.lat;
  const lon = h?.area?.lon;
  const name = h?.place ?? "";
  const hasTable = !!h?.season_table;
  const hasSeasons = !!h?.seasons;

  useEffect(() => {
    if (!needs || lat === undefined || lon === undefined) return;
    const ac = new AbortController();
    (async () => {
      const today = isoDate();
      if ((await getMeta<string>(db, "climateBackfill")) === today) return;
      const patch: Partial<Pick<Household, "grow" | "climate" | "seasons" | "country">> = {};
      if (missingClimate) {
        const c = await climateFor(lat, lon, ac.signal).catch(() => null);
        if (c) {
          patch.grow = growOf(c);
          patch.climate = hasTable ? "temperate" : c.type;
          if (!hasTable && !hasSeasons) patch.seasons = seasonsFromNormals(c.normals, name || "here");
        }
      }
      if (missingCountry) {
        // The nearest match for the place's own name; none close enough, no country (and no retry).
        const found = name ? await searchPlaces(name, ac.signal).catch(() => null) : [];
        if (found) patch.country = found.filter((p) => distanceKm(p, { lat, lon }) <= 50)[0]?.country ?? null;
      }
      if (ac.signal.aborted) return; // left the screen: try again next time
      await setMeta(db, "climateBackfill", today);
      if (Object.keys(patch).length) await update(db.households, householdId, patch);
    })();
    return () => ac.abort();
  }, [needs, missingClimate, missingCountry, lat, lon, name, hasTable, hasSeasons, db, householdId]);
  return null;
}
