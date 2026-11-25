import type { SeasonTable } from "./types.ts";

/**
 * Amsterdam: eight seasons, each nine microseasons long, starting at 立春.
 * Names and poems from the Washi & Sumi design (Fix Pass LOCAL8), with
 * "Summer" renamed "High summer · long light evenings" to match S06, and Late
 * spring's half rewritten ("tender plants go out") — both agreed with the owner.
 * The frost arc and the 24 "Here" lines are from Revised (08 Growing year).
 */
export const AMSTERDAM: SeasonTable = {
  id: "amsterdam",
  place: "Amsterdam",
  climate: "temperate",
  hemisphere: 1,
  seasons: [
    { id: "late-winter", name: "Late winter", poem: "snowdrops and frost", start: "02-04" },
    { id: "spring", name: "Spring", poem: "blossom and late frosts", start: "03-21" },
    { id: "late-spring", name: "Late spring", poem: "tender plants go out", start: "05-05" },
    { id: "high-summer", name: "High summer", poem: "long light evenings", start: "06-21" },
    { id: "late-summer", name: "Late summer", poem: "heavy harvests", start: "08-08" },
    { id: "autumn", name: "Autumn", poem: "storms from the sea", start: "09-23" },
    { id: "late-autumn", name: "Late autumn", poem: "first frosts", start: "11-07", about: "First frosts are due and the plane trees are nearly bare." },
    { id: "deep-winter", name: "Deep winter", poem: "still, cold air", start: "12-22" },
  ],
  frost: { from: 54, to: 16 },
  termNotes: [
    "Still winter here. Snowdrops in the parks, frost most nights.",
    "Wet and raw. Crocuses open on sunny days.",
    "Early spring. The light returns, but frost still visits.",
    "Spring proper. Blossom along the canals, cold nights.",
    "Tulip time. The last frosts are usually gone by mid-April.",
    "Mild days, chilly nights. Most seeds can go outside.",
    "Late spring. After mid-May, tender plants can go out.",
    "Long light evenings. Everything grows fast.",
    "Early summer. Strawberries and broad beans come in.",
    "Light until after ten. Water in the evenings.",
    "High summer, sometimes a heatwave. Lift the garlic.",
    "Warm and showery. Basil by the handful.",
    "Late summer. Thunder showers and heavy harvests.",
    "Summer fading. Sow the winter salads now.",
    "Early autumn. Mornings turn misty.",
    "Autumn. Storms start blowing in from the sea.",
    "Mid-autumn. The leaves turn. Plant garlic.",
    "Late autumn. The clocks go back; light frosts are possible.",
    "Late autumn. First frosts usually arrive in the coming weeks.",
    "Late autumn. First frosts, short grey days, plane trees almost bare.",
    "Early winter. Damp cold and the shortest days.",
    "Midwinter. The light starts coming back.",
    "Deep winter. Frost and the odd snowfall.",
    "The coldest weeks. Seed catalogues by the radiator.",
  ],
};

export const SEASON_TABLES: Record<string, SeasonTable> = { amsterdam: AMSTERDAM };
