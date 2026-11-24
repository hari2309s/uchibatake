import { assert, test } from "./t.mts";
import { ensoDash } from "../src/components/ui/enso.tsx";
import { monthsText } from "../src/components/ui/month-strip.tsx";

const C = 2 * Math.PI * 20;

test("ensō: an open ring never closes, a closed one does", () => {
  assert.ok(ensoDash(100, C) < C);
  assert.equal(ensoDash(100, C, true), C);
});

test("ensō: 0 still shows a short stroke, values are clamped", () => {
  assert.ok(ensoDash(0, C) > 0);
  assert.equal(ensoDash(-20, C), ensoDash(0, C));
  assert.equal(ensoDash(150, C), ensoDash(100, C));
});

test("ensō: grows with the value", () => {
  assert.ok(ensoDash(30, C) < ensoDash(60, C));
});

test("month strip reading: runs, pairs and singles", () => {
  assert.equal(monthsText([9, 10, 11]), "October to December");
  assert.equal(monthsText([5, 6]), "June and July");
  assert.equal(monthsText([2]), "March");
  assert.equal(monthsText([2, 7, 8]), "March, August and September");
  assert.equal(monthsText([5, 6, 9, 10, 11]), "June, July and October to December");
  assert.equal(monthsText([]), "none");
});

test("month strip reading: a run across the new year reads as one span", () => {
  assert.equal(monthsText([10, 11, 0, 1]), "November to February");
});
