import { supabase } from "../supabase";
import { getMeta, setMeta, type FieldDB } from "./db";
import { createInvite, deleteAccount, joinWith, myField, share, type Membership } from "./remote";
import { supabaseRemote } from "./remote";
import { live, update } from "./repo";
import type { Session } from "./session";
import { forgetSharing, LAST_SHARED_KEY, RemoteError, SHARED_TABLES, SHARING_KEY, SyncEngine, type Sharing } from "./sync";
import type { Role, Row } from "./types";

/*
 * Sharing, as the app uses it: on and off, a new phone finding its field,
 * joining with an invite, and the one engine per field database.
 */

const engines = new Map<string, SyncEngine>();

/** The sync engine for this database, or null where sharing can't exist (no Supabase). */
export function engineFor(db: FieldDB): SyncEngine | null {
  const sb = supabase();
  if (!sb) return null;
  let e = engines.get(db.name);
  if (!e) {
    e = new SyncEngine(db, supabaseRemote(sb), () => getMeta<Sharing>(db, SHARING_KEY), async (s) => {
      const m = await myField(sb);
      // Removed from the field (or it was deleted): stop sharing here; the field stays on this phone.
      if (!m || m.household !== s.household) {
        await forgetSharing(db);
        throw new RemoteError("not in this field", "gone");
      }
      if (m.role !== s.role) await setMeta(db, SHARING_KEY, { household: m.household, role: m.role } satisfies Sharing);
      return { household: m.household, role: m.role };
    });
    engines.set(db.name, e);
  }
  return e;
}

const client = () => {
  const sb = supabase();
  if (!sb) throw new Error("Sharing needs Supabase");
  return sb;
};

/** Every shared row counts as changed, so the next sync sends the whole field. */
async function markAllDirty(db: FieldDB) {
  await db.transaction("rw", SHARED_TABLES.map((t) => db[t]), async () => {
    for (const t of SHARED_TABLES) await (db[t] as unknown as { toCollection(): { modify(c: Partial<Row>): Promise<number> } }).toCollection().modify({ dirty: 1 });
  });
}

/** Empties the field on this phone (before another field replaces it). */
async function clearField(db: FieldDB) {
  await db.transaction("rw", [...SHARED_TABLES.map((t) => db[t]), db.photos, db.meta], async () => {
    for (const t of SHARED_TABLES) await db[t].clear();
    await db.photos.clear();
    await forgetSharing(db);
    await db.meta.bulkDelete(["forecastAppliedAt", "notesSent"]);
  });
}

export type ShareResult = { ok: true } | { other: Membership };

/**
 * "Share between phones": registers this field and sends it. If this account
 * already shares a different field, nothing changes and that one is returned.
 */
export async function turnOnSharing(db: FieldDB, session: Extract<Session, { kind: "account" }>, householdId: string): Promise<ShareResult> {
  const sb = client();
  const m = await share(sb, householdId);
  if (m.household !== householdId) return { other: m };
  // Same id, but this phone has never shared and the share already has rows: another phone of this
  // account shared its own field first. Ask, rather than mixing the two.
  if ((await getMeta<number>(db, LAST_SHARED_KEY)) === undefined && (await hasRows(sb, m.household))) return { other: m };
  // The owner is this account on every phone.
  const owner = (await live(db.members)).find((x) => x.role === "owner" && !x.user_id);
  if (owner) await update(db.members, owner.id, { user_id: session.id });
  await markAllDirty(db);
  await setMeta(db, SHARING_KEY, { household: m.household, role: m.role } satisfies Sharing);
  await engineFor(db)?.sync();
  return { ok: true };
}

/** Runs a sync and says whether it worked (the engine itself never throws; it sets a status). */
async function syncedOk(db: FieldDB): Promise<boolean> {
  const e = engineFor(db);
  if (!e) return false;
  await e.sync();
  return e.getStatus().state === "idle";
}

/**
 * Uses the account's shared field on this phone, in place of the one here.
 * If it can't be fetched, the phone is left empty and not sharing (never a
 * half field that would be pushed into the family's), and this throws.
 */
export async function adoptSharedField(db: FieldDB, m: Membership): Promise<void> {
  await clearField(db);
  await setMeta(db, SHARING_KEY, { household: m.household, role: m.role } satisfies Sharing);
  if (!(await syncedOk(db)) || !(await live(db.households)).length) {
    await clearField(db);
    throw new RemoteError("couldn't fetch the shared field", "offline");
  }
}

/** The account's shared field, brought to this phone (after a join that couldn't finish, or a second phone). */
export async function adoptMyField(db: FieldDB): Promise<boolean> {
  const m = await myField(client());
  if (!m) return false;
  await adoptSharedField(db, m);
  return true;
}

async function hasRows(sb: ReturnType<typeof client>, household: string): Promise<boolean> {
  const { count, error } = await sb.from("uchi_rows").select("id", { count: "exact", head: true }).eq("household_id", household);
  if (error) throw new RemoteError(error.message, "other");
  return (count ?? 0) > 0;
}

/** Stops sharing on this phone. The field stays here; the shared copy stays for the family. */
export async function turnOffSharing(db: FieldDB): Promise<void> {
  await forgetSharing(db);
}

/** A phone signing in with no field yet: if the account shares one, bring it here. */
export async function restoreOnSignIn(db: FieldDB): Promise<boolean> {
  const sb = supabase();
  if (!sb || (await live(db.households)).length) return false;
  const m = await myField(sb).catch(() => null);
  if (!m) return false;
  try {
    await adoptSharedField(db, m);
    return true;
  } catch {
    return false; // offline: this phone starts on its own; Settings can bring the shared field later
  }
}

/** M13 "Join the field": the family's field replaces the one on this phone. */
export async function joinFamily(db: FieldDB, code: string): Promise<void> {
  const m = await joinWith(client(), code);
  await adoptSharedField(db, m);
}

/** "Send a link": the invite URL for one member of the family. */
export async function inviteLink(role: "editor" | "helper", memberId: string, inviterName: string | null): Promise<string> {
  const code = await createInvite(client(), role, memberId, inviterName);
  return new URL(`/join/${code}`, location.origin).toString();
}

/** M17b: removes the account on the server (and the shared field, if no one else is in it). */
export async function deleteAccountEverywhere(): Promise<void> {
  await deleteAccount(client());
}

export const isSharing = async (db: FieldDB) => !!(await getMeta<Sharing>(db, SHARING_KEY));
export const lastShared = (db: FieldDB) => getMeta<number>(db, LAST_SHARED_KEY);
export type { Role };

const JOIN_KEY = "uchibatake-join";
const JOIN_FOR_MS = 60 * 60_000;

/** An invite opened before signing in: remembered for an hour (an email link opens in a new tab). */
export function rememberJoin(code: string) {
  try {
    localStorage.setItem(JOIN_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Not kept: they can open the link again after signing in.
  }
}

export function pendingJoin(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(JOIN_KEY) ?? "null") as { code?: unknown; at?: unknown } | null;
    localStorage.removeItem(JOIN_KEY);
    if (!v || typeof v.code !== "string" || typeof v.at !== "number" || Date.now() - v.at > JOIN_FOR_MS) return null;
    return /^[0-9a-f]{32,80}$/.test(v.code) ? v.code : null;
  } catch {
    return null;
  }
}
