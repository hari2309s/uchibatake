import "fake-indexeddb/auto";
import { assert, test } from "./t.mts";
import { FieldDB } from "../src/lib/data/db.ts";
import { addTask, completeTask, create, live, logHarvest, nextStamp, remove, reopenTask, snoozeTask, toggleNoticeItem, update } from "../src/lib/data/repo.ts";
import { firstOfEach, harvestTotals, tasksForDay } from "../src/lib/data/queries.ts";
import { DEMO_HOUSEHOLD, M, P, S, seedDemo, storyYear } from "../src/lib/demo/seed.ts";
import { cropById } from "@uchibatake/content";

const NOW = new Date(2026, 10, 23, 9, 0); // Monday 23 November 2026, the design's day
let n = 0;
async function demoDb(now = NOW) {
  const db = new FieldDB(`test-${++n}`);
  await seedDemo(db, now);
  return db;
}

test("story year: the latest 23 November that has come", () => {
  assert.equal(storyYear(new Date(2026, 10, 23)), 2026);
  assert.equal(storyYear(new Date(2026, 10, 22)), 2025);
  assert.equal(storyYear(new Date(2027, 6, 16)), 2026);
});

test("demo: one household, six people with the kids' marks, three spaces", async () => {
  const db = await demoDb();
  assert.equal((await live(db.households)).length, 1);
  const members = await live(db.members);
  assert.deepEqual(members.sort((a, b) => a.sort - b.sort).map((m) => m.name), ["Hari", "Saskia", "Kamala", "Mira", "Sem", "Noor"]);
  assert.deepEqual(members.filter((m) => m.kind === "child").map((m) => m.mark.kind).sort(), ["bean", "leaf", "sprout"]);
  assert.deepEqual((await live(db.spaces)).map((s) => s.name).sort(), ["Back balcony", "Back garden", "Kitchen windowsill"]);
});

test("demo: what's growing in each space matches 02 Home", async () => {
  const db = await demoDb();
  const growing = (await live(db.plantings)).filter((p) => p.status === "growing");
  const names = (space: string) => growing.filter((p) => p.space_id === space).map((p) => cropById(p.crop_id!)!.name).sort();
  assert.deepEqual(names(S.garden), ["Broad beans", "Garlic", "Leeks", "Rhubarb"]);
  assert.deepEqual(names(S.balcony), ["Kale", "Lamb's lettuce", "Spinach", "Strawberries"]);
  assert.deepEqual(names(S.sill), ["Basil", "Green onions", "Parsley"]);
});

test("demo: every reference points at a real row and a real crop", async () => {
  const db = await demoDb();
  const ids = async (t: { toArray(): Promise<{ id: string }[]> }) => new Set((await t.toArray()).map((r) => r.id));
  const [members, spaces, plantings] = await Promise.all([ids(db.members), ids(db.spaces), ids(db.plantings)]);
  for (const p of await db.plantings.toArray()) {
    assert.ok(spaces.has(p.space_id), p.id);
    assert.ok(!p.crop_id || cropById(p.crop_id), `${p.id}: crop ${p.crop_id}`);
  }
  for (const h of await db.harvests.toArray()) {
    assert.ok(!h.planting_id || plantings.has(h.planting_id), h.id);
    for (const by of h.picked_by) assert.ok(members.has(by), `${h.id} picked by ${by}`);
    assert.ok(h.amount > 0);
  }
  for (const j of await db.journal_entries.toArray()) {
    assert.ok(members.has(j.writer_id), j.id);
    for (const p of j.planting_ids) assert.ok(plantings.has(p), `${j.id} → ${p}`);
  }
  for (const t of await db.tasks.toArray()) {
    for (const p of t.planting_ids) assert.ok(plantings.has(p), `${t.id} → ${p}`);
    assert.ok(!t.assignee_id || members.has(t.assignee_id));
  }
  for (const r of await live(db.households)) assert.equal(r.id, DEMO_HOUSEHOLD);
});

