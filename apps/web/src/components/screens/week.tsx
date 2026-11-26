"use client";

import { MICROSEASONS, microseasonFor, seasonFor, SEASON_TABLES } from "@uchibatake/content";
import { BackBar } from "@/components/ui/bars";
import { useHousehold, usePlantings, useSettings, useSpaces } from "@/lib/data/hooks";
import { parseIsoDate } from "@/lib/dates";
import { useForecastState } from "@/lib/forecast-context";
import { durationWords, toUnits } from "@/lib/forecast";
import { useToday } from "@/lib/use-today";
import { FROST_AT, meanings, read } from "@/lib/weather-rules";

const NUMERALS = ["一", "二", "三"];

/** 03 This week's sky: the weather now, what it means for the plants, seven days, the next microseason. */
export function Week() {
  const { forecast, offline, failed, retry } = useForecastState();
  const household = useHousehold();
  const settings = useSettings();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const today = useToday();
  if (!household || !today) return null;
  const u = settings?.units;
  const table = (household.season_table ? SEASON_TABLES[household.season_table] : undefined) ?? household.seasons ?? undefined;
  const season = table ? seasonFor(table, today.slice(5)) : null;
  const ms = microseasonFor(today.slice(5));
  const next = MICROSEASONS[(ms.index + 1) % 72];
  const hasOutdoor = !!plantings?.some((p) => p.status === "growing" && spaces?.find((s) => s.id === p.space_id && (s.type === "balcony" || s.type === "backyard")));
  const place = household.place || table?.place || "";

  return (
    <div className="pb-9">
      <BackBar href="/" label="Home" />
      <div className="rise flex flex-col gap-2 px-8 pt-3">
        <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">{place}</span>
        <h1 className="font-mincho text-[34px] font-normal">This week&apos;s sky</h1>
        {season ? (
          <p className="text-[17px] leading-[1.55] text-ink-body">
            Here{place ? ` in ${place}` : ""}: {season.label.toLowerCase()}.
          </p>
        ) : null}
      </div>
      {!forecast ? (
        <div className="px-8 pt-8">
          <p className="text-[17px] text-ink-body">{offline || failed ? "We can't reach the forecast just now." : household.area ? "" : "Tell us where you are in Profile, and the week's weather will be here."}</p>
          {offline || failed ? (
            <button type="button" onClick={retry} className="tap mt-3 min-h-11 text-[16px] underline underline-offset-4">
              Try again
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="rise mx-8 mt-6 flex flex-col gap-3 border-y border-rule py-5" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="flex items-baseline gap-4">
              <span className="font-mincho text-[46px] leading-none">{toUnits(forecast.now.tempC, u)}°</span>
              <span className="text-[17px]">{forecast.now.words}</span>
            </div>
            <span className="text-[16px] text-ink-soft">
              High {toUnits(forecast.days[0].hi, u)}° · low {toUnits(forecast.days[0].lo, u)}° · wind {u === "F" ? `${Math.round(forecast.now.windKmh * 0.621)} mph` : `${Math.round(forecast.now.windKmh)} km/h`}
            </span>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {(
                [
                  ["Sunrise", forecast.days[0].sunrise],
                  ["Sunset", forecast.days[0].sunset],
                  ["Real sun", durationWords(forecast.days[0].sunshine, true)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-[15px] uppercase tracking-[.12em] text-ink-soft">{k}</span>
                  <span className="font-mincho text-[20px]">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <section aria-label="What it means for your plants" className="rise px-8 pt-9" style={{ "--i": 2 } as React.CSSProperties}>
            <h2 className="font-mincho text-[24px] font-normal">What it means for your plants</h2>
            <ol className="pt-3">
              {meanings(forecast, read(forecast), hasOutdoor, u).map((m, i) => (
                <li key={i} className="flex gap-4 border-t border-rule py-3.5 last:border-b">
                  <span aria-hidden className="w-5 font-mincho text-[20px]">
                    {NUMERALS[i]}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-mincho text-[19px]">{m.t}</span>
                    <span className="text-[16px] leading-normal text-ink-body">{m.x}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-label="Seven days" className="rise px-8 pt-9" style={{ "--i": 3 } as React.CSSProperties}>
            <h2 className="font-mincho text-[24px] font-normal">Seven days</h2>
            <ul className="pt-3">
              {forecast.days.map((d, i) => {
                const frost = (forecast.days[i + 1]?.lo ?? 99) <= FROST_AT;
                return (
                  <li key={d.date} className="grid min-h-[60px] grid-cols-[56px_1fr_auto] items-center gap-3 border-t border-rule last:border-b">
                    <span className="font-mincho text-[17px]">{i === 0 ? "Today" : parseIsoDate(d.date).toLocaleDateString("en-GB", { weekday: "short" })}</span>
                    <span className="flex flex-col">
                      <span className="text-[16px]">{d.words}</span>
                      <span className="text-[15px] text-ink-soft">{d.rainChance >= 30 ? `${d.rainChance}% chance of rain` : "Dry"}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      {frost ? (
                        <span className="font-mincho text-[20px]" aria-label="Frost that night">
                          霜
                        </span>
                      ) : null}
                      <span className="font-mincho text-[18px]">
                        {toUnits(d.hi, u)}° <span className="text-ink-soft">/ {toUnits(d.lo, u)}°</span>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <p className="px-8 pt-4 text-[15px] text-ink-soft">
            Forecast for {place || "your area"} from Open-Meteo, {offline || failed ? "last fetched" : "fetched"} {new Date(forecast.at).toLocaleString("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" })}.
          </p>
        </>
      )}
      <div className="rise mx-8 mt-9 flex gap-4 border-t border-rule pt-5" style={{ "--i": 4 } as React.CSSProperties}>
        <span lang="ja" aria-hidden className="vertical font-mincho text-[17px] tracking-[.3em] text-ink-soft">
          {next.kanji}
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">Next in Japan · {parseIsoDate(`2001-${next.start}`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</span>
          <span className="font-mincho text-[18px]">{next.english}</span>
        </span>
      </div>
    </div>
  );
}
