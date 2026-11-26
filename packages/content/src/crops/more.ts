import type { Crop, Region, Source, Window } from "./types.ts";
import type { Timing } from "./timing.ts";

/*
 * Timing for places outside the mild maritime climate, where each crop is
 * commonly grown, and crops added in November 2026.
 *
 * - Frost-relative weeks: UNH Extension, "Growing Vegetables: When to Plant
 *   Your Vegetable Garden" (read Nov 2026). A single figure ("4 wks before
 *   last frost") is used as the start of a two-week window.
 * - Asian greens (komatsuna, mizuna, pak choi, napa cabbage): Johnny's
 *   Selected Seeds, "Asian Greens – Key Growing Information": sow from early
 *   spring through midsummer, into late fall in mild climates. Shiso: Johnny's
 *   "Shiso – Key Growing Information": sow after the last frost; thin to 6–12".
 * - Lettuce and coriander heat: Johnny's Key Growing Information pages.
 * - New crops' UK dates, spacing, pots, care and problems: the RHS "How to
 *   grow" pages (read Nov 2026), month words turned into dates as in data.ts.
 * Nothing here is model output; blanks are left blank.
 */

const w = (from: string, to: string): Window => ({ from, to });
const rhs = (path: string, title: string): Source => ({ title: `RHS: ${title}`, url: `https://www.rhs.org.uk/vegetables/${path}/grow-your-own` });
export const UNH: Source = { title: "UNH Extension: When to plant your vegetable garden", url: "https://extension.unh.edu/resource/growing-vegetables-when-plant-your-vegetable-garden-fact-sheet" };
const JOHNNYS_ASIAN: Source = { title: "Johnny's Selected Seeds: Asian greens, key growing information", url: "https://www.johnnyseeds.com/growers-library/vegetables/greens/asian-greens-key-growing-information.html" };
const JOHNNYS_SHISO: Source = { title: "Johnny's Selected Seeds: Shiso, key growing information", url: "https://www.johnnyseeds.com/growers-library/herbs/shiso-key-growing-information.html" };
const JOHNNYS_LETTUCE: Source = { title: "Johnny's Selected Seeds: Lettuce, key growing information", url: "https://www.johnnyseeds.com/growers-library/vegetables/lettuce/lettuce-key-growing-information.html" };
const JOHNNYS_CILANTRO: Source = { title: "Johnny's Selected Seeds: Cilantro, key growing information", url: "https://www.johnnyseeds.com/growers-library/herbs/cilantro-coriander/cilantro-coriander-key-growing-information.html" };
export const TEMPERATURE_RULES: Source = { title: "Purdue Vegetable Crops Hotline: Setting your transplants up for success", url: "https://vegcropshotline.org/?p=13666" };

const ALL: Region[] = ["eu", "us", "jp", "kr"];

