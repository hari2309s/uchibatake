import type { Table } from "dexie";
import { getMeta, setMeta, type FieldDB } from "./db";
import { DEFAULT_SETTINGS, type Harvest, type JournalEntry, type New, type Notice, type Planting, type Row, type Seed, type Settings, type Space, type Task } from "./types";

/**
 * Every local write goes through here, so each change is stamped
 * (`updated_at` always moves forward, even if the clock is behind the last
 * edit) and marked dirty for the sync engine that comes later.
 */

export function newId(): string {
  return crypto.randomUUID();
}

/** An edit time that never goes backwards for the same row. */
export function nextStamp(prev?: number): number {
  return Math.max(Date.now(), (prev ?? 0) + 1);
}

/** Inserts a row with fresh bookkeeping. */
export async function create<T extends Row>(table: Table<T, string>, data: New<T>, householdId: string): Promise<T> {
  const now = Date.now();
  const row = { ...data, id: data.id ?? newId(), household_id: householdId, created_at: now, updated_at: now, deleted_at: null, dirty: 1 } as T;
  await table.add(row);
  return row;
}

/** Applies a patch to a live row; returns the new row, or null if it's gone. */
export async function update<T extends Row>(table: Table<T, string>, id: string, patch: Partial<Omit<T, "id" | "household_id" | "created_at">>): Promise<T | null> {
  return table.db.transaction("rw", table, async () => {
    const prev = await table.get(id);
    if (!prev || prev.deleted_at) return null;
    const next = { ...prev, ...patch, updated_at: nextStamp(prev.updated_at), dirty: 1 } as T;
    await table.put(next);
    return next;
  });
}

/** Soft delete: the row stays (for sync) but every read skips it. */
export async function remove<T extends Row>(table: Table<T, string>, id: string): Promise<void> {
  await table.db.transaction("rw", table, async () => {
    const prev = await table.get(id);
    if (!prev || prev.deleted_at) return;
    const stamp = nextStamp(prev.updated_at);
    await table.put({ ...prev, deleted_at: stamp, updated_at: stamp, dirty: 1 } as T);
  });
}

/** Live (not deleted) rows of a table. */
export async function live<T extends Row>(table: Table<T, string>): Promise<T[]> {
  return (await table.toArray()).filter((r) => !r.deleted_at);
}

// ── Household context ───────────────────────────────────────────────────────

/** The household on this device (one per database). */
export async function householdId(db: FieldDB): Promise<string> {
  const h = (await live(db.households))[0];
  if (!h) throw new Error("No household on this device yet");
  return h.id;
}

// ── Tasks ───────────────────────────────────────────────────────────────────

/**
 * Done: the 済 seal. Remembers who did it. Ticking a plant's start job
 * ("Sow peas") makes that planned plant a growing one, started today.
 */
export async function completeTask(db: FieldDB, id: string, by: string | null) {
  const t = await update(db.tasks, id, { done_at: Date.now(), done_by: by, skipped_at: null });
  if (t?.rule_key?.startsWith("start:")) {
    const p = await db.plantings.get(t.rule_key.slice("start:".length));
    if (p && !p.deleted_at && p.status === "planned") {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      await update(db.plantings, p.id, { status: "growing", started_on: today });
    }
  }
  return t;
}

/** Undo a done or a skip. */
export function reopenTask(db: FieldDB, id: string) {
  return update(db.tasks, id, { done_at: null, done_by: null, skipped_at: null });
}

/** "Tomorrow": moves the job to another day without a fuss. */
export function snoozeTask(db: FieldDB, id: string, until: string) {
  return update(db.tasks, id, { snoozed_until: until });
}

export function skipTask(db: FieldDB, id: string) {
  return update(db.tasks, id, { skipped_at: Date.now() });
}

/**
 * Adds a job. A rule never adds the same job twice: any row with the same
 * rule_key counts, including one the family deleted (it stays deleted).
 * Returns the existing row in that case.
 */
export async function addTask(db: FieldDB, task: New<Task>): Promise<Task> {
  const hid = await householdId(db);
  return db.transaction("rw", db.tasks, async () => {
    if (task.rule_key) {
      const existing = await db.tasks.where("rule_key").equals(task.rule_key).first();
      if (existing) return existing;
    }
    return create(db.tasks, task, hid);
  });
}

// ── Spaces, plantings, harvests, journal, seeds ─────────────────────────────

export async function addSpace(db: FieldDB, space: New<Space>) {
  return create(db.spaces, space, await householdId(db));
}

export async function addPlanting(db: FieldDB, planting: New<Planting>) {
  return create(db.plantings, planting, await householdId(db));
}

/** Removes a plant, and any open jobs that were only about it. Journal pages stay. */
export async function removePlanting(db: FieldDB, id: string): Promise<void> {
  await db.transaction("rw", db.plantings, db.tasks, async () => {
    await remove(db.plantings, id);
    for (const t of await db.tasks.toArray()) {
      if (t.deleted_at || t.done_at || !t.planting_ids.includes(id)) continue;
      if (t.planting_ids.length === 1) await remove(db.tasks, t.id);
      else await update(db.tasks, t.id, { planting_ids: t.planting_ids.filter((x) => x !== id) });
    }
  });
}

/** Ends a planting (season over or lost) without deleting its story. */
export function endPlanting(db: FieldDB, id: string, on: string, lost?: Planting["lost_cause"]) {
  return update(db.plantings, id, { status: lost !== undefined ? "lost" : "ended", ended_on: on, lost_cause: lost ?? null });
}

export async function logHarvest(db: FieldDB, harvest: New<Harvest>) {
  if (!(harvest.amount > 0)) throw new Error("A harvest needs an amount above zero");
  return create(db.harvests, harvest, await householdId(db));
}

export async function addJournalEntry(db: FieldDB, entry: New<JournalEntry>) {
  return create(db.journal_entries, entry, await householdId(db));
}

export async function addSeed(db: FieldDB, seed: New<Seed>) {
  return create(db.seeds, seed, await householdId(db));
}

/** Ticks one job on a notice's checklist (or unticks it). */
export async function toggleNoticeItem(db: FieldDB, noticeId: string, itemId: string, by: string | null): Promise<Notice | null> {
  // Read, toggle and write in one transaction, so two quick taps never lose a tick.
  return db.transaction("rw", db.notices, async () => {
    const n = await db.notices.get(noticeId);
    if (!n || n.deleted_at) return null;
    const checklist = n.checklist.map((c) => (c.id === itemId ? { ...c, done_at: c.done_at ? null : Date.now(), done_by: c.done_at ? null : by } : c));
    return update(db.notices, noticeId, { checklist });
  });
}

// ── Settings (device only) ──────────────────────────────────────────────────

export async function getSettings(db: FieldDB): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await getMeta<Partial<Settings>>(db, "settings")) ?? {}) };
}

export async function setSettings(db: FieldDB, patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings(db)), ...patch };
  await setMeta(db, "settings", next);
  return next;
}
