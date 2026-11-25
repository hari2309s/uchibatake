/** Broad climate types (from the Köppen group) that crop windows and season copy are written for. */
export type ClimateType = "temperate" | "continental" | "mediterranean" | "tropical-wet-dry" | "tropical-wet" | "arid" | "polar";

/** A local season: a plain name and a short poetic half ("Late autumn · first frosts"). */
export interface LocalSeason {
  id: string;
  name: string;
  poem: string;
  /** First day, "MM-DD": always the start of a microseason, so the ring lines up. */
  start: string;
  /** One or two plain sentences about this season here (optional; say less when unsure). */
  about?: string;
}

export interface SeasonTable {
  id: string;
  /** The place these seasons were written for, or "generic". */
  place: string;
  climate: ClimateType;
  /** Northern (1) or southern (-1) hemisphere. */
  hemisphere: 1 | -1;
  /** Seasons in year order; the last runs until the first starts again. */
  seasons: LocalSeason[];
  /** Months when frost is likely, as microseason indexes (the ring's dotted arc). */
  frost?: { from: number; to: number };
  /** One line per solar term (24) about what it's like here (the almanac's "Here" row). */
  termNotes?: string[];
}
