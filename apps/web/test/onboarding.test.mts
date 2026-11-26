import "fake-indexeddb/auto";
import { assert, test } from "./t.mts";
import { firstSeason } from "../src/lib/plan.ts";
import { dateWords, listWords, numberWord } from "../src/lib/words.ts";
import { distanceKm, roughArea, seasonTableFor } from "../src/lib/place.ts";
import { FieldDB } from "../src/lib/data/db.ts";
import { moveGuestIntoAccount } from "../src/lib/data/migrate.ts";
import { create, live } from "../src/lib/data/repo.ts";
import { seedDemo } from "../src/lib/demo/seed.ts";

const SPACES = [
  { key: "sill", type: "windowsill" as const, name: "Windowsill" },
  { key: "garden", type: "backyard" as const, name: "Back garden" },
  { key: "balcony", type: "balcony" as const, name: "Balcony" },
];

const NL = { climate: "temperate", hemisphere: 1, grow: null } as const;

test("words: numbers, dates, lists", () => {
  assert.equal(numberWord(6), "six");
  assert.equal(numberWord(23), "23");
  assert.equal(dateWords("12-15"), "mid-December");
  assert.equal(dateWords("05-21"), "late May");
  assert.equal(dateWords("03-01"), "early March");
  assert.equal(listWords(["tomatoes", "basil"]), "tomatoes and basil");
  assert.equal(listWords(["a", "b", "c"]), "a, b and c");
});

test("place: rough area is ~1 km, Amsterdam gets its own seasons", () => {
  assert.deepEqual(roughArea(52.354712, 4.889733), { lat: 52.35, lon: 4.89 });
  assert.equal(seasonTableFor({ lat: 52.35, lon: 4.89 }), "amsterdam");
  assert.equal(seasonTableFor({ lat: 52.09, lon: 5.12 }), "amsterdam", "Utrecht is close enough");
  assert.equal(seasonTableFor({ lat: 51.51, lon: -0.13 }), null, "London computes its own");
  assert.ok(Math.abs(distanceKm({ lat: 52.37, lon: 4.9 }, { lat: 51.51, lon: -0.13 }) - 357) < 10);
});

test("first season on 23 November in Amsterdam: three gentle plants, one per space, from the data", () => {
  const plan = firstSeason({ spaces: SPACES, today: "2026-11-23", place: NL, likes: ["tomatoes", "herbs"] });
  assert.equal(plan.items.length, 3);
  assert.deepEqual(new Set(plan.items.map((i) => i.space.key)).size, 3, "one per space");
  const garden = plan.items.find((i) => i.space.key === "garden")!;
  assert.equal(garden.crop.id, "garlic", "garlic is very easy and goes in now");
  assert.equal(garden.title, "Plant garlic");
  assert.equal(garden.line, "Plant before mid-December. Ready from late May.");
  assert.deepEqual(plan.items.map((i) => i.space.key), ["sill", "garden", "balcony"], "windowsill, garden, balcony, as the design lists them");
  const sill = plan.items.find((i) => i.space.key === "sill")!;
  assert.ok(["pea-shoots", "green-onions"].includes(sill.crop.id), sill.crop.id);
  // Nothing suggested out of season: lamb's lettuce sowing ended mid-October.
  assert.ok(!plan.items.some((i) => i.crop.id === "lambs-lettuce"));
});

test("first season: favourites that wait say when, from the data", () => {
  const plan = firstSeason({ spaces: SPACES, today: "2026-11-23", place: NL, likes: ["tomatoes"] });
  assert.ok(plan.later);
  assert.equal(plan.later!.crops[0].id, "tomatoes");
  assert.equal(plan.later!.from, "05-21");
  assert.equal(plan.later!.line, "Tomatoes come later. Here that's from late May, and we'll remind you.");
});

test("first season: a windowsill alone in July still gets something; no spaces, no plan", () => {
  const sill = firstSeason({ spaces: [SPACES[0]], today: "2026-07-16", place: NL });
  assert.ok(sill.items.length >= 1);
  assert.ok(sill.items.every((i) => i.space.key === "sill"));
  assert.equal(firstSeason({ spaces: [], today: "2026-07-16", place: NL }).items.length, 0);
});

test("first season: a climate with no data says less (no suggestions it can't back up)", () => {
  const plan = firstSeason({ spaces: [SPACES[1]], today: "2026-11-23", place: { climate: "arid", hemisphere: 1, grow: null } });
  assert.equal(plan.items.length, 0);
});

let n = 0;
const household = (id: string) => ({ id, name: "Our field", place: "", address: null, area: null, climate: null, season_table: null, since: "2026-11-23", people_count: null, likes: [], diet: [], experience: null, onboarded_at: null });

