"use client";

import { cropById, eatByMonth, inWindows, isSourced, MILD_WINTER_C, protectionById, regionOf, shelteredWindows, type Protection, type ProtectionId } from "@uchibatake/content";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BackBar, CloseButton, Progress } from "@/components/ui/bars";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { MonthBand } from "@/components/ui/month-band";
import { Hitokoto } from "@/components/ui/notes";
import { PageLoader } from "@/components/ui/page-loader";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { useHousehold, useMembers, usePlantings, useReadings, useSettings, useSpace, useSpaces } from "@/lib/data/hooks";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { addReading, addTask, update } from "@/lib/data/repo";
import { Enso } from "@/components/ui/enso";
import { Seal } from "@/components/ui/seal";
import type { Reading, Space } from "@/lib/data/types";
import { deg, toUnits } from "@/lib/forecast";
import { useForecastState } from "@/lib/forecast-context";
import { FACING_WORDS, isIndoors } from "@/lib/space-words";
import { familyCrops, hasShelter, hotSummer, MONTHS, protectionsFor, rankForShelter, shelterOf, shelterWords, warmerBy, yearPlan, type YearPlan } from "@/lib/microclimate";
import { placeOf } from "@/lib/place-climate";
import { useToday } from "@/lib/use-today";
import { listWords } from "@/lib/words";
import { isoDate } from "@/lib/dates";

/*
 * Microclimates without sensors (MC01–MC07a, MC12–MC14). Words and numbers
 * come from the curated protections (packages/content/src/shelter.ts): a
 * protection with no source shows "We don't know how much this helps yet"
 * and adds nothing.
 */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fToC = (v: number, units: "C" | "F" | undefined) => (units === "F" ? Math.round(((v - 32) * 5) / 9) : v);

/** Ink-line drawings for the protections (card paper, one stroke weight). */
export function ProtectionDrawing({ id, className }: { id: ProtectionId; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 1, className: "draw" };
  return (
    <svg viewBox="0 0 56 40" width="56" height="40" aria-hidden className={cn("flex-none text-ink", className)}>
      {id === "cold-frame" ? (
        <>
          <path {...p} d="M6 34 V20 L50 12 V34 Z" />
          <path {...p} d="M6 20 L50 12" style={{ animationDelay: "300ms" }} />
        </>
      ) : id === "cloche" ? (
        <>
          <path {...p} d="M10 32 Q10 8 28 8 Q46 8 46 32" />
          <path {...p} d="M4 32 H52" style={{ animationDelay: "250ms" }} />
        </>
      ) : id === "fleece" ? (
        <>
          <path {...p} d="M4 26 Q16 14 28 24 T52 22" />
          <path {...p} d="M6 32 H50" style={{ animationDelay: "250ms" }} />
        </>
      ) : id === "polytunnel" ? (
        <>
          <path {...p} d="M6 34 Q6 6 28 6 Q50 6 50 34" />
          <path {...p} d="M17 34 Q17 12 28 12 Q39 12 39 34" style={{ animationDelay: "250ms" }} />
        </>
      ) : id === "mini-greenhouse" ? (
        <>
          <path {...p} d="M12 34 V14 L28 6 L44 14 V34 Z" />
          <path {...p} d="M12 22 H44 M12 28 H44" style={{ animationDelay: "250ms" }} />
        </>
      ) : id === "bubble-wrap" ? (
        <path {...p} strokeDasharray="3 3" className="" d="M8 6 H48 V34 H8 Z M28 6 V34 M8 20 H48" />
      ) : (
        <>
          <path {...p} d="M4 10 H52" />
          <path {...p} d="M8 10 L14 30 M20 10 L26 30 M32 10 L38 30 M44 10 L50 30" style={{ animationDelay: "250ms" }} />
        </>
      )}
    </svg>
  );
}

/** "About 3–4 weeks longer at each end · RHS: cloches", or the honest unknown. */
export function effectLine(p: Protection): string {
  return isSourced(p) ? `${p.effect} · ${sourceWords(p.sources.map((s) => s.title))}` : "We don't know how much this helps yet.";
}

/** "RHS: cold frames; growing for winter" (one "RHS:", short names). */
export function sourceWords(titles: string[]): string {
  const byWho = new Map<string, string[]>();
  for (const t of titles) {
    const [who, ...rest] = t.split(": ");
    const what = rest.join(": ").replace(/^Vegetables: /, "").replace(/ and mini-greenhouses$/, "");
    byWho.set(who, [...(byWho.get(who) ?? []), what.charAt(0).toLowerCase() + what.slice(1)]);
  }
  return [...byWho].map(([who, whats]) => `${who}: ${[...new Set(whats)].join("; ")}`).join(" · ");
}

type Climate = "mild" | "cold" | "hot";
function climateKind(place: ReturnType<typeof placeOf>): Climate {
  if (!place?.grow) return "mild";
  // A hard winter is the bigger gap where both happen (Seoul): it leads.
  if (Math.min(...place.grow.meanTemp) < MILD_WINTER_C) return "cold";
  return hotSummer(place) ? "hot" : "mild";
}

