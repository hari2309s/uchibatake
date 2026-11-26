import { regionOf, type Place, type Region } from "@uchibatake/content";
import { useHousehold } from "./data/hooks";
import type { Household } from "./data/types";

/** The household's place, for crop dates: climate, hemisphere, frost dates and temperatures. Null until it's known. */
export function placeOf(h: Pick<Household, "climate" | "area" | "grow"> | undefined | null): Place | null {
  if (!h?.climate) return null;
  return { climate: h.climate, hemisphere: (h.area?.lat ?? 1) < 0 ? -1 : 1, grow: h.grow ?? null };
}

export function usePlace(): Place | null {
  return placeOf(useHousehold());
}

export function useRegion(): Region | null {
  return regionOf(useHousehold()?.country);
}
