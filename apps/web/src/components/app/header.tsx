"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { brushDraw } from "@/components/ui/enso";
import { useHousehold, useMembers, useSettings } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { useWeatherNow } from "@/lib/use-weather";

/** The app's mark, small: an open ensō with the 畑 seal. */
function MarkIcon() {
  const c = 2 * Math.PI * 14;
  return (
    <span className="relative block h-9 w-9" aria-hidden>
      <svg width="36" height="36" viewBox="0 0 36 36" className="block">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" transform="rotate(-65 18 18)" style={brushDraw(c * 0.82, c, 0, 900)} />
      </svg>
      <span className="ink-press absolute -bottom-0.5 -right-1 flex h-[17px] w-[17px] items-center justify-center rounded-[2px] bg-shu font-mincho text-[11px] leading-none text-on-ink" style={{ animationDelay: "600ms, 880ms" }}>
        畑
      </span>
    </span>
  );
}

/**
 * The sticky header on every app screen: the mark (Home), where and when,
 * the weather now, and your mark (Profile).
 */
export function AppHeader() {
  const { db } = useData();
  const household = useHousehold();
  const members = useMembers();
  const settings = useSettings();
  const today = useToday();
  const weather = useWeatherNow(db, household?.area ?? null);
  const me = members?.find((m) => m.role === "owner");
  const date = today ? parseIsoDate(today).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";
  const temp = weather ? Math.round(settings?.units === "F" ? (weather.tempC * 9) / 5 + 32 : weather.tempC) : null;

  return (
    <header className="washi sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-rule pl-5 pr-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <Link href="/" aria-label="Home" className="tap flex h-11 w-11 flex-none items-center justify-center">
        <MarkIcon />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-mincho text-[17px]">{household?.place || "Our field"}</span>
        <span className="truncate text-[15px] text-ink-soft">{date}</span>
      </div>
      {weather && temp !== null ? (
        <div key={weather.at} className="fade-in flex flex-none flex-col items-end leading-tight" aria-label={`Now ${temp} degrees, ${weather.words.toLowerCase()}`}>
          <span className="font-mincho text-[19px]">{temp}°</span>
          <span className="text-[15px] text-ink-soft">{weather.words}</span>
        </div>
      ) : null}
      <Link href="/profile" aria-label="Profile" className="tap flex h-11 w-11 flex-none items-center justify-center rounded-full">
        {me ? <Avatar mark={me.mark} size={40} quiet /> : <span className="h-10 w-10 rounded-full bg-wash" />}
      </Link>
    </header>
  );
}
