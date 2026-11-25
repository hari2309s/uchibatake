import { inWindows, windowsFor, type ClimateType, type Crop } from "@uchibatake/content";
import type { Facing, Space } from "./data/types";
import { startsNow } from "./plan";
import { FACING_WORDS } from "./space-words";

/*
 * How well a crop fits a space, in plain words, from the crop data only:
 * indoors or out, whether the sources say it suits a container (and how
 * deep), and whether it can start there now.
 */

export interface Fit {
  space: Space;
  /** 2 = good, 1 = possible, 0 = not here. */
  score: 0 | 1 | 2;
  reason: string;
}

const INDOOR = (s: Space) => s.type === "windowsill" || s.type === "rack";

export function fitFor(crop: Crop, space: Space, md: string, climate: ClimateType | null): Fit {
  const name = crop.name.toLowerCase();
  const asPlanSpace = { key: space.id, type: space.type, name: space.name };
  const now = climate ? startsNow(crop, asPlanSpace, md, climate, 1) : null;
  const facing = space.facing ? FACING_WORDS[space.facing] : null;

  if (INDOOR(space)) {
    const small = crop.kind === "herb" || crop.id === "pea-shoots" || crop.start.scraps.ok;
    if (!small) return { space, score: 0, reason: `Too small for ${name}.` };
    return { space, score: now ? 2 : 1, reason: now ? "Indoors and warm. A good spot for it." : "Indoors. Fine for it, in its season." };
  }
  if (space.type === "balcony") {
    if (!crop.pot) return { space, score: 0, reason: `We don't know that ${name} suits a pot.` };
    const deep = crop.pot.depthCm ?? crop.pot.widthCm;
    return { space, score: now ? 2 : 1, reason: `Works in a pot${deep ? ` at least ${deep} cm ${crop.pot.depthCm ? "deep" : "wide"}` : ""}.` };
  }
  if (space.type === "greenhouse") return { space, score: now ? 2 : 1, reason: "Covered and sheltered. A few degrees warmer than outside." };
  // Open ground.
  return { space, score: now ? 2 : 1, reason: [space.ground?.split(" · ")[0] ?? "Open ground", facing?.toLowerCase()].filter(Boolean).join(", ") + (now ? ". Good for it now." : ".") };
}

/** Spaces ranked for a crop: best first, the ones that don't suit last (shown greyed, with the reason). */
export function rankSpaces(crop: Crop, spaces: Space[], md: string, climate: ClimateType | null): Fit[] {
  return spaces.map((s) => fitFor(crop, s, md, climate)).sort((a, b) => b.score - a.score || a.space.sort - b.space.sort);
}

/** Is this crop's starting season open now (anywhere)? */
export function seasonOpen(crop: Crop, md: string, climate: ClimateType | null): boolean {
  const w = climate ? windowsFor(crop, climate) : undefined;
  return !!w && [w.sow, w.sowIndoors, w.plantOut].some((ws) => inWindows(md, ws));
}

// ── Everyday words (02b–02d, 04) ─────────────────────────────────────────────

/** What light a facing gets (northern hemisphere; flipped south of the equator). */
export function facingLight(f: Facing, south = false): string {
  const flip: Record<Facing, Facing> = { N: "S", NE: "SE", E: "E", SE: "NE", S: "N", SW: "NW", W: "W", NW: "SW" };
  const g = south ? flip[f] : f;
  return { N: "Little direct sun", NE: "Early morning sun", E: "Morning sun", SE: "Morning and midday sun", S: "Sun most of the day", SW: "Afternoon and evening sun", W: "Afternoon and evening sun", NW: "Evening sun in summer" }[g];
}

/** Spacing in everyday terms, with the number: "A hand apart · 15 cm". */
export function spacingWords(cm: number): string {
  const w = cm <= 8 ? "Two fingers apart" : cm <= 20 ? "A hand apart" : cm <= 35 ? "A ruler apart" : cm <= 60 ? "An arm's length apart" : "A big stride apart";
  return `${w} · ${cm} cm`;
}

/** Pot depth in everyday terms: "A bucket deep · 25 cm". */
export function potWords(pot: NonNullable<Crop["pot"]>): string {
  const cm = pot.depthCm ?? pot.widthCm ?? 0;
  const w = cm <= 20 ? "A small pot" : cm <= 30 ? "A bucket deep" : cm <= 45 ? "A big tub" : "A barrel";
  return `${w} · ${cm} cm${pot.depthCm ? "" : " wide"}`;
}

export const DIFFICULTY_WORDS = { "very-easy": "Very easy", easy: "Easy", "some-care": "Needs some care" } as const;
export const SUN_NEED_WORDS = { full: "Full sun", "sun-or-part": "Sun or part sun", part: "Part sun" } as const;
