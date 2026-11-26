import { getMeta, setMeta, type FieldDB } from "./data/db";
import { getSettings, live } from "./data/repo";
import { tasksForDay } from "./data/queries";
import { isoDate } from "./dates";
import type { Settings } from "./data/types";
import { deg } from "./forecast";

/*
 * Gentle notes (M05): one a day at the hour the family chose, and a warning
 * when there's frost tonight. Never during quiet hours, never more than that,
 * and only after they've allowed notes. Without a push server (that comes
 * with sync), notes are sent while Uchibatake is open or running on the phone.
 */

export const notesAllowed = () => typeof Notification !== "undefined" && Notification.permission === "granted";

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Quiet hours wrap midnight (21:00 to 07:00). */
export function isQuiet(now: Date, q: Settings["quietHours"]): boolean {
  const m = now.getHours() * 60 + now.getMinutes();
  const from = minutes(q.from);
  const to = minutes(q.to);
  return from <= to ? m >= from && m < to : m >= from || m < to;
}

async function show(title: string, body: string, tag: string, url: string) {
  const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (reg) await reg.showNotification(title, { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url } });
  else new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
}

/** Sends today's note and a frost warning if they're due and not sent yet. */
export async function sendDueNotes(db: FieldDB, now = new Date()): Promise<void> {
  if (!notesAllowed()) return;
  // One check at a time across tabs, so a note is never sent twice.
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (locks) return void (await locks.request("uchibatake-notes", { ifAvailable: true }, async (lock) => (lock ? check(db, now) : undefined)));
  return check(db, now);
}

let running = false;
async function check(db: FieldDB, now: Date): Promise<void> {
  if (running) return;
  running = true;
  try {
    await checkInner(db, now);
  } finally {
    running = false;
  }
}

async function checkInner(db: FieldDB, now: Date): Promise<void> {
  const settings = await getSettings(db);
  if (isQuiet(now, settings.quietHours)) return;
  const today = isoDate(now);
  const sent = (await getMeta<Record<string, string>>(db, "notesSent")) ?? {};

  if (settings.dailyRound && sent.daily !== today && now.getHours() * 60 + now.getMinutes() >= minutes(settings.dailyRound)) {
    const open = tasksForDay(await db.tasks.toArray(), today).filter((t) => !t.done_at);
    const first = open[0]?.title ?? "";
    if (open.length) await show("Today in the field", open.length === 1 ? `One small thing: ${first.charAt(0).toLowerCase()}${first.slice(1)}.` : `${open.length} small things today. No rush.`, "daily", "/");
    sent.daily = today;
  }

  if (settings.frostWarnings && sent.frost !== today) {
    const frost = (await live(db.notices)).find((n) => n.kind === "frost" && n.for_date === today);
    // The warning goes out when it's useful: about an hour before sunset (the notice's time), or from 15:00.
    const due = frost ? minutes(frost.remind_at ?? "15:00") <= now.getHours() * 60 + now.getMinutes() : false;
    if (frost && due) {
      const left = frost.checklist.filter((c) => !c.done_at).length;
      await show("Frost tonight", `${frost.low !== null ? `Down to ${deg(frost.low, settings.units)}. ` : ""}${left ? `${left} ${left === 1 ? "thing" : "things"} before dark.` : "Everything's done."}`, "frost", `/notice/${frost.id}`);
      sent.frost = today;
    }
  }
  await setMeta(db, "notesSent", sent);
}
