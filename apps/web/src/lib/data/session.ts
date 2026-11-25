/**
 * Who this device is using the app as, before accounts exist (Phase 3):
 * a guest (their own field, on this device only) or the demo household.
 * Stored per device; each kind has its own database. If the browser blocks
 * storage, the session still works for this page (kept in memory).
 */
import { forgetFieldDB } from "./db";

export type Session = { kind: "guest"; id: string } | { kind: "demo"; id: "demo" };

const KEY = "uchibatake-session";
/** The guest field's id outlives the session, so leaving and coming back finds the same field. */
const GUEST_KEY = "uchibatake-guest-id";

const listeners = new Set<() => void>();
let snapshot: { raw: string | null; value: Session | null } = { raw: null, value: null };
/** Used when storage is blocked. */
let memory: Session | null = null;

function getItem(key: string): string | null | undefined {
  try {
    return localStorage.getItem(key);
  } catch {
    return undefined; // blocked
  }
}

function setItem(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parse(raw: string | null): Session | null {
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v?.kind === "demo") return { kind: "demo", id: "demo" };
    if (v?.kind === "guest" && typeof v.id === "string") return { kind: "guest", id: v.id };
  } catch {
    // A damaged value is the same as none.
  }
  return null;
}

export function readSession(): Session | null {
  const raw = getItem(KEY);
  if (raw === undefined) return memory;
  // Same string, same object: useSyncExternalStore needs a stable snapshot.
  if (raw !== snapshot.raw) snapshot = { raw, value: parse(raw) };
  return snapshot.value;
}

function write(s: Session | null) {
  memory = s;
  setItem(KEY, s ? JSON.stringify(s) : null);
  listeners.forEach((l) => l());
}

export function subscribeSession(l: () => void): () => void {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Opens the demo with a fresh copy of the household (any earlier demo changes are wiped). */
export async function startDemo(): Promise<void> {
  await forgetFieldDB("demo");
  write({ kind: "demo", id: "demo" });
}

/** Starts this device's guest field, or comes back to it. */
export function startGuest(): void {
  if (readSession()?.kind === "guest") return;
  let id = getItem(GUEST_KEY) || (memory?.kind === "guest" ? memory.id : null);
  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    setItem(GUEST_KEY, id);
  }
  write({ kind: "guest", id });
}

/** Leaves the demo or the guest field. A guest's field stays on this device; "Start my own field" reopens it. */
export function endSession(): void {
  write(null);
}

/** Deletes this device's guest field for good. */
export async function deleteGuestField(): Promise<void> {
  const id = getItem(GUEST_KEY);
  if (readSession()?.kind === "guest") write(null);
  if (id) await forgetFieldDB(id);
  setItem(GUEST_KEY, null);
}
