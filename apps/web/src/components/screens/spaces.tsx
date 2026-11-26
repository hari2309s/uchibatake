"use client";

import { PageLoader } from "@/components/ui/page-loader";
import Link from "next/link";
import { useHousehold, usePlantings, useSpaces } from "@/lib/data/hooks";
import { SUN_WORDS, spaceLine } from "@/lib/space-words";
import { listWords } from "@/lib/words";
import { plantName } from "./parts";

/** 04 Spaces: every space with what grows there. */
export function Spaces() {
  const household = useHousehold();
  const spaces = useSpaces();
  const plantings = usePlantings();
  if (!spaces) return <PageLoader />;
  return (
    <div className="pb-6">
      <div className="rise flex flex-col gap-2 px-8 pt-[30px]">
        <h1 className="font-mincho text-[34px] font-normal">Your spaces</h1>
        {household?.address ? <p className="text-[16px] text-ink-soft">{household.address}</p> : null}
      </div>
      <div className="flex flex-col gap-3.5 px-8 pt-[22px]">
        {spaces.length === 0 ? <p className="rise text-[17px] text-ink-body">A windowsill is enough to begin.</p> : null}
        {spaces.map((s, i) => {
          const here = (plantings ?? []).filter((p) => p.space_id === s.id && p.status === "growing");
          const names = listWords(here.map((p, k) => (k ? plantName(p).toLowerCase() : plantName(p))));
          return (
            <Link key={s.id} href={`/spaces/${s.id}`} className="rise tap flex flex-col gap-3.5 border border-rule bg-card p-5" style={{ "--i": i + 1 } as React.CSSProperties}>
              <span className="flex items-baseline justify-between">
                <span className="font-mincho text-[23px]">{s.name}</span>
                <span aria-hidden className="text-[20px]">
                  ›
                </span>
              </span>
              <span className="flex flex-wrap gap-x-[18px] text-[16px] text-ink-soft">
                <span>{spaceLine(s)}</span>
                {s.sun && !s.rack ? <span>{SUN_WORDS[s.sun]}</span> : null}
              </span>
              {names ? (
                <span className="flex items-center gap-2.5 text-[16px]">
                  <span aria-hidden className="h-3 w-3 flex-none rounded-full bg-ink" />
                  {names}
                </span>
              ) : (
                <span className="text-[16px] text-ink-soft">Nothing growing here yet.</span>
              )}
            </Link>
          );
        })}
        <Link href="/spaces/new" className="rise tap flex min-h-16 items-center justify-center gap-2.5 border-[1.5px] border-dashed border-rule-dash text-[17px] font-medium" style={{ "--i": spaces.length + 1 } as React.CSSProperties}>
          <span aria-hidden className="text-[22px]">
            +
          </span>
          Add a space
        </Link>
        <div className="rise flex min-h-16 items-center justify-between border-t border-rule pt-1.5 text-ink-faint" style={{ "--i": spaces.length + 1 } as React.CSSProperties}>
          <span className="flex flex-col gap-0.5">
            <span className="text-[17px] font-medium">Farm or allotment</span>
            <span className="text-[16px]">For a volkstuin later on</span>
          </span>
          <span className="rounded-[2px] border border-ink-soft px-2 py-1 text-[15px] tracking-[.1em] text-ink-soft">COMING SOON</span>
        </div>
      </div>
    </div>
  );
}
