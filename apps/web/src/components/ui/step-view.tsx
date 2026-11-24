"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "./button";
import { CloseButton, Progress } from "./bars";
import { Seal } from "./seal";

export interface Step {
  /** Large ink-line illustration (05a) or a card drawing (S02a). */
  picture?: React.ReactNode;
  heading: string;
  detail?: string;
}

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/**
 * One step per screen (05a/05b, S02a/S02b). 30px instruction, 64px buttons
 * for muddy hands; swipe or arrow keys move between steps. The last step's
 * button carries the 済 seal. `numerals` shows 一二三四 at 56px (rack feeding).
 */
export function StepView({ title, steps, closeHref, onClose, onDone, doneLabel = "Done", numerals = false, initial = 0 }: { title: string; steps: Step[]; closeHref?: string; onClose?: () => void; onDone: () => void; doneLabel?: string; numerals?: boolean; initial?: number }) {
  const [i, setI] = useState(Math.min(Math.max(initial, 0), steps.length - 1));
  const start = useRef<{ x: number; y: number } | null>(null);
  const last = i === steps.length - 1;
  const step = steps[i];

  const go = useCallback((d: number) => setI((x) => Math.min(Math.max(x + d, 0), steps.length - 1)), [steps.length]);

  if (!step) return null;

  return (
    <div
      className="flex min-h-dvh touch-pan-y flex-col"
      onPointerDown={(e) => {
        // Swipes are for fingers and pens, and never start on a button (a mouse drag there is a click).
        const onControl = (e.target as Element).closest("button, a, input");
        start.current = e.pointerType !== "mouse" && !onControl ? { x: e.clientX, y: e.clientY } : null;
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="flex h-[52px] items-center justify-between pl-8 pr-5">
        <span className="text-[16px] text-ink-soft">{title}</span>
        <CloseButton href={onClose ? undefined : closeHref} onClick={onClose} />
      </div>
      <div className="px-8">
        <Progress total={steps.length} current={i + 1} fill />
      </div>
      <section aria-live="polite" aria-label={`Step ${i + 1} of ${steps.length}`} className="flex flex-col gap-2.5 px-8 pt-[26px]">
        {numerals ? (
          <span aria-hidden className="font-mincho text-[56px] leading-none">
            {NUMERALS[i] ?? i + 1}
          </span>
        ) : null}
        {step.picture ? <div className="relative mb-2.5">{step.picture}</div> : null}
        <h1 className="font-mincho text-[30px] font-normal leading-[1.25] text-pretty">{step.heading}</h1>
        {step.detail ? <p className="text-[19px] leading-normal text-ink-body">{step.detail}</p> : null}
      </section>
      <div className="mt-auto grid gap-2.5 px-6 pb-[30px] pt-8" style={{ gridTemplateColumns: i > 0 && !last ? "1fr 2fr" : "1fr" }}>
        {last ? (
          <Button size="lg" onClick={onDone}>
            <Seal kind="済" size={36} />
            {doneLabel}
          </Button>
        ) : (
          <>
            {i > 0 ? (
              <Button size="lg" variant="outline" onClick={() => go(-1)}>
                Back
              </Button>
            ) : null}
            <Button size="lg" onClick={() => go(1)}>
              Next step
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
