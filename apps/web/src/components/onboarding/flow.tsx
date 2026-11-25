"use client";

import { AMSTERDAM, seasonFor, seasonsFromNormals } from "@uchibatake/content";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Progress } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { ChoiceList, Chips, Tabs } from "@/components/ui/choice";
import { BrushLines, Enso } from "@/components/ui/enso";
import { Field } from "@/components/ui/field";
import { Hitokoto } from "@/components/ui/notes";
import { PermissionPage } from "@/components/ui/permission";
import { Column } from "@/components/ui/shell";
import { Stepper } from "@/components/ui/stepper";
import { useData } from "@/lib/data/provider";
import { useHousehold } from "@/lib/data/hooks";
import { rememberAccount, rememberedAccount, startAccount } from "@/lib/data/session";
import { Redirect } from "@/components/app/redirect";
import type { Space, SpaceType } from "@/lib/data/types";
import { climateFor, climateWords, frostWords, nameArea, weatherNow, type WeatherNow } from "@/lib/climate";
import { finishOnboarding, SPACE_NAMES } from "@/lib/onboarding";
import { roughArea, searchPlaces, seasonTableFor, type Place } from "@/lib/place";
import { firstSeason } from "@/lib/plan";
import { useToday } from "@/lib/use-today";
import { numberWord } from "@/lib/words";
import { EMPTY_DRAFT, loadDraft, saveDraft, STEPS, type Draft, type Step } from "./draft";

const NUMERALS = ["一", "二", "三"];

function Frame({ step, onSkip, children, action }: { step: Step; onSkip?: () => void; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <Column>
      <div className="flex h-12 items-center justify-between pl-8 pr-5">
        <Progress total={STEPS.length} current={STEPS.indexOf(step) + 1} />
        {onSkip ? (
          <button type="button" onClick={onSkip} className="flex h-11 min-w-11 items-center justify-center text-[16px] text-ink-soft">
            Skip
          </button>
        ) : null}
      </div>
      <div className="flex flex-col">{children}</div>
      <div className="rise mt-auto px-8 pb-[34px] pt-8" style={{ "--i": 6 } as React.CSSProperties}>
        {action}
      </div>
    </Column>
  );
}

function Heading({ title, lede }: { title: string; lede?: string }) {
  return (
    <div className="rise flex flex-col gap-2.5 px-8 pt-6" style={{ "--i": -1 } as React.CSSProperties}>
      <h1 className="font-mincho text-[32px] font-normal leading-[1.2] text-pretty">{title}</h1>
      {lede ? <p className="text-[17px] leading-normal text-ink-soft">{lede}</p> : null}
    </div>
  );
}

const SUN_DISC: Record<NonNullable<Space["sun"]>, React.ReactNode> = {
  // The frame fills this with vermilion; CLAUDE.md keeps vermilion for seals and one primary action, so sumi.
  full: <span className="block h-14 w-14 rounded-full bg-ink" />,
  part: <span className="block h-14 w-14 rounded-full border-2 border-ink" style={{ background: "linear-gradient(90deg, var(--ink) 50%, transparent 50%)" }} />,
  shade: <span className="block h-14 w-14 rounded-full border-2 border-ink" />,
};

