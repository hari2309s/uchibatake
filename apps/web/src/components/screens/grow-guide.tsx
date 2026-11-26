"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { placeOf } from "@/lib/place-climate";
import { datesFrom } from "@uchibatake/content";
import { cropById, neighbours, windowMonths, windowsFor } from "@uchibatake/content";
import { useRouter, useSearchParams } from "next/navigation";
import { BackBar } from "@/components/ui/bars";
import { ButtonLink } from "@/components/ui/button";
import { MonthStrip } from "@/components/ui/month-strip";
import { Hitokoto } from "@/components/ui/notes";
import { StepView } from "@/components/ui/step-view";
import { useHousehold, usePlantings, useSpaces } from "@/lib/data/hooks";
import { companionNote } from "@/lib/companions";
import { DIFFICULTY_WORDS, potWords, spacingWords, SUN_NEED_WORDS } from "@/lib/fit";
import { useToday } from "@/lib/use-today";
import { dateWords } from "@/lib/words";

/** 04 Grow guide: the crop in everyday words, its year here, its neighbours, and "Grow this". */
export function GrowGuide({ id }: { id: string }) {
  const crop = cropById(id);
  // Arriving from a space ("Good to grow there now"): carry it to "Where, and when?".
  const spaceParam = useSearchParams().get("space");
  const household = useHousehold();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const today = useToday();
  if (!crop) return <BackBar href="/add" label="Add a plant" />;
  if (!today || !household) return <PageLoader back={{ href: "/add", label: "Add a plant" }} />;
  const cropPlace = placeOf(household);
  const w = windowsFor(crop, cropPlace);
  // Outside mild maritime places, the dates are worked out (crops/timing.ts), not copied from the RHS: say so.
  const worked = datesFrom(crop, cropPlace) === "worked-out";
  const plantMonths = windowMonths([...(w?.sowIndoors ?? []), ...(w?.sow ?? []), ...(w?.plantOut ?? [])]);
  const harvestMonths = windowMonths(w?.harvest);
  const place = household.place || "here";
  // The verb follows the kind of window: sow outside, sow indoors, or plant out (strawberries, rhubarb).
  const start = w?.sow?.[0] ? { win: w.sow[0], verb: (crop.sowVerb ?? "Sow").toLowerCase() } : w?.plantOut?.[0] ? { win: w.plantOut[0], verb: "plant" } : w?.sowIndoors?.[0] ? { win: w.sowIndoors[0], verb: "sow indoors" } : null;
  const firstHarvest = w?.harvest?.find((x) => !(x.from === "01-01" && x.to === "12-31"));
  const caption = start
    ? `The dot is now. In ${place}, ${start.verb} from ${dateWords(start.win.from)} to ${dateWords(start.win.to)}${firstHarvest ? `, and pick from ${dateWords(firstHarvest.from)}` : ""}.${worked ? " Worked out from your typical frost dates and temperatures, so give or take a week or two." : ""}`
    : undefined;
  const facts = (
    [
      ["How hard", crop.difficulty ? DIFFICULTY_WORDS[crop.difficulty] : null],
      ["Sun", crop.sun ? SUN_NEED_WORDS[crop.sun] : null],
      ["Space", crop.spacingCm ? spacingWords(crop.spacingCm) : null],
      ["Pot", crop.pot ? potWords(crop.pot) : null],
    ] as const
  ).filter(([, v]) => v);
  const n = neighbours(crop);
  const clash = (spaces ?? []).map((s) => companionNote(crop.id, s, plantings ?? [])).find(Boolean);
  const howTo = crop.howTo?.[0];

  return (
    <div className="pb-9">
      <BackBar href="/add" label="Add a plant" />
      <div className="rise flex flex-col gap-2 px-8 pt-3.5">
        <h1 className="font-mincho text-[40px] font-normal leading-[1.1]">{crop.name}</h1>
      </div>
      {facts.length ? (
        <div className="rise mx-8 mt-[22px] grid grid-cols-2 border-t border-rule" style={{ "--i": 1 } as React.CSSProperties}>
          {facts.map(([k, v], i) => (
            <div key={k} className={`flex flex-col gap-0.5 border-b border-rule py-3.5 ${i % 2 ? "border-l pl-3.5" : ""}`}>
              <span className="text-[15px] uppercase tracking-[.12em] text-ink-soft">{k}</span>
              <span className="font-mincho text-[19px] leading-tight">{v}</span>
            </div>
          ))}
        </div>
      ) : null}
      {plantMonths.length || harvestMonths.length ? (
        <section className="rise px-8 pt-8" style={{ "--i": 2 } as React.CSSProperties} aria-label={`The year in ${place}`}>
          <h2 className="pb-3.5 font-mincho text-[22px] font-normal">The year in {place}</h2>
          <MonthStrip plant={plantMonths} harvest={harvestMonths} now={Number(today.slice(5, 7)) - 1} caption={caption} plantLabel={crop.sowVerb ?? "Plant"} />
        </section>
      ) : (
        <p className="px-8 pt-8 text-[16px] text-ink-soft">We don&apos;t have growing dates for {crop.name.toLowerCase()} in your climate yet, so we won&apos;t guess.</p>
      )}
      {n.good.length || n.apart.length ? (
        <div className="rise flex flex-col px-8 pt-8" style={{ "--i": 3 } as React.CSSProperties}>
          {n.good.length ? (
            <div className="grid grid-cols-[104px_1fr] gap-3 border-t border-rule py-3.5">
              <span className="text-[16px] text-ink-soft">Good next to</span>
              <span className="text-[17px] leading-normal">{n.good.join(", ").replace(/^./, (c) => c.toUpperCase())}</span>
            </div>
          ) : null}
          {n.apart.length ? (
            <div className="grid grid-cols-[104px_1fr] gap-3 border-y border-rule py-3.5">
              <span className="text-[16px] text-ink-soft">Keep apart from</span>
              <span className="text-[17px] leading-normal">{n.apart.join(", ")}</span>
            </div>
          ) : null}
          <p className="pt-2 text-[15px] text-ink-soft">Neighbours are gardeners&apos; tradition, not science.</p>
        </div>
      ) : null}
      {clash ? <Hitokoto className="rise mx-8 mt-5">{clash}</Hitokoto> : null}
      {crop.kidTip ? (
        <div className="rise mx-8 mt-6 flex flex-col gap-1.5 border-t border-rule pt-[18px]" style={{ "--i": 4 } as React.CSSProperties}>
          <span className="font-mincho text-[20px]">For the kids</span>
          <span className="text-[17px] leading-[1.6] text-ink-body">{crop.kidTip}</span>
        </div>
      ) : null}
      <div className="rise flex flex-col gap-2.5 px-8 pt-6" style={{ "--i": 5 } as React.CSSProperties}>
        <ButtonLink href={`/add/${crop.id}/start${spaceParam ? `?space=${encodeURIComponent(spaceParam)}` : ""}`} variant="accent">
          Grow this
        </ButtonLink>
        {howTo ? (
          <ButtonLink href={`/crops/${crop.id}/how-to/${howTo.id}`} variant="quiet">
            How to {howTo.title.charAt(0).toLowerCase() + howTo.title.slice(1)}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}

/** 05a/05b: one step per screen. */
export function HowTo({ id, slug }: { id: string; slug: string }) {
  const router = useRouter();
  const crop = cropById(id);
  const h = crop?.howTo?.find((x) => x.id === slug);
  if (!crop || !h) return <BackBar href={`/crops/${id}`} label={crop?.name ?? "Back"} />;
  return <StepView title={h.title} steps={h.steps.map((s) => ({ heading: s.heading, detail: s.detail }))} onClose={() => router.back()} onDone={() => router.push(`/crops/${id}`)} />;
}