/** Timing, regions and extra sources for the crops in data.ts. */
export const EXTRA: Record<string, { timing?: Timing; popularIn: Region[]; sources?: Source[]; aka?: string[] }> = {
  kale: { timing: { season: "cool", indoorWeeks: [4, 6], plantOut: [-4, -2] }, popularIn: ["eu", "us"], sources: [UNH] },
  leeks: { timing: { season: "cool", indoorWeeks: [8, 10], plantOut: [-4, -2] }, popularIn: ["eu"], sources: [UNH] },
  garlic: { popularIn: ALL },
  "broad-beans": { popularIn: ["eu"] },
  rhubarb: { popularIn: ["eu", "us"] },
  "lambs-lettuce": { popularIn: ["eu"] },
  spinach: { timing: { season: "cool", indoorWeeks: [4, 6], plantOut: [-6, -3], autumn: true }, popularIn: ALL, sources: [UNH], aka: ["horenso", "sigeumchi"] },
  strawberries: { popularIn: ALL },
  "green-onions": { timing: { season: "cool", indoorWeeks: [8, 10], plantOut: [-4, -2] }, popularIn: ALL, sources: [UNH], aka: ["negi", "pa", "bunching onion"] },
  basil: { timing: { season: "warm", indoorWeeks: [6, 8], plantOut: [2, 4], succession: true }, popularIn: ["eu", "us"], sources: [UNH] },
  parsley: { timing: { season: "cool", indoorWeeks: [9, 10], plantOut: [-3, -2] }, popularIn: ["eu", "us"], sources: [UNH] },
  coriander: { timing: { season: "cool", whenever: true }, popularIn: ["us", "eu"], sources: [JOHNNYS_CILANTRO] },
  "garden-pea": { timing: { season: "cool", sowWarmC: 1 }, popularIn: ["eu", "us"], sources: [UNH] },
  "sugar-snap": { timing: { season: "cool", sowWarmC: 1 }, popularIn: ["us", "jp", "eu"], sources: [UNH] },
  "pea-shoots": { popularIn: ["eu", "us"] },
  mizuna: { timing: { season: "cool", whenever: true }, popularIn: ["jp", "eu"], sources: [JOHNNYS_ASIAN] },
  "winter-purslane": { popularIn: ["eu"] },
  tomatoes: { timing: { season: "warm", indoorWeeks: [6, 8], plantOut: [1, 2] }, popularIn: ALL, sources: [UNH] },
  lettuce: { timing: { season: "cool", indoorWeeks: [4, 5], plantOut: [-4, -3], succession: true, autumn: true }, popularIn: ALL, sources: [UNH, JOHNNYS_LETTUCE], aka: ["sangchu", "ssam"] },
  chard: { timing: { season: "cool", indoorWeeks: [4, 6], plantOut: [-2, -1], sow: [-4, -2] }, popularIn: ["eu", "us"], sources: [UNH] },
  radish: { timing: { season: "cool", sow: [-4, -2], autumn: true }, popularIn: ["eu", "us"], sources: [UNH] },
  chives: { popularIn: ["eu", "us"] },
  mint: { popularIn: ["eu", "us"] },
};

const NO_SCRAPS = { ok: false, why: "Not from scraps." };