test("demo: about forty harvests, and 14 strawberry pickings of about 140 berries (M12)", async () => {
  const db = await demoDb();
  const harvests = await db.harvests.toArray();
  assert.ok(harvests.length >= 38 && harvests.length <= 45, `${harvests.length} harvests`);
  const straw = harvestTotals(harvests).find((t) => t.cropId === "strawberries")!;
  assert.equal(straw.pickings, 14);
  assert.ok(straw.count >= 130 && straw.count <= 150, `${straw.count} berries`);
  assert.equal(straw.pickers[M.noor], 5);
  assert.equal(straw.first, "2026-06-02");
});

test("demo: first of each (初物) in date order, as on 14 Year in the field", async () => {
  const db = await demoDb();
  const firsts = firstOfEach(await db.harvests.toArray(), "2026-06-01", "2026-11-30");
  const byCrop = Object.fromEntries(firsts.map((h) => [h.crop_id, h.picked_on]));
  assert.equal(byCrop.strawberries, "2026-06-02");
  assert.equal(byCrop["broad-beans"], "2026-06-18");
  assert.equal(byCrop.garlic, "2026-07-14");
  assert.equal(byCrop.kale, "2026-10-12");
  assert.ok(firsts.every((h, i) => i === 0 || firsts[i - 1].picked_on <= h.picked_on));
});

test("demo: today's four small things, one already done", async () => {
  const db = await demoDb();
  const today = tasksForDay(await db.tasks.toArray(), "2026-11-23");
  assert.equal(today.length, 4);
  assert.equal(today.filter((t) => t.done_at).length, 1);
  assert.equal(today.at(-1)!.title, "Snip green onions for Kamala's dal", "done jobs sort last");
});

test("repo: creating stamps bookkeeping and marks the row dirty", async () => {
  const db = await demoDb();
  const h = await logHarvest(db, { planting_id: P.kale, crop_id: "kale", amount: 400, unit: "g", measure: "a big colander", picked_by: [M.saskia, M.mira], picked_on: "2026-11-23", note: null, photo_ids: [] });
  assert.equal(h.household_id, DEMO_HOUSEHOLD);
  assert.equal(h.dirty, 1);
  assert.equal(h.deleted_at, null);
  assert.ok(h.id.length > 10);
  await assert.rejects(() => logHarvest(db, { ...h, id: undefined, amount: 0 }), /above zero/);
});

test("repo: updates move updated_at forward even when the clock is behind", async () => {
  const db = await demoDb();
  const future = Date.now() + 60_000;
  await db.spaces.update(S.sill, { updated_at: future });
  const next = await update(db.spaces, S.sill, { name: "Kitchen sill" });
  assert.ok(next!.updated_at > future);
  assert.equal(next!.dirty, 1);
  assert.equal(nextStamp(future), future + 1);
});

test("repo: soft delete hides the row from reads and keeps it for sync", async () => {
  const db = await demoDb();
  await remove(db.seeds, "demo-seed-basil");
  assert.ok(!(await live(db.seeds)).some((s) => s.id === "demo-seed-basil"));
  const raw = await db.seeds.get("demo-seed-basil");
  assert.ok(raw?.deleted_at && raw.dirty === 1);
  assert.equal(await update(db.seeds, "demo-seed-basil", { name: "x" }), null, "deleted rows can't be edited");
});

test("tasks: done, undo, tomorrow; rule jobs are never added twice", async () => {
  const db = await demoDb();
  await completeTask(db, "demo-task-water-sill", M.sem);
  let t = (await db.tasks.get("demo-task-water-sill"))!;
  assert.ok(t.done_at && t.done_by === M.sem);
  await reopenTask(db, t.id);
  t = (await db.tasks.get(t.id))!;
  assert.equal(t.done_at, null);

  await snoozeTask(db, t.id, "2026-11-24");
  const all = await db.tasks.toArray();
  assert.ok(!tasksForDay(all, "2026-11-23").some((x) => x.id === t.id), "gone from today");
  assert.ok(tasksForDay(all, "2026-11-24").some((x) => x.id === t.id), "there tomorrow");

  const job = { title: "Water the balcony", detail: null, how: null, why: "Dry week", space_id: S.balcony, planting_ids: [], due_on: "2026-11-25", due_time: null, slot: null, assignee_id: null, done_at: null, done_by: null, snoozed_until: null, skipped_at: null, source: "rule" as const, rule_key: "water:balcony:2026-11-25" };
  const a = await addTask(db, job);
  const b = await addTask(db, job);
  assert.equal(a.id, b.id);
});