test("guest → account: an empty account takes the whole field, and the guest database is gone", async () => {
  const gid = `guest-${++n}`;
  const guest = new FieldDB(`uchibatake-${gid}`);
  await create(guest.households, household(gid), gid);
  await create(guest.spaces, { name: "Windowsill", type: "windowsill", facing: null, sun_checks: null, sun: null, size: null, size_note: null, containers: [], ground: null, plan: [], rack: null, greenhouse: null, sort: 0 }, gid);
  for (const crop of ["basil", "green-onions"])
    await create(guest.plantings, { crop_id: crop, own_name: null, nickname: null, space_id: "x", start_method: "plant", started_on: "2026-11-20", status: "growing", ended_on: null, lost_cause: null, quantity_note: null }, gid);
  const account = new FieldDB(`uchibatake-acct-${n}`);
  const { moved } = await moveGuestIntoAccount(guest, account, gid);
  assert.equal(moved, 4);
  assert.equal((await live(account.plantings)).length, 2, "your two plants come with you");
  assert.equal((await live(account.households))[0].id, gid);
  assert.ok((await account.plantings.toArray()).every((p) => p.dirty === 1));
  const names = (await indexedDB.databases()).map((d) => d.name);
  assert.ok(!names.includes(`uchibatake-${gid}`), "guest database deleted");
});

test("guest → account: joining an existing field re-homes rows and maps the guest's 'you' to the owner", async () => {
  const gid = `guest-${++n}`;
  const guest = new FieldDB(`uchibatake-${gid}`);
  await create(guest.households, household(gid), gid);
  const me = await create(guest.members, { name: "You", role: "owner", kind: "adult", mark: { kind: "initial", letter: "Y" }, age: null, note: null, user_id: null, sort: 0 }, gid);
  await create(guest.harvests, { planting_id: null, crop_id: "basil", amount: 20, unit: "g", measure: null, picked_by: [me.id], picked_on: "2026-11-22", note: null, photo_ids: [] }, gid);
  const account = new FieldDB(`uchibatake-acct-${n}`);
  await seedDemo(account, new Date(2026, 10, 23));
  const owner = (await live(account.members)).find((m) => m.role === "owner")!;
  await moveGuestIntoAccount(guest, account, gid);
  assert.equal((await live(account.households)).length, 1, "still one household");
  const h = (await account.harvests.toArray()).find((x) => x.crop_id === "basil" && x.picked_on === "2026-11-22")!;
  assert.equal(h.household_id, "demo-household");
  assert.deepEqual(h.picked_by, [owner.id]);
  assert.ok(!(await live(account.members)).some((m) => m.name === "You"), "no duplicate 'you'");
});

test("first season: no 'we'll remind you' for a favourite the chosen spaces can't grow", () => {
  const plan = firstSeason({ spaces: [SPACES[0]], today: "2026-11-23", place: NL, likes: ["tomatoes"] });
  assert.equal(plan.later, null, "tomatoes don't grow on a windowsill in our data");
});

test("guest → existing account: same-kind spaces merge, rule jobs aren't doubled, the half-done answers come along", async () => {
  const gid = `guest-${++n}`;
  const guest = new FieldDB(`uchibatake-${gid}`);
  await create(guest.households, household(gid), gid);
  const gSpace = await create(guest.spaces, { id: `${gid}:space:backyard`, name: "Back garden", type: "backyard", facing: null, sun_checks: null, sun: null, size: null, size_note: null, containers: [], ground: null, plan: [], rack: null, greenhouse: null, sort: 0 }, gid);
  const job = { title: "Plant garlic", detail: null, how: null, why: null, space_id: gSpace.id, planting_ids: [], due_on: "2026-11-23", due_time: null, slot: null, assignee_id: null, done_at: null, done_by: null, snoozed_until: null, skipped_at: null, source: "rule" as const, rule_key: "first-season:garlic" };
  await create(guest.tasks, job, gid);
  await create(guest.plantings, { crop_id: "garlic", own_name: null, nickname: null, space_id: gSpace.id, start_method: "seed", started_on: "2026-11-23", status: "growing", ended_on: null, lost_cause: null, quantity_note: null }, gid);

  const account = new FieldDB(`uchibatake-acct-${n}`);
  await create(account.households, household("acct"), "acct");
  const aSpace = await create(account.spaces, { name: "Garden", type: "backyard", facing: null, sun_checks: null, sun: null, size: null, size_note: null, containers: [], ground: null, plan: [], rack: null, greenhouse: null, sort: 0 }, "acct");
  await create(account.tasks, { ...job, space_id: aSpace.id }, "acct");
  await guest.meta.put({ key: "onboarding", value: { where: ["backyard"] } });

  await moveGuestIntoAccount(guest, account, gid);
  assert.equal((await live(account.spaces)).length, 1, "one back garden");
  assert.equal((await account.tasks.where("rule_key").equals("first-season:garlic").count()), 1, "one 'Plant garlic'");
  const garlic = (await live(account.plantings)).find((p) => p.crop_id === "garlic")!;
  assert.equal(garlic.space_id, aSpace.id, "the plant moved into the account's garden");
  assert.deepEqual((await account.meta.get("onboarding"))?.value, { where: ["backyard"] });
});

