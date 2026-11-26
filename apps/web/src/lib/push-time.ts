/** Local minutes since midnight and YYYY-MM-DD for `now` in `tz` (UTC for an unknown zone). */
export function localNow(now: Date, tz: string): { minutes: number; date: string } {
  const fmt = (zone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = fmt(tz);
  } catch {
    parts = fmt("UTC");
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")), date: `${get("year")}-${get("month")}-${get("day")}` };
}

/** How late a missed wake (a slow or failed tick) may still be sent. */
export const CATCH_UP_MIN = 60;

/** Due: its time has come today (local), within the catch-up window, and it hasn't been woken today. */
export function isDue(sub: { hour: number; minute: number; tz: string; last_sent_on: string | null }, now: Date): { due: boolean; date: string } {
  const local = localNow(now, sub.tz);
  const wake = sub.hour * 60 + sub.minute;
  return { due: sub.last_sent_on !== local.date && local.minutes >= wake && local.minutes < wake + CATCH_UP_MIN, date: local.date };
}

/** The quarter hour a "HH:MM" daily note is woken: never earlier than chosen (08:10 → 08:15). */
export function wakeTime(hhmm: string): { hour: number; minute: number } {
  const total = Math.ceil((Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))) / 15) * 15;
  return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
}