/** Onboarding 1–6 (A 02, A 03, 01 Location, A 05, A 06, A 07). */
export function Onboarding({ step }: { step: Step }) {
  const router = useRouter();
  const { db, session } = useData();
  const today = useToday();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    loadDraft(db).then(setDraft);
  }, [db]);

  // Already set up (a returning guest, or someone signing in again): onboarding would overwrite it. Go Home.
  const household = useHousehold();
  if (household?.onboarded_at) return <Redirect to="/" />;

  const change = (patch: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...(d ?? EMPTY_DRAFT), ...patch };
      void saveDraft(db, next);
      return next;
    });
  const go = (s: Step) => router.push(`/start/${s}`);
  const next = () => {
    const i = STEPS.indexOf(step);
    let n = STEPS[i + 1];
    // No spaces chosen: there's no sun to ask about.
    if (n === "sun" && !draft?.where.length) n = "location";
    go(n ?? "plan");
  };

  if (!draft) return null;

  if (step === "where")
    return (
      <Frame step={step} onSkip={next} action={<Button onClick={next}>Continue</Button>}>
        <Heading title="Where will you grow?" lede="Choose any. You can add more later." />
        <div className="px-8 pt-5">
          <ChoiceList<SpaceType | "farm">
            legend="Where will you grow?"
            hideLegend
            value={draft.where}
            onChange={(v) => change({ where: v.filter((x): x is SpaceType => x !== "farm") })}
            options={[
              { value: "balcony", label: "Balcony", hint: "Pots and planters outside" },
              { value: "windowsill", label: "Indoors, on a windowsill", hint: "Herbs and small greens" },
              { value: "rack", label: "Vertical rack", hint: "Shelves, towers, water-grown" },
              { value: "backyard", label: "Backyard", hint: "Beds in the ground" },
              { value: "greenhouse", label: "Greenhouse", hint: "Covered and sheltered" },
              { value: "farm", label: "Farm", disabled: true, tag: "COMING SOON" },
            ]}
          />
        </div>
      </Frame>
    );

  if (step === "sun") return <SunStep draft={draft} change={change} next={next} />;
  if (step === "location") return <LocationStep draft={draft} change={change} next={next} />;

  if (step === "family") {
    const askName = !(session.kind === "account" && session.name);
    return (
      <Frame step={step} onSkip={next} action={<Button onClick={next}>Continue</Button>}>
        <Heading title="Who are you growing for?" />
        <div className="mx-8 mt-5 flex items-center justify-between border-b border-rule pb-[18px]">
          <span className="text-[17px]">People at home</span>
          <Stepper label="People at home" size="small" value={draft.people} min={1} max={20} onChange={(people) => change({ people })} />
        </div>
        <div className="flex flex-col gap-[22px] px-8 pt-5">
          <Chips
            legend="What does your family love to eat?"
            value={draft.likes}
            onChange={(likes) => change({ likes })}
            options={[
              { value: "tomatoes", label: "Tomatoes" },
              { value: "herbs", label: "Herbs" },
              { value: "greens", label: "Leafy greens" },
              { value: "strawberries", label: "Strawberries" },
              { value: "beans", label: "Beans" },
              { value: "miso", label: "Miso soup things" },
              { value: "roots", label: "Root vegetables" },
            ]}
          />
          <Chips
            legend="Anything to keep in mind?"
            value={draft.diet}
            onChange={(diet) => change({ diet: diet.includes("none") && !draft.diet.includes("none") ? ["none"] : diet.filter((x) => x !== "none") })}
            options={[
              { value: "vegetarian", label: "Vegetarian" },
              { value: "vegan", label: "Vegan" },
              { value: "gluten-free", label: "Gluten-free" },
              { value: "none", label: "Nothing special" },
            ]}
          />
          {askName ? <Field label="What should we call you?" autoComplete="given-name" value={draft.name} onChange={(e) => change({ name: e.target.value })} /> : null}
        </div>
      </Frame>
    );
  }

  if (step === "experience")
    return (
      <Frame step={step} onSkip={next} action={<Button onClick={next}>Continue</Button>}>
        <Heading title="Have you grown things before?" lede="There's no wrong answer. We'll go at your pace." />
        <div className="px-8 pt-4">
          <ChoiceList
            legend="Have you grown things before?"
            hideLegend
            variant="card"
            value={draft.experience ? [draft.experience] : []}
            onChange={([v]) => change({ experience: v as Draft["experience"] })}
            options={[
              { value: "never", label: "Never grown anything", hint: "Perfect. We'll start with forgiving plants.", leading: <Enso value={20} size={44} /> },
              { value: "some", label: "A plant or two", hint: "You've kept a houseplant alive.", leading: <Enso value={47} size={44} /> },
              { value: "veg", label: "A few vegetables", hint: "Tomatoes or herbs, a season or two.", leading: <Enso value={75} size={44} /> },
              { value: "green-thumb", label: "I have a green thumb", hint: "Show me the details.", leading: <Enso value={94} size={44} /> },
            ]}
          />
        </div>
      </Frame>
    );

  // step === "plan"
  if (!today) return null;
  const name = session.kind === "account" ? (session.name ?? "") : "";
  return <FirstSeasonView draft={{ ...draft, name: draft.name || name }} today={today} onBegin={() => router.replace("/")} />;
}

