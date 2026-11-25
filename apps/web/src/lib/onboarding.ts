import type { FieldDB } from "./data/db";
import { addTask, create, householdId, live, update } from "./data/repo";
import type { Household, Space, SpaceType } from "./data/types";
import { seasonsFromNormals } from "@uchibatake/content";
import type { ClimateSummary } from "./climate";
import type { FirstSeason } from "./plan";
import { seasonTableFor } from "./place";

export interface Answers {
  where: SpaceType[];
  sun: Partial<Record<SpaceType, Space["sun"]>>;
  place: {
    name: string;
    detail: string | null;
    lat: number;
    lon: number;
    found: "location" | "search";
    /** From 30 years of history, once fetched (01 Location's climate card). */
    climate?: ClimateSummary | null;
  } | null;
  people: number;
  likes: string[];
  diet: string[];
  name: string;
  experience: Household["experience"];
}

export const SPACE_NAMES: Record<SpaceType, string> = { balcony: "Balcony", windowsill: "Windowsill", rack: "Vertical rack", backyard: "Back garden", greenhouse: "Greenhouse" };

/** The space id onboarding gives a type, so finishing twice never makes two. */
export const spaceKey = (householdId: string, type: SpaceType) => `${householdId}:space:${type}`;

/**
 * "Begin my season": writes everything onboarding gathered, in one go:
 * the household's place and choices, a space per kind chosen, the person
 * filling it in, a job for each plant in the first-season plan, and a
 * reminder for the favourites that come later. Safe to run twice.
 */
export async function finishOnboarding(db: FieldDB, a: Answers, plan: FirstSeason, today: string): Promise<void> {
  const hid = await householdId(db);
  const area = a.place ? { lat: a.place.lat, lon: a.place.lon } : null;
  const seasonTable = area ? seasonTableFor(area) : null;
  const summary = a.place?.climate ?? null;
  // Amsterdam has its own table; anywhere else, seasons come from the place's normals (when we have them).
  const seasons = !seasonTable && summary ? seasonsFromNormals(summary.normals, a.place?.name || "here") : null;
  const name = a.name.trim();
  const now = Date.now();

  await update(db.households, hid, {
    name: name ? `${name}'s ${a.people > 1 ? "family" : "field"}` : "Our field",
    place: a.place?.name ?? "",
    area,
    season_table: seasonTable,
    seasons,
    climate: seasonTable ? "temperate" : (summary?.type ?? null),
    people_count: a.people,
    likes: a.likes,
    diet: a.diet,
    experience: a.experience,
  });

  const existingSpaces = new Set((await live(db.spaces)).map((s) => s.id));
  for (const [i, type] of a.where.entries()) {
    const id = spaceKey(hid, type);
    if (existingSpaces.has(id)) continue;
    await create(
      db.spaces,
      { id, name: SPACE_NAMES[type], type, facing: null, sun_checks: null, sun: a.sun[type] ?? null, size: null, size_note: null, containers: [], ground: null, plan: [], rack: null, greenhouse: null, sort: i },
      hid
    );
  }

  if (!(await live(db.members)).some((m) => m.role === "owner")) {
    await create(
      db.members,
      { name: name || "You", role: "owner", kind: "adult", mark: { kind: "initial", letter: (name || "Y")[0].toUpperCase() }, age: null, note: null, user_id: null, sort: 0 },
      hid
    );
  }

  for (const item of plan.items) {
    await addTask(db, {
      title: item.title,
      detail: item.line,
      how: null,
      why: "From your first-season plan: it can start now.",
      space_id: spaceKey(hid, item.space.type),
      planting_ids: [],
      due_on: today,
      due_time: null,
      slot: null,
      assignee_id: null,
      done_at: null,
      done_by: null,
      snoozed_until: null,
      skipped_at: null,
      source: "rule",
      rule_key: `first-season:${item.crop.id}`,
    });
  }

  if (plan.later) {
    const year = Number(today.slice(0, 4));
    const on = `${plan.later.from > today.slice(5) ? year : year + 1}-${plan.later.from}`;
    const id = `${hid}:reminder:first-season-later`;
    if (!(await db.reminders.get(id))) {
      await create(
        db.reminders,
        { id, title: `Time to start ${plan.later.crops.map((c) => c.name.toLowerCase()).join(" and ")}`, on, time: null, repeat: "none", task_id: null, planting_id: null, done_at: null },
        hid
      );
    }
  }

  // Last, so an interrupted finish is simply run again.
  await update(db.households, hid, { onboarded_at: now });
}