/** Union of several plans (the whole field). */
function joinPlans(plans: YearPlan[]): YearPlan {
  return {
    outside: Array.from({ length: 12 }, (_, i) => plans.some((p) => p.outside[i])),
    sheltered: Array.from({ length: 12 }, (_, i) => plans.some((p) => p.sheltered[i])),
    eat: Array.from({ length: 12 }, (_, i) => [...new Set(plans.flatMap((p) => p.eat[i]))].slice(0, 2)),
  };
}

const cropNames = (ids: string[]) => listWords(ids.map((id) => cropById(id)?.name.toLowerCase() ?? id));

/** MC01 Grow all year (for one space, or the whole field from Profile); MC13 / MC14 in cold and hot places. */
export function GrowAllYear({ spaceId }: { spaceId?: string }) {
  const household = useHousehold();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const settings = useSettings();
  const today = useToday();
  if (!household || !spaces || !plantings || !today) return <PageLoader back={{ href: spaceId ? `/spaces/${spaceId}` : "/profile", label: "Back" }} />;
  // A link to a space that's gone: back to Spaces (never the whole field dressed up as that space).
  if (spaceId && !spaces.some((s) => s.id === spaceId)) return <BackBar href="/spaces" label="Spaces" />;
  const place = placeOf(household);
  const region = regionOf(household.country);
  const space = spaceId ? spaces.find((s) => s.id === spaceId) : undefined;
  const scope = space ? [space] : spaces;
  const plan = joinPlans(scope.map((s) => yearPlan(s, plantings, place, region)));
  const now = Number(today.slice(5, 7)) - 1;
  // Nothing planted here yet: the band shows what could grow, rather than a year of dashes.
  const nothingYet = !scope.some((s) => familyCrops(s, plantings).length);
  const band = nothingYet ? plan.eat.map((m) => m.length > 0) : plan.sheltered;
  // "The gap is midsummer" only where midsummer really is the empty stretch here (otherwise the band would say otherwise).
  const hotGap = place?.grow ? !band[place.grow.meanMax.indexOf(Math.max(...place.grow.meanMax))] : false;
  const climate = climateKind(place);
  const kind: Climate = climate === "hot" && !hotGap ? "mild" : climate;
  const sheltered = scope.some(hasShelter);
  const units = settings?.units;
  const coldMonth = place?.grow ? place.grow.meanMin.indexOf(Math.min(...place.grow.meanMin)) : 0;
  const hotMonth = place?.grow ? place.grow.meanMax.indexOf(Math.max(...place.grow.meanMax)) : 7;
  const back = space ? { href: `/spaces/${space.id}`, label: space.name } : { href: "/profile", label: "Profile" };
  const setupHref = `/grow/setup${space ? `?space=${encodeURIComponent(space.id)}` : ""}`;
  const southBalcony = scope.find((s) => s.type === "balcony" && s.facing && ["S", "SE", "SW"].includes(s.facing));
  const nowLine = band[now] ? `Now: ${MONTH_NAMES[now]}. ${cropNames(plan.eat[now]).replace(/^./, (c) => c.toUpperCase())} to pick.` : `Now: ${MONTH_NAMES[now]}, the field is going quiet.`;

  const heading =
    kind === "cold"
      ? { title: "A long, hard winter here", line: `Nights near ${deg(place!.grow!.meanMin[coldMonth], units)} in ${MONTH_NAMES[coldMonth]}. Shelter adds weeks at each end, but deep winter rests.` }
      : kind === "hot"
        ? { title: "Here, the gap is midsummer", line: `Winter is mild. In ${MONTH_NAMES[hotMonth]}, days reach about ${deg(place!.grow!.meanMax[hotMonth], units)} and pots dry quickly.` }
        : { title: "A little shelter turns a short season into a long one.", line: nothingYet ? "This is what could grow here. The dashed months are when little grows." : "This is your field's year as it is now. The dashed months are when little grows here." };
  const tip =
    kind === "cold"
      ? "In the darkest weeks, grow pea shoots and herbs on a sunny windowsill instead."
      : kind === "hot"
        ? "Shade cloth is a loose net that softens strong sun. Hang it above the plants, not on them."
        : southBalcony
          ? `An old window over a box on your ${FACING_WORDS[southBalcony.facing!].toLowerCase()} balcony could keep salad leaves going through winter.`
          : "A cloche or a row of fleece over winter salads keeps them going through the cold months.";

  return (
    <div className="pb-10">
      <BackBar href={back.href} label={back.label} />
      <div className="flex flex-col gap-3 px-8 pt-4">
        <span className="rise text-[15px] uppercase tracking-[.16em] text-ink-soft">Grow all year</span>
        <h1 className="rise font-mincho text-[32px] font-normal leading-[1.25]" style={{ "--i": 1 } as React.CSSProperties}>
          {heading.title}
        </h1>
        <p className="rise text-[17px] leading-[1.6] text-ink-body" style={{ "--i": 2 } as React.CSSProperties}>
          {heading.line}
        </p>
      </div>
      <div className="px-8 pt-8">
        <MonthBand outside={band} now={now} />
        <p className="rise pt-3 text-[16px] text-ink-soft" style={{ "--i": 4 } as React.CSSProperties}>
          {nowLine}
        </p>
      </div>
      {space && !hasShelter(space) && !isIndoors(space) ? (
        // MC12: no shelter yet.
        <p className="rise px-8 pt-6 text-[17px] leading-[1.6] text-ink-body" style={{ "--i": 5 } as React.CSSProperties}>
          No shelter here yet. Most gardens can take a cloche or a row of fleece. It&apos;s a small start.
        </p>
      ) : null}
      <Hitokoto className="rise mx-8 mt-7">{tip}</Hitokoto>
      <div className="rise flex flex-col items-center gap-2.5 px-8 pt-9" style={{ "--i": 6 } as React.CSSProperties}>
        {sheltered && space ? <ButtonLink href={`/spaces/${space.id}/sheltered`}>Your year, sheltered</ButtonLink> : null}
        <ButtonLink href={setupHref} variant={sheltered && space ? "outline" : "primary"}>
          {kind === "hot" ? "Find a cooler corner" : sheltered ? "Change the shelter" : "Set up a warm spot"}
        </ButtonLink>
      </div>
    </div>
  );
}