function SunStep({ draft, change, next }: { draft: Draft; change: (p: Partial<Draft>) => void; next: () => void }) {
  const [tab, setTab] = useState<SpaceType>(draft.where[0] ?? "balcony");
  return (
    <Frame step="sun" onSkip={next} action={<Button onClick={next}>Continue</Button>}>
      <Heading title="How much sun does the spot get?" />
      {draft.where.length > 1 ? (
        <div className="px-8 pt-[18px]">
          <Tabs label="Your spaces" value={tab} onChange={setTab} tabs={draft.where.map((w) => ({ value: w, label: SPACE_NAMES[w] }))} />
        </div>
      ) : null}
      <div className="px-8 pt-2">
        <ChoiceList
          key={tab}
          legend={`Sun on the ${SPACE_NAMES[tab].toLowerCase()}`}
          hideLegend
          variant="radio"
          value={draft.sun[tab] ? [draft.sun[tab]!] : []}
          onChange={([v]) => change({ sun: { ...draft.sun, [tab]: v } })}
          options={[
            { value: "full", label: "Full sun", hint: "6 hours or more of direct light. Sunny most of the day.", leading: SUN_DISC.full },
            { value: "part", label: "Part sun", hint: "3 to 6 hours. Only mornings, or only afternoons.", leading: SUN_DISC.part },
            { value: "shade", label: "Shade", hint: "Under 3 hours. Bright, but the sun rarely reaches it.", leading: SUN_DISC.shade },
          ]}
        />
      </div>
      <Hitokoto className="mx-8 mt-6">Not sure? Look at the spot at 10, at 1, and at 4 o&apos;clock. Count how many times the sun is on it.</Hitokoto>
    </Frame>
  );
}

