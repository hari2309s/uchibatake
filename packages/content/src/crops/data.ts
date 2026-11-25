import type { Crop, Source, Window } from "./types.ts";

/*
 * Curated crop data. Temperate windows and growing facts come from the RHS
 * "grow your own" pages (UK; maritime climate like Amsterdam's, Köppen Cfb),
 * read November 2026. Month words were turned into dates like this:
 * early = 1st, mid = 15th, late = 21st of the month; "spring" = Mar–May,
 * "summer" = Jun–Aug, "autumn" = Sep–Nov, "winter" = Dec–Feb.
 * Anything without a source is left empty and listed in `unsure`.
 * Companion pairs are traditional gardening lore shown in the designs, not RHS advice.
 */

const w = (from: string, to: string): Window => ({ from, to });
const rhs = (path: string, title: string): Source => ({ title: `RHS: ${title}`, url: `https://www.rhs.org.uk/${path}/grow-your-own` });

const RHS_WINTER: Source = { title: "RHS: Vegetables, growing for winter", url: "https://www.rhs.org.uk/vegetables/growing-for-winter" };
const COMPANIONS = "Companion pairs (goodWith / keepApart) are traditional lore from the designs; not from a horticultural source.";

const NO_SCRAPS = { ok: false, why: "Not from scraps. Try green onions." };

