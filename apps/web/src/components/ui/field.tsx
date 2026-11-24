"use client";

import { useId } from "react";
import { cn } from "./cn";

/** Underlined field (M08 name, 06a note, Location): 52px, Mincho 17, 1.5px sumi underline. */
export function Field({ label, hideLabel, className, ...input }: { label: string; hideLabel?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-[16px] text-ink-soft"}>
        {label}
      </label>
      <input
        id={id}
        className="h-[52px] border-b-[1.5px] border-ink bg-transparent font-mincho text-[17px] text-ink placeholder:text-ink-soft focus-visible:rounded-none"
        {...input}
      />
    </div>
  );
}

/** Dashed "+ photo" box (06a, M08): 72px. */
export function PhotoSlot({ onPick, label = "+ photo" }: { onPick?: () => void; label?: string }) {
  return (
    <button type="button" onClick={onPick} className="flex h-[72px] w-[72px] flex-none items-center justify-center border-[1.5px] border-dashed border-rule-dash text-[16px] text-ink-soft">
      {label}
    </button>
  );
}