type Step = "space" | "protect" | "cold" | "indoors";

/** MC02–MC05: choose a space, what you have, how cold it gets (optional), indoors. Then MC06. */
export function ShelterSetup() {
  const { db, session } = useData();
  const router = useRouter();
  const params = useSearchParams();
  const household = useHousehold();
  const spaces = useSpaces();
  const settings = useSettings();
  const members = useMembers();
  const { forecast } = useForecastState();
  const [chosen, setChosen] = useState<string | null>(params.get("space"));
  const [rawStep, setStep] = useState<Step>(params.get("space") ? "protect" : "space");
  const [protections, setProtections] = useState<ProtectionId[] | null>(null);
  const [warmWall, setWarmWall] = useState<boolean | null>(null);
  const [low, setLow] = useState<number | null>(null);
  const [high, setHigh] = useState<number | null>(null);
  const [nightLow, setNightLow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const found = spaces?.find((s) => s.id === chosen);
  const readingsBySpace: Record<string, Reading[]> = {}; // MC02's "measured" reasons arrive with sensors (Phase B)
  if (!household || !spaces || !settings) return <PageLoader />;
  const units = settings.units;
  const place = placeOf(household);
  const hot = hotSummer(place);
  // A space from a link that isn't there (deleted, mistyped): choose one instead.
  const space = found;
  const indoors = !!space && isIndoors(space);
  // From a link straight to an indoor space: its first step is Indoors, not protections.
  const step: Step = !space && rawStep !== "space" ? "space" : rawStep === "protect" && indoors ? "indoors" : rawStep;
  const order: Step[] = ["space", indoors ? "indoors" : "protect", ...(indoors ? [] : (["cold"] as Step[]))];
  const at = order.indexOf(step) + 1;
  const total = order.length + 1; // and "your year"
  const chosenProtections = protections ?? space?.shelter?.protections ?? [];
  const wall = warmWall ?? space?.shelter?.warm_wall ?? false;
  const me = meOf(members, session);

  const finish = async (withReading: boolean) => {
    if (!space || busy) return;
    setBusy(true);
    try {
      if (indoors) await update(db.spaces, space.id, { night_low: nightLow !== null ? fToC(nightLow, units) : (space.night_low ?? null) });
      else await update(db.spaces, space.id, { shelter: { protections: chosenProtections, warm_wall: wall } });
      if (withReading && (low !== null || high !== null)) {
        // Both numbers as shown (one may be the starting value the family agreed with).
        const lo = low ?? toUnits(2, units);
        const hi = Math.max(lo, high ?? toUnits(9, units));
        await addReading(db, { space_id: space.id, on: isoDate(), low: fToC(lo, units), high: fToC(hi, units), outside_low: forecast?.days[0]?.lo ?? null, by: me?.id ?? null, source: "typed" });
      }
      router.replace(`/spaces/${space.id}/sheltered`);
    } finally {
      setBusy(false);
    }
  };

  const frame = (title: string, eyebrow: string, body: React.ReactNode, action: React.ReactNode) => (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-12 items-center justify-between pl-8 pr-5">
        <Progress total={total} current={at} />
        <CloseButton href={space ? `/spaces/${space.id}/grow` : "/grow"} />
      </div>
      <div key={step} className="page-enter flex flex-col">
        <div className="flex flex-col gap-2 px-8 pt-4">
          <span className="text-[16px] text-ink-soft">{eyebrow}</span>
          <h1 className="font-mincho text-[30px] font-normal leading-[1.2]">{title}</h1>
        </div>
        {body}
      </div>
      <div className="washi sticky bottom-0 z-10 mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-5">{action}</div>
    </div>
  );

  if (step === "space") {
    const ranked = rankForShelter(spaces, readingsBySpace);
    return frame(
      "Which space should we shelter?",
      `Step 1 of ${total}`,
      <ul className="px-8 pt-5">
        {ranked.map((r, i) => (
          <li key={r.space.id} className="rise border-t border-rule last:border-b" style={{ "--i": i } as React.CSSProperties}>
            <button type="button" aria-pressed={chosen === r.space.id} onClick={() => setChosen(r.space.id)} className={cn("tap flex w-full flex-col gap-1 py-4 text-left", chosen === r.space.id && "pl-3 border-l-2 border-ink")}>
              <span className="font-mincho text-[21px]">
                {r.space.name}
                {r.space.facing ? <span className="text-[16px] text-ink-soft"> · {FACING_WORDS[r.space.facing].toLowerCase()}</span> : null}
              </span>
              <span className="text-[16px] leading-normal text-ink-soft">{r.reason}</span>
            </button>
          </li>
        ))}
      </ul>,
      <Button disabled={!chosen} onClick={() => setStep(indoors ? "indoors" : "protect")}>
        Continue
      </Button>
    );
  }

  if (!space) return <PageLoader />;

  if (step === "indoors") {
    const shown = nightLow ?? toUnits(space.night_low ?? 14, units);
    return frame(
      "Indoors",
      `Step 2 of ${total} · ${space.name}`,
      <div className="flex flex-col gap-6 px-8 pt-5">
        <p className="text-[17px] leading-[1.6] text-ink-body">
          {space.facing ? `Faces ${FACING_WORDS[space.facing].toLowerCase()}. ` : ""}
          {space.rack?.light === "yes" && space.rack.light_on ? `Grow light ${space.rack.light_on} to ${space.rack.light_off}. ` : ""}
          Already indoors, so most leafy crops and herbs can grow here all year.
        </p>
        <div className="flex flex-col gap-3">
          <span className="text-[17px]">How cold does the room get at night?</span>
          <Stepper label="Coldest at night" value={shown} display={`${shown}°`} onChange={setNightLow} min={units === "F" ? 32 : 0} max={units === "F" ? 86 : 30} />
        </div>
        <Hitokoto>Humidity is how much water is in the air. Most leaves are happy between 40 and 70%.</Hitokoto>
      </div>,
      <Button disabled={busy} onClick={() => void finish(false)}>
        See your year
      </Button>
    );
  }

  if (step === "protect") {
    const offered = protectionsFor(space, hot);
    const toggle = (id: ProtectionId) => setProtections(chosenProtections.includes(id) ? chosenProtections.filter((x) => x !== id) : [...chosenProtections, id]);
    return frame(
      "What do you have, or could make?",
      `Step 2 of ${total} · ${space.name}`,
      <div className="flex flex-col px-8 pt-4">
        {offered.map((id, i) => {
          const p = protectionById(id)!;
          const on = chosenProtections.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              className={cn("rise tap mt-3 flex gap-4 rounded-[4px] p-3.5 text-left transition-[border-color] duration-300", on ? "border-2 border-ink" : "border border-rule")}
              style={{ "--i": i } as React.CSSProperties}
            >
              <ProtectionDrawing id={id} />
              <span className="flex flex-col gap-1">
                <span className="text-[17px] font-medium">
                  {p.name}
                  {on ? <span className="pop inline-block pl-1.5">✓</span> : null}
                </span>
                <span className="text-[16px] leading-normal text-ink-body">{p.line}</span>
                <span className="text-[15px] text-ink-soft">{p.how}</span>
                <span className="text-[15px] leading-normal text-ink-soft">{effectLine(p)}</span>
              </span>
            </button>
          );
        })}
        {space.type === "balcony" || space.type === "backyard" ? (
          <label className="tap mt-5 flex min-h-12 cursor-pointer items-center gap-3 text-[17px]">
            <input type="checkbox" checked={wall} onChange={(e) => setWarmWall(e.target.checked)} className="h-5 w-5 accent-[var(--ink)]" />
            A warm wall behind it (a house wall facing the sun)
          </label>
        ) : null}
      </div>,
      <Button onClick={() => setStep("cold")}>{chosenProtections.length || wall ? "Continue" : "Skip for now"}</Button>
    );
  }

  // step === "cold" (MC04a, optional)
  const lo = low ?? toUnits(2, units);
  const hi = high ?? toUnits(9, units);
  return frame(
    "How cold does it get in there?",
    `Step 3 of ${total} · optional`,
    <div className="flex flex-col gap-5 px-8 pt-4">
      <p className="text-[17px] leading-[1.6] text-ink-body">If you have a min/max thermometer, type last night&apos;s reading.</p>
      <Dial value={fToC(lo, units)} units={units} />
      <div className="flex flex-col gap-2">
        <span className="text-[16px] text-ink-soft">Coldest</span>
        <Stepper label="Coldest" value={lo} display={`${lo}°`} onChange={(v) => { setLow(v); setHigh((h) => Math.max(h ?? hi, v)); }} min={units === "F" ? 0 : -20} max={units === "F" ? 100 : 40} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[16px] text-ink-soft">Warmest</span>
        <Stepper label="Warmest" value={hi} display={`${hi}°`} onChange={setHigh} min={lo} max={units === "F" ? 120 : 50} />
      </div>
      <Hitokoto>A min/max thermometer remembers the coldest and warmest since you last reset it.</Hitokoto>
    </div>,
    <>
      <Button disabled={busy} onClick={() => void finish(low !== null || high !== null)}>
        {low !== null || high !== null ? "Save reading" : "Continue"}
      </Button>
      <button type="button" disabled={busy} className="min-h-11 text-[16px] text-ink-soft" onClick={() => void finish(false)}>
        Skip, use the forecast
      </button>
    </>
  );
}

