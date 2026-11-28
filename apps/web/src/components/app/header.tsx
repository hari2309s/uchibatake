"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { brushDraw } from "@/components/ui/enso";
import { useHousehold, useMembers, useSettings } from "@/lib/data/hooks";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { useForecastState } from "@/lib/forecast-context";
import { setTheme, type ThemePref } from "@/lib/theme";
import { useThemePref } from "@/lib/use-theme";

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

const NEXT: Record<ThemePref, ThemePref> = { system: "light", light: "dark", dark: "system" };
const WORDS: Record<ThemePref, string> = { system: "follows your phone", light: "light", dark: "dark" };

/** One button that steps through the themes: follows your phone → light → dark. The new icon turns in. */
function ThemeButton() {
  const pref = useThemePref();
  const next = NEXT[pref];
  const line = { fill: "none", stroke: "var(--ink)", strokeWidth: 1.6, strokeLinecap: "round" as const };
  return (
    <button type="button" onClick={() => setTheme(next)} aria-label={`Theme: ${WORDS[pref]}. Tap for ${WORDS[next]}.`} title={`Theme: ${WORDS[pref]}`} className="tap flex h-11 w-11 flex-none items-center justify-center">
      <svg key={pref} width="22" height="22" viewBox="0 0 22 22" aria-hidden className="theme-turn">
        {pref === "light" ? (
          <>
            <circle cx="11" cy="11" r="4.2" {...line} />
            {Array.from({ length: 8 }, (_, k) => {
              const a = (k * Math.PI) / 4;
              return <line key={k} x1={11 + Math.cos(a) * 6.8} y1={11 + Math.sin(a) * 6.8} x2={11 + Math.cos(a) * 9} y2={11 + Math.sin(a) * 9} {...line} />;
            })}
          </>
        ) : pref === "dark" ? (
          <path d="M15.5 14.6A7 7 0 0 1 8.4 4.1a7 7 0 1 0 7.1 10.5Z" {...line} />
        ) : (
          <>
            <circle cx="11" cy="11" r="7" {...line} />
            <path d="M11 4a7 7 0 0 1 0 14Z" fill="var(--ink)" />
          </>
        )}
      </svg>
    </button>
  );
}

/**
 * The place's name. When it's too long for the header it scrolls slowly, round
 * and round, with soft edges (reduced motion: it ends in "…" instead).
 */
function PlaceName({ name }: { name: string }) {
  const box = useRef<HTMLSpanElement>(null);
  // A hidden copy, always there, measures the name (the visible spans change between modes).
  const ruler = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState(0);
  useEffect(() => {
    const measure = () => {
      const b = box.current;
      const r = ruler.current;
      if (b && r) setOver(r.scrollWidth > b.clientWidth + 1 ? r.scrollWidth : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [name]);
  const gap = 40;
  return (
    <span ref={box} className={over ? "marquee-box relative block overflow-hidden" : "relative block overflow-hidden"} title={name}>
      <span ref={ruler} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-mincho text-[17px]">
        {name}
      </span>
      {over ? (
        // Two copies on one track: when the first has gone by, the second is exactly where it started.
        <span className="marquee-track flex w-max font-mincho text-[17px]" style={{ "--shift": `-${over + gap}px`, "--dur": `${Math.max(6, (over + gap) / 28)}s` } as React.CSSProperties}>
          <span className="whitespace-nowrap" style={{ paddingRight: gap }}>
            {name}
          </span>
          <span aria-hidden className="whitespace-nowrap" style={{ paddingRight: gap }}>
            {name}
          </span>
        </span>
      ) : (
        <span className="block truncate whitespace-nowrap font-mincho text-[17px]">{name}</span>
      )}
    </span>
  );
}

/**
 * The sticky header on every app screen: the mark (Home), where and when,
 * the weather now, the theme, and your mark (Profile).
 */
export function AppHeader() {
  const household = useHousehold();
  const members = useMembers();
  const settings = useSettings();
  const today = useToday();
  const { forecast } = useForecastState();
  const weather = forecast ? { tempC: forecast.now.tempC, words: forecast.now.words, at: forecast.at } : null;
  const { session } = useData();
  const me = meOf(members, session);
  const date = today ? parseIsoDate(today).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";
  const temp = weather ? Math.round(settings?.units === "F" ? (weather.tempC * 9) / 5 + 32 : weather.tempC) : null;

  return (
    <header className="washi sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-rule pl-5 pr-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <Link href="/" aria-label="Home" className="tap flex h-11 w-11 flex-none items-center justify-center">
        <MarkIcon />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <PlaceName name={household?.place || "Our field"} />
        <span className="truncate text-[15px] text-ink-soft">{date}</span>
      </div>
      {weather && temp !== null ? (
        <div key={weather.at} className="fade-in flex flex-none flex-col items-end leading-tight" aria-label={`Now ${temp} degrees, ${weather.words.toLowerCase()}`}>
          <span className="font-mincho text-[19px]">{temp}°</span>
          <span className="text-[15px] text-ink-soft">{weather.words}</span>
        </div>
      ) : null}
      <ThemeButton />
      <Link href="/profile" aria-label="Profile" className="tap flex h-11 w-11 flex-none items-center justify-center rounded-full">
        {me ? <Avatar mark={me.mark} size={40} quiet /> : <span className="h-10 w-10 rounded-full bg-wash" />}
      </Link>
    </header>
  );
}
