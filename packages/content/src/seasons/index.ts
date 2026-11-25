import { almanacDay, microseasonEnd, microseasonStartingOn, monthDay } from "../microseasons.ts";
import type { LocalSeason, SeasonTable } from "./types.ts";

export * from "./types.ts";
export * from "./tables.ts";
export * from "./algorithm.ts";

export interface SeasonNow {
  season: LocalSeason;
  /** "MM-DD" start and last day. */
  start: string;
  end: string;
  /** "Late autumn · first frosts". */
  label: string;
}

/** Seasons in the order they occur from the almanac's start (4 Feb). */
function ordered(table: SeasonTable): LocalSeason[] {
  return [...table.seasons].sort((a, b) => almanacDay(a.start) - almanacDay(b.start));
}

/** The local season a date falls in, with its span. */
export function seasonFor(table: SeasonTable, d: Date | string): SeasonNow {
  if (!table.seasons.length) throw new Error(`Season table ${table.id} has no seasons`);
  const pos = almanacDay(typeof d === "string" ? d : monthDay(d));
  const seasons = ordered(table);
  let i = seasons.length - 1; // before the first start: still in the last season (it wraps the year)
  seasons.forEach((s, k) => {
    if (almanacDay(s.start) <= pos) i = k;
  });
  const season = seasons[i];
  const next = seasons[(i + 1) % seasons.length];
  return { season, start: season.start, end: microseasonEnd((microseasonStartingOn(next.start) + 71) % 72), label: `${season.name} · ${season.poem}` };
}
