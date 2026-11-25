"use client";

import { useId } from "react";
import { cn } from "./cn";

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: string;
  hint?: string;
  /** Leading visual (an ensō, a sun disc…). */
  leading?: React.ReactNode;
  /** Shown greyed with a gentle reason instead of being hidden (03a), or a "COMING SOON" tag (Farm). */
  disabled?: boolean;
  tag?: string;
}

/**
 * Single or multi choice list.
 * - "check": square sumi tick boxes, ruled rows (A 02, multi)
 * - "card": the chosen row becomes a card with a sumi border (A 06, single)
 * - "radio": a ring on the right that thickens when chosen (A 03, single)
 * Real radio/checkbox inputs underneath, so keyboard and screen readers work.
 */
export function ChoiceList<V extends string>(props: {
  legend: string;
  hideLegend?: boolean;
  options: ChoiceOption<V>[];
  variant?: "check" | "card" | "radio";
  multiple?: boolean;
  value: V[];
  onChange: (value: V[]) => void;
}) {
  const { legend, hideLegend, options, variant = "check", multiple = variant === "check", value, onChange } = props;
  const name = useId();
  const toggle = (v: V) => {
    if (!multiple) return onChange([v]);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : "mb-2 text-[17px]"}>{legend}</legend>
      <div className={cn("flex flex-col", variant === "card" && "gap-2.5")}>
        {options.map((o, i) => {
          const on = value.includes(o.value);
          const last = i === options.length - 1;
          return (
            <label
              key={o.value}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(
                "rise relative flex items-center transition-colors duration-300",
                o.disabled ? "cursor-default text-ink-faint" : "cursor-pointer",
                variant === "check" && "min-h-16 gap-4",
                variant === "radio" && "min-h-[104px] gap-5",
                variant === "card" && "min-h-[88px] gap-[18px] rounded-[4px] px-[18px]",
                variant === "card" && (on ? "border-[1.5px] border-ink bg-card" : cn("rounded-none", !last && "border-b border-rule")),
                variant !== "card" && !(last && o.disabled) && "border-b border-rule",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
              )}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                className="sr-only"
                checked={on}
                disabled={o.disabled}
                onChange={() => toggle(o.value)}
              />
              {variant === "check" ? (
                o.disabled ? (
                  <span aria-hidden className="h-[26px] w-[26px] flex-none rounded-[3px] border-[1.5px] border-dashed border-rule-dash" />
                ) : on ? (
                  <span aria-hidden className="pop flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[3px] bg-ink text-[16px] font-bold text-on-ink">
                    ✓
                  </span>
                ) : (
                  <span aria-hidden className="h-[26px] w-[26px] flex-none rounded-[3px] border-[1.5px] border-ink" />
                )
              ) : null}
              {o.leading ? <span className="flex-none">{o.leading}</span> : null}
              <span className="flex flex-1 flex-col gap-0.5">
                <span className={cn(variant === "radio" ? "font-mincho text-[22px]" : "text-[18px] font-medium")}>{o.label}</span>
                {o.hint ? <span className={cn("text-[16px] leading-[1.45]", o.disabled ? "text-ink-faint" : "text-ink-soft")}>{o.hint}</span> : null}
              </span>
              {o.tag ? <span className="rounded-[2px] border border-ink-soft px-2 py-1 text-[15px] tracking-[.1em] text-ink-soft">{o.tag}</span> : null}
              {variant === "radio" ? (
                <span aria-hidden className={cn("h-[22px] w-[22px] flex-none rounded-full border-ink transition-[border-width] duration-300 ease-out", on ? "border-[6px]" : "border-[1.5px]")} />
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Pill chips, 44px (A 05 foods, 02d containers, 07a symptoms). Filled sumi when chosen. */
export function Chips<V extends string>({ legend, hideLegend, options, value, onChange, multiple = true }: { legend: string; hideLegend?: boolean; options: { value: V; label: string }[]; value: V[]; onChange: (v: V[]) => void; multiple?: boolean }) {
  const name = useId();
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : "text-[17px]"}>{legend}</legend>
      <div className={cn("flex flex-wrap gap-2", !hideLegend && "mt-3")}>
        {options.map((o, i) => {
          const on = value.includes(o.value);
          return (
            <label
              key={o.value}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(
                "rise flex h-11 cursor-pointer items-center rounded-[22px] border-[1.5px] px-4 text-[16px] transition-[background-color,color,border-color,transform] duration-300 active:scale-95 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                on ? "border-ink bg-ink text-on-ink" : "border-rule-strong"
              )}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                className="sr-only"
                checked={on}
                onChange={() => onChange(multiple ? (on ? value.filter((x) => x !== o.value) : [...value, o.value]) : [o.value])}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Two- or three-way segmented switch (Count / Weight; °C / °F; Lead with). */
export function Segmented<V extends string>({ label, options, value, onChange, className }: { label: string; options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; className?: string }) {
  const name = useId();
  return (
    <fieldset className={cn("inline-flex overflow-hidden rounded-[4px] border-[1.5px] border-ink", className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex min-h-11 min-w-[76px] cursor-pointer items-center justify-center px-3 text-[16px] transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-current",
            value === o.value && "bg-ink text-on-ink"
          )}
        >
          <input type="radio" name={name} className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

/** On/off switch (13a "Frost warnings"): 52×30, sumi when on. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 items-center"
    >
      <span className={cn("relative block h-[30px] w-[52px] rounded-[15px] border-[1.5px] transition-colors duration-300", checked ? "border-ink bg-ink" : "border-ink-soft bg-transparent")}>
        <span className={cn("absolute left-[1.5px] top-[1.5px] h-6 w-6 rounded-full transition-[transform,background-color] duration-300 ease-out", checked ? "translate-x-[22px] bg-washi" : "bg-ink-soft")} />
      </span>
    </button>
  );
}

/** Underlined tabs (A 03: one tab per space). */
export function Tabs<V extends string>({ label, tabs, value, onChange }: { label: string; tabs: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 overflow-x-auto border-b border-rule">
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cn("-mb-px flex h-[46px] flex-none items-center border-b-2 px-1 text-[17px] transition-colors duration-300", on ? "border-ink font-bold" : "border-transparent text-ink-soft")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