/** MC04a dial: a half-ensō from −10° to 30°, the needle turning to the coldest reading. */
function Dial({ value, units }: { value: number; units: "C" | "F" | undefined }) {
  const t = Math.min(1, Math.max(0, (value + 10) / 40));
  const angle = -90 + t * 180;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 124" width="220" height="124" aria-hidden>
        <path d="M14 112 A96 96 0 0 1 206 112" fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" pathLength={1} className="draw" />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "110px 112px", transformBox: "view-box", transition: "transform 600ms cubic-bezier(.2,.8,.3,1)" }}>
          <line x1="110" y1="112" x2="110" y2="34" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="110" cy="112" r="5" fill="var(--ink)" />
      </svg>
      <div className="flex w-[220px] justify-between pt-1 font-mincho text-[16px] text-ink-soft">
        <span>{deg(-10, units)}</span>
        <span>{deg(30, units)}</span>
      </div>
    </div>
  );
}

/** MC06 Your year, sheltered: outside as it is, with the shelter (new months darker), and what you could eat each month. */
export function ShelteredYear({ spaceId }: { spaceId: string }) {
  const space = useSpace(spaceId);
  const household = useHousehold();
  const plantings = usePlantings();
  const today = useToday();
  if (space === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!space || !household || !plantings || !today) return <PageLoader back={{ href: `/spaces/${spaceId}`, label: "Back" }} />;
  const place = placeOf(household);
  const region = regionOf(household.country);
  const shelter = shelterOf(space);
  const plan = yearPlan(space, plantings, place, region, shelter);
  const outside = yearPlan(space, plantings, place, region, { protections: [] });
  const now = Number(today.slice(5, 7)) - 1;
  const ps = shelter.protections.map(protectionById).filter((p) => !!p);
  const what = shelterWords(space) ?? (isIndoors(space) ? "indoors" : "no shelter yet");
  const first = ps[0]?.name.toLowerCase() ?? (space.greenhouse ? "greenhouse" : "shelter");
  const sources = [...new Set(ps.filter((p) => isSourced(p!)).flatMap((p) => p!.sources.map((s) => s.title)))];
  const winterSalads = ps.some((p) => p!.winterLeaves);

  return (
    <div className="pb-10">
      <BackBar href={`/spaces/${space.id}`} label={space.name} />
      <div className="flex flex-col gap-1.5 px-8 pt-3">
        <span className="rise text-[16px] text-ink-soft">
          {space.name} · {what.split(" · ")[0].toLowerCase()}
        </span>
        <h1 className="rise font-mincho text-[32px] font-normal" style={{ "--i": 1 } as React.CSSProperties}>
          Your year, sheltered
        </h1>
      </div>
      <div className="px-8 pt-6">
        <MonthBand outside={outside.sheltered} sheltered={plan.sheltered} now={now} outsideLabel="Outside, as it is" shelteredLabel={isIndoors(space) ? "Indoors" : `With your ${first}`} />
        <p className="rise pt-3 text-[15px] leading-normal text-ink-soft" style={{ "--i": 3 } as React.CSSProperties}>
          {plan.sheltered.some((m, i) => m && !outside.sheltered[i]) ? "The darker months are new. " : ""}
          {[sources.length ? sourceWords(sources) : null, place?.grow ? "Open-Meteo, 30 years of local temperatures" : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <section aria-label="What you could eat each month" className="rise px-8 pt-8" style={{ "--i": 4 } as React.CSSProperties}>
        <h2 className="font-mincho text-[24px] font-normal">What you could eat each month</h2>
        <div className="grid grid-cols-2 gap-x-6 pt-3">
          {[0, 6, 1, 7, 2, 8, 3, 9, 4, 10, 5, 11].map((m) => (
            <div key={m} className="grid grid-cols-[40px_1fr] gap-2 py-1.5">
              <span className="font-mincho text-[17px] font-bold">{MONTHS[m]}</span>
              <span className="text-[16px] leading-snug text-ink-body">{plan.eat[m].length ? cropNames(plan.eat[m]) : "A resting month. Plan, sort seeds, read."}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="rise flex flex-col items-center gap-2.5 px-8 pt-8" style={{ "--i": 5 } as React.CSSProperties}>
        <ButtonLink href={winterSalads ? `/spaces/${space.id}/winter-salads` : `/add?space=${encodeURIComponent(space.id)}`}>Plan these months</ButtonLink>
        <Link href={`/grow/setup?space=${encodeURIComponent(space.id)}`} className="tap inline-flex min-h-11 items-center text-[16px] text-ink-soft underline underline-offset-4">
          Change the shelter
        </Link>
      </div>
    </div>
  );
}

/** MC07a on a space's page: its shelter, the last reading (who typed it, when), one plain comparison, and "Add a reading". */
export function ShelterBlock({ space }: { space: Space }) {
  const readings = useReadings(space.id);
  const members = useMembers();
  const settings = useSettings();
  const [adding, setAdding] = useState(false);
  const words = shelterWords(space);
  const last = readings?.[0];
  const warm = warmerBy(readings ?? []);
  const who = (r: Reading) => members?.find((m) => m.id === r.by)?.name;
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long" });
  const first = space.shelter?.protections.map(protectionById)[0]?.name.toLowerCase() ?? (space.greenhouse ? "greenhouse" : "space");
  const units = settings?.units;
  return (
    <section aria-label="Sheltered" className="rise px-8 pt-[30px]" style={{ "--i": 2 } as React.CSSProperties}>
      {words ? (
        <>
          <h2 className="text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">Sheltered</h2>
          <p className="pt-2 text-[17px] leading-normal">{words}</p>
        </>
      ) : null}
      {last ? (
        <div className="mt-4 border-t border-rule pt-3.5">
          <span className="text-[15px] text-ink-soft">
            Last reading · {last.source === "typed" ? `typed by ${who(last) ?? "you"}, ${day(last.on)}` : day(last.on)}
          </span>
          <div className="flex gap-10 pt-2">
            {last.low !== null ? (
              <span className="flex flex-col">
                <span className="text-[15px] text-ink-soft">Coldest</span>
                <span className="font-mincho text-[30px] leading-tight">{deg(last.low, units)}</span>
              </span>
            ) : null}
            {last.high !== null ? (
              <span className="flex flex-col">
                <span className="text-[15px] text-ink-soft">Warmest</span>
                <span className="font-mincho text-[30px] leading-tight">{deg(last.high, units)}</span>
              </span>
            ) : null}
          </div>
          {warm !== null && warm !== 0 ? (
            <p className="pt-2 text-[16px] text-ink-body">
              Your {first} was about {Math.abs(toUnits(warm, units) - toUnits(0, units))}° {warm > 0 ? "warmer" : "colder"} than outside lately.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-x-6 pt-2">
        <button type="button" onClick={() => setAdding(true)} className="tap inline-flex min-h-11 items-center text-[16px] font-medium underline underline-offset-4">
          Add a reading
        </button>
        <Link href={`/spaces/${space.id}/grow`} className="tap inline-flex min-h-11 items-center text-[16px] text-ink-soft underline underline-offset-4">
          Grow all year ›
        </Link>
      </div>
      <ReadingSheet space={space} open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

/** "Add a reading": coldest and warmest since the thermometer was last reset. */
export function ReadingSheet({ space, open, onClose }: { space: Space; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add a reading">
      {open ? <ReadingForm space={space} onDone={onClose} /> : null}
    </Sheet>
  );
}

function ReadingForm({ space, onDone }: { space: Space; onDone: () => void }) {
  const { db, session } = useData();
  const settings = useSettings();
  const members = useMembers();
  const { forecast } = useForecastState();
  const units = settings?.units;
  const [lo, setLo] = useState(toUnits(2, units));
  const [hi, setHi] = useState(toUnits(9, units));
  const [busy, setBusy] = useState(false);
  const me = meOf(members, session);
  return (
    <div className="flex flex-col gap-5 px-8 pb-[34px] pt-3">
      <p className="text-[17px] leading-[1.6] text-ink-body">From the min/max thermometer in the {space.name.toLowerCase()}, since it was last reset.</p>
      <Dial value={fToC(lo, units)} units={units} />
      <div className="flex flex-col gap-2">
        <span className="text-[16px] text-ink-soft">Coldest</span>
        <Stepper label="Coldest" value={lo} display={`${lo}°`} onChange={(v) => { setLo(v); setHi((h) => Math.max(h, v)); }} min={units === "F" ? 0 : -20} max={units === "F" ? 100 : 40} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[16px] text-ink-soft">Warmest</span>
        <Stepper label="Warmest" value={hi} display={`${hi}°`} onChange={setHi} min={lo} max={units === "F" ? 120 : 50} />
      </div>
      <Button
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await addReading(db, { space_id: space.id, on: isoDate(), low: fToC(lo, units), high: fToC(hi, units), outside_low: forecast?.days[0]?.lo ?? null, by: me?.id ?? null, source: "typed" });
            onDone();
          } finally {
            setBusy(false);
          }
        }}
      >
        Save reading
      </Button>
    </div>
  );
}

/** Salad leaves that keep going in winter under cover (RHS: growing for winter), for MC10. */
const WINTER_SALADS = ["lambs-lettuce", "mizuna", "pak-choi", "komatsuna", "chard", "parsley"];
const STEP_DAYS = 21;

/** MC10: winter salads under cover, sown a little every three weeks, as a row of seed packets. */
export function WinterSalads({ spaceId }: { spaceId: string }) {
  const { db } = useData();
  const space = useSpace(spaceId);
  const household = useHousehold();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const today = useToday();
  const [added, setAdded] = useState<string[]>([]);
  if (space === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!space || !household || !plantings || !spaces || !today) return <PageLoader back={{ href: `/spaces/${spaceId}`, label: "Back" }} />;
  const place = placeOf(household);
  const shelter = shelterOf(space);
  const what = shelter.protections.map(protectionById)[0]?.name.toLowerCase() ?? (space.greenhouse ? "greenhouse" : "cover");
  // Crops that suit this space, with a sheltered sowing window.
  const candidates = WINTER_SALADS.map((id) => cropById(id)!).filter((c) => c && c.sources.length).map((c) => ({ c, w: shelteredWindowsSafe(c.id, place, shelter) })).filter((x) => x.w?.sow?.length || x.w?.sowIndoors?.length);
  const md = (iso: string) => iso.slice(5);
  const inSow = (x: (typeof candidates)[number], iso: string) => [...(x.w?.sow ?? []), ...(x.w?.sowIndoors ?? [])].some((w) => inWindowsSafe(md(iso), w));
  // Packets every three weeks, from about two months back to three months ahead.
  const start = new Date(`${today}T12:00:00`);
  const packets: { on: string; crop: string }[] = [];
  for (let k = -3; k <= 5; k++) {
    const d = new Date(start.getTime() + k * STEP_DAYS * 86_400_000);
    const on = isoDate(d);
    const fits = candidates.filter((x) => inSow(x, on));
    if (fits.length) packets.push({ on, crop: fits[(k + 30) % fits.length].c.id });
  }
  const sown = (p: { on: string; crop: string }) => plantings.some((x) => x.space_id === space.id && x.crop_id === p.crop && Math.abs(new Date(`${x.started_on}T12:00:00`).getTime() - new Date(`${p.on}T12:00:00`).getTime()) <= 10 * 86_400_000);
  const next = packets.find((p) => p.on >= today && !sown(p));
  const sill = spaces.find((s) => s.type === "windowsill");
  const longDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  return (
    <div className="pb-10">
      <BackBar href={`/spaces/${space.id}`} label={space.name} />
      <div className="flex flex-col gap-2 px-8 pt-3">
        <h1 className="rise font-mincho text-[30px] font-normal leading-[1.2]">Winter salads under the {what}</h1>
        <p className="rise text-[17px] leading-[1.6] text-ink-body" style={{ "--i": 1 } as React.CSSProperties}>
          Sow a little every 3 weeks, so there&apos;s always something to pick.
        </p>
      </div>
      {packets.length ? (
        <ol className="flex flex-col px-8 pt-6">
          {packets.filter((p) => p.on >= today || sown(p)).map((p, i) => {
            const isSown = sown(p);
            const isNext = next === p;
            const later = !isSown && !isNext && p.on > today;
            const name = cropById(p.crop)!.name;
            return (
              <li key={p.on} className="rise flex items-center gap-4 border-t border-rule py-3.5 last:border-b" style={{ "--i": i + 2 } as React.CSSProperties}>
                <span className={cn("flex h-[54px] w-[42px] flex-none items-center justify-center rounded-[3px]", isSown ? "border border-rule bg-card" : isNext ? "border-2 border-ink" : "border-[1.5px] border-dashed border-rule-dash")}>
                  {isSown ? <Seal kind="種" size={26} /> : null}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] uppercase tracking-[.12em] text-ink-soft">
                    {longDay(p.on)}
                    {isNext ? " · next" : ""}
                  </span>
                  <span className={cn("text-[17px]", later && "text-ink-soft")}>
                    {name}
                    {isSown ? " · sown" : isNext ? ", one short row" : ""}
                  </span>
                </span>
                {isNext ? (
                  <button
                    type="button"
                    disabled={added.includes(p.on)}
                    onClick={async () => {
                      await addTask(db, { title: `Sow ${name.toLowerCase()}`, detail: `One short row, under the ${what}.`, how: null, why: "A little every three weeks keeps winter salads coming.", space_id: space.id, planting_ids: [], due_on: p.on, due_time: null, slot: null, assignee_id: null, done_at: null, done_by: null, snoozed_until: null, skipped_at: null, source: "rule", rule_key: `succession:${space.id}:${p.crop}:${p.on}` });
                      setAdded((a) => [...a, p.on]);
                    }}
                    className="tap min-h-11 flex-none text-[16px] font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-50"
                  >
                    {added.includes(p.on) ? "On your jobs" : "Add to jobs"}
                  </button>
                ) : null}
              </li>
            );
          })}
          {sill ? (
            <li className="flex items-center gap-4 py-3.5 text-ink-soft">
              <span className="flex h-[54px] w-[42px] flex-none rounded-[3px] border-[1.5px] border-dashed border-rule-dash" />
              <span className="text-[17px]">And pea shoots, on the {sill.name.toLowerCase()}, any time.</span>
            </li>
          ) : null}
        </ol>
      ) : (
        <p className="px-8 pt-6 text-[17px] leading-[1.6] text-ink-body">Nothing to sow under the {what} for the next few months here. Look again as the season turns.</p>
      )}
    </div>
  );
}

const shelteredWindowsSafe = (id: string, place: ReturnType<typeof placeOf>, shelter: ReturnType<typeof shelterOf>) => {
  const c = cropById(id);
  return c ? shelteredWindows(c, place, shelter) : undefined;
};
const inWindowsSafe = (md: string, w: { from: string; to: string }) => inWindows(md, [w]);

/** MC11 on Home: something to pick every month, the next gap, and what could close it. */
export function MonthsCard() {
  const household = useHousehold();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const today = useToday();
  // Worked out once per change to the field (not on every render of Home).
  const plan = useMemo(() => (household && spaces && plantings ? joinPlans(spaces.map((s) => yearPlan(s, plantings, placeOf(household), null, shelterOf(s), false))) : null), [household, spaces, plantings]);
  if (!household || !spaces || !plantings || !today || !plan) return null;
  const place = placeOf(household);
  if (!plantings.some((p) => p.status === "growing" || p.status === "planned")) return null;
  const own = Array.from({ length: 12 }, (_, i) => plan.sheltered[i]);
  const now = Number(today.slice(5, 7)) - 1;
  const order = Array.from({ length: 12 }, (_, k) => (now + k) % 12);
  const gap = order.find((m) => !own[m]);
  // What could close the next gap: a cloche, fleece or cold frame over something they already grow.
  let closer: string | null = null;
  if (gap !== undefined) {
    outer: for (const s of spaces.filter((x) => !isIndoors(x))) {
      for (const p of plantings.filter((x) => x.space_id === s.id && x.status === "growing" && x.crop_id)) {
        for (const id of ["cloche", "fleece", "cold-frame"] as ProtectionId[]) {
          if (s.shelter?.protections.includes(id)) continue;
          const tried = eatByMonth([p.crop_id!], place, { protections: [...(s.shelter?.protections ?? []), id] });
          if (tried.sheltered[gap].length) {
            closer = `A ${protectionById(id)!.name.toLowerCase()} over the ${s.name.toLowerCase()} ${cropById(p.crop_id!)!.name.toLowerCase()} could close it.`;
            break outer;
          }
        }
      }
    }
  }
  const nowNames = plan.eat[now].length ? cropNames(plan.eat[now]) : null;
  return (
    <section aria-label="Something to pick every month" className="rise px-8 pt-11" style={{ "--i": 5 } as React.CSSProperties}>
      <Link href="/grow" className="tap flex flex-col gap-3.5">
        <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">Something to pick every month</span>
        <span className="grid grid-cols-6 gap-y-3">
          {MONTHS.map((m, i) => (
            <span key={m} className="flex flex-col items-center gap-1">
              <span className="relative">
                <Enso value={own[i] ? 100 : 0} closed={own[i]} size={34} weight={3} label={`${m}: ${own[i] ? "something to pick" : "a gap"}`} className={own[i] ? undefined : "opacity-40"} />
                {own[i] && i === now ? (
                  <span className="absolute -right-2 -top-2">
                    <Seal kind="収" size={20} press />
                  </span>
                ) : null}
              </span>
              <span className={cn("text-[15px]", i === now ? "font-bold" : "text-ink-soft")}>{m}</span>
            </span>
          ))}
        </span>
        <span className="text-[16px] leading-normal text-ink-body">
          {nowNames ? `${MONTH_NAMES[now]}: ${nowNames}. ` : ""}
          {gap === undefined ? "Every month has something now." : `Next gap: ${MONTH_NAMES[gap]}. ${closer ?? "Plan, sort seeds, read."}`}
        </span>
      </Link>
    </section>
  );
}
