"use client";

import { cn } from "./cn";

/** Children's ink marks (Revised fix 二): Mira a leaf, Sem a bean, Noor a sprout. */
export type KidMark = "leaf" | "bean" | "sprout";
export type MemberMark = { kind: "initial"; letter: string } | { kind: KidMark };

export function Mark({ mark }: { mark: MemberMark }) {
  if (mark.kind === "initial") return <>{mark.letter}</>;
  if (mark.kind === "leaf")
    return <span className="block h-3 w-5 border-[1.5px] border-current" style={{ borderRadius: "0 100% 0 100%", transform: "rotate(-30deg)" }} />;
  if (mark.kind === "bean")
    return (
      <span className="relative block h-3.5 w-5">
        <span className="absolute inset-0 border-[1.5px] border-current" style={{ borderRadius: "50% 50% 46% 46% / 62% 62% 38% 38%" }} />
        <span className="absolute left-2 top-0.5 h-1 w-1 rounded-full border-[1.2px] border-current" />
      </span>
    );
  return (
    <span className="relative block h-5 w-5">
      <span className="absolute left-[9px] top-[7px] h-[13px] w-[1.5px] bg-current" />
      <span className="absolute left-px top-[3px] h-1.5 w-[9px] border-[1.5px] border-current" style={{ borderRadius: "0 100% 0 100%", transform: "rotate(-20deg)" }} />
      <span className="absolute left-2.5 top-[3px] h-1.5 w-[9px] border-[1.5px] border-current" style={{ borderRadius: "100% 0 100% 0", transform: "rotate(20deg)" }} />
    </span>
  );
}

/**
 * A member's round mark. `quiet` is the soft wash disc used in headers (44px);
 * otherwise an outline that fills with sumi when `selected` (46px, harvest picker).
 */
export function Avatar({ mark, size = 46, selected = false, quiet = false, className }: { mark: MemberMark; size?: number; selected?: boolean; quiet?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full font-mincho text-[18px] leading-none transition-colors duration-300",
        quiet ? "bg-wash text-ink" : selected ? "bg-ink text-on-ink" : "border-[1.5px] border-rule text-ink",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Mark mark={mark} />
    </span>
  );
}

export interface PickMember {
  id: string;
  name: string;
  mark: MemberMark;
}

/** "Who picked it?": a row of family marks, more than one can be chosen. */
export function AvatarPicker({ members, value, onChange, legend }: { members: PickMember[]; value: string[]; onChange: (ids: string[]) => void; legend: string }) {
  return (
    <fieldset>
      <legend className="text-[17px]">{legend}</legend>
      <div className="mt-2.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(members.length, 6)}, minmax(0, 1fr))` }}>
        {members.map((m, i) => {
          const on = value.includes(m.id);
          return (
            <label key={m.id} className="rise flex min-h-11 cursor-pointer flex-col items-center gap-[5px] transition-transform active:scale-95" style={{ "--i": i } as React.CSSProperties}>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={on}
                onChange={() => onChange(on ? value.filter((v) => v !== m.id) : [...value, m.id])}
              />
              <Avatar mark={m.mark} selected={on} className={cn("peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink", on && "pop")} />
              <span className={cn("text-[16px]", on && "font-bold")}>{m.name}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Overlapping marks, like a hand of cards (M13 invite). */
export function AvatarStack({ marks, size = 44 }: { marks: MemberMark[]; size?: number }) {
  return (
    <div className="flex" aria-hidden>
      {marks.map((m, i) => (
        <span key={i} className="rounded-full ring-2 ring-washi" style={{ marginLeft: i ? -size * 0.28 : 0 }}>
          <Avatar mark={m} size={size} quiet />
        </span>
      ))}
    </div>
  );
}
