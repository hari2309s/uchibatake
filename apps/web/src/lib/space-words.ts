import type { Facing, Space } from "./data/types";

/** Windowsills and racks are indoors: the outdoor crop windows don't apply there. */
export const isIndoors = (s: Pick<Space, "type"> | null | undefined) => s?.type === "windowsill" || s?.type === "rack";

export const FACING_WORDS: Record<Facing, string> = { N: "North", NE: "North-east", E: "East", SE: "South-east", S: "South", SW: "South-west", W: "West", NW: "North-west" };
export const SUN_WORDS: Record<NonNullable<Space["sun"]>, string> = { full: "Full sun", part: "Part sun", shade: "Shade" };
/** Sizes in everyday objects, as on 02d. */
export const SIZE_WORDS: Record<NonNullable<Space["size"]>, string> = { s: "About a chair's width", m: "About a kitchen table", l: "About a parked car" };

/** One short line about a space: "South-west · full sun", "4 shelves · water-grown · light 06:00–20:00". */
export function spaceLine(s: Space): string {
  if (s.rack) {
    const parts = [s.rack.shelves > 1 ? `${s.rack.shelves} shelves` : "One shelf", s.rack.medium === "water" ? "water-grown" : "in pots"];
    if (s.rack.light === "yes" && s.rack.light_on && s.rack.light_off) parts.push(`light ${s.rack.light_on}–${s.rack.light_off}`);
    return parts.join(" · ");
  }
  if (s.greenhouse) return [s.size_note, s.greenhouse.heated === "no" ? "not heated" : s.greenhouse.heated === "frost" ? "frost-free" : "heated"].filter(Boolean).join(" · ");
  const parts = [s.type === "backyard" ? (s.ground?.split(" · ")[0] ?? "Open ground") : null, s.facing ? FACING_WORDS[s.facing] : null].filter(Boolean) as string[];
  if (!parts.length && s.sun) parts.push(SUN_WORDS[s.sun]);
  return parts.map((p, i) => (i ? p.toLowerCase() : p)).join(" · ");
}