export const MORE_CROPS: Crop[] = [
  {
    id: "courgette",
    name: "Courgette",
    aka: ["zucchini", "summer squash", "hobak", "aehobak"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 90,
    pot: { widthCm: 45 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("04-01", "05-14")], sow: [w("05-21", "06-14")], plantOut: [w("06-01", "06-30")] } },
    timing: { season: "warm", indoorWeeks: [3, 4], plantOut: [2, 4], sow: [2, 4], sowWarmC: 21 },
    care: {
      water: "Water around the base, not the leaves. Keep the soil moist; pots may need water every day when it's hot.",
      feed: "In pots, a high-potash liquid feed every 10–14 days once the fruits swell. In the ground, rarely needed.",
      pick: "Small, at 10–12 cm long. Pick often and it keeps going.",
    },
    problems: [
      { id: "powdery-mildew", name: "Powdery mildew", fixes: [] },
      { id: "downy-mildew", name: "Downy mildew", fixes: [] },
      { id: "grey-mould", name: "Grey mould", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    popularIn: ["eu", "us", "kr"],
    sources: [rhs("courgettes", "How to grow courgettes"), UNH, TEMPERATURE_RULES],
    unsure: ["harvest months (the RHS page doesn't give them)", "days to a first picking"],
  },
  {
    id: "french-beans",
    name: "Dwarf French beans",
    aka: ["green beans", "bush beans", "string beans", "ingen"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 15,
    pot: { widthCm: 30 },
    daysToFirstPick: 56, // RHS: dwarf kinds crop in eight to ten weeks
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("04-21", "05-31")], sow: [w("05-21", "06-14")], plantOut: [w("05-21", "06-14")], harvest: [w("07-15", "09-14")] } },
    timing: { season: "warm", sow: [0, 2], succession: true },
    care: {
      water: "In dry weather, especially once they flower.",
      feed: "In pots, a high-potash feed (like tomato feed) every two weeks once flowers appear.",
      pick: "Pods at 15–20 cm, while they still snap. Pick often.",
    },
    kidTip: "The seeds are big enough for small hands to push in, one finger deep.",
    problems: [
      { id: "bean-seed-fly", name: "Bean seed fly", fixes: [] },
      { id: "blackfly", name: "Blackfly", fixes: [] },
      { id: "bean-rust", name: "Bean rust", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    popularIn: ["eu", "us", "jp"],
    sources: [rhs("french-beans", "How to grow French beans"), UNH],
  },
  {
    id: "cucumbers",
    name: "Cucumbers",
    aka: ["cucumber", "kyuri", "oi"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 30,
    pot: { depthCm: 30, widthCm: 30 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("04-21", "05-14")], sow: [w("05-21", "06-14")], plantOut: [w("06-01", "06-30")] } },
    timing: { season: "warm", indoorWeeks: [3, 4], plantOut: [1, 2], sowWarmC: 21 },
    care: {
      water: "Keep evenly moist, watering at the base.",
      feed: "In pots, a liquid feed every 10–14 days, then a high-potash one once they flower.",
      pick: "Cut, don't pull. Small kinds at about 15 cm, full-size at 20–25 cm.",
    },
    problems: [
      { id: "mosaic-virus", name: "Cucumber mosaic virus", fixes: [] },
      { id: "red-spider-mite", name: "Red spider mite", fixes: [] },
      { id: "whitefly", name: "Whitefly", fixes: [] },
      { id: "powdery-mildew", name: "Powdery mildew", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    popularIn: ALL,
    sources: [rhs("cucumbers", "How to grow cucumbers"), UNH, TEMPERATURE_RULES],
    unsure: ["outdoor harvest months (the RHS page gives greenhouse ones)", "days to a first picking"],
  },
  {
    id: "beetroot",
    name: "Beetroot",
    aka: ["beets", "beet"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 10,
    pot: { widthCm: 40 },
    daysToFirstPick: 40, // RHS: ready in as little as 40 days (usually 50–60)
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sow: [w("03-21", "07-31")], harvest: [w("06-01", "10-15")] } },
    timing: { season: "cool", sowWarmC: 7 },
    care: {
      water: "Water seedlings regularly; in dry spells, a good soak every 10–14 days. Uneven watering makes them split.",
      pick: "Lift every other one at golf-ball size; let the rest grow to cricket-ball size.",
    },
    kidTip: "Pull one up and see the colour: it stains fingers pink.",
    problems: [
      { id: "bolting", name: "Running to flower (bolting)", fixes: [] },
      { id: "leaf-miner", name: "Beet leaf miner", fixes: [] },
      { id: "downy-mildew", name: "Downy mildew", fixes: [] },
    ],
    popularIn: ["eu", "us"],
    sources: [rhs("beetroot", "How to grow beetroot"), UNH],
  },
  {
    id: "carrots",
    name: "Carrots",
    aka: ["carrot", "ninjin", "danggeun"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 6,
    pot: { depthCm: 25 },
    daysToFirstPick: 84, // RHS: about 12–16 weeks after sowing
    start: { seed: { ok: true }, plant: { ok: false, why: "Carrots are sown where they grow; they don't like being moved." }, scraps: NO_SCRAPS },
    windows: { temperate: { sow: [w("04-01", "07-07")] } },
    // No timing elsewhere: UNH's "soil warms to 60 °F" would mean June sowings in a cold-winter place,
    // which doesn't match common practice, and we have no better source yet. Say less.
    care: {
      water: "They cope with dry weather; in a long dry spell, a soak every two weeks. Pots need more.",
      pick: "Lift a few at a time as you need them.",
    },
    kidTip: "Round, short kinds grow well in a pot and are easy to pull.",
    problems: [
      { id: "carrot-fly", name: "Carrot fly", fixes: ["Cover with fine insect mesh from sowing."] },
      { id: "splitting", name: "Split roots", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "wireworms", name: "Wireworms", fixes: [] },
    ],
    popularIn: ALL,
    sources: [rhs("carrots", "How to grow carrots"), UNH],
    unsure: ["pot size (the RHS says 'deep containers' for long kinds; 25 cm depth is our minimum for short kinds, to check)", "dates outside mild maritime climates (needs a better source than UNH's soil figure)"],
  },
  {
    id: "potatoes",
    name: "Potatoes",
    aka: ["potato", "jagaimo", "gamja"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 30,
    pot: { depthCm: 30, widthCm: 30 },
    daysToFirstPick: 84, // RHS: early kinds in as little as 12 weeks
    sowVerb: "Plant",
    start: { seed: { ok: false, why: "From seed potatoes (small potatoes), not seed." }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { plantOut: [w("03-21", "05-07")], harvest: [w("06-01", "10-31")] } },
    timing: { season: "cool", plantOut: [-2, -1] },
    care: {
      water: "In dry weather; pots and bags need regular watering.",
      feed: "In pots, an organic general or liquid feed about six weeks after planting.",
      pick: "Earlies when the flowers open. Throw away any green potatoes.",
    },
    kidTip: "Tipping out a bag of potatoes is the best treasure hunt of the summer.",
    problems: [
      { id: "blight", name: "Potato blight", fixes: [] },
      { id: "scab", name: "Potato scab", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "wireworms", name: "Wireworms", fixes: [] },
    ],
    popularIn: ALL,
    sources: [rhs("potatoes", "How to grow potatoes"), UNH],
  },
  {
    id: "aubergines",
    name: "Aubergines",
    aka: ["eggplant", "aubergine", "nasu", "gaji"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 60,
    pot: { widthCm: 30 },
    daysToFirstPick: 150, // RHS: at least five months from sowing to harvesting
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("03-01", "03-31")], plantOut: [w("05-21", "06-14")] } },
    timing: { season: "warm", indoorWeeks: [8, 10], plantOut: [2, 3] },
    care: {
      water: "Steadily moist; pots may need water every day when it's hot.",
      feed: "In pots, an organic high-potash feed every two weeks once flowers appear.",
      pick: "Glossy fruit, often. Over-ripe ones turn bitter.",
    },
    problems: [
      { id: "aphids", name: "Aphids", fixes: [] },
      { id: "red-spider-mite", name: "Red spider mite", fixes: [] },
      { id: "whitefly", name: "Whitefly", fixes: [] },
    ],
    popularIn: ["jp", "kr", "eu", "us"],
    sources: [rhs("aubergines", "How to grow aubergines"), UNH, TEMPERATURE_RULES],
    unsure: ["outdoor harvest end (the RHS says 'from August onwards')"],
  },
  {
    id: "pumpkins",
    name: "Pumpkins and squash",
    aka: ["pumpkin", "squash", "winter squash", "kabocha"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 90,
    pot: { widthCm: 45 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("04-15", "04-30")], sow: [w("05-21", "06-14")], plantOut: [w("05-21", "06-14")], harvest: [w("09-01", "11-30")] } },
    timing: { season: "warm", indoorWeeks: [3, 4], plantOut: [2, 4], sowWarmC: 21 },
    care: {
      water: "Plenty. Sink a small pot beside each plant and water into it.",
      feed: "Most need none; in pots, a high-potash feed every 10–14 days once fruit swells.",
      pick: "Before the first frost, with at least 10 cm of stem. Leave them in the sun for a week to harden.",
    },
    kidTip: "Scratch a name into a small pumpkin's skin: it grows with the pumpkin.",
    problems: [
      { id: "powdery-mildew", name: "Powdery mildew", fixes: [] },
      { id: "grey-mould", name: "Grey mould", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    popularIn: ["us", "jp", "eu"],
    sources: [rhs("pumpkins", "How to grow pumpkins"), UNH, TEMPERATURE_RULES],
    unsure: ["days to a first picking"],
  },
  {
    id: "peppers",
    name: "Peppers",
    aka: ["sweet pepper", "bell pepper", "capsicum", "piman", "shishito", "paprika"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 40,
    pot: { widthCm: 30 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("03-21", "04-07")], plantOut: [w("05-21", "06-30")], harvest: [w("08-01", "09-30")] } },
    timing: { season: "warm", indoorWeeks: [8, 10], plantOut: [2, 4] },
    care: {
      water: "A steady supply; keep the compost evenly moist or the flower buds drop.",
      feed: "In pots, an organic high-potash feed every week once it flowers.",
      pick: "When swollen and glossy. Picking often brings more.",
    },
    problems: [
      { id: "blossom-end-rot", name: "Blossom end rot", fixes: [] },
      { id: "aphids", name: "Aphids", fixes: [] },
      { id: "grey-mould", name: "Grey mould", fixes: [] },
      { id: "red-spider-mite", name: "Red spider mite", fixes: [] },
      { id: "whitefly", name: "Whitefly", fixes: [] },
    ],
    popularIn: ALL,
    sources: [rhs("peppers", "How to grow sweet peppers"), UNH, TEMPERATURE_RULES],
    unsure: ["care is from the RHS sweet-pepper page; chillies (gochu, jalapeño) are close relatives but not covered there", "days to a first picking"],
  },
  {
    id: "pak-choi",
    name: "Pak choi",
    aka: ["bok choy", "pak choy", "chingensai", "cheonggyeongchae"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 20,
    pot: { widthCm: 30 },
    daysToFirstPick: 30, // RHS: baby leaves in as little as 30 days
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("03-01", "05-31")], sow: [w("05-21", "08-31")], harvest: [w("06-01", "11-30")] } },
    timing: { season: "cool", whenever: true },
    care: {
      water: "Keep it watered, especially when young; water in the morning.",
      pick: "Baby leaves from about a month; whole heads in 45–75 days. Pull any flower stems.",
    },
    problems: [
      { id: "bolting", name: "Running to flower (bolting)", fixes: [] },
      { id: "flea-beetles", name: "Flea beetles", fixes: ["Cover with fleece or fine mesh from the day you sow."] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "caterpillars", name: "Cabbage caterpillars", fixes: [] },
    ],
    popularIn: ["jp", "kr", "us", "eu"],
    sources: [{ title: "RHS: How to grow pak choi", url: "https://www.rhs.org.uk/vegetables/pak-choi/grow-your-own" }, JOHNNYS_ASIAN, TEMPERATURE_RULES],
  },
  {
    id: "napa-cabbage",
    name: "Napa cabbage",
    aka: ["chinese cabbage", "hakusai", "baechu", "kimchi cabbage"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 30,
    pot: { depthCm: 30, widthCm: 30 },
    daysToFirstPick: 42, // RHS: salad leaves in as little as six weeks
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: { temperate: { sowIndoors: [w("04-15", "06-30")], sow: [w("05-01", "08-31")], harvest: [w("07-01", "11-30")] } },
    timing: { season: "cool", whenever: true },
    care: {
      water: "Water seedlings regularly, in the morning; mulch with compost.",
      pick: "Cut the head below the lowest leaves. Late-summer sowings do best.",
    },
    problems: [
      { id: "bolting", name: "Running to flower (bolting)", fixes: [] },
      { id: "club-root", name: "Club root", fixes: [] },
      { id: "caterpillars", name: "Cabbage caterpillars", fixes: [] },
      { id: "flea-beetles", name: "Flea beetles", fixes: ["Cover with fleece or fine mesh from the day you sow."] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    popularIn: ["kr", "jp", "us"],
    sources: [{ title: "RHS: How to grow Chinese cabbage", url: "https://www.rhs.org.uk/vegetables/chinese-cabbage/grow-your-own" }, JOHNNYS_ASIAN, TEMPERATURE_RULES],
  },
  {
    id: "komatsuna",
    name: "Komatsuna",
    aka: ["japanese mustard spinach"],
    kind: "vegetable",
    sun: "sun-or-part",
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {},
    timing: { season: "cool", whenever: true },
    problems: [{ id: "flea-beetles", name: "Flea beetles", fixes: ["Cover with fleece or fine mesh from the day you sow."] }],
    popularIn: ["jp"],
    sources: [JOHNNYS_ASIAN, TEMPERATURE_RULES],
    unsure: ["spacing, pot size, days to a first picking, care (Johnny's gives seeding rates for farms only)"],
  },
  {
    id: "shiso",
    name: "Shiso",
    aka: ["perilla", "kkaennip", "egoma", "beefsteak plant"],
    kind: "herb",
    sun: "sun-or-part",
    spacingCm: 23, // Johnny's: thin to 6–12" apart
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {},
    timing: { season: "warm", sow: [0, 2] },
    care: { pick: "Pick leaves once the plants are settled." },
    popularIn: ["jp", "kr"],
    sources: [JOHNNYS_SHISO, TEMPERATURE_RULES],
    unsure: ["pot size, days to a first picking, problems; seed can be slow (7–21 days) and comes up better after cold"],
  },
];
