import { cn } from "./cn";

const LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * The year as twelve cells (MC01, MC06, MC13, MC14): solid = something to
 * pick, dashed = an empty stretch. With `sheltered`, a second row shows the
 * year with shelter: months that are new there are drawn in sumi, the rest in
 * soft ink. The cells draw in from January to December; new months fill like
 * ink soaking in.
 */
export function MonthBand({ outside, sheltered, now, outsideLabel, shelteredLabel }: { outside: boolean[]; sheltered?: boolean[]; now: number; outsideLabel?: string; shelteredLabel?: string }) {
  const row = (cells: boolean[], kind: "outside" | "sheltered") => (
    <div className="grid grid-cols-12 gap-[3px]">
      {cells.map((on, i) => {
        const isNew = kind === "sheltered" && on && !outside[i];
        return (
          <span
            key={i}
            className={cn(
              "band-cell h-[22px]",
              on ? (kind === "outside" && sheltered ? "bg-ink-soft" : "bg-ink") : "border-[1.5px] border-dashed border-rule-dash",
              isNew && "band-new"
            )}
            style={{ animationDelay: `${(kind === "sheltered" ? 240 : 0) + i * 60}ms` } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
  const months = (cells: boolean[]) => {
    const on = cells.map((c, i) => (c ? NAMES[i] : null)).filter(Boolean);
    return on.length === 12 ? "every month" : on.length ? on.join(", ") : "no month yet";
  };
  return (
    <figure className="flex flex-col gap-2.5">
      <figcaption className="sr-only">
        {outsideLabel ?? "Outside"}: something to pick in {months(outside)}.{sheltered ? ` ${shelteredLabel ?? "With shelter"}: ${months(sheltered)}.` : ""} It is now {NAMES[now]}.
      </figcaption>
      <div aria-hidden className="flex flex-col gap-2.5">
        {outsideLabel ? <span className="text-[16px] text-ink-soft">{outsideLabel}</span> : null}
        {row(outside, "outside")}
        {sheltered ? (
          <>
            {shelteredLabel ? <span className="pt-1 text-[16px]">{shelteredLabel}</span> : null}
            {row(sheltered, "sheltered")}
          </>
        ) : null}
        <div className="grid grid-cols-12 gap-[3px] pt-0.5 text-center font-mincho text-[16px]">
          {LETTERS.map((l, i) => (
            <span key={i} className={cn("flex flex-col items-center gap-1", i === now ? "font-bold text-ink" : "text-ink-soft")}>
              {l}
              {i === now ? <span className="h-[6px] w-[6px] rounded-full bg-ink" /> : null}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
