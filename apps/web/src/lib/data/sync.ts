import type { Table } from "dexie";
import { getMeta, setMeta, type FieldDB, type SyncedTable } from "./db";
import type { Role, Row } from "./types";

/*
 * Sharing one family field between phones (opt-in, accounts only). Adapted
 * from Coral's engine, for a field many people write to.
 *
 * Push: rows changed here (dirty = 1) are upserted into the field's share.
 *   The server keeps the newest version of each row (updated_at) and drops
 *   older writes. A row is marked clean only if it wasn't edited again while
 *   the push was in flight.
 * Pull: rows are read in server order after a stored cursor (rewound a few
 *   seconds each time so nothing committed out of order is missed; merging is
 *   idempotent). A remote row replaces the local one unless the local one is
 *   newer.
 * Not shared: photos (they stay on each phone) and the street address.
 */

/** Tables that are shared. Photos never leave the phone. */
export const SHARED_TABLES = ["households", "members", "spaces", "plantings", "tasks", "harvests", "journal_entries", "seeds", "reminders", "notices"] as const satisfies readonly SyncedTable[];
export type SharedTable = (typeof SHARED_TABLES)[number];

/**
 * What helpers may change (the server enforces the same): the day's work, and
 * plants, because ticking "Sow peas" or logging the last picking moves a plant
 * on. Owners and editors: everything.
 */
const HELPER_TABLES: readonly SharedTable[] = ["tasks", "harvests", "journal_entries", "notices", "reminders", "plantings"];
export const canWrite = (role: Role, t: SharedTable) => role !== "helper" || HELPER_TABLES.includes(t);

/** This phone's share, kept in meta. */
export interface Sharing {
  household: string;
  role: Role;
}
export const SHARING_KEY = "sharing";
export const LAST_SHARED_KEY = "lastSharedAt";
const CURSOR_KEY = "shareCursor";

export interface PullCursor {
  ts: string;
  id: string;
}

export interface RemoteRow {
  tbl: SharedTable;
  id: string;
  data: Record<string, unknown>;
  updated_at: number;
  deleted: boolean;
  server_updated_at: string;
}

export interface Remote {
  push(household: string, rows: Omit<RemoteRow, "server_updated_at">[]): Promise<void>;
  /** Rows strictly after `after` in (server_updated_at, id) order. */
  pull(household: string, after: PullCursor | null, limit: number): Promise<RemoteRow[]>;
}

export class RemoteError extends Error {
  constructor(
    message: string,
    readonly kind: "offline" | "auth" | "schema" | "gone" | "other"
  ) {
    super(message);
  }
}

export type SyncState = "idle" | "syncing" | "offline" | "error";
export interface SyncStatus {
  state: SyncState;
  /** A calm sentence for Settings, or null. */
  note: string | null;
}

const PUSH_BATCH = 200;
const PULL_PAGE = 500;
const MAX_ROUNDS = 50;
const REWIND_MS = 5_000;

/** Local row → what's stored in the share. The street address stays on this phone. */
export function toRemote(t: SharedTable, row: Row): Omit<RemoteRow, "server_updated_at"> {
  const data: Record<string, unknown> = { ...row };
  delete data.dirty;
  if (t === "households") data.address = null;
  return { tbl: t, id: row.id, data, updated_at: row.updated_at, deleted: !!row.deleted_at };
}

/** A shared row → local, keeping this phone's own address. */
export function fromRemote(r: RemoteRow, local: Row | undefined): Row {
  const row = { ...r.data, id: r.id, updated_at: r.updated_at, dirty: 0 } as unknown as Row & { address?: unknown };
  if (r.tbl === "households") row.address = (local as unknown as { address?: unknown } | undefined)?.address ?? null;
  return row;
}

/** Drops sub-millisecond digits so every engine parses it, then steps back a little. */
function rewind(ts: string): string {
  const ms = Date.parse(ts.replace(/(\.\d{3})\d+/, "$1"));
  return Number.isNaN(ms) ? ts : new Date(ms - REWIND_MS).toISOString();
}

export class SyncEngine {
  private running: Promise<void> | null = null;
  private again = false;
  private status: SyncStatus = { state: "idle", note: null };
  private listeners = new Set<() => void>();

  constructor(
    private readonly db: FieldDB,
    private readonly remote: Remote,
    private readonly sharing: () => Promise<Sharing | undefined>,
    /** Checks this account's place in the field before each run; returns it fresh (role changes), or throws "gone". */
    private readonly preflight?: (s: Sharing) => Promise<Sharing>
  ) {}

