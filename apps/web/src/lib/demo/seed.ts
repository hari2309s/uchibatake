import { addDays, isoDate } from "../dates";
import type { FieldDB } from "../data/db";
import { setMeta } from "../data/db";
import { DEFAULT_SETTINGS, type Harvest, type Household, type JournalEntry, type Member, type Planting, type Reminder, type Seed, type Space, type Task } from "../data/types";

/*
 * The demo: Hari & Saskia's family in De Pijp, Amsterdam (Kamala; Mira, Sem,
 * Noor), as the Washi & Sumi designs show them. Rows have stable ids so tests
 * can find them. The story happens around 23 November ("Rainbows hide") of the
 * most recent year that has reached it; today's small jobs are dated today.
 *
 * Where the designs disagree with each other the choice is noted inline.
 */

export const DEMO_HOUSEHOLD = "demo-household";
export const M = { hari: "demo-hari", saskia: "demo-saskia", kamala: "demo-kamala", mira: "demo-mira", sem: "demo-sem", noor: "demo-noor" } as const;
export const S = { garden: "demo-garden", balcony: "demo-balcony", sill: "demo-sill" } as const;
export const P = {
  leeks: "demo-leeks",
  garlic: "demo-garlic",
  broadBeans: "demo-broad-beans",
  rhubarb: "demo-rhubarb",
  kale: "demo-kale",
  lambsLettuce: "demo-lambs-lettuce",
  spinach: "demo-spinach",
  strawberries: "demo-strawberries",
  greenOnions: "demo-green-onions",
  basil: "demo-basil",
  parsley: "demo-parsley",
  tomatoes: "demo-tomatoes",
  coriander: "demo-coriander",
  springBeans: "demo-spring-broad-beans",
  oldGarlic: "demo-last-years-garlic",
} as const;

/** The story's year: the latest year whose 23 November has come. */
export function storyYear(now: Date): number {
  const y = now.getFullYear();
  return now >= new Date(y, 10, 23) ? y : y - 1;
}

