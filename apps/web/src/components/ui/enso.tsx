import { cn } from "./cn";

/**
 * Style that draws a circular brush stroke of length `len` on a ring of
 * circumference `c`: one dash as long as the ring, pulled into view by the
 * offset. Used for every ensō, so they all draw themselves on arrival.
 */
export function brushDraw(len: number, c: number, delay = 0, duration = 900): React.CSSProperties {
  return {
    strokeDasharray: `${c} ${c}`,
    strokeDashoffset: c - len,
    "--c": c,
    "--o": c - len,
    animation: `ensodraw ${duration}ms ${delay}ms cubic-bezier(.2,.8,.3,1) both`,
  } as React.CSSProperties;
}

/** Ensō arc length for a progress value (0–100) on a circle of circumference `c`. Never fully closes unless asked. */
export function ensoDash(value: number, c: number, closed = false): number {
  const v = Math.max(0, Math.min(100, value));
  if (closed) return c;
  // The frames run from a short stroke (~13% "just sown") to ~95% ("ready"): an ensō never quite closes.
  return Math.max(c * 0.06, (v / 100) * c * 0.955);
}

/**
 * Brush ensō progress ring. Geometry from the Home space cards (52px box, r 20,
 * stroke 4.5, starts at −80°). Near the end a second, fainter stroke appears,
 * like a brush going round twice ("Ready to snip").
 */
/** `weight`: stroke width in the ring's own units (52 across). Big rings use a lighter brush, as the frames do. */
export function Enso({ value, size = 52, closed = false, label, className, draw = true, weight = 4.5 }: { value: number; size?: number; closed?: boolean; label?: string; className?: string; draw?: boolean; weight?: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const dash = ensoDash(value, c, closed);
  const second = value >= 85 && !closed;
  const stroke = (len: number, delay: number) => (draw ? brushDraw(len, c, delay) : { strokeDasharray: `${len} 400` });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block flex-none", className)}
    >
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--ink)" strokeWidth={weight} strokeLinecap="round" transform="rotate(-80 26 26)" style={stroke(dash, 0)} />
      {second ? <circle cx="26.6" cy="25.4" r="19" fill="none" stroke="var(--ink)" strokeWidth={weight * 0.27} strokeLinecap="round" transform="rotate(-68 26 26)" opacity=".45" style={stroke(dash * 0.82, 260)} /> : null}
    </svg>
  );
}

/** Broken ensō (15d error): two brush arcs that don't meet. */
export function BrokenEnso({ size = 180, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" aria-hidden className={cn("block", className)}>
      <circle cx="90" cy="90" r="70" fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" transform="rotate(-80 90 90)" style={brushDraw(150, 2 * Math.PI * 70, 100, 1000)} />
      <circle cx="93" cy="94" r="70" fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" transform="rotate(80 90 90)" style={brushDraw(180, 2 * Math.PI * 70, 700, 1000)} />
    </svg>
  );
}

/**
 * Ink-drop loader (15c): a brush ensō draws itself while two ink rings spread
 * from the centre, on a 2.4 s cycle. For network waits, and (through
 * PageLoader, after a short pause) while a screen's data loads.
 */
export function InkDropLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("relative h-[150px] w-[150px]", className)}>
      <span className="absolute inset-[30px] rounded-full border-[1.5px] border-ink" style={{ animation: "inkdrop 2.4s ease-out infinite" }} />
      <span className="absolute inset-[30px] rounded-full border-[1.5px] border-ink" style={{ animation: "inkdrop 2.4s 1.2s ease-out infinite" }} />
      <svg width="150" height="150" className="absolute inset-0" aria-hidden>
        <circle
          cx="75"
          cy="75"
          r="52"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="560"
          style={{ transform: "rotate(-70deg)", transformOrigin: "75px 75px", animation: "brushdraw 2.4s ease-in-out infinite" }}
        />
      </svg>
      <span className="absolute left-[69px] top-[69px] h-3 w-3 rounded-full bg-ink" />
    </div>
  );
}

/** Placeholder lines while something loads: soft brush strokes, not grey boxes. */
export function BrushLines({ widths = [70, 92, 56], className }: { widths?: number[]; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-[18px]", className)}>
      {widths.map((w, i) => (
        <span key={i} className="h-2.5 rounded-[5px] bg-wash" style={{ width: `${w}%`, animation: `brushfade 2.4s ${i * 0.3}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}
