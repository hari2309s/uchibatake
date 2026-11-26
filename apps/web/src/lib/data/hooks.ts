"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, live } from "./repo";
import { tasksForDay } from "./queries";
import { useData } from "./provider";
import type { FieldDB } from "./db";
import type { Harvest, Household, JournalEntry, Member, Planting, Reminder, Seed, Settings, Space, Task } from "./types";

/**
 * useLiveQuery that starts from the last result for the same query on this
 * device's database, so screens visited before render their content at once
 * (so a screen seen before never shows its loader); the live query refreshes it right after.
 */
const lastValues = new WeakMap<FieldDB, Map<string, unknown>>();
function useCached<T>(db: FieldDB, key: string, query: () => Promise<T>, deps: unknown[]): T | undefined {
  let cache = lastValues.get(db);
  if (!cache) lastValues.set(db, (cache = new Map()));
  const c = cache;
  return useLiveQuery(
    async () => {
      const value = await query();
      c.set(key, value);
      return value;
    },
    deps,
    c.get(key) as T | undefined
  );
}

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

export function useHousehold(): Household | undefined {
  const { db, householdId } = useData();
  return useCached(db, "household", async () => db.households.get(householdId), [db, householdId]);
}

export function useMembers(): Member[] | undefined {
  const { db } = useData();
  return useCached(db, "members", async () => (await live(db.members)).sort(bySort), [db]);
}

export function useSpaces(): Space[] | undefined {
  const { db } = useData();
  return useCached(db, "spaces", async () => (await live(db.spaces)).sort(bySort), [db]);
}

export function useSpace(id: string): Space | null | undefined {
  const { db } = useData();
  return useCached(db, `space:${id}`, async () => {
    const s = await db.spaces.get(id);
    return s && !s.deleted_at ? s : null;
  }, [db, id]);
}

/** Plantings, optionally only those in a space; growing first, then by start date. */
export function usePlantings(spaceId?: string): Planting[] | undefined {
  const { db } = useData();
  return useCached(db, `plantings:${spaceId ?? "*"}`, async () => {
    const rows = spaceId ? await db.plantings.where("space_id").equals(spaceId).toArray() : await db.plantings.toArray();
    return rows
      .filter((p) => !p.deleted_at)
      .sort((a, b) => Number(a.status !== "growing") - Number(b.status !== "growing") || a.started_on.localeCompare(b.started_on));
  }, [db, spaceId]);
}

export function usePlanting(id: string): Planting | null | undefined {
  const { db } = useData();
  return useCached(db, `planting:${id}`, async () => {
    const p = await db.plantings.get(id);
    return p && !p.deleted_at ? p : null;
  }, [db, id]);
}

/** The day's jobs (open ones carry forward; done ones stay on their day). */
export function useTasksForDay(day: string): Task[] | undefined {
  const { db } = useData();
  // A household has a few dozen jobs at most: filter in memory (handles snoozed and carried-over jobs too).
  return useCached(db, `tasks:${day}`, async () => tasksForDay(await db.tasks.toArray(), day), [db, day]);
}

export function useTask(id: string): Task | null | undefined {
  const { db } = useData();
  return useCached(db, `task:${id}`, async () => {
    const t = await db.tasks.get(id);
    return t && !t.deleted_at ? t : null;
  }, [db, id]);
}

export function useHarvests(plantingId?: string): Harvest[] | undefined {
  const { db } = useData();
  return useCached(db, `harvests:${plantingId ?? "*"}`, async () => {
    const rows = plantingId ? await db.harvests.where("planting_id").equals(plantingId).toArray() : await db.harvests.toArray();
    return rows.filter((h) => !h.deleted_at).sort((a, b) => b.picked_on.localeCompare(a.picked_on));
  }, [db, plantingId]);
}

/** Journal pages, newest first. */
export function useJournal(): JournalEntry[] | undefined {
  const { db } = useData();
  return useCached(db, "journal", async () => (await live(db.journal_entries)).sort((a, b) => b.written_on.localeCompare(a.written_on) || b.created_at - a.created_at), [db]);
}

export function useSeeds(): Seed[] | undefined {
  const { db } = useData();
  return useCached(db, "seeds", async () => (await live(db.seeds)).sort((a, b) => a.name.localeCompare(b.name)), [db]);
}

export function useReminders(): Reminder[] | undefined {
  const { db } = useData();
  return useCached(db, "reminders", async () => (await live(db.reminders)).sort((a, b) => a.on.localeCompare(b.on) || (a.time ?? "").localeCompare(b.time ?? "")), [db]);
}

export function useSettings(): Settings | undefined {
  const { db } = useData();
  return useCached(db, "settings", () => getSettings(db), [db]);
}
