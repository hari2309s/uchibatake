import { cn } from "./cn";

const LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Months (0–11) as a readable list: "October to December", "June and July". */
export function monthsText(months: number[]): string {
  const m = [...new Set(months)].sort((a, b) => a - b);
  if (!m.length) return "none";
  const runs: number[][] = [];
  for (const x of m) {
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1] === x - 1) run.push(x);
    else runs.push([x]);
  }
  // A run that wraps the year end (Nov, Dec + Jan) reads as one span.
  if (runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1].at(-1) === 11) runs.unshift([...(runs.pop() as number[]), ...(runs.shift() as number[])]);
  // Short runs are listed month by month; three or more read as a span.
  const parts = runs.flatMap((r) => (r.length < 3 ? r.map((x) => NAMES[x]) : [`${NAMES[r[0]]} to ${NAMES[r.at(-1) as number]}`]));
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/**
 * Month strip (04 Grow guide): twelve columns with 15–16px initials, outlined
 * cells for planting, filled for harvest, one dot under the current month
 * (bold initial). A one-line reading follows as `caption`.
 */
export function MonthStrip({ plant, harvest, now, caption, plantLabel = "Plant", harvestLabel = "Harvest" }: { plant: number[]; harvest: number[]; now: number; caption?: string; plantLabel?: string; harvestLabel?: string }) {
  return (
    <figure>
      <figcaption className="sr-only">
        {plantLabel}: {monthsText(plant)}. {harvestLabel}: {monthsText(harvest)}. It is now {NAMES[now]}.
      </figcaption>
      <div aria-hidden className="grid items-center gap-[3px] text-[16px]" style={{ gridTemplateColumns: "62px repeat(12, minmax(0, 1fr))" }}>
        <span />
        {LETTERS.map((l, i) => (
          <span key={i} className={cn("text-center", i === now && "font-bold")}>
            {l}
          </span>
        ))}
        <span className="text-ink-soft">{plantLabel}</span>
        {LETTERS.map((_, i) => (
          <span key={i} className={cn("h-[18px]", plant.includes(i) && "border-[1.5px] border-ink")} />
        ))}
        <span className="text-ink-soft">{harvestLabel}</span>
        {LETTERS.map((_, i) => (
          <span key={i} className={cn("h-[18px]", harvest.includes(i) && "bg-ink")} />
        ))}
        <span />
        {LETTERS.map((_, i) => (
          <span key={i} className="flex justify-center">
            {i === now ? <span className="h-[7px] w-[7px] rounded-full bg-ink" /> : null}
          </span>
        ))}
      </div>
      {caption ? <p className="mt-2 text-[16px] text-ink-soft">{caption}</p> : null}
    </figure>
  );
}
