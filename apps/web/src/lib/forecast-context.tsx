"use client";

import { createContext, useContext, useEffect } from "react";
import { getMeta, setMeta } from "./data/db";
import { useHousehold, useSettings } from "./data/hooks";
import { useData } from "./data/provider";
import { useForecast, type ForecastState } from "./forecast";
import { useToday } from "./use-today";
import { applyForecast } from "./weather-rules";

const Ctx = createContext<ForecastState>({ forecast: null, offline: false, failed: false, retry: () => {} });

export const useForecastState = () => useContext(Ctx);

/** One forecast for the whole app, and the rules applied to the field once per new forecast. */
export function ForecastProvider({ children }: { children: React.ReactNode }) {
  const { db, session, householdId } = useData();
  const household = useHousehold();
  const today = useToday();
  const settings = useSettings();
  const raw = useForecast(db, household?.area ?? null);
  // A kept forecast from an earlier day: drop the days that have passed, so "today" is today (offline after midnight).
  const days = raw.forecast && today ? raw.forecast.days.filter((d) => d.date >= today) : [];
  const forecast = raw.forecast && days.length ? (days.length === raw.forecast.days.length ? raw.forecast : { ...raw.forecast, days }) : null;
  const state: ForecastState = { ...raw, forecast, offline: raw.offline || (!!raw.forecast && !forecast) };
  const at = state.forecast?.at;

  useEffect(() => {
    // The demo keeps its own story (its frost night is part of the design), so it isn't changed by today's weather.
    if (!state.forecast || !today || session.kind === "demo") return;
    const f = state.forecast;
    let cancelled = false;
    (async () => {
      if ((await getMeta<string>(db, "forecastAppliedAt")) === `${f.at}:${today}` || cancelled) return;
      await applyForecast(db, f, householdId, today, settings?.units);
      await setMeta(db, "forecastAppliedAt", `${f.at}:${today}`);
    })().catch(() => {
      // Rules are applied again with the next forecast; nothing to show the family.
    });
    return () => {
      cancelled = true;
    };
  }, [at, db, householdId, today, session.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
