"use client";

import { cn } from "./cn";

/**
 * Gentle stepper. "large": 56px − / + with the amount in Mincho 36 and an
 * everyday measure underneath (06a). "small": 44px buttons, Mincho 34 (A 05).
 */
/** `label` names the group for screen readers; the visible label sits beside it on screen (as in the frames). */
export function Stepper({ label, value, display, measure, onChange, min = 0, max = Infinity, step = 1, size = "large" }: { label: string; value: number; display?: string; measure?: string; onChange: (v: number) => void; min?: number; max?: number; step?: number; size?: "large" | "small" }) {
  const big = size === "large";
  const btn = cn("flex flex-none items-center justify-center rounded-full border-[1.5px] border-ink disabled:opacity-30", big ? "h-14 w-14 text-[24px]" : "h-11 w-11 text-[22px]");
  return (
    <div role="group" aria-label={label} className={cn("flex items-center", big ? "justify-between" : "gap-3.5")}>
      <button type="button" className={btn} aria-label="Less" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <div className="flex flex-col items-center" aria-live="polite">
        {/* Keyed, so each new amount presses into place. */}
        <span key={display ?? value} className={cn("pop font-mincho leading-none", big ? "text-[36px]" : "w-7 text-center text-[34px]")}>
          {display ?? value}
        </span>
        {measure ? <span className="mt-1 text-[16px] text-ink-soft">{measure}</span> : null}
      </div>
      <button type="button" className={btn} aria-label="More" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </div>
  );
}