function LocationStep({ draft, change, next }: { draft: Draft; change: (p: Partial<Draft>) => void; next: () => void }) {
  const [asking, setAsking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState<WeatherNow | null>(null);
  const [climateState, setClimateState] = useState<"idle" | "loading" | "failed">("idle");
  const aborter = useRef<AbortController | null>(null);
  const place = draft.place;
  // Keep the latest draft for async callbacks (the climate arrives after the place is set).
  const placeRef = useRef(place);
  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  // Town search (Open-Meteo geocoding), debounced.
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      aborter.current?.abort();
      const ac = (aborter.current = new AbortController());
      try {
        setResults(await searchPlaces(q, ac.signal));
        setNote(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setNote("We can't look places up just now. Try again in a moment.");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Once there's a place: the weather now, and its climate (once; kept in the draft).
  const key = place ? `${place.lat},${place.lon}` : null;
  useEffect(() => {
    if (!key) return;
    const [lat, lon] = key.split(",").map(Number);
    const ac = new AbortController();
    weatherNow(lat, lon, ac.signal).then(setNow, () => setNow(null));
    if (!placeRef.current?.climate) {
      setClimateState("loading");
      climateFor(lat, lon, ac.signal).then(
        (climate) => {
          const p = placeRef.current;
          if (p && `${p.lat},${p.lon}` === key) change({ place: { ...p, climate } });
          setClimateState("idle");
        },
        (e) => (e as Error).name !== "AbortError" && setClimateState("failed")
      );
    }
    return () => ac.abort();
    // `change` is stable enough for this: it only writes the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const locate = () => {
    setAsking(false);
    if (!("geolocation" in navigator)) return setNote("This browser can't share a location. Type a town instead.");
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const area = roughArea(pos.coords.latitude, pos.coords.longitude);
        // Name the rough area (OpenStreetMap). If that fails, keep the place and let them name it.
        const named = await nameArea(area.lat, area.lon).catch(() => null);
        change({ place: { name: named?.name ?? "", detail: named?.detail ?? null, ...area, found: "location", climate: null } });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setNote("We couldn't get your location. Type a town instead.");
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 }
    );
  };

  if (asking) return <PermissionPage kind="location" onNotNow={() => setAsking(false)} onAllow={locate} />;

  const firstSpace = draft.where[0] ? SPACE_NAMES[draft.where[0]].toLowerCase() : null;
  const climate = place?.climate ?? null;
  return (
    <Frame step="location" onSkip={next} action={<Button onClick={next}>Continue</Button>}>
      <Heading title="Where are you?" lede={`We follow your own weather and seasons, so the advice fits ${firstSpace ? `your ${firstSpace}` : "where you grow"}.`} />
      <div className="flex flex-col px-8 pt-5">
        {place ? (
          <>
            {place.found === "location" && !place.name ? (
              <Field label="What do you call this place?" placeholder="Your neighbourhood or town" value={place.name} onChange={(e) => change({ place: { ...place, name: e.target.value } })} />
            ) : (
              <div className="rise flex flex-col gap-1 border-b-[1.5px] border-ink pb-2.5">
                <span className="text-[19px]">{place.name}</span>
                {place.detail ? <span className="text-[16px] text-ink-soft">{place.detail}</span> : null}
              </div>
            )}
            <div className="mt-1 flex min-h-11 items-center justify-between gap-2.5 text-[16px] font-medium">
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="h-3 w-3 rounded-full bg-ink" />
                {place.found === "location" ? "Found with your current location" : "Found by name"}
              </span>
              <button
                type="button"
                className="min-h-11 font-normal text-ink-soft underline underline-offset-4"
                onClick={() => {
                  change({ place: null });
                  setNow(null);
                  setClimateState("idle");
                }}
              >
                Change
              </button>
            </div>
            <div className="rise mt-2.5 flex flex-col border border-rule bg-card px-5 pb-1.5 pt-[18px]" aria-live="polite">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[15px] uppercase tracking-[.16em] text-ink-soft">Right now{place.name ? ` in ${place.name}` : ""}</span>
                <span className="flex-none whitespace-nowrap font-mincho text-[22px]">{now ? `${Math.round(now.tempC)}° · ${now.words}` : ""}</span>
              </div>
              {climate ? (
                (
                  [
                    ["Climate", climateWords(climate)],
                    ["First frost", frostWords(climate.firstFrost)],
                    ["Last frost", frostWords(climate.lastFrost)],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between border-t border-wash py-[11px]">
                    <span className="text-[16px] text-ink-soft">{k}</span>
                    <span className="font-mincho text-[17px]">{v}</span>
                  </div>
                ))
              ) : climateState === "loading" ? (
                <div className="border-t border-wash py-3">
                  <BrushLines widths={[80, 60, 70]} />
                  <span className="sr-only">Reading your climate</span>
                </div>
              ) : climateState === "failed" ? (
                <p className="border-t border-wash py-3 text-[16px] text-ink-soft">We couldn&apos;t read your climate just now. Your seasons will follow once it loads.</p>
              ) : null}
            </div>
            {place.found === "location" ? <p className="pt-2 text-[15px] text-ink-soft">Place names © OpenStreetMap contributors</p> : null}
          </>
        ) : locating ? (
          <p role="status" className="py-4 text-[17px] text-ink-body">
            Finding where you are…
          </p>
        ) : (
          <>
            <Field label="Town or neighbourhood" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="address-level2" />
            {q.trim().length >= 2 && results.length ? (
              <ul aria-label="Places" className="flex flex-col">
                {results.map((r) => (
                  <li key={`${r.name}-${r.lat}-${r.lon}`}>
                    <button type="button" className="flex min-h-14 w-full flex-col items-start justify-center border-b border-rule text-left" onClick={() => change({ place: { ...r, found: "search", climate: null } })}>
                      <span className="text-[17px]">{r.name}</span>
                      {r.detail ? <span className="text-[16px] text-ink-soft">{r.detail}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="flex min-h-11 items-center gap-2.5 text-[16px] font-medium" onClick={() => setAsking(true)}>
              <span aria-hidden className="h-3 w-3 rounded-full border-[1.5px] border-ink" />
              Use my current location
            </button>
          </>
        )}
        {note ? (
          <p role="status" className="pt-2 text-[16px] text-ink-soft">
            {note}
          </p>
        ) : null}
        <p className="pt-3.5 text-[16px] leading-normal text-ink-soft">Only used for weather and seasons.</p>
      </div>
    </Frame>
  );
}

function FirstSeasonView({ draft, today, onBegin }: { draft: Draft; today: string; onBegin: () => void }) {
  const { db, session } = useData();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const area = draft.place ? { lat: draft.place.lat, lon: draft.place.lon } : null;
  const table = area ? seasonTableFor(area) : null;
  const summary = draft.place?.climate ?? null;
  // Crop windows are written for temperate climates; elsewhere we don't guess.
  const climate = table ? ("temperate" as const) : (summary?.type ?? null);
  const seasons = table ? AMSTERDAM : summary ? seasonsFromNormals(summary.normals, draft.place?.name || "here") : null;
  const plan = useMemo(() => {
    const spaces = draft.where.map((type) => ({ key: type, type, name: SPACE_NAMES[type] }));
    return climate ? firstSeason({ spaces, today, climate, likes: draft.likes }) : { items: [], later: null };
  }, [climate, draft.where, today, draft.likes]);
  const eyebrow = [seasons ? seasonFor(seasons, today.slice(5)).season.name : null, draft.place?.name || null, draft.people > 1 ? `${numberWord(draft.people)} of us` : "just me"].filter(Boolean).join(" · ");

  const begin = async () => {
    setBusy(true);
    setProblem(false);
    try {
      await finishOnboarding(db, draft, plan, today);
      if (session.kind === "account") {
        const prev = rememberedAccount();
        const name = session.name ?? (draft.name.trim() || null);
        if (name !== session.name) startAccount({ id: session.id, email: session.email, name, provider: session.provider });
        rememberAccount({
          id: session.id,
          email: session.email,
          name,
          provider: session.provider,
          place: draft.place?.name || prev?.place || null,
          seasonTable: draft.place ? table : (prev?.seasonTable ?? null),
        });
      }
      onBegin();
    } catch {
      setProblem(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Column>
      <div className="rise flex flex-col gap-2.5 px-8 pt-10">
        <div className="text-[15px] uppercase tracking-[.16em] text-ink-soft">{eyebrow}</div>
        <h1 className="max-w-[280px] font-mincho text-[34px] font-normal leading-[1.2]">Your first season</h1>
        <p className="max-w-[290px] text-[17px] leading-[1.55] text-ink-body">
          {plan.items.length
            ? `${numberWord(plan.items.length).replace(/^./, (c) => c.toUpperCase())} gentle ${plan.items.length === 1 ? "plant" : "plants"} to start.${plan.items.every((i) => i.crop.difficulty === "very-easy" || i.crop.difficulty === "easy") ? " Each one is hard to get wrong." : ""}`
            : !draft.where.length
              ? "Add a space when you're ready, and we'll suggest what to grow there."
              : !draft.place
                ? "Tell us where you are, and we'll suggest a few gentle plants that suit your weather."
                : !climate
                  ? "We're still reading your climate. Your first suggestions will follow."
                  : climate !== "temperate"
                    ? "We don't have growing dates for your climate yet, so we won't guess."
                    : "Nothing we'd start in your spaces right now. We'll suggest something as the season turns."}
        </p>
      </div>
      {plan.items.length ? (
        <ol className="flex flex-col px-8 pt-5">
          {plan.items.map((item, i) => (
            <li key={item.crop.id} className="rise flex gap-[18px] border-t border-rule py-4 last:border-b" style={{ "--i": i + 2 } as React.CSSProperties}>
              <span aria-hidden className="w-5 font-mincho text-[20px]">
                {NUMERALS[i]}
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mincho text-[22px]">{item.crop.name}</span>
                  <span className="text-[16px] text-ink-soft">{item.space.name}</span>
                </div>
                <span className="text-[16px] leading-normal text-ink-body">{item.line}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {plan.later ? (
        <p className="rise px-8 pl-[70px] pt-4 text-[16px] leading-normal text-ink-soft" style={{ "--i": plan.items.length + 2 } as React.CSSProperties}>
          {plan.later.line}
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-8">
        {problem ? (
          <p role="status" className="text-center text-[16px] text-ink-soft">
            That didn&apos;t save. Nothing has changed; try again.
          </p>
        ) : null}
        <Button variant="accent" disabled={busy} onClick={begin}>
          Begin my season
        </Button>
      </div>
    </Column>
  );
}
