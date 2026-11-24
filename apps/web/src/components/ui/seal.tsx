import { cn } from "./cn";

/** The four hanko seals: 済 done, 収 harvest, 種 seeds, 芽 first sprout. */
export type SealKind = "済" | "収" | "種" | "芽";

export const SEAL_NAMES: Record<SealKind, string> = { 済: "Done", 収: "Harvest", 種: "Seeds", 芽: "First sprout" };

/** Font size per seal size, as set in the frames. */
const SEAL_FONT: Record<number, number> = { 28: 16, 30: 17, 34: 18, 36: 20, 44: 24, 48: 22, 88: 50 };

/**
 * A vermilion seal. Sizes from the frames: 28 (reminder rows), 30 (task rows),
 * 34 (notice checklist), 36 (button), 44 (done ensō), 48 (picker), 88 (harvest stamp).
 * `outline` is the seal picker's unchosen state. `press` plays the ink-press
 * (≈0.6 s, with the bleed); reduced motion shows the final state.
 * Decorative by default: pass `label` when the seal is the only signal.
 */
export function Seal({ kind, size = 30, outline = false, press = false, tilt = true, label, className }: { kind: SealKind; size?: number; outline?: boolean; press?: boolean; tilt?: boolean; label?: string; className?: string }) {
  const radius = size >= 80 ? 6 : size >= 44 ? 4 : 3;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex flex-none items-center justify-center font-mincho leading-none", outline ? "border-[1.5px] border-shu text-shu" : "bg-shu text-on-ink", press && "ink-press", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: SEAL_FONT[size] ?? Math.round(size * 0.55),
        transform: !press && tilt && !outline ? `rotate(${size >= 36 ? -6 : -5}deg)` : undefined,
      }}
    >
      {kind}
    </span>
  );
}
