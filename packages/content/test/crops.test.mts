import { assert, test } from "./t.mts";
import { clashes, CROPS, cropById, inWindows, neighbours, searchCrops, windowMicroseasons, windowMonths, windowsFor } from "../src/crops/index.ts";

const MD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

test("crop ids are unique", () => {
  assert.equal(new Set(CROPS.map((c) => c.id)).size, CROPS.length);
});

test("every neighbour id names a crop in the catalogue", () => {
  for (const c of CROPS)
    for (const n of [...(c.goodWith ?? []), ...(c.keepApart ?? [])]) if (typeof n === "string") assert.ok(cropById(n), `${c.id} → ${n}`);
});

test("window dates are real MM-DD", () => {
  for (const c of CROPS)
    for (const cw of Object.values(c.windows))
      for (const ws of Object.values(cw ?? {})) for (const win of ws ?? []) assert.ok(MD.test(win.from) && MD.test(win.to), `${c.id}: ${win.from}–${win.to}`);
});

test("no source, no facts: unsourced crops carry no growing data", () => {
  for (const c of CROPS) {
    if (c.sources.length) continue;
    assert.deepEqual(c.windows, {}, `${c.id} has windows without a source`);
    for (const f of ["difficulty", "sun", "spacingCm", "pot", "care", "howTo", "problems", "kidTip"] as const) assert.equal(c[f], undefined, `${c.id}.${f} without a source`);
    assert.ok(c.unsure?.length, `${c.id} should say what's missing`);
  }
});

test("fixes are gentlest first only where they exist; problems have names", () => {
  for (const c of CROPS) for (const p of c.problems ?? []) assert.ok(p.name.length > 2, `${c.id}.${p.id}`);
});

test("garlic and broad beans don't get on (the 03b companion ひとこと)", () => {
  assert.ok(clashes("garlic", "broad-beans"));
  assert.ok(clashes("broad-beans", "garlic"));
  assert.ok(!clashes("garlic", "strawberries"));
  assert.deepEqual(neighbours(cropById("garlic")!).good, ["Strawberries", "carrots", "beetroot"]);
});

test("garlic's month strip: plant Oct–Dec, harvest May–Jul", () => {
  const g = windowsFor(cropById("garlic")!, "temperate")!;
  assert.deepEqual(windowMonths(g.sow), [9, 10, 11]);
  assert.deepEqual(windowMonths(g.harvest), [4, 5, 6]);
  assert.ok(inWindows("11-23", g.sow), "garlic can go in on 23 November");
  assert.ok(!inWindows("12-20", g.sow), "but not after mid-December");
});

test("windows across the year end", () => {
  const kale = windowsFor(cropById("kale")!, "temperate")!;
  assert.deepEqual(windowMonths(kale.harvest), [0, 1, 2, 3, 8, 9, 10, 11]);
  assert.ok(inWindows("01-10", kale.harvest));
  const ms = windowMicroseasons(kale.harvest);
  assert.ok(ms.includes(0) && ms.includes(71) && !ms.includes(30), "harvest dots wrap the ring");
});

test("southern temperate places get the dates half a year on; other climates say less", () => {
  const south = windowsFor(cropById("garlic")!, "temperate", -1)!;
  assert.deepEqual(windowMonths(south.sow), [3, 4, 5]);
  assert.equal(windowsFor(cropById("garlic")!, "arid"), undefined);
});

test("search: 'pea' finds pea shoots, garden pea and sugar snap; other names work", () => {
  const ids = searchCrops("pea").map((c) => c.id);
  for (const id of ["pea-shoots", "garden-pea", "sugar-snap"]) assert.ok(ids.includes(id), id);
  assert.equal(searchCrops("corn salad")[0].id, "lambs-lettuce");
  assert.equal(searchCrops("boerenkool")[0].id, "kale");
  assert.deepEqual(searchCrops("kalettes"), []);
});
