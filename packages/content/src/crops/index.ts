import { almanacDay, MICROSEASONS } from "../microseasons.ts";
import type { ClimateType } from "../seasons/types.ts";
import { CROPS } from "./data.ts";
import type { ClimateWindows, Crop, Neighbour, Window } from "./types.ts";

export * from "./types.ts";
export { CROPS };

const BY_ID = new Map(CROPS.map((c) => [c.id, c]));

export function cropById(id: string): Crop | undefined {
  return BY_ID.get(id);
}

/** Search by name or other name: "pea" finds pea shoots, garden pea, sugar snap. */
export function searchCrops(q: string): Crop[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const score = (c: Crop) => {
    const names = [c.name, ...(c.aka ?? [])].map((n) => n.toLowerCase());
    if (names.some((n) => n === s)) return 0;
    if (names.some((n) => n.startsWith(s))) return 1;
    if (names.some((n) => n.split(/[\s-]/).some((w) => w.startsWith(s)))) return 2;
    if (names.some((n) => n.includes(s))) return 3;
    return 9;
  };
  return CROPS.map((c) => [c, score(c)] as const)
    .filter(([, sc]) => sc < 9)
    .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name))
    .map(([c]) => c);
}

const neighbourName = (n: Neighbour) => (typeof n === "string" ? (BY_ID.get(n)?.name ?? n) : n.name);

/** Names of good neighbours / ones to keep apart, for the grow guide. */
export function neighbours(crop: Crop): { good: string[]; apart: string[] } {
  return { good: (crop.goodWith ?? []).map(neighbourName), apart: (crop.keepApart ?? []).map(neighbourName) };
}

/** True when two crops don't get on (either one says so). */
export function clashes(a: string, b: string): boolean {
  const ca = BY_ID.get(a);
  const cb = BY_ID.get(b);
  return !!(ca?.keepApart?.includes(b) || cb?.keepApart?.includes(a));
}

/** Months (0–11) a set of windows touches, for the month strip. */
export function windowMonths(windows: Window[] | undefined): number[] {
  const out = new Set<number>();
  for (const win of windows ?? []) {
    const [fm] = win.from.split("-").map(Number);
    const [tm] = win.to.split("-").map(Number);
    let m = fm - 1;
    out.add(m);
    while (m !== tm - 1) {
      m = (m + 1) % 12;
      out.add(m);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** Microseason indexes (0–71) a set of windows touches, for the ring's dots. */
export function windowMicroseasons(windows: Window[] | undefined): number[] {
  const out = new Set<number>();
  for (const win of windows ?? []) {
    const from = almanacDay(win.from);
    const to = almanacDay(win.to);
    const inside = (p: number) => (from <= to ? p >= from && p <= to : p >= from || p <= to);
    MICROSEASONS.forEach((m, i) => {
      // Almanac positions rise through the year; the last microseason runs to the year's end.
      const start = almanacDay(m.start);
      const end = i === 71 ? 365 : almanacDay(MICROSEASONS[i + 1].start) - 1;
      for (let p = start; p <= end; p++) if (inside(p)) return void out.add(i);
    });
  }
  return [...out].sort((a, b) => a - b);
}

/** Is a "MM-DD" inside any of the windows? */
export function inWindows(md: string, windows: Window[] | undefined): boolean {
  const p = almanacDay(md);
  return (windows ?? []).some((win) => {
    const from = almanacDay(win.from);
    const to = almanacDay(win.to);
    return from <= to ? p >= from && p <= to : p >= from || p <= to;
  });
}

/** The windows for a climate; southern temperate places use the northern dates shifted half a year. */
export function windowsFor(crop: Crop, climate: ClimateType, hemisphere: 1 | -1 = 1): ClimateWindows | undefined {
  // Only temperate dates are shifted; other climates say less until they have their own data.
  if (climate !== "temperate" || hemisphere === 1) return crop.windows[climate];
  const base = crop.windows.temperate;
  if (!base) return undefined;
  const shift = (md: string) => {
    const [m, d] = md.split("-").map(Number);
    const month = ((m + 5) % 12) + 1;
    // Keep the day valid in the new month (31 Aug → 28 Feb).
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    return `${String(month).padStart(2, "0")}-${String(Math.min(d, days)).padStart(2, "0")}`;
  };
  const sh = (ws?: Window[]) => ws?.map((x) => ({ from: shift(x.from), to: shift(x.to) }));
  return { sowIndoors: sh(base.sowIndoors), sow: sh(base.sow), plantOut: sh(base.plantOut), harvest: sh(base.harvest) };
}
