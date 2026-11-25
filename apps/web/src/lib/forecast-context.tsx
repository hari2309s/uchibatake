"use client";

import { createContext, useContext, useEffect } from "react";
import { getMeta, setMeta } from "./data/db";
import { useHousehold } from "./data/hooks";
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
  const state = useForecast(db, household?.area ?? null);
  const at = state.forecast?.at;

  useEffect(() => {
    // The demo keeps its own story (its frost night is part of the design), so it isn't changed by today's weather.
    if (!state.forecast || !today || session.kind === "demo") return;
    const f = state.forecast;
    (async () => {
      if ((await getMeta<number>(db, "forecastAppliedAt")) === f.at) return;
      await applyForecast(db, f, householdId, today);
      await setMeta(db, "forecastAppliedAt", f.at);
    })();
  }, [at, db, householdId, today, session.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