test("growth: ready in the harvest window, just sown when young, 'ready from' otherwise", async () => {
  const { growthStatus, readyWords } = await import("../src/lib/growth.ts");
  const base = { id: "p", household_id: "h", created_at: 0, updated_at: 0, deleted_at: null, dirty: 0 as const, own_name: null, nickname: null, space_id: "s", status: "growing" as const, ended_on: null, lost_cause: null, quantity_note: null };
  const kale = growthStatus({ ...base, crop_id: "kale", start_method: "plant", started_on: "2026-09-10" }, "2026-11-23", { place: NL });
  // A bought plant in its picking season: true, but we don't know how far along it is.
  assert.equal(kale.label, "In its picking season");
  assert.equal(kale.readyInDays, null);
  const beans = growthStatus({ ...base, crop_id: "broad-beans", start_method: "seed", started_on: "2026-11-14" }, "2026-11-23", { place: NL });
  assert.equal(beans.label, "Just sown");
  const garlic = growthStatus({ ...base, crop_id: "garlic", start_method: "seed", started_on: "2026-10-25" }, "2026-11-23", { place: NL });
  assert.equal(garlic.label, "Ready from late May");
  assert.ok(garlic.progress > 8 && garlic.progress < 30, String(garlic.progress));
  const shoots = growthStatus({ ...base, crop_id: "pea-shoots", start_method: "seed", started_on: "2026-11-20" }, "2026-11-23", { place: NL });
  assert.equal(shoots.label, "Just sown", "all-year harvest still needs time to grow");
  assert.equal(shoots.readyInDays, 18, "RHS: 3 weeks from sowing");
  // Sown spinach isn't ready two weeks in, even inside its window (RHS: about a month).
  const spinach = growthStatus({ ...base, crop_id: "spinach", start_method: "seed", started_on: "2026-10-01" }, "2026-10-16", { place: NL });
  assert.notEqual(spinach.label, "Ready to pick");
  assert.equal(spinach.readyInDays, 15);
  assert.equal(growthStatus({ ...base, crop_id: "spinach", start_method: "seed", started_on: "2026-10-01" }, "2026-11-02", { place: NL }).label, "Ready to pick");
  // Without a climate we say less.
  assert.equal(growthStatus({ ...base, crop_id: "garlic", start_method: "seed", started_on: "2026-10-25" }, "2026-11-23", { place: null }).label, "Growing");
  const own = growthStatus({ ...base, crop_id: null, start_method: "plant", started_on: "2026-10-01" }, "2026-11-23", { place: NL });
  assert.equal(own.label, "Growing");
  assert.equal(own.readyInDays, null, "no window, no claim");
  // Indoors, outdoor windows don't apply: say less. Scraps regrow on their own clock.
  assert.equal(growthStatus({ ...base, crop_id: "basil", start_method: "plant", started_on: "2026-05-20" }, "2026-11-23", { indoors: true, place: NL }).label, "Growing");
  assert.equal(growthStatus({ ...base, crop_id: "green-onions", start_method: "scraps", started_on: "2026-11-02" }, "2026-11-23", { place: NL }).readyInDays, null);
  assert.equal(growthStatus({ ...base, crop_id: "pea-shoots", start_method: "seed", started_on: "2026-10-20" }, "2026-11-23", { indoors: true, place: NL }).label, "Ready to pick");
  assert.equal(garlic.short, "Ready late May");
  assert.equal(readyWords(0), "now");
  assert.equal(readyWords(10), "in about 10 days");
  assert.equal(readyWords(21), "in about 3 weeks");
});

test("climate: daily history → normals, type and typical frost dates", async () => {
  const { summarise, climateWords, frostWords } = await import("../src/lib/climate.ts");
  // Two synthetic Amsterdam-like years: frost from 20 Nov to 5 Apr.
  const time: string[] = [];
  const mean: number[] = [];
  const min: number[] = [];
  const max: number[] = [];
  const rain: number[] = [];
  const M = [3.6, 3.9, 6.5, 9.8, 13.4, 16.2, 18.3, 18.1, 15.0, 11.2, 7.2, 4.3];
  for (let y = 2001; y <= 2002; y++)
    for (let dt = new Date(Date.UTC(y, 0, 1)); dt.getUTCFullYear() === y; dt.setUTCDate(dt.getUTCDate() + 1)) {
      const iso = dt.toISOString().slice(0, 10);
      const m = dt.getUTCMonth();
      const mdd = iso.slice(5);
      const frosty = mdd >= "11-20" || mdd <= "04-05";
      time.push(iso);
      mean.push(M[m]);
      min.push(frosty ? -1 : M[m] - 3);
      max.push(M[m] + 3);
      rain.push(2.3);
    }
  const s = summarise(52.35, { time, temperature_2m_mean: mean, temperature_2m_min: min, temperature_2m_max: max, precipitation_sum: rain });
  assert.equal(s.type, "temperate");
  assert.equal(climateWords(s), "Mild and damp");
  assert.equal(frostWords(s.firstFrost), "Usually late November");
  assert.equal(frostWords(s.lastFrost), "Usually early April");
  assert.ok(Math.abs(s.normals.meanTemp[6] - 18.3) < 0.01);
});
