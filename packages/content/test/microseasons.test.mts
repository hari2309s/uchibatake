import { assert, test } from "./t.mts";
import { almanacDay, MICROSEASONS, microseasonEnd, microseasonFor, SOLAR_TERMS } from "../src/microseasons.ts";

test("72 microseasons in 24 solar terms", () => {
  assert.equal(MICROSEASONS.length, 72);
  assert.equal(SOLAR_TERMS.length, 24);
  assert.deepEqual(new Set(MICROSEASONS.map((m) => m.term)).size, 24);
});

test("starts are strictly increasing through the almanac year and cover it", () => {
  for (let i = 1; i < 72; i++) assert.ok(almanacDay(MICROSEASONS[i].start) > almanacDay(MICROSEASONS[i - 1].start), MICROSEASONS[i].start);
  assert.equal(MICROSEASONS[0].start, "02-04");
  // Every microseason lasts 4 to 7 days.
  for (let i = 0; i < 72; i++) {
    const next = i === 71 ? 365 : almanacDay(MICROSEASONS[i + 1].start);
    const len = next - almanacDay(MICROSEASONS[i].start);
    assert.ok(len >= 4 && len <= 7, `${MICROSEASONS[i].kanji} lasts ${len}`);
  }
});

test("lookup by date (the design's days)", () => {
  assert.equal(microseasonFor("11-23").kanji, "虹蔵不見");
  assert.equal(microseasonFor("11-23").english, "Rainbows hide");
  assert.equal(microseasonFor("07-16").kanji, "蓮始開");
  assert.equal(microseasonFor("11-27").kanji, "朔風払葉");
  assert.equal(microseasonFor(new Date(2026, 1, 4)).kanji, "東風解凍");
});

test("lookup at the edges: the year turn, a leap day, the day before 立春", () => {
  assert.equal(microseasonFor("12-31").kanji, "麋角解");
  assert.equal(microseasonFor("01-01").kanji, "雪下出麦");
  assert.equal(microseasonFor("02-29").kanji, "霞始靆");
  assert.equal(microseasonFor("02-03").kanji, "鶏始乳");
});

test("end dates are the day before the next start", () => {
  assert.equal(microseasonEnd(57), "11-26");
  assert.equal(microseasonEnd(71), "02-03");
  assert.equal(microseasonEnd(64), "12-31");
  assert.equal(microseasonEnd(65), "01-04");
});