export async function seedDemo(db: FieldDB, now: Date = new Date()): Promise<void> {
  const Y = storyYear(now);
  const d = (md: string, year = Y) => `${year}-${md}`;
  const today = isoDate(now);
  const t0 = new Date(Y, 5, 1).getTime();
  const base = { household_id: DEMO_HOUSEHOLD, created_at: t0, updated_at: t0, deleted_at: null, dirty: 0 as const };

  const household: Household = {
    ...base,
    id: DEMO_HOUSEHOLD,
    name: "Hari & Saskia's family",
    place: "De Pijp",
    address: "Tweede Jan Steenstraat 41-H",
    area: { lat: 52.35, lon: 4.89 },
    climate: "temperate",
    season_table: "amsterdam",
    since: d("06-01"),
  };

  const member = (id: string, sort: number, m: Omit<Member, keyof typeof base | "id" | "sort" | "user_id">): Member => ({ ...base, id, sort, user_id: null, ...m });
  const members: Member[] = [
    member(M.hari, 0, { name: "Hari", role: "owner", kind: "adult", mark: { kind: "initial", letter: "H" }, age: null, note: "Looks after it all" }),
    member(M.saskia, 1, { name: "Saskia", role: "editor", kind: "adult", mark: { kind: "initial", letter: "S" }, age: null, note: null }),
    member(M.kamala, 2, { name: "Kamala", role: "helper", kind: "adult", mark: { kind: "initial", letter: "K" }, age: null, note: "Seed keeper" }),
    member(M.mira, 3, { name: "Mira", role: "helper", kind: "child", mark: { kind: "leaf" }, age: 9, note: "snail patrol" }),
    member(M.sem, 4, { name: "Sem", role: "helper", kind: "child", mark: { kind: "bean" }, age: 6, note: "windowsill waterer" }),
    member(M.noor, 5, { name: "Noor", role: "helper", kind: "child", mark: { kind: "sprout" }, age: 3, note: "leaf gatherer" }),
  ];

  const space = (id: string, sort: number, s: Omit<Space, keyof typeof base | "id" | "sort" | "rack" | "greenhouse">): Space => ({ ...base, id, sort, rack: null, greenhouse: null, ...s });
  const spaces: Space[] = [
    space(S.garden, 0, { name: "Back garden", type: "backyard", facing: "S", sun_checks: null, sun: "full", size: "l", size_note: null, containers: [], ground: "Open ground · clay soil", plan: [] }),
    space(S.balcony, 1, {
      name: "Back balcony",
      type: "balcony",
      facing: "SW",
      sun_checks: { h10: false, h13: true, h16: true },
      sun: "full",
      size: "m",
      size_note: "About 3 m by 1.2 m",
      containers: ["troughs", "pots"],
      ground: null,
      plan: [
        { planting_id: P.kale, x: 0.2, y: 0.3 },
        { planting_id: P.lambsLettuce, x: 0.45, y: 0.3 },
        { planting_id: P.spinach, x: 0.7, y: 0.3 },
        { planting_id: P.strawberries, x: 0.85, y: 0.7 },
      ],
    }),
    space(S.sill, 2, { name: "Kitchen windowsill", type: "windowsill", facing: "E", sun_checks: null, sun: "part", size: "s", size_note: null, containers: ["pots"], ground: null, plan: [] }),
  ];

  const planting = (id: string, p: Partial<Planting> & Pick<Planting, "crop_id" | "space_id" | "start_method" | "started_on">): Planting => ({
    ...base,
    id,
    own_name: null,
    nickname: null,
    status: "growing",
    ended_on: null,
    lost_cause: null,
    quantity_note: null,
    ...p,
  });
  const plantings: Planting[] = [
    // Back garden. (Revised puts the garlic here; M13's list says the balcony. Revised wins.)
    planting(P.leeks, { crop_id: "leeks", space_id: S.garden, start_method: "plant", started_on: d("06-15") }),
    planting(P.garlic, { crop_id: "garlic", space_id: S.garden, start_method: "seed", started_on: d("10-25") }),
    // Home says "Just sown"; 13a's reminders say they're sown on Saturday. Home wins: sown already.
    planting(P.broadBeans, { crop_id: "broad-beans", space_id: S.garden, start_method: "seed", started_on: addDays(d("11-23"), -9) }),
    planting(P.rhubarb, { crop_id: "rhubarb", space_id: S.garden, start_method: "existing", started_on: d("06-01") }),
    // Back balcony.
    planting(P.kale, { crop_id: "kale", space_id: S.balcony, start_method: "plant", started_on: d("09-10"), nickname: "Kale by the door", quantity_note: "four young plants from the market" }),
    planting(P.lambsLettuce, { crop_id: "lambs-lettuce", space_id: S.balcony, start_method: "seed", started_on: d("09-05") }),
    planting(P.spinach, { crop_id: "spinach", space_id: S.balcony, start_method: "seed", started_on: d("09-12") }),
    planting(P.strawberries, { crop_id: "strawberries", space_id: S.balcony, start_method: "existing", started_on: d("06-01") }),
    // Kitchen windowsill.
    planting(P.greenOnions, { crop_id: "green-onions", space_id: S.sill, start_method: "scraps", started_on: d("11-02") }),
    planting(P.basil, { crop_id: "basil", space_id: S.sill, start_method: "plant", started_on: d("05-20") }),
    planting(P.parsley, { crop_id: "parsley", space_id: S.sill, start_method: "seed", started_on: d("08-01") }),
    // Earlier this season, now ended.
    planting(P.tomatoes, { crop_id: "tomatoes", space_id: S.balcony, start_method: "plant", started_on: d("05-20"), status: "ended", ended_on: d("10-15"), nickname: "Cherry tomatoes" }),
    planting(P.coriander, { crop_id: "coriander", space_id: S.sill, start_method: "seed", started_on: d("06-10"), status: "ended", ended_on: d("11-20") }),
    planting(P.springBeans, { crop_id: "broad-beans", space_id: S.garden, start_method: "seed", started_on: d("03-20"), status: "ended", ended_on: d("07-31") }),
    planting(P.oldGarlic, { crop_id: "garlic", space_id: S.garden, start_method: "seed", started_on: d("11-01", Y - 1), status: "ended", ended_on: d("07-14") }),
  ];

  let hn = 0;
  const harvest = (planting_id: string, crop_id: string, picked_on: string, amount: number, unit: Harvest["unit"], picked_by: string[], note: string | null = null, measure: string | null = null): Harvest => ({
    ...base,
    id: `demo-harvest-${++hn}`,
    planting_id,
    crop_id,
    picked_on,
    amount,
    unit,
    picked_by,
    note,
    measure,
    photo_ids: [],
  });
  const strawberryPickers = [M.noor, M.mira, M.kamala, M.noor, M.sem, M.mira, M.noor, M.kamala, M.hari, M.noor, M.mira, M.sem, M.kamala, M.noor];
  const harvests: Harvest[] = [
    // 14 strawberry pickings, about 140 berries (M12): Noor first, on 2 June.
    ...strawberryPickers.map((who, i) => harvest(P.strawberries, "strawberries", addDays(d("06-02"), i * 4), i === 0 ? 1 : 10 + (i % 3), "count", [who], i === 0 ? "Eaten by Noor before anyone saw" : null)),
    harvest(P.rhubarb, "rhubarb", d("06-05"), 600, "g", [M.kamala]),
    harvest(P.rhubarb, "rhubarb", d("06-20"), 450, "g", [M.kamala, M.noor]),
    harvest(P.springBeans, "broad-beans", d("06-18"), 500, "g", [M.kamala, M.sem], "Into Kamala's sabzi"),
    harvest(P.springBeans, "broad-beans", d("06-29"), 800, "g", [M.sem]),
    harvest(P.springBeans, "broad-beans", d("07-10"), 700, "g", [M.hari, M.sem]),
    harvest(P.oldGarlic, "garlic", d("07-14"), 14, "count", [M.hari], "Hung to dry in the shed"),
    ...[0, 9, 18, 27, 36, 45, 54, 63, 72, 81].map((k, i) => harvest(P.tomatoes, "tomatoes", addDays(d("07-20"), k), 150 + (i % 4) * 50, "g", [i % 2 ? M.mira : M.saskia])),
    ...[0, 14, 28, 42, 56].map((k, i) => harvest(P.basil, "basil", addDays(d("06-25"), k), 30, "g", [i % 2 ? M.hari : M.kamala])),
    harvest(P.greenOnions, "green-onions", d("11-12"), 20, "g", [M.kamala]),
    harvest(P.greenOnions, "green-onions", d("11-18"), 20, "g", [M.kamala]),
    harvest(P.kale, "kale", d("10-12"), 150, "g", [M.hari], "First small picking, for a pan of eggs."),
    harvest(P.lambsLettuce, "lambs-lettuce", d("11-19"), 80, "g", [M.saskia], "One small bowl, with walnuts.", "one small bowl"),
    harvest(P.kale, "kale", d("11-21"), 3, "count", [M.mira], "Three leaves, frosted."),
  ];

  let jn = 0;
  const entry = (written_on: string, writer_id: string, text: string, e: Partial<JournalEntry> = {}): JournalEntry => ({
    ...base,
    id: `demo-journal-${++jn}`,
    written_on,
    writer_id,
    text,
    title: null,
    seal: null,
    planting_ids: [],
    space_ids: [],
    photo_ids: [],
    kind: "note",
    ...e,
  });
  const journal: JournalEntry[] = [
    entry(d("09-10"), M.saskia, "Young plants into the big balcony box, planted by Sem and Mira.", { title: "Planted", seal: "芽", planting_ids: [P.kale], space_ids: [S.balcony] }),
    entry(d("10-02"), M.saskia, "Mira found the first caterpillars.", { title: "Growing", planting_ids: [P.kale] }),
    entry(d("10-28"), M.hari, "Full and dark, and taller than Noor.", { title: "Full and dark", planting_ids: [P.kale] }),
    entry(d("11-03"), M.saskia, "Mira picked the caterpillars off by hand. No harm done.", { planting_ids: [P.kale] }),
    entry(d("11-12"), M.hari, "Nights dipped to 3°. It's on the kitchen sill now, beside the green onions.", { title: "The basil came inside", planting_ids: [P.basil], space_ids: [S.sill] }),
    entry(d("11-19"), M.saskia, "One small bowl, with walnuts. Noor says it tastes like grass. That's rather the point.", { title: "First lamb's lettuce", seal: "収", planting_ids: [P.lambsLettuce] }),
    entry(d("11-21"), M.saskia, "Mira picked three leaves before school, still stiff with frost. Kamala said they taste like her mother's saag. Stamppot tonight for all six of us.", {
      title: "The first frosted kale",
      seal: "収",
      planting_ids: [P.kale],
      space_ids: [S.balcony],
    }),
    entry(d("11-22"), M.kamala, "“Rub the dry heads between your palms, like my mother did.” Enough for every pot next spring, and a jar for the kitchen.", {
      title: "Coriander seeds saved for spring",
      seal: "種",
      planting_ids: [P.coriander],
    }),
  ];

  const seed = (id: string, s: Omit<Seed, keyof typeof base | "id">): Seed => ({ ...base, id, ...s });
  const seeds: Seed[] = [
    seed("demo-seed-beans", { crop_id: "broad-beans", name: "Broad beans", variety: "Aquadulce Claudia", source: "bought", saved_by: null, from_note: null, year: Y - 1, good_until: Y + 2 }),
    seed("demo-seed-garlic", { crop_id: "garlic", name: "Garlic", variety: "Germidour bulbs", source: "bought", saved_by: null, from_note: null, year: Y, good_until: null }),
    seed("demo-seed-coriander", { crop_id: "coriander", name: "Coriander", variety: null, source: "saved", saved_by: M.kamala, from_note: "From the windowsill", year: Y, good_until: Y + 3 }),
    seed("demo-seed-saved-beans", { crop_id: "broad-beans", name: "Broad beans", variety: null, source: "saved", saved_by: M.hari, from_note: "The fattest pods", year: Y, good_until: Y + 3 }),
    seed("demo-seed-lettuce", { crop_id: "lettuce", name: "Lettuce", variety: "Little Gem", source: "bought", saved_by: null, from_note: null, year: Y - 2, good_until: null }),
    seed("demo-seed-basil", { crop_id: "basil", name: "Basil", variety: "Genovese", source: "bought", saved_by: null, from_note: null, year: Y - 2, good_until: null }),
  ];

  const task = (id: string, t: Partial<Task> & Pick<Task, "title" | "due_on" | "source">): Task => ({
    ...base,
    created_at: now.getTime(),
    updated_at: now.getTime(),
    id,
    detail: null,
    how: null,
    why: null,
    space_id: null,
    planting_ids: [],
    due_time: null,
    slot: null,
    assignee_id: null,
    done_at: null,
    done_by: null,
    snoozed_until: null,
    skipped_at: null,
    rule_key: null,
    ...t,
  });
  const morning = new Date(now);
  morning.setHours(7, 40, 0, 0);
  const tasks: Task[] = [
    task("demo-task-fleece", {
      title: "Put the fleece by the balcony door",
      detail: "Ready for the spinach and the garden leeks when frost comes.",
      due_on: today,
      source: "weather",
      space_id: S.balcony,
      planting_ids: [P.spinach, P.leeks],
    }),
    task("demo-task-water-sill", {
      title: "Water the windowsill pots",
      detail: "The heating dries them out. The balcony can wait.",
      how: "Pour slowly at the base until a little runs into the saucer. Tip that out after ten minutes.",
      why: "The heating has been on since Friday and the top of the soil is dry to your knuckle.",
      due_on: today,
      source: "rule",
      space_id: S.sill,
      planting_ids: [P.basil, P.parsley, P.greenOnions],
      slot: "morning",
      assignee_id: M.sem,
    }),
    task("demo-task-snip-onions", {
      title: "Snip green onions for Kamala's dal",
      detail: "Done this morning. They'll grow back.",
      due_on: today,
      source: "user",
      planting_ids: [P.greenOnions],
      done_at: morning.getTime(),
      done_by: M.kamala,
    }),
    task("demo-task-snails", {
      title: "Mira's job: a snail check",
      detail: "Round the garden beds after dark, with a torch.",
      due_on: today,
      source: "user",
      space_id: S.garden,
      slot: "evening",
      assignee_id: M.mira,
    }),
    task("demo-task-leaves", {
      title: "Gather leaves for the beds",
      detail: "Saturday, with Kamala.",
      due_on: addDays(today, (6 - now.getDay() + 7) % 7 || 7),
      source: "user",
      space_id: S.garden,
      assignee_id: M.noor,
    }),
  ];

  const reminders: Reminder[] = [
    { ...base, id: "demo-reminder-kale-photo", title: "A fresh photo of the kale", on: addDays(today, (4 - now.getDay() + 7) % 7 || 7), time: null, repeat: "none", task_id: null, planting_id: P.kale, done_at: null },
  ];

  await db.transaction("rw", [db.households, db.members, db.spaces, db.plantings, db.harvests, db.journal_entries, db.seeds, db.tasks, db.reminders, db.meta], async () => {
    await db.households.put(household);
    await db.members.bulkPut(members);
    await db.spaces.bulkPut(spaces);
    await db.plantings.bulkPut(plantings);
    await db.harvests.bulkPut(harvests);
    await db.journal_entries.bulkPut(journal);
    await db.seeds.bulkPut(seeds);
    await db.tasks.bulkPut(tasks);
    await db.reminders.bulkPut(reminders);
    await setMeta(db, "settings", DEFAULT_SETTINGS);
    await setMeta(db, "demoSeededOn", today);
  });
}
