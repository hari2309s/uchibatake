"use client";

import { getMeta, setMeta, type FieldDB } from "./data/db";
import { getSettings } from "./data/repo";
import type { Session } from "./data/session";
import { isQuiet, notesAllowed } from "./notify";
import { CATCH_UP_MIN, wakeTime } from "./push-time";
import { supabase } from "./supabase";

/*
 * The daily note while the app is closed (accounts only): this browser's push
 * address and the hour are kept on our server; the push itself carries nothing
 * from the field. sw.js reads the field named in a small pointer below.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
export const PUSH_CONFIGURED = !!PUBLIC_KEY;

const STATE_CACHE = "uchibatake-state";
const STATE_URL = "/__sw-state";

/** Tells the service worker which field this phone uses (or none). */
async function pointServiceWorkerAt(dbName: string | null) {
  if (typeof caches === "undefined") return;
  const c = await caches.open(STATE_CACHE);
  if (dbName) await c.put(STATE_URL, new Response(JSON.stringify({ db: dbName }), { headers: { "content-type": "application/json" } }));
  else await c.delete(STATE_URL);
}

function key(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || typeof PushManager === "undefined") return undefined;
  return navigator.serviceWorker.getRegistration();
}

let chain: Promise<void> = Promise.resolve();

/**
 * Keeps this browser's push in step with Settings: on for a signed-in phone
 * with notes allowed and a daily note outside quiet hours; off otherwise.
 * Runs one at a time, so quick changes can't land on the server out of order.
 */
export function syncPush(db: FieldDB, session: Session): Promise<void> {
  chain = chain.then(() => syncPushNow(db, session)).catch(() => undefined);
  return chain;
}

/** The note can reach the phone closed: what Settings says depends on it. */
export const PUSH_ON_KEY = "pushClaimed";

async function syncPushNow(db: FieldDB, session: Session): Promise<void> {
  // A guest or the demo never changes the browser's push: it may belong to an account on this phone.
  if (session.kind !== "account") return;
  const reg = await registration();
  const sb = supabase();
  const settings = await getSettings(db);
  const wake = settings.dailyRound ? wakeTime(settings.dailyRound) : null;
  // Quiet hours always win: not when the wake (or its catch-up hour) could fall in them.
  const quiet = (min: number) => isQuiet(new Date(2026, 0, 1, Math.floor(min / 60) % 24, min % 60), settings.quietHours);
  const start = wake ? wake.hour * 60 + wake.minute : 0;
  const want = !!reg && !!sb && PUSH_CONFIGURED && notesAllowed() && !!wake && !quiet(start) && !quiet(start + CATCH_UP_MIN - 1);
  const existing = reg ? await reg.pushManager.getSubscription() : null;
  if (!want) {
    if (existing) {
      if (sb) await sb.rpc("uchi_drop_push", { p_endpoint: existing.endpoint });
      await existing.unsubscribe();
    }
    await setMeta(db, PUSH_ON_KEY, null);
    return;
  }
  await pointServiceWorkerAt(db.name);
  const sub = existing ?? (await reg!.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(PUBLIC_KEY!) }));
  const j = sub.toJSON();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  // Claimed again once a day too, in case the server dropped the row (a failed send, another account).
  const claim = `${session.id}|${sub.endpoint}|${wake!.hour}:${wake!.minute}|${tz}|${new Date().toDateString()}`;
  if ((await getMeta<string>(db, PUSH_ON_KEY)) === claim) return;
  const { error } = await sb!.rpc("uchi_claim_push", { p_endpoint: sub.endpoint, p_p256dh: j.keys?.p256dh ?? "", p_auth: j.keys?.auth ?? "", p_hour: wake!.hour, p_minute: wake!.minute, p_tz: tz });
  await setMeta(db, PUSH_ON_KEY, error ? null : claim);
}

/** Signing out or deleting: this browser stops getting the account's note, and the worker forgets the field. */
export async function stopPushHere(): Promise<void> {
  try {
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase()?.rpc("uchi_drop_push", { p_endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    await pointServiceWorkerAt(null);
  } catch {
    // Best effort: an orphaned address is removed on its first failed send.
  }
}
