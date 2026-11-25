"use client";

import { microseasonFor, SEASON_TABLES } from "@uchibatake/content";
import Link from "next/link";
import { Hitokoto } from "@/components/ui/notes";
import { useHousehold, usePlantings, useSettings, useSpaces } from "@/lib/data/hooks";
import { useForecastState } from "@/lib/forecast-context";
import { deg, durationWords } from "@/lib/forecast";
import { adviceLine, read } from "@/lib/weather-rules";

const at = (ms: number) => {
  const d = new Date(ms);
  const sameDay = d.toDateString() === new Date().toDateString();
  const hh = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  return sameDay ? (d.getHours() < 12 ? `this morning, ${hh}` : `today, ${hh}`) : `${d.toLocaleDateString("en-GB", { weekday: "long" })}, ${hh}`;
};

/** 02 Home's weather row, or 15b when there's no forecast to show. */
export function WeatherRow({ today }: { today: string }) {
  const { forecast, offline, failed, retry } = useForecastState();
  const household = useHousehold();
  const settings = useSettings();
  const spaces = useSpaces();
  const plantings = usePlantings();
  if (!household?.area) return null;
  const outdoorSpace = spaces?.find((s) => s.type === "balcony" || s.type === "backyard");
  const hasOutdoor = !!plantings?.some((p) => p.status === "growing" && spaces?.find((s) => s.id === p.space_id && (s.type === "balcony" || s.type === "backyard")));
  const u = settings?.units;

  if (!forecast) {
    if (!offline && !failed) return null; // first fetch on its way: nothing to say yet, and no spinner
    const table = household.season_table ? SEASON_TABLES[household.season_table] : null;
    const term = microseasonFor(today.slice(5)).term;
    const fallback = table?.termNotes?.[term];
    return (
      <div className="rise mx-8 mt-7 flex flex-col gap-3 border-y border-rule py-5" style={{ "--i": 1 } as React.CSSProperties}>
        <Hitokoto title="No weather just now">
          We can&apos;t reach the forecast.{fallback ? ` Here's what the season tells us: ${fallback.charAt(0).toLowerCase()}${fallback.slice(1)}` : " The season's advice still holds."}
        </Hitokoto>
        <button type="button" onClick={retry} className="tap self-start pl-5 text-[16px] underline underline-offset-4">
          Try again
        </button>
      </div>
    );
  }

  const r = read(forecast);
  const d0 = forecast.days[0];
  return (
    <div className="rise mx-8 mt-7 flex flex-col gap-3.5 border-y border-rule py-5" style={{ "--i": 1 } as React.CSSProperties}>
      <div className="flex items-start gap-5">
        <div className="flex flex-none flex-col gap-0.5">
          <span key={forecast.at} className="fade-in font-mincho text-[46px] leading-none">
            {deg(forecast.now.tempC, u)}
          </span>
          <span className="text-[16px] text-ink-soft">
            {forecast.now.words} · tonight {deg(forecast.days[1]?.lo ?? d0.lo, u)}
          </span>
        </div>
        <p className="text-[17px] leading-[1.55]">{adviceLine(forecast, r, hasOutdoor)}</p>
      </div>
      <div className="flex min-h-11 items-center justify-between text-[16px] text-ink-soft">
        <span>
          {outdoorSpace ? `Sun on the ${outdoorSpace.name.toLowerCase()}` : "Sun today"}: {durationWords(d0.sunshine)}
        </span>
        <Link href="/week" className="tap text-ink underline decoration-ink underline-offset-4">
          This week
        </Link>
      </div>
      {offline || failed ? <span className="text-[15px] text-ink-soft">Last forecast: {at(forecast.at)}</span> : null}
    </div>
  );
}
