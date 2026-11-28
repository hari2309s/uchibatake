import Dexie, { type Table } from "dexie";
import type { Harvest, Household, JournalEntry, Member, Notice, Photo, Planting, Reading, Reminder, Seed, Space, Task } from "./types";

/** Device-only key/value rows (settings, caches, onboarding progress). Never synced. */
export interface MetaRow {
  key: string;
  value: unknown;
}

export const SYNCED_TABLES = [
  "households",
  "members",
  "spaces",
  "plantings",
  "tasks",
  "harvests",
  "journal_entries",
  "seeds",
  "reminders",
  "notices",
  "photos",
  "readings",
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export class FieldDB extends Dexie {
  households!: Table<Household, string>;
  members!: Table<Member, string>;
  spaces!: Table<Space, string>;
  plantings!: Table<Planting, string>;
  tasks!: Table<Task, string>;
  harvests!: Table<Harvest, string>;
  journal_entries!: Table<JournalEntry, string>;
  seeds!: Table<Seed, string>;
  reminders!: Table<Reminder, string>;
  notices!: Table<Notice, string>;
  photos!: Table<Photo, string>;
  readings!: Table<Reading, string>;
  meta!: Table<MetaRow, string>;

  constructor(name: string, options?: ConstructorParameters<typeof Dexie>[1]) {
    super(name, options);
    // Indexes only for what we query by; `dirty` on every synced table for the sync engine.
    this.version(1).stores({
      households: "id, dirty",
      members: "id, household_id, dirty",
      spaces: "id, household_id, dirty",
      plantings: "id, space_id, crop_id, status, dirty",
      tasks: "id, due_on, rule_key, dirty",
      harvests: "id, planting_id, picked_on, dirty",
      journal_entries: "id, written_on, dirty",
      seeds: "id, dirty",
      reminders: "id, on, dirty",
      notices: "id, for_date, dirty",
      photos: "id, owner_id, dirty",
      meta: "key",
    });
    // v2: thermometer (and later sensor) readings per space (microclimates).
    this.version(2).stores({ readings: "id, space_id, on, dirty" });
  }
}

const instances = new Map<string, FieldDB>();

const dbName = (userId: string) => `uchibatake-${userId}`;

/** One database per person (guest, demo or account), so households never mix on a shared device. */
export function openFieldDB(userId: string, options?: ConstructorParameters<typeof Dexie>[1]): FieldDB {
  let db = instances.get(userId);
  if (!db) {
    db = new FieldDB(dbName(userId), options);
    instances.set(userId, db);
  }
  return db;
}

/** Deletes a person's on-device database and drops the cached handle. */
export async function forgetFieldDB(userId: string): Promise<void> {
  const db = instances.get(userId) ?? new FieldDB(dbName(userId));
  instances.delete(userId);
  db.close();
  await Dexie.delete(dbName(userId));
}

export async function getMeta<T>(db: FieldDB, key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(db: FieldDB, key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