test("tasks: open jobs carry forward; done ones stay on their day", async () => {
  const db = await demoDb();
  const all = await db.tasks.toArray();
  const tomorrow = tasksForDay(all, "2026-11-24").map((t) => t.id);
  assert.ok(tomorrow.includes("demo-task-water-sill"), "an open job is still there tomorrow");
  assert.ok(!tomorrow.includes("demo-task-snip-onions"), "a done job isn't");
});

test("harvest totals: counts and grams kept apart; a picker counted once per picking", async () => {
  const base = { household_id: "h", created_at: 0, updated_at: 0, deleted_at: null, dirty: 0 as const, planting_id: "p", crop_id: "kale", measure: null, note: null, photo_ids: [] };
  const totals = harvestTotals([
    { ...base, id: "1", amount: 400, unit: "g", picked_by: ["a", "b"], picked_on: "2026-11-23" },
    { ...base, id: "2", amount: 3, unit: "count", picked_by: ["a", "a"], picked_on: "2026-11-21" },
    { ...base, id: "3", amount: 999, unit: "g", picked_by: ["a"], picked_on: "2026-11-01", deleted_at: 1 },
  ]);
  assert.equal(totals.length, 1);
  assert.deepEqual({ ...totals[0], pickers: { ...totals[0].pickers } }, { cropId: "kale", plantingId: null, pickings: 2, count: 3, grams: 400, pickers: { a: 2, b: 1 }, first: "2026-11-21", last: "2026-11-23" });
});

test("create works for a guest household too (no demo ids)", async () => {
  const db = new FieldDB(`test-guest-${++n}`);
  const h = await create(db.households, { name: "Our field", place: "", address: null, area: null, climate: null, season_table: null, since: "2026-11-23" }, "will-be-replaced");
  assert.equal((await live(db.households)).length, 1);
  assert.ok(h.id);
});

test("tasks: a carried-over job ticked today shows today with its 済, not on its old day", async () => {
  const db = await demoDb();
  // Due yesterday, still open, carried to today; then done.
  await db.tasks.update("demo-task-fleece", { due_on: "2026-11-22" });
  await completeTask(db, "demo-task-fleece", M.hari);
  const all = await db.tasks.toArray();
  const doneDay = new Date((await db.tasks.get("demo-task-fleece"))!.done_at!);
  const day = `${doneDay.getFullYear()}-${String(doneDay.getMonth() + 1).padStart(2, "0")}-${String(doneDay.getDate()).padStart(2, "0")}`;
  assert.ok(tasksForDay(all, day).some((t) => t.id === "demo-task-fleece" && t.done_at));
  assert.ok(!tasksForDay(all, "2026-11-22").some((t) => t.id === "demo-task-fleece"));
});

test("tasks: a rule job the family deleted stays deleted", async () => {
  const db = await demoDb();
  const job = { title: "Water the balcony", detail: null, how: null, why: null, space_id: null, planting_ids: [], due_on: "2026-11-25", due_time: null, slot: null, assignee_id: null, done_at: null, done_by: null, snoozed_until: null, skipped_at: null, source: "rule" as const, rule_key: "water:balcony:test" };
  const a = await addTask(db, job);
  await remove(db.tasks, a.id);
  const b = await addTask(db, job);
  assert.equal(b.id, a.id);
  assert.ok(b.deleted_at, "returns the deleted row, adds nothing");
  assert.equal((await db.tasks.where("rule_key").equals("water:balcony:test").count()), 1);
});

test("notices: two quick ticks both land", async () => {
  const db = await demoDb();
  const n = await create(db.notices, { kind: "frost", for_date: "2026-11-23", low: -2, high: 5, remind_at: null, checklist: [{ id: "a", text: "Fleece", done_at: null, done_by: null }, { id: "b", text: "Basil", done_at: null, done_by: null }] }, DEMO_HOUSEHOLD);
  await Promise.all([toggleNoticeItem(db, n.id, "a", M.hari), toggleNoticeItem(db, n.id, "b", M.mira)]);
  const after = (await db.notices.get(n.id))!;
  assert.ok(after.checklist.every((c) => c.done_at), "both ticked");
});
