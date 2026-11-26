import type { ClimateType } from "../seasons/types.ts";
import type { Timing } from "./timing.ts";

/** A date range "MM-DD" to "MM-DD", inclusive; may wrap the year end. */
export interface Window {
  from: string;
  to: string;
}

/** When to do what, for one climate type. Empty when we don't know: say less. */
export interface ClimateWindows {
  /** Sow under cover (windowsill, greenhouse, propagator). */
  sowIndoors?: Window[];
  /** Sow or plant straight outside (for garlic: push the cloves in). */
  sow?: Window[];
  /** Move young plants outside, or plant bought plants / crowns / runners. */
  plantOut?: Window[];
  harvest?: Window[];
}

export interface Applies {
  ok: boolean;
  /** Plain words, shown greyed when it doesn't apply ("Not for beans. Try green onions or celery."). */
  why?: string;
}

export interface Problem {
  id: string;
  name: string;
  /** What it looks like, in plain words. */
  signs?: string;
  /** Gentlest first: by hand, then barriers, then (organic, child-safe) products. Empty until checked. */
  fixes: string[];
}

export interface HowToStep {
  heading: string;
  detail?: string;
}

export interface HowTo {
  id: string;
  title: string;
  steps: HowToStep[];
}

/** A neighbour: another crop in the catalogue, or a plant we don't carry (by name). */
export type Neighbour = string | { name: string };

export type Region = "eu" | "us" | "jp" | "kr";

export interface Source {
  title: string;
  url: string;
}

export interface Crop {
  id: string;
  name: string;
  /** Other names people search for ("corn salad", "spring onions"). */
  aka?: string[];
  kind: "vegetable" | "herb" | "fruit";
  difficulty?: "very-easy" | "easy" | "some-care";
  sun?: "full" | "sun-or-part" | "part";
  /** Between plants, in cm (the middle of the source's range). */
  spacingCm?: number;
  /** Smallest pot that suits it, in cm. */
  pot?: { depthCm?: number; widthCm?: number };
  start: { seed: Applies; plant: Applies; scraps: Applies };
  /** Days from sowing to the first picking, the shortest the source gives. Unset when the source doesn't say. */
  daysToFirstPick?: number;
  /** The verb for starting it, when "Sow" is wrong ("Plant the cloves of" → "Plant garlic"). */
  sowVerb?: string;
  /** RHS dates for mild maritime places (key "temperate"). */
  windows: Partial<Record<ClimateType, ClimateWindows>>;
  /** Frost- and temperature-relative timing, for everywhere else (crops/timing.ts). */
  timing?: Timing;
  /** Where families commonly grow it: ranks it first for them. */
  popularIn?: Region[];
  goodWith?: Neighbour[];
  keepApart?: Neighbour[];
  kidTip?: string;
  care?: { water?: string; feed?: string; pick?: string };
  howTo?: HowTo[];
  problems?: Problem[];
  /** Where the facts come from. A crop with no sources carries no growing facts. */
  sources: Source[];
  /** Fields left empty on purpose until there's a source, for the owner to review. */
  unsure?: string[];
}