  getStatus = (): SyncStatus => this.status;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach((fn) => fn());
  }

  /** Runs a sync; calls made meanwhile fold into one more run. */
  sync(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
          if (locks) await locks.request(`uchibatake-sync-${this.db.name}`, () => this.runOnce());
          else await this.runOnce();
        } while (this.again);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async runOnce(): Promise<void> {
    let sharing = await this.sharing();
    if (!sharing) return;
    this.set({ state: "syncing", note: null });
    try {
      if (this.preflight) sharing = await this.preflight(sharing);
      // A phone joining an existing share takes what's there first.
      if ((await getMeta<number>(this.db, LAST_SHARED_KEY)) === undefined) await this.pull(sharing.household);
      await this.push(sharing);
      await this.pull(sharing.household);
      await setMeta(this.db, LAST_SHARED_KEY, Date.now());
      this.set({ state: "idle", note: null });
    } catch (err) {
      const kind = err instanceof RemoteError ? err.kind : "other";
      this.set({
        state: kind === "offline" ? "offline" : "error",
        note:
          kind === "offline"
            ? "Offline. Changes will be shared when you're back online."
            : kind === "auth"
              ? "Sign in again to keep sharing."
              : kind === "gone"
                ? "This phone isn't part of the shared field any more."
                : kind === "schema"
                  ? "Sharing isn't set up on the server yet."
                  : "Sharing paused for a moment. It will try again.",
      });
    }
  }

  private table(t: SharedTable): Table<Row, string> {
    return this.db[t] as unknown as Table<Row, string>;
  }

  private async push(sharing: Sharing): Promise<void> {
    for (const t of SHARED_TABLES) {
      // A helper's changes to other things stay on this phone (the server wouldn't take them).
      if (!canWrite(sharing.role, t)) continue;
      const table = this.table(t);
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const rows = await table.where("dirty").equals(1).limit(PUSH_BATCH).toArray();
        if (!rows.length) break;
        await this.remote.push(sharing.household, rows.map((r) => toRemote(t, r)));
        await this.db.transaction("rw", table, async () => {
          const now = await table.bulkGet(rows.map((r) => r.id));
          const clean = rows.filter((r, i) => now[i]?.dirty === 1 && now[i]?.updated_at === r.updated_at).map((r) => ({ key: r.id, changes: { dirty: 0 as const } }));
          if (clean.length) await table.bulkUpdate(clean);
        });
        if (rows.length < PUSH_BATCH) break;
      }
    }
  }

  private async pull(household: string): Promise<void> {
    const stored = await getMeta<PullCursor>(this.db, CURSOR_KEY);
    let after: PullCursor | null = stored ? { ts: rewind(stored.ts), id: "" } : null;
    let last: PullCursor | null = null;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const rows = await this.remote.pull(household, after, PULL_PAGE);
      if (!rows.length) break;
      const byTable = new Map<SharedTable, RemoteRow[]>();
      for (const r of rows) if ((SHARED_TABLES as readonly string[]).includes(r.tbl)) byTable.set(r.tbl, [...(byTable.get(r.tbl) ?? []), r]);
      await this.db.transaction("rw", SHARED_TABLES.map((t) => this.table(t)), async () => {
        for (const [t, list] of byTable) {
          const table = this.table(t);
          const locals = await table.bulkGet(list.map((r) => r.id));
          // Newest wins; an unpushed edit here that's at least as new stays.
          const incoming: Row[] = [];
          list.forEach((r, i) => {
            const local = locals[i];
            if (!local || (local.dirty === 1 ? local.updated_at < r.updated_at : local.updated_at <= r.updated_at)) incoming.push(fromRemote(r, local));
          });
          if (incoming.length) await table.bulkPut(incoming);
        }
      });
      const tail = rows[rows.length - 1];
      last = after = { ts: tail.server_updated_at, id: tail.id };
      if (rows.length < PULL_PAGE) break;
    }
    if (last) await setMeta(this.db, CURSOR_KEY, last);
  }
}

/** Forgets this phone's share bookkeeping (sharing off, or a different field). */
export async function forgetSharing(db: FieldDB): Promise<void> {
  await db.meta.bulkDelete([SHARING_KEY, LAST_SHARED_KEY, CURSOR_KEY]);
}
