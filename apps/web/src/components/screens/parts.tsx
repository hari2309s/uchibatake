"use client";

import { cropById, microseasonFor, seasonFor, SEASON_TABLES } from "@uchibatake/content";
import Link from "next/link";
import { ViewTransition } from "react";
import { Enso } from "@/components/ui/enso";
import { cn } from "@/components/ui/cn";
import type { Household, Planting, Settings } from "@/lib/data/types";
import { growthStatus } from "@/lib/growth";
import { useHousehold } from "@/lib/data/hooks";

export function plantName(p: Planting): string {
  return p.nickname ?? (p.crop_id ? (cropById(p.crop_id)?.name ?? p.own_name ?? "A plant") : (p.own_name ?? "A plant"));
}

/** The plant's ensō, named so it can glide into the plant page. */
/** The household's climate, for crop windows (null until we know it: then we say less). */
export function useClimate() {
  return useHousehold()?.climate ?? null;
}

export function PlantEnso({ p, today, size = 52, indoors = false }: { p: Planting; today: string; size?: number; indoors?: boolean }) {
  const g = growthStatus(p, today, { indoors, climate: useClimate() });
  return (
    <ViewTransition name={`enso-${p.id}`} share="enso-morph" default="none">
      <span className="block flex-none">
        <Enso value={g.progress} closed={g.closed} size={size} />
      </span>
    </ViewTransition>
  );
}

/** Ensō + name + where it is in its season. */
export function PlantCell({ p, today, compact = false, indoors = false, i = 0 }: { p: Planting; today: string; compact?: boolean; indoors?: boolean; i?: number }) {
  const g = growthStatus(p, today, { indoors, climate: useClimate() });
  return (
    <Link href={`/plants/${p.id}`} className={cn("rise tap flex items-center gap-3", compact ? "min-h-[52px]" : "min-h-16")} style={{ "--i": i } as React.CSSProperties}>
      <PlantEnso p={p} today={today} size={compact ? 52 : 44} indoors={indoors} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[17px] font-medium">{plantName(p)}</span>
        <span className={cn("text-[16px]", g.readyInDays === 0 ? "text-ink" : "text-ink-soft")}>{compact ? g.short : g.label}</span>
      </span>
    </Link>
  );
}

/**
 * Season header. The local season leads ("Late autumn · first frosts"), with
 * Japan's microseason underneath as a small poem. "Lead with Japan" swaps which
 * line is large. With no local table yet, the microseason alone, and less said.
 */
export function SeasonHeader({ household, settings, today }: { household: Household; settings: Settings | undefined; today: string }) {
  const md = today.slice(5);
  const ms = microseasonFor(md);
  const table = (household.season_table ? SEASON_TABLES[household.season_table] : undefined) ?? household.seasons ?? undefined;
  const local = table ? seasonFor(table, md) : null;
  const japanFirst = !local || settings?.seasonLead === "japan";
  const place = household.place || table?.place || "";

  if (japanFirst)
    return (
      <div className="rise flex gap-[22px] px-8 pt-7">
        <div lang="ja" aria-hidden className="vertical pt-1 font-mincho text-[22px] tracking-[.35em]">
          {ms.kanji}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="text-[15px] uppercase tracking-[.16em] text-ink-soft">Today&apos;s microseason</div>
          <h1 className="font-mincho text-[40px] font-normal leading-[1.1]">{ms.english}</h1>
          {local ? (
            <p className="mt-3.5 border-t border-rule pt-3 text-[17px] leading-[1.55] text-ink-body">
              Here in {place}: {local.season.name.toLowerCase()}. {local.season.about ?? ""}
            </p>
          ) : null}
        </div>
      </div>
    );

  return (
    <div className="rise flex flex-col gap-3 px-8 pt-6">
      <div className="text-[15px] uppercase tracking-[.16em] text-ink-soft">The season in {place}</div>
      <h1 className="font-mincho text-[38px] font-normal leading-[1.12] text-pretty">{local!.label}</h1>
      {local!.season.about ? <p className="text-[17px] leading-[1.55] text-ink-body">{local!.season.about}</p> : null}
      <div className="mt-1.5 flex items-start gap-4 border-t border-rule pt-3.5">
        <div lang="ja" aria-hidden className="vertical font-mincho text-[17px] tracking-[.3em] text-ink-soft">
          {ms.kanji}
        </div>
        <span className="pt-0.5 font-mincho text-[18px] leading-[1.4]">In Japan: {ms.english.charAt(0).toLowerCase() + ms.english.slice(1)}.</span>
      </div>
    </div>
  );
}

/** "Monday, 23 November". */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return `${date.toLocaleDateString("en-GB", { weekday: "long" })}, ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
}

/** "23 Nov". */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Section heading row with an optional link on the right. */
export function Section({ title, aside, href, children, className, i = 0 }: { title: string; aside?: string; href?: string; children: React.ReactNode; className?: string; i?: number }) {
  return (
    <section className={cn("rise px-8 pt-11", className)} style={{ "--i": i } as React.CSSProperties} aria-label={title}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-mincho text-[26px] font-normal">{title}</h2>
        {aside ? (
          href ? (
            <Link href={href} className="flex min-h-11 items-center text-[16px]">
              {aside}
            </Link>
          ) : (
            <span className="text-[16px] text-ink-soft">{aside}</span>
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}
