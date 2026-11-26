"use client";

import { brushDraw } from "@/components/ui/enso";
import { Button } from "./button";
import { Column } from "./shell";

export type PermissionKind = "location" | "notifications" | "camera";

/*
 * A permission page (M04–M06): shown before the browser's own prompt, with one
 * sentence on why and what happens. Copy is kept true to what the code does.
 */
const COPY: Record<PermissionKind, { title: string; lede: string; detail: string }> = {
  location: {
    title: "Where is your field?",
    lede: "So the advice fits your weather.",
    // Design said "It never leaves the app"; the rough area does go to Open-Meteo for the forecast.
    detail: "Only your rough area is used, about a kilometre wide: to name your neighbourhood, fetch your weather and work out your seasons. We don't keep it on a server, and you can type a town instead.",
  },
  notifications: {
    title: "A note now and then",
    lede: "One gentle note a day, and a warning before frost.",
    detail: "Never more than that. You choose the hour, and nights stay quiet.",
  },
  camera: {
    title: "May we look too?",
    lede: "To look at a leaf with you when something seems wrong.",
    // Design said photos stay in the field; a diagnosis photo is sent to an AI service to be read.
    detail: "Only when you tap the camera. Photos stay on this phone. If you ask us to look at one, it's sent to an AI service to read it. We don't keep it.",
  },
};

function Drawing({ kind }: { kind: PermissionKind }) {
  return (
    <div className="relative h-[200px] w-[200px] self-center" aria-hidden>
      <svg width="200" height="200" className="block">
        <circle cx="100" cy="100" r="82" fill="none" stroke="var(--ink)" strokeWidth="12" strokeLinecap="round" transform="rotate(-80 100 100)" style={brushDraw(453.4, 2 * Math.PI * 82, 0, 1100)} />
        <circle cx="102.4" cy="97.6" r="74.8" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" transform="rotate(-70 100 100)" opacity=".4" style={brushDraw(371.8, 2 * Math.PI * 74.8, 260, 1100)} />
      </svg>
      <div className="fade-in" style={{ animationDelay: "650ms" }}>
      {kind === "location" ? (
        <>
          <span className="absolute left-[84px] top-[66px] h-8 w-8 border-[1.5px] border-ink" style={{ borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)" }} />
          <span className="absolute left-[96px] top-[78px] h-2 w-2 rounded-full bg-ink" />
          <span className="absolute left-[66px] top-[118px] h-3.5 w-[68px] rounded-full border-[1.2px] border-ink opacity-50" />
        </>
      ) : kind === "notifications" ? (
        <>
          <span className="absolute left-[72px] top-[62px] h-14 w-14 rounded-full border-[1.5px] border-ink" />
          <span className="absolute left-[88px] top-[54px] h-14 w-14 rounded-full bg-washi" />
          <span className="absolute left-[126px] top-[72px] h-1 w-1 rounded-full bg-ink" />
          <span className="absolute left-[60px] top-[138px] w-20 border-t-[1.5px] border-ink" />
        </>
      ) : (
        <>
          <span className="absolute left-[70px] top-[72px] h-9 w-[60px] border-[1.5px] border-ink" style={{ borderRadius: "0 100% 0 100%", transform: "rotate(-25deg)" }} />
          <span className="absolute left-[99px] top-[70px] h-11 w-[1.5px] bg-ink" style={{ transform: "rotate(55deg)" }} />
          <span className="absolute left-[62px] top-[128px] h-[1.5px] w-[76px] bg-ink opacity-50" />
        </>
      )}
      </div>
    </div>
  );
}

export function PermissionPage({ kind, onAllow, onNotNow }: { kind: PermissionKind; onAllow: () => void; onNotNow: () => void }) {
  const c = COPY[kind];
  return (
    <Column className="page-enter">
      <div className="flex flex-col gap-9 px-8 pt-[88px]">
        <Drawing kind={kind} />
        <div className="rise flex flex-col gap-2" style={{ "--i": 2 } as React.CSSProperties}>
          <h1 className="font-mincho text-[34px] font-normal leading-[1.2] text-balance">{c.title}</h1>
          <p className="text-[17px] leading-[1.6] text-ink-body text-pretty">{c.lede}</p>
        </div>
        <p className="rise text-[16px] leading-[1.55] text-ink-soft" style={{ "--i": 3 } as React.CSSProperties}>
          {c.detail}
        </p>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-8">
        <Button onClick={onAllow}>Allow</Button>
        <button type="button" onClick={onNotNow} className="min-h-11 text-[16px] text-ink-soft">
          Not now
        </button>
      </div>
    </Column>
  );
}