export const CROPS: Crop[] = [
  {
    id: "kale",
    name: "Kale",
    aka: ["boerenkool", "borecole"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 45,
    pot: { depthCm: 30, widthCm: 30 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("03-01", "04-30")],
        sow: [w("03-01", "06-30")],
        plantOut: [w("04-21", "07-15")],
        harvest: [w("09-01", "04-30")],
      },
    },
    care: {
      water: "Water young plants regularly. Once settled, only in long dry spells. Pots need watering more often.",
      feed: "Not usually needed, except in pots or poor soil.",
      pick: "The outer leaves, from the bottom up. It keeps giving through autumn, winter and spring.",
    },
    problems: [
      {
        id: "caterpillars",
        name: "Cabbage white caterpillars",
        signs: "Small green caterpillars on the undersides, with neat round holes.",
        fixes: ["Pick them off by hand. Check under every leaf.", "Cover with fine netting so butterflies can't lay more eggs."],
      },
      { id: "pigeons", name: "Pigeons", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "whitefly", name: "Cabbage whitefly", fixes: [] },
      { id: "aphids", name: "Mealy cabbage aphid", fixes: [] },
      { id: "club-root", name: "Club root", fixes: [] },
    ],
    sources: [rhs("vegetables/kale", "How to grow kale")],
    unsure: ["difficulty", "Bt spray as a third fix for caterpillars (shown in 07b) — not yet checked for the Netherlands"],
  },
  {
    id: "leeks",
    name: "Leeks",
    aka: ["leek", "prei"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 18,
    pot: { widthCm: 40 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("02-01", "02-28")],
        sow: [w("03-01", "06-30")],
        plantOut: [w("04-15", "07-31")],
        harvest: [w("08-21", "04-30")],
      },
    },
    care: {
      water: "Water seedlings until they're settled, then only in long dry spells. Keep water off the leaves.",
      pick: "Lift them as you need them. Late kinds can stay in the ground through winter.",
    },
    problems: [
      { id: "leek-rust", name: "Leek rust", fixes: [] },
      { id: "allium-leaf-miner", name: "Allium leaf miner", fixes: [] },
      { id: "leek-moth", name: "Leek moth", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    sources: [rhs("vegetables/leeks", "How to grow leeks")],
    unsure: ["difficulty", "feeding"],
  },
  {
    id: "garlic",
    name: "Garlic",
    aka: ["knoflook"],
    kind: "vegetable",
    difficulty: "very-easy",
    sun: "full",
    spacingCm: 15,
    pot: { depthCm: 25 },
    start: {
      seed: { ok: true, why: "Plant cloves, not seeds." },
      plant: { ok: false, why: "Garlic starts from cloves." },
      scraps: { ok: false, why: "Start from planting cloves." },
    },
    sowVerb: "Plant",
    windows: {
      temperate: {
        sow: [w("10-15", "12-15")],
        harvest: [w("05-21", "07-15")],
      },
    },
    goodWith: ["strawberries", { name: "carrots" }, { name: "beetroot" }],
    keepApart: ["broad-beans", "garden-pea", "sugar-snap"],
    kidTip: "Push each clove in, pointy end up, a finger deep. Then cover them like they're tucking someone into bed.",
    care: {
      water: "In dry spells in spring and early summer, for bigger bulbs. Stop once the bulbs are big.",
      pick: "When the leaves turn yellow. Hang them somewhere airy to dry.",
    },
    howTo: [
      {
        id: "plant-cloves",
        title: "Plant garlic cloves",
        steps: [
          { heading: "Break the bulb into cloves.", detail: "Keep the biggest for planting. Big clove, big bulb." },
          { heading: "Push each clove in, pointy end up.", detail: "About a finger deep, and a hand apart." },
          { heading: "Cover them with a blanket of leaves.", detail: "It keeps the frost off. Then let winter do the rest." },
        ],
      },
    ],
    problems: [
      { id: "leek-rust", name: "Leek rust", fixes: [] },
      { id: "allium-leaf-miner", name: "Allium leaf miner", fixes: [] },
      { id: "white-rot", name: "Onion white rot", fixes: [] },
    ],
    sources: [rhs("vegetables/garlic", "How to grow garlic")],
    unsure: [COMPANIONS, "The design's month strip shows the Amsterdam harvest in June–July; RHS says late spring to early summer for autumn-planted garlic, so the data says late May to mid-July."],
  },
  {
    id: "broad-beans",
    name: "Broad beans",
    aka: ["fava beans", "tuinbonen"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 20,
    pot: { widthCm: 40 },
    start: { seed: { ok: true, why: "Big seeds, easy to handle." }, plant: { ok: true, why: "From a garden centre, usually in spring." }, scraps: { ok: false, why: "Not for beans. Try green onions or celery." } },
    windows: {
      temperate: {
        sowIndoors: [w("02-01", "02-28")],
        sow: [w("10-15", "11-30"), w("03-01", "05-10")],
        plantOut: [w("03-15", "05-10")],
        harvest: [w("05-21", "08-31")],
      },
    },
    keepApart: ["garlic"],
    kidTip: "Big seeds for small hands.",
    care: {
      water: "Usually not needed in the ground. Give a good soak as the flowers open, and again two weeks later.",
      feed: "In pots: tomato feed every two weeks once flowers appear.",
      pick: "The fat pods from the bottom up, while the beans are still soft.",
    },
    problems: [
      { id: "blackfly", name: "Blackfly", fixes: [] },
      { id: "chocolate-spot", name: "Chocolate spot", fixes: [] },
      { id: "mice", name: "Mice", fixes: [] },
    ],
    sources: [rhs("vegetables/broad-beans", "How to grow broad beans")],
    unsure: [COMPANIONS, "difficulty", "Autumn sowing is for mild areas with hardy varieties (e.g. Aquadulce) — fine for Amsterdam, not for colder places."],
  },
  {
    id: "rhubarb",
    name: "Rhubarb",
    aka: ["rabarber"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 80,
    pot: { depthCm: 50, widthCm: 50 },
    start: { seed: { ok: true, why: "Possible, but slow to get going." }, plant: { ok: true, why: "A crown or young plant is quickest." }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        plantOut: [w("11-01", "03-31")],
        harvest: [w("04-15", "07-01")],
      },
    },
    care: {
      water: "In dry spells in its first year. After that, only in long dry periods.",
      pick: "Pull, don't cut. Nothing in year one, a few stalks in year two, then up to a third at a time. Stop by early July.",
    },
    problems: [
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "frost", name: "Late frosts", fixes: [] },
    ],
    sources: [rhs("vegetables/rhubarb", "How to grow rhubarb")],
    unsure: ["difficulty", "Leaves are poisonous — the app should say so before kids help (wording to check)."],
  },
  {
    id: "lambs-lettuce",
    name: "Lamb's lettuce",
    aka: ["corn salad", "veldsla", "mâche"],
    kind: "vegetable",
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sow: [w("08-01", "10-15")],
        harvest: [w("10-01", "03-15")],
      },
    },
    care: { pick: "Cut and come again, through autumn, and into winter under a cloche." },
    sources: [RHS_WINTER],
    unsure: ["difficulty", "sun", "spacing", "pot size", "spring sowing"],
  },
  {
    id: "spinach",
    name: "Spinach",
    aka: ["spinazie"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 15,
    pot: { depthCm: 30, widthCm: 30 },
    start: { seed: { ok: true, why: "Sow it straight where it will grow." }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sow: [w("04-15", "05-31"), w("08-08", "09-30")],
        plantOut: [w("04-15", "05-31")],
        harvest: [w("05-15", "07-15"), w("09-15", "11-30"), w("03-01", "04-30")],
      },
    },
    care: {
      water: "A thirsty plant. Water in dry weather, early in the morning.",
      pick: "Baby leaves about a month after sowing, bigger leaves at about two months.",
    },
    problems: [
      { id: "bolting", name: "Running to seed", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "downy-mildew", name: "Downy mildew", fixes: [] },
    ],
    sources: [rhs("vegetables/spinach", "How to grow spinach")],
    unsure: ["difficulty"],
  },
  {
    id: "strawberries",
    name: "Strawberries",
    aka: ["strawberry", "aardbeien"],
    kind: "fruit",
    sun: "full",
    spacingCm: 38,
    start: { seed: { ok: false, why: "Only alpine kinds grow from seed. Start from a young plant." }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        plantOut: [w("03-21", "05-04"), w("08-01", "09-30")],
        harvest: [w("06-01", "08-07")],
      },
    },
    goodWith: ["garlic"],
    care: {
      water: "Water new plants while they settle, and pots regularly. Water in the morning, not over the crown.",
      feed: "In pots: a feed every two weeks, tomato feed once flower buds form.",
      pick: "When fully red, on a dry day.",
    },
    problems: [
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "birds", name: "Birds", fixes: [] },
      { id: "grey-mould", name: "Grey mould", fixes: [] },
      { id: "vine-weevil", name: "Vine weevil (in pots)", fixes: [] },
    ],
    sources: [rhs("fruit/strawberries", "How to grow strawberries")],
    unsure: [COMPANIONS, "difficulty", "pot size"],
  },
  {
    id: "green-onions",
    name: "Green onions",
    aka: ["spring onions", "salad onions", "scallions", "lente-ui"],
    kind: "vegetable",
    start: {
      seed: { ok: true },
      plant: { ok: true },
      scraps: { ok: true, why: "Regrow the roots of shop-bought ones in a glass of water." },
    },
    windows: {
      temperate: {
        sow: [w("03-01", "07-31"), w("08-15", "09-30")],
        harvest: [w("06-01", "10-15"), w("03-15", "05-31")],
      },
    },
    care: { pick: "Snip the green tops. They grow back." },
    sources: [{ title: "RHS: How to grow salad onions", url: "https://www.rhs.org.uk/vegetables/salad-onions/grow-your-own" }],
    unsure: ["difficulty (the design calls them very easy)", "sun", "spacing", "regrowing from roots: common practice, no source yet"],
  },
  {
    id: "basil",
    name: "Basil",
    aka: ["basilicum"],
    kind: "herb",
    sun: "full",
    spacingCm: 15,
    pot: { depthCm: 20, widthCm: 20 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("03-01", "07-31")],
        sow: [w("06-01", "06-30")],
        plantOut: [w("06-01", "06-30")],
        harvest: [w("06-15", "09-30")],
      },
    },
    goodWith: ["tomatoes"],
    care: {
      water: "Keep it evenly moist. Water in the morning and keep the leaves dry.",
      feed: "In pots: a balanced liquid feed. Not tomato feed.",
      pick: "The shoot tips, often. It stays bushy.",
    },
    problems: [
      { id: "aphids", name: "Aphids", fixes: [] },
      { id: "grey-mould", name: "Grey mould", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    sources: [rhs("herbs/basil", "How to grow basil")],
    unsure: [COMPANIONS, "difficulty", "Cold glass / nights under 10° (M11 copy): RHS says sow outdoors only once nights stay above 10°C — consistent, but indoor cold damage wording is unchecked."],
  },
  {
    id: "parsley",
    name: "Parsley",
    aka: ["peterselie"],
    kind: "herb",
    sun: "sun-or-part",
    spacingCm: 22,
    pot: { depthCm: 25, widthCm: 25 },
    start: { seed: { ok: true, why: "Slow to sprout: up to six weeks." }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("03-01", "04-14")],
        sow: [w("04-15", "08-31")],
        plantOut: [w("04-15", "06-30")],
        harvest: [w("05-21", "10-31")],
      },
    },
    care: {
      water: "Keep it moist, not soggy. Pots need checking often.",
      feed: "In pots: a liquid feed every few weeks while it grows.",
      pick: "A few outer stems at a time.",
    },
    problems: [
      { id: "aphids", name: "Aphids", fixes: [] },
      { id: "carrot-fly", name: "Carrot fly", fixes: [] },
      { id: "slugs", name: "Slugs and snails", fixes: [] },
    ],
    sources: [rhs("herbs/parsley", "How to grow parsley")],
    unsure: ["difficulty"],
  },
  {
    id: "coriander",
    name: "Coriander",
    aka: ["cilantro", "koriander", "dhania"],
    kind: "herb",
    sun: "sun-or-part",
    spacingCm: 5,
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("02-01", "03-31")],
        sow: [w("04-01", "09-30")],
        harvest: [w("07-01", "09-30")],
      },
    },
    care: {
      water: "In the ground, only in long dry spells (it helps stop it running to seed). In pots, keep just moist.",
      pick: "Cut and come again from about 10 cm tall. Let some go to seed to save.",
    },
    problems: [
      { id: "bolting", name: "Running to seed", fixes: [] },
      { id: "aphids", name: "Aphids", fixes: [] },
    ],
    sources: [rhs("herbs/coriander", "How to grow coriander")],
    unsure: ["difficulty", "pot size"],
  },
  {
    id: "garden-pea",
    name: "Garden pea",
    aka: ["peas", "pea", "doperwten"],
    kind: "vegetable",
    difficulty: "easy",
    sun: "full",
    spacingCm: 8,
    pot: { widthCm: 45 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("02-01", "03-31")],
        sow: [w("03-01", "06-30")],
        plantOut: [w("03-15", "05-31")],
        harvest: [w("06-01", "10-15")],
      },
    },
    keepApart: ["garlic"],
    care: {
      water: "Little once settled. Water as flowering starts and again two weeks later.",
      feed: "In pots: tomato feed every two weeks from the first flowers.",
      pick: "Often, so it keeps flowering.",
    },
    problems: [
      { id: "pigeons", name: "Pigeons", fixes: [] },
      { id: "mice", name: "Mice", fixes: [] },
      { id: "pea-moth", name: "Pea moth", fixes: [] },
      { id: "powdery-mildew", name: "Powdery mildew", fixes: [] },
    ],
    sources: [rhs("vegetables/peas", "How to grow peas")],
    unsure: [COMPANIONS],
  },
  {
    id: "sugar-snap",
    name: "Sugar snap",
    aka: ["mangetout", "snap peas", "peultjes"],
    kind: "vegetable",
    difficulty: "easy",
    sun: "full",
    spacingCm: 8,
    pot: { widthCm: 45 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("02-01", "03-31")],
        sow: [w("03-01", "06-30")],
        plantOut: [w("03-15", "05-31")],
        harvest: [w("06-01", "10-15")],
      },
    },
    keepApart: ["garlic"],
    care: { pick: "Mangetout when the pods are about 7 cm long." },
    sources: [rhs("vegetables/peas", "How to grow peas (incl. mangetout)")],
    unsure: [COMPANIONS, "Sugar snaps follow the RHS peas page; it covers mangetout, not sugar snaps by name."],
  },
  {
    id: "pea-shoots",
    name: "Pea shoots",
    aka: ["pea tips", "dou miao"],
    kind: "vegetable",
    difficulty: "very-easy",
    start: { seed: { ok: true }, plant: { ok: false, why: "Grown from dried peas, in a tray." }, scraps: NO_SCRAPS },
    windows: {
      temperate: { sowIndoors: [w("01-01", "12-31")], harvest: [w("01-01", "12-31")] },
    },
    care: { pick: "Snip them three to four weeks after sowing." },
    sources: [rhs("vegetables/peas", "How to grow peas (pea shoots)")],
    unsure: ["sun"],
  },
  {
    id: "mizuna",
    name: "Mizuna",
    aka: ["japanese mustard greens"],
    kind: "vegetable",
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: { sow: [w("03-15", "05-31"), w("08-01", "09-30")] },
    },
    care: { pick: "Snip with scissors and it grows back." },
    sources: [{ title: "RHS: How to grow mizuna and mibuna", url: "https://www.rhs.org.uk/vegetables/mizuna-mibuna/grow-your-own" }],
    unsure: ["difficulty", "sun", "spacing", "harvest window (RHS: almost all year with repeat sowings; winter needs cover)", "\"4 weeks\" to first cut (06 Add plant copy)"],
  },
  {
    id: "winter-purslane",
    name: "Winter purslane",
    aka: ["miner's lettuce", "claytonia", "winterpostelein"],
    kind: "vegetable",
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: { sow: [w("08-01", "10-15")], harvest: [w("10-01", "03-31")] },
    },
    care: { pick: "Cut and come again through autumn, and winter under a cloche." },
    sources: [RHS_WINTER],
    unsure: ["difficulty", "sun", "spacing"],
  },
  {
    id: "tomatoes",
    name: "Tomatoes",
    aka: ["tomato", "cherry tomatoes", "tomaten"],
    kind: "vegetable",
    sun: "full",
    spacingCm: 52,
    pot: { depthCm: 30, widthCm: 30 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("02-21", "04-10")],
        plantOut: [w("05-21", "06-30")],
        harvest: [w("07-15", "10-15")],
      },
    },
    goodWith: ["basil"],
    care: {
      water: "Steady, regular water. Pots may need it every day when it's hot.",
      feed: "Tomato feed every 10 to 14 days once the first fruits swell.",
      pick: "Each one when it's fully coloured.",
    },
    problems: [
      { id: "blight", name: "Tomato blight", fixes: [] },
      { id: "splitting", name: "Split fruit", fixes: [] },
      { id: "whitefly", name: "Whitefly", fixes: [] },
    ],
    sources: [rhs("vegetables/tomatoes", "How to grow tomatoes")],
    unsure: [COMPANIONS, "difficulty"],
  },
  {
    id: "lettuce",
    name: "Lettuce",
    aka: ["little gem", "butter lettuce", "winter lettuce", "sla"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 22,
    pot: { depthCm: 30, widthCm: 30 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: {
        sowIndoors: [w("02-01", "02-28"), w("09-01", "10-31")],
        sow: [w("03-21", "08-07")],
        plantOut: [w("03-01", "05-31")],
        harvest: [w("05-15", "12-31")],
      },
    },
    care: {
      water: "Keep the soil moist. Pots may need water every day in summer.",
      pick: "Loose-leaf from about 10 cm. Whole heads when firm.",
    },
    problems: [
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "aphids", name: "Aphids", fixes: [] },
      { id: "bolting", name: "Running to seed", fixes: [] },
    ],
    sources: [rhs("vegetables/lettuce", "How to grow lettuce")],
    unsure: ["difficulty"],
  },
  {
    id: "chard",
    name: "Chard",
    aka: ["swiss chard", "snijbiet"],
    kind: "vegetable",
    sun: "sun-or-part",
    spacingCm: 30,
    pot: { depthCm: 40, widthCm: 40 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: { sowIndoors: [w("03-01", "04-14")], sow: [w("04-01", "07-31")] },
    },
    care: { water: "Water young plants until settled; older ones only in long dry spells.", pick: "Outer leaves for months." },
    problems: [
      { id: "slugs", name: "Slugs and snails", fixes: [] },
      { id: "leaf-miner", name: "Beet leaf miner", fixes: [] },
    ],
    sources: [rhs("vegetables/chard", "How to grow chard")],
    unsure: ["difficulty", "harvest window (RHS gives it on a month grid only)"],
  },
  {
    id: "radish",
    name: "Radish",
    aka: ["radishes", "radijs"],
    kind: "vegetable",
    start: { seed: { ok: true }, plant: { ok: false, why: "Sow radishes straight where they grow." }, scraps: NO_SCRAPS },
    windows: {
      temperate: { sow: [w("03-15", "05-31"), w("08-01", "09-15")], harvest: [w("04-15", "06-30"), w("09-01", "10-15")] },
    },
    care: { pick: "About four weeks after sowing, while they're small." },
    sources: [{ title: "RHS: How to grow radishes", url: "https://www.rhs.org.uk/vegetables/radishes/grow-your-own" }],
    unsure: ["difficulty", "sun", "spacing"],
  },
  {
    id: "chives",
    name: "Chives",
    aka: ["bieslook"],
    kind: "herb",
    sun: "sun-or-part",
    spacingCm: 18,
    pot: { depthCm: 20, widthCm: 20 },
    start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
    windows: {
      temperate: { sowIndoors: [w("03-01", "04-14")], sow: [w("03-21", "05-31")], harvest: [w("05-01", "10-31")] },
    },
    care: { pick: "Snip from late spring until the leaves die back in autumn." },
    problems: [{ id: "aphids", name: "Aphids", fixes: [] }],
    sources: [rhs("herbs/chives", "How to grow chives")],
    unsure: ["difficulty"],
  },
  {
    id: "mint",
    name: "Mint",
    aka: ["munt", "pudina"],
    kind: "herb",
    sun: "sun-or-part",
    start: { seed: { ok: true, why: "Possible, but a young plant is easier." }, plant: { ok: true }, scraps: { ok: true, why: "A cutting roots in a glass of water." } },
    windows: {
      temperate: { plantOut: [w("03-01", "05-31"), w("09-01", "10-31")], harvest: [w("05-01", "10-31")] },
    },
    care: {
      water: "Keep pots evenly moist, especially in hot weather.",
      pick: "Young shoot tips, often.",
    },
    problems: [
      { id: "mint-rust", name: "Mint rust", fixes: [] },
      { id: "aphids", name: "Aphids", fixes: [] },
    ],
    sources: [rhs("herbs/mint", "How to grow mint")],
    unsure: ["difficulty", "spacing", "rooting cuttings in water: RHS mentions cuttings; water-rooting not stated"],
  },
  // Named in the Amsterdam screens ("Next year, let's try…") but not sourced yet:
  // listed so search and the journal can name them, with no growing facts.
  ...(
    [
      ["shiso", "Shiso", ["perilla"], "herb"],
      ["methi", "Methi", ["fenugreek"], "herb"],
    ] as const
  ).map(
    ([id, name, aka, kind]): Crop => ({
      id,
      name,
      aka: [...aka],
      kind,
      start: { seed: { ok: true }, plant: { ok: true }, scraps: NO_SCRAPS },
      windows: {},
      sources: [],
      unsure: ["everything: no source checked yet"],
    })
  ),
];
