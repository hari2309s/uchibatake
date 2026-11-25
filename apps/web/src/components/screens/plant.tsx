"use client";

import { cropById } from "@uchibatake/content";
import Link from "next/link";
import { useState, ViewTransition } from "react";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Enso } from "@/components/ui/enso";
import { Hitokoto } from "@/components/ui/notes";
import { Seal } from "@/components/ui/seal";
import { useHarvests, useHousehold, useJournal, usePlanting, useSpace } from "@/lib/data/hooks";
import { parseIsoDate } from "@/lib/dates";
import { growthStatus } from "@/lib/growth";
import { isIndoors } from "@/lib/space-words";
import { useToday } from "@/lib/use-today";
import { HarvestSheet } from "./harvest-sheet";
import { plantName, Section, shortDate } from "./parts";

const START_WORDS = { seed: "Sown", plant: "Planted", scraps: "Started from scraps", existing: "Already growing when we began" } as const;

/** 05 Plant detail: where it is in its season, its rhythm, its story. */
export function PlantDetail({ id }: { id: string }) {
  const p = usePlanting(id);
  const household = useHousehold();
  const space = useSpace(p?.space_id ?? "");
  const harvests = useHarvests(id);
  const journal = useJournal();
  const today = useToday();
  const [harvesting, setHarvesting] = useState(false);
  if (p === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!p || !today) return null;

  const crop = p.crop_id ? cropById(p.crop_id) : undefined;
  const g = growthStatus(p, today, { indoors: isIndoors(space), climate: household?.climate ?? null });
  const name = plantName(p);
  const since = parseIsoDate(p.started_on).toLocaleDateString("en-GB", { month: "long" });
  const centre =
    g.closed ? ["Done", "for the season"] : g.readyInDays === 0 ? ["Ready", "to pick"] : g.readyInDays === null ? ["Growing", ""] : g.readyInDays < 14 ? [String(g.readyInDays), "days to go"] : [String(Math.round(g.readyInDays / 7)), "weeks to go"];

  type Moment = { on: string; seal?: "収" | "芽" | "種" | "済"; text: string };
  const pages = (journal ?? []).filter((j) => j.planting_ids.includes(p.id));
  const told = new Set(pages.filter((j) => j.seal === "収").map((j) => j.written_on));
  const story: Moment[] = [
    ...pages.map((j) => ({ on: j.written_on, seal: j.seal ?? undefined, text: j.title ? `${j.title}.` : j.text })),
    ...(harvests ?? []).filter((h) => !told.has(h.picked_on)).map((h) => ({ on: h.picked_on, seal: "収" as const, text: h.note ?? (h.unit === "g" ? `About ${h.amount} g picked.` : `${h.amount} picked.`) })),
    { on: p.started_on, text: `${START_WORDS[p.start_method]}${p.quantity_note ? `: ${p.quantity_note}` : ""}.` },
  ]
    .sort((a, b) => b.on.localeCompare(a.on))
    .slice(0, 8);

  const rhythm = ([["Water", crop?.care?.water], ["Feed", crop?.care?.feed], ["Pick", crop?.care?.pick]] as const).filter(([, v]) => v);

  return (
    <div className="pb-10">
      <BackBar
        href={space ? `/spaces/${space.id}` : "/spaces"}
        label={space?.name ?? "Spaces"}
        right={
          <Link href={`/plants/${p.id}/edit`} className="tap flex min-h-11 items-center px-2 text-[17px]">
            Edit
          </Link>
        }
      />
      <div className="relative flex justify-center pt-3">
        <ViewTransition name={`enso-${p.id}`} share="enso-morph" default="none">
          <div className="relative h-[210px] w-[210px]">
            <Enso value={g.progress} closed={g.closed} size={210} weight={2.7} />
            {/* Sized to sit well inside the ring: short words large, longer ones smaller. */}
            <div className="fade-in absolute inset-[38px] flex flex-col items-center justify-center gap-1 text-center" style={{ animationDelay: "450ms" }}>
              <span className="font-mincho leading-none" style={{ fontSize: centre[0].length <= 3 ? 40 : centre[0].length <= 5 ? 30 : 24 }}>
                {centre[0]}
              </span>
              {centre[1] ? <span className="text-[15px] leading-tight text-ink-soft">{centre[1]}</span> : null}
            </div>
          </div>
        </ViewTransition>
      </div>
      <div className="rise flex flex-col gap-1.5 px-8 pt-6">
        <h1 className="font-mincho text-[38px] font-normal leading-[1.1]">{name}</h1>
        <p className="text-[16px] text-ink-soft">{space ? `In the ${space.name.toLowerCase()} since ${since}` : `Since ${since}`}</p>
        <p className="mt-1.5 text-[17px] leading-[1.55]">{g.label}.</p>
      </div>

      {crop?.care?.pick ? (
        <div className="rise mx-8 mt-6 border border-rule bg-card p-5" style={{ "--i": 1 } as React.CSSProperties}>
          <Hitokoto title="When to pick">{crop.care.pick}</Hitokoto>
        </div>
      ) : null}

      {rhythm.length ? (
        <Section title="Its rhythm" i={2} className="pt-9">
          <div className="flex flex-col pt-2">
            {rhythm.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[80px_1fr] gap-3 border-t border-rule py-3.5 last:border-b">
                <span className="text-[16px] text-ink-soft">{k}</span>
                <span className="text-[17px] leading-normal">{v}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Its story so far" aside="See it all" href={`/plants/${p.id}/timeline`} i={3} className="pt-9">
        <ol className="flex flex-col gap-[18px] pt-3.5">
          {story.map((m, i) => (
            <li key={i} className="grid grid-cols-[64px_1fr] gap-3">
              <span className="font-mincho text-[16px] text-ink-soft">{shortDate(m.on)}</span>
              <span className="flex items-start gap-2.5 text-[16px] leading-normal">
                {m.seal ? <Seal kind={m.seal} size={24} /> : null}
                <span>{m.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {p.status === "growing" ? (
        <div className="rise px-8 pt-7" style={{ "--i": 4 } as React.CSSProperties}>
          <Button className="h-[54px]" onClick={() => setHarvesting(true)}>
            Log a harvest
          </Button>
        </div>
      ) : null}
      {p.status === "growing" ? (
        <div className="rise flex justify-center gap-6 px-8 pt-6" style={{ "--i": 5 } as React.CSSProperties}>
          <Link href={`/plants/${p.id}/end`} className="tap flex min-h-11 items-center text-[16px] text-ink-soft underline underline-offset-4">
            The season&apos;s over
          </Link>
          <Link href={`/plants/${p.id}/lost`} className="tap flex min-h-11 items-center text-[16px] text-ink-soft underline underline-offset-4">
            It didn&apos;t make it
          </Link>
        </div>
      ) : null}
      <HarvestSheet planting={p} spaceName={space?.name ?? ""} open={harvesting} onClose={() => setHarvesting(false)} />
    </div>
  );
}
