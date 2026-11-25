import { assert, test } from "./t.mts";
import { almanacDay, microseasonStartingOn } from "../src/microseasons.ts";
import { AMSTERDAM, climateType, seasonFor, seasonsFromNormals, SEASON_TABLES, snapToMicroseason, type ClimateNormals, type SeasonTable } from "../src/seasons/index.ts";

/*
 * Test fixtures: rounded 1991–2020-style monthly normals. Approximate on
 * purpose; the app fetches real normals from Open-Meteo. Amsterdam (Schiphol)
 * and a made-up monsoon town with a long dry season.
 */
const AMS: ClimateNormals = {
  latitude: 52.35,
  meanTemp: [3.6, 3.9, 6.5, 9.8, 13.4, 16.2, 18.3, 18.1, 15.0, 11.2, 7.2, 4.3],
  meanMin: [0.8, 0.6, 2.4, 4.4, 7.9, 10.8, 13.0, 12.8, 10.3, 7.4, 4.3, 1.6],
  meanMax: [6.2, 7.0, 10.6, 14.9, 18.5, 21.2, 23.4, 23.2, 19.8, 15.2, 10.2, 6.9],
  precip: [70, 55, 55, 40, 55, 65, 80, 85, 85, 90, 85, 80],
};
const MONSOON: ClimateNormals = {
  latitude: -12.4,
  meanTemp: [28.6, 28.4, 28.4, 28.3, 27.0, 25.2, 24.8, 25.6, 27.6, 29.0, 29.3, 29.1],
  meanMin: [24.7, 24.6, 24.4, 23.6, 21.5, 19.6, 19.2, 20.4, 22.9, 24.8, 25.1, 25.1],
  meanMax: [31.8, 31.4, 32.0, 32.7, 32.2, 30.8, 30.7, 31.3, 32.4, 33.2, 33.5, 33.0],
  precip: [420, 375, 315, 100, 20, 2, 1, 5, 15, 70, 140, 250],
};

function assertAligned(t: SeasonTable) {
  for (const s of t.seasons) assert.ok(microseasonStartingOn(s.start) >= 0, `${t.id}: ${s.name} starts ${s.start}, not on a microseason`);
  assert.equal(new Set(t.seasons.map((s) => s.start)).size, t.seasons.length, `${t.id}: two seasons share a start`);
}

test("Amsterdam ships eight seasons, each spanning whole microseasons", () => {
  assert.equal(AMSTERDAM.seasons.length, 8);
  assertAligned(AMSTERDAM);
  for (const t of Object.values(SEASON_TABLES)) assertAligned(t);
});

test("Amsterdam's season on the design's days", () => {
  assert.equal(seasonFor(AMSTERDAM, "11-23").label, "Late autumn · first frosts");
  assert.equal(seasonFor(AMSTERDAM, "07-16").label, "High summer · long light evenings");
  const late = seasonFor(AMSTERDAM, "11-23");
  assert.equal(late.start, "11-07");
  assert.equal(late.end, "12-21");
});

test("the season wrapping the year end is found on both sides of it", () => {
  assert.equal(seasonFor(AMSTERDAM, "12-31").season.id, "deep-winter");
  assert.equal(seasonFor(AMSTERDAM, "01-15").season.id, "deep-winter");
  assert.equal(seasonFor(AMSTERDAM, "02-03").season.id, "deep-winter");
  assert.equal(seasonFor(AMSTERDAM, "02-04").season.id, "late-winter");
});

test("Amsterdam has 24 'Here' lines, one per solar term", () => {
  assert.equal(AMSTERDAM.termNotes?.length, 24);
});

test("Köppen: Amsterdam is temperate, the monsoon town is tropical wet–dry", () => {
  assert.equal(climateType(AMS), "temperate");
  assert.equal(climateType(MONSOON), "tropical-wet-dry");
});

test("the algorithm gives Amsterdam 6–8 seasons, aligned, close to the shipped table", () => {
  const t = seasonsFromNormals(AMS, "Amsterdam");
  assert.ok(t.seasons.length >= 6 && t.seasons.length <= 8, `${t.seasons.length} seasons`);
  assertAligned(t);
  // Late autumn (first frosts) lands within three microseasons of the hand-written table.
  const computed = t.seasons.find((s) => s.id === "late-autumn");
  assert.ok(computed, "has a late autumn");
  assert.equal(computed!.poem, "first frosts");
  const shipped = AMSTERDAM.seasons.find((s) => s.id === "late-autumn")!;
  assert.ok(Math.abs(microseasonStartingOn(computed!.start) - microseasonStartingOn(shipped.start)) <= 3, `${computed!.start} vs ${shipped.start}`);
});

test("the algorithm gives a monsoon climate four seasons in the right order", () => {
  const t = seasonsFromNormals(MONSOON, "Monsoon town");
  assertAligned(t);
  assert.deepEqual(
    [...t.seasons].sort((a, b) => almanacDay(a.start) - almanacDay(b.start)).map((s) => s.id),
    ["storms", "dry", "build-up", "wet"]
  );
  assert.equal(seasonFor(t, "01-15").season.name, "The rainy season");
  assert.equal(seasonFor(t, "07-01").season.name, "The dry season");
});

test("snapping picks the nearest microseason start", () => {
  // Day 0 = 1 Jan: nearest start is 01-01 (雪下出麦).
  assert.equal(snapToMicroseason(0), "01-01");
  // 1 Oct (day 273) sits between 09-28 and 10-03: 10-03 is nearer.
  assert.equal(snapToMicroseason(273), "10-03");
});

test("a place that's hot all year still gets one season, and lookups work", () => {
  const desert: ClimateNormals = {
    latitude: 15.6,
    meanTemp: [23, 25, 28, 32, 34, 34, 32, 31, 32, 32, 28, 24],
    meanMin: [16, 17, 20, 23, 26, 27, 26, 25, 26, 25, 21, 17],
    meanMax: [31, 33, 37, 40, 42, 41, 38, 37, 39, 39, 35, 32],
    precip: [0, 0, 0, 1, 4, 5, 40, 70, 25, 5, 0, 0],
  };
  const t = seasonsFromNormals(desert, "Desert town");
  assert.equal(t.climate, "arid");
  assert.equal(t.seasons.length, 1);
  assert.equal(seasonFor(t, "03-01").season.name, "All year");
});
