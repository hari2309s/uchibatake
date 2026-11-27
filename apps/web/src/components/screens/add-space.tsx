"use client";

import { byRegion, regionOf } from "@uchibatake/content";
import { placeOf } from "@/lib/place-climate";
import { CROPS } from "@uchibatake/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloseButton, Progress } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { ChoiceList, Chips, Segmented } from "@/components/ui/choice";
import { brushDraw } from "@/components/ui/enso";
import { Field } from "@/components/ui/field";
import { Hitokoto } from "@/components/ui/notes";
import { Seal } from "@/components/ui/seal";
import { useHousehold, useSpaces } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { addSpace } from "@/lib/data/repo";
import type { Container, Facing, Space, SpaceType } from "@/lib/data/types";
import { facingLight } from "@/lib/fit";
import { startsNow } from "@/lib/plan";
import { FACING_WORDS, SIZE_WORDS, SUN_WORDS } from "@/lib/space-words";
import { useToday } from "@/lib/use-today";

const NAMES: Record<SpaceType, string> = { balcony: "Balcony", windowsill: "Windowsill", rack: "Vertical rack", backyard: "Back garden", greenhouse: "Greenhouse" };
const DIRS: Facing[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

type Step = "type" | "facing" | "extras" | "sun" | "size" | "done";

interface Answers {
  type: SpaceType | null;
  facing: Facing | null;
  checks: { h10: boolean | null; h13: boolean | null; h16: boolean | null };
  size: Space["size"];
  containers: Container[];
  name: string;
  rack: NonNullable<Space["rack"]>;
  greenhouse: NonNullable<Space["greenhouse"]>;
}

/** 3 sun of 3 → full sun; 1–2 → part; none → shade (as A 03 defines them). */
function sunFrom(c: Answers["checks"]): Space["sun"] {
  const vals = [c.h10, c.h13, c.h16];
  if (vals.some((v) => v === null)) return null;
  const n = vals.filter(Boolean).length;
  return n === 3 ? "full" : n === 0 ? "shade" : "part";
}

/** The ensō compass (02b): a brush ring with a needle. Tap the ring, or use the phone's compass. */
function Compass({ value, onChange }: { value: Facing | null; onChange: (f: Facing) => void }) {
  const angle = value ? DIRS.indexOf(value) * 45 : 225;
  const rad = ((angle - 90) * Math.PI) / 180;
  return (
    // At most 240px; smaller on short screens so the step still fits (the drawing scales with its viewBox).
    <div className="relative mx-auto mt-6 size-[min(240px,30dvh)]">
      <svg
        viewBox="0 0 240 240"
        width="100%"
        height="100%"
        role="radiogroup"
        aria-label="Which way it faces"
        className="block cursor-pointer"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const a = (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180) / Math.PI + 90;
          onChange(DIRS[Math.round(((a + 360) % 360) / 45) % 8]);
        }}
      >
        <circle cx="120" cy="120" r="96" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" transform="rotate(-60 120 120)" style={brushDraw(540, 2 * Math.PI * 96, 0, 1100)} />
        <circle cx="121.5" cy="118.5" r="92" fill="none" stroke="var(--ink)" strokeWidth="2" transform="rotate(-48 120 120)" opacity=".4" style={brushDraw(470, 2 * Math.PI * 92, 260, 1100)} />
        <line x1="120" y1="120" x2={120 + Math.cos(rad) * 76} y2={120 + Math.sin(rad) * 76} stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" style={{ transition: "all 500ms cubic-bezier(.2,.8,.3,1)" }} />
        <circle cx="120" cy="120" r="5" fill="var(--ink)" />
      </svg>
      {(["N", "E", "S", "W"] as const).map((d, i) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          aria-label={FACING_WORDS[d]}
          onClick={() => onChange(d)}
          className="absolute flex h-11 w-11 items-center justify-center font-mincho text-[18px]"
          style={[{ left: "calc(50% - 22px)", top: -18 }, { right: -24, top: "calc(50% - 22px)" }, { left: "calc(50% - 22px)", bottom: -18 }, { left: -24, top: "calc(50% - 22px)" }][i]}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

/** Add a space: 02a type → 02b facing → (S05 rack / greenhouse) → 02c sun → 02d size → 02e done. */
export function AddSpace() {
  const router = useRouter();
  const { db } = useData();
  const household = useHousehold();
  const place = placeOf(household);
  const region = regionOf(household?.country);
  const spaces = useSpaces();
  const today = useToday();
  const [step, setStep] = useState<Step>("type");
  const [made, setMade] = useState<Space | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [a, setA] = useState<Answers>({
    type: null,
    facing: null,
    checks: { h10: null, h13: null, h16: null },
    size: null,
    containers: [],
    name: "",
    rack: { shelves: 4, medium: "water", light: "yes", light_on: "06:00", light_off: "20:00" },
    greenhouse: { heated: "no", vents: ["roof"] },
  });
  const set = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));
  const extras = a.type === "rack" || a.type === "greenhouse";
  const order: Step[] = ["type", "facing", ...(extras ? (["extras"] as const) : []), "sun", "size"];
  const go = (dir: 1 | -1) => setStep(order[Math.min(order.length - 1, Math.max(0, order.indexOf(step) + dir))]);
  const south = (household?.area?.lat ?? 52) < 0;

  const frame = (body: React.ReactNode, action: React.ReactNode) => (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-12 items-center justify-between pl-8 pr-5">
        <Progress total={order.length} current={order.indexOf(step) + 1} />
        <CloseButton href="/spaces" />
      </div>
      <div key={step} className="page-enter flex flex-col">
        {body}
      </div>
      <div className="rise washi sticky bottom-0 z-10 mt-auto px-8 pb-[34px] pt-5" style={{ "--i": 6 } as React.CSSProperties}>
        {action}
      </div>
    </div>
  );
  const heading = (title: string, lede?: string) => (
    <div className="flex flex-col gap-2 px-8 pt-5">
      <h1 className="font-mincho text-[32px] font-normal leading-[1.2]">{title}</h1>
      {lede ? <p className="text-[17px] leading-normal text-ink-soft">{lede}</p> : null}
    </div>
  );

  if (step === "done" && made && today) {
    const md = today.slice(5);
    const goodNow = place ? byRegion(CROPS, region).filter((c) => c.sources.length && startsNow(c, { key: made.id, type: made.type, name: made.name }, md, place)).slice(0, 3) : [];
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="flex justify-center pt-[60px]">
          <div className="relative h-[150px] w-[150px]">
            <svg width="150" height="150" aria-hidden className="block">
              <circle cx="75" cy="75" r="62" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" transform="rotate(-70 75 75)" style={brushDraw(360, 2 * Math.PI * 62, 0, 1100)} />
            </svg>
            <span className="absolute -right-1 bottom-1.5">
              <Seal kind="済" size={44} press label="Ready" className="[animation-delay:900ms,1180ms]" />
            </span>
          </div>
        </div>
        <div className="rise flex flex-col gap-2 px-8 pt-7 text-center" style={{ "--i": 2 } as React.CSSProperties}>
          <h1 className="font-mincho text-[30px] font-normal">{made.name} is ready</h1>
          <p className="text-[17px] text-ink-soft">{[made.facing ? FACING_WORDS[made.facing] : null, made.sun ? SUN_WORDS[made.sun].toLowerCase() : null, made.size ? { s: "small", m: "medium", l: "large" }[made.size] : null].filter(Boolean).join(" · ")}</p>
        </div>
        {goodNow.length ? (
          <>
            <h2 className="rise px-8 pt-[30px] text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft" style={{ "--i": 3 } as React.CSSProperties}>
              Good to grow there now
            </h2>
            <ul className="px-8 pt-1">
              {goodNow.map((c, i) => (
                <li key={c.id} className="rise border-b border-rule last:border-b-0" style={{ "--i": i + 4 } as React.CSSProperties}>
                  <Link href={`/crops/${c.id}?space=${made.id}`} className="tap flex min-h-[68px] items-center gap-3.5">
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="font-mincho text-[19px]">{c.name}</span>
                      {c.care?.pick ? <span className="text-[16px] text-ink-soft">{c.care.pick}</span> : null}
                    </span>
                    <span aria-hidden className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-[1.5px] border-ink text-[20px]">
                      +
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="washi sticky bottom-0 z-10 mt-auto px-8 pb-[34px] pt-5">
          <Button onClick={() => router.replace(`/spaces/${made.id}`)}>Done</Button>
        </div>
      </div>
    );
  }

  if (step === "type")
    return frame(
      <>
        {heading("What kind of space?")}
        <div className="px-8 pt-5">
          <ChoiceList<SpaceType | "farm">
            legend="What kind of space?"
            hideLegend
            multiple={false}
            value={a.type ? [a.type] : []}
            onChange={([t]) => t !== "farm" && set({ type: t, name: a.name || NAMES[t] })}
            options={[
              { value: "balcony", label: "Balcony", hint: "Pots and planters outside" },
              { value: "windowsill", label: "Windowsill", hint: "Herbs and small greens" },
              { value: "rack", label: "Vertical rack", hint: "Shelves, towers, water-grown" },
              { value: "backyard", label: "Backyard", hint: "Beds in the ground" },
              { value: "greenhouse", label: "Greenhouse", hint: "Covered and sheltered" },
              { value: "farm", label: "Farm", disabled: true, tag: "COMING SOON" },
            ]}
          />
        </div>
      </>,
      <Button disabled={!a.type} onClick={() => go(1)}>
        Continue
      </Button>
    );

  if (step === "facing")
    return frame(
      <>
        {heading("Which way does it face?", a.type === "backyard" ? "Stand with your back to the house and look out." : "Stand at the window or railing and look out.")}
        <Compass value={a.facing} onChange={(facing) => set({ facing })} />
        <div className="flex min-h-[70px] flex-col gap-1 px-8 pt-[22px] text-center" aria-live="polite">
          {a.facing ? (
            <>
              <span key={a.facing} className="pop font-mincho text-[28px]">
                {FACING_WORDS[a.facing]}
              </span>
              <span className="text-[16px] text-ink-soft">{facingLight(a.facing, south)}</span>
            </>
          ) : null}
        </div>
        <div className="flex flex-col gap-2.5 px-8 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setNote(null);
              const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
              try {
                if (DOE?.requestPermission && (await DOE.requestPermission()) !== "granted") return setNote("The compass wasn't allowed. Tap a direction on the ring instead.");
              } catch {
                return setNote("This phone's compass isn't available here. Tap a direction on the ring instead.");
              }
              let got = false;
              // Only a heading measured from north counts: iOS's compass heading, or an absolute orientation (Android).
              const onO = (e: DeviceOrientationEvent) => {
                const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
                const heading = ios ?? (e.absolute && e.alpha !== null ? 360 - e.alpha : null);
                if (heading === null || got) return;
                got = true;
                window.removeEventListener("deviceorientationabsolute", onO as EventListener);
                window.removeEventListener("deviceorientation", onO);
                set({ facing: DIRS[Math.round(heading / 45) % 8] });
              };
              window.addEventListener("deviceorientationabsolute", onO as EventListener);
              window.addEventListener("deviceorientation", onO);
              setTimeout(() => {
                window.removeEventListener("deviceorientationabsolute", onO as EventListener);
                window.removeEventListener("deviceorientation", onO);
                if (!got) setNote("This phone's compass isn't available here. Tap a direction on the ring instead.");
              }, 2500);
            }}
          >
            Use my phone&apos;s compass
          </Button>
          <p className="text-center text-[16px] text-ink-soft">{note ?? "Or tap a direction on the ring."}</p>
        </div>
      </>,
      <Button onClick={() => go(1)}>{a.facing ? "Continue" : "Skip for now"}</Button>
    );

  if (step === "extras" && a.type === "rack")
    return frame(
      <>
        {heading("About your rack")}
        <div className="flex flex-col gap-6 px-8 pt-5">
          <Chips legend="How many shelves?" multiple={false} value={[String(Math.min(a.rack.shelves, 5))]} onChange={([v]) => set({ rack: { ...a.rack, shelves: Number(v) } })} options={["2", "3", "4", "5"].map((v) => ({ value: v, label: v === "5" ? "5+" : v }))} />
          <Chips legend="What do the roots sit in?" multiple={false} value={[a.rack.medium]} onChange={([v]) => set({ rack: { ...a.rack, medium: v as "water" | "soil" } })} options={[{ value: "water", label: "Water" }, { value: "soil", label: "Soil" }]} />
          <Chips legend="Is there a grow light?" multiple={false} value={[a.rack.light]} onChange={([v]) => set({ rack: { ...a.rack, light: v as "yes" | "no" | "not-yet" } })} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not-yet", label: "Not yet" }]} />
          <Hitokoto>Only racks get these questions. Everything else about it we&apos;ll work out as you go.</Hitokoto>
        </div>
      </>,
      <Button onClick={() => go(1)}>Continue</Button>
    );

  if (step === "extras" && a.type === "greenhouse")
    return frame(
      <>
        {heading("About your greenhouse")}
        <div className="flex flex-col gap-6 px-8 pt-5">
          <Chips legend="Is it heated?" multiple={false} value={[a.greenhouse.heated]} onChange={([v]) => set({ greenhouse: { ...a.greenhouse, heated: v as "no" | "frost" | "warm" } })} options={[{ value: "no", label: "No" }, { value: "frost", label: "A little, frost only" }, { value: "warm", label: "Yes, kept warm" }]} />
          <Chips
            legend="Does it have vents?"
            value={a.greenhouse.vents.length ? a.greenhouse.vents : ["none"]}
            onChange={(v) => {
              // "None" was just chosen: clear the vents. Anything else: the vents chosen, without "None".
              const noneJustChosen = v.includes("none") && a.greenhouse.vents.length > 0;
              set({ greenhouse: { ...a.greenhouse, vents: noneJustChosen ? [] : (v.filter((x) => x !== "none") as ("roof" | "side")[]) } });
            }}
            options={[{ value: "roof", label: "Roof vent" }, { value: "side", label: "Side vents" }, { value: "none", label: "None" }]}
          />
          <Hitokoto>An unheated greenhouse is still a few degrees warmer than outside.</Hitokoto>
        </div>
      </>,
      <Button onClick={() => go(1)}>Continue</Button>
    );

  if (step === "sun") {
    const sun = sunFrom(a.checks);
    return frame(
      <>
        {heading("Let's check the sun", "On a sunny day, look at the spot three times. Is the sun on it?")}
        <div className="flex flex-col px-8 pt-[18px]">
          {(
            [
              ["h10", "10 o'clock"],
              ["h13", "1 o'clock"],
              ["h16", "4 o'clock"],
            ] as const
          ).map(([k, label], i) => (
            <div key={k} className="rise flex min-h-[72px] items-center justify-between border-b border-rule" style={{ "--i": i } as React.CSSProperties}>
              <span className="font-mincho text-[20px]">{label}</span>
              <Segmented<"sun" | "shade" | "">
                label={label}
                value={a.checks[k] === null ? "" : a.checks[k] ? "sun" : "shade"}
                onChange={(v) => set({ checks: { ...a.checks, [k]: v === "sun" } })}
                options={[{ value: "sun", label: "Sun" }, { value: "shade", label: "Shade" }]}
              />
            </div>
          ))}
        </div>
        <div className="mx-8 mt-6 flex min-h-[64px] items-center gap-4" aria-live="polite">
          {sun ? (
            <>
              <span
                key={sun}
                aria-hidden
                className="pop block h-14 w-14 flex-none rounded-full border-2 border-ink"
                style={{ background: sun === "full" ? "var(--ink)" : sun === "part" ? "linear-gradient(90deg, var(--ink) 50%, transparent 50%)" : "transparent" }}
              />
              <span className="flex flex-col gap-[3px]">
                <span className="font-mincho text-[22px]">{SUN_WORDS[sun]}</span>
                <span className="text-[16px] leading-[1.45] text-ink-body">
                  {sun === "shade"
                    ? "Most food plants want more sun than this."
                    : `Good for ${CROPS.filter((c) => c.sun && (sun === "full" ? c.sun === "full" : c.sun !== "full"))
                        .filter((c) => (a.type === "windowsill" || a.type === "rack" ? c.kind === "herb" || c.id === "pea-shoots" : a.type === "balcony" ? !!c.pot : true))
                        .slice(0, 3)
                        .map((c, i) => (i ? c.name.toLowerCase() : c.name))
                        .join(", ")}.`}
                </span>
              </span>
            </>
          ) : null}
        </div>
        <Hitokoto className="mx-8 mt-[22px]">Cloudy today? Skip this. You can check again on a sunny day.</Hitokoto>
      </>,
      <Button onClick={() => go(1)}>{sun ? "Continue" : "Skip for now"}</Button>
    );
  }

  // step === "size"
  return frame(
    <>
      {heading("How big, roughly?")}
      <div className="px-8 pt-4">
        <ChoiceList
          legend="How big, roughly?"
          hideLegend
          variant="radio"
          value={a.size ? [a.size] : []}
          onChange={([v]) => set({ size: v as Space["size"] })}
          options={(["s", "m", "l"] as const).map((v) => ({ value: v, label: { s: "Small", m: "Medium", l: "Large" }[v], hint: SIZE_WORDS[v] }))}
        />
      </div>
      {a.type !== "rack" ? (
        <div className="px-8 pt-5">
          <Chips
            legend="What will you grow in?"
            value={a.containers}
            onChange={(v) => set({ containers: v as Container[] })}
            options={[
              { value: "pots", label: "Pots" },
              { value: "troughs", label: "Troughs" },
              { value: "grow-bags", label: "Grow bags" },
              { value: "rail-planters", label: "Rail planters" },
            ]}
          />
        </div>
      ) : null}
      <div className="px-8 pt-6">
        <Field label="What do you call it?" value={a.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
    </>,
    <Button
      onClick={async () => {
        if (!a.type) return;
        const name = a.name.trim() || NAMES[a.type];
        const made = await addSpace(db, {
          name,
          type: a.type,
          facing: a.facing,
          sun_checks: a.checks.h10 === null && a.checks.h13 === null && a.checks.h16 === null ? null : a.checks,
          sun: sunFrom(a.checks),
          size: a.size,
          size_note: null,
          containers: a.containers,
          ground: a.type === "backyard" ? "Open ground" : null,
          plan: [],
          rack: a.type === "rack" ? a.rack : null,
          greenhouse: a.type === "greenhouse" ? a.greenhouse : null,
          sort: spaces?.length ?? 0,
        });
        setMade(made);
        setStep("done");
      }}
    >
      Add this space
    </Button>
  );
}
