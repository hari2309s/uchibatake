"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { cropById } from "@uchibatake/content";
import { useState } from "react";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { brushDraw } from "@/components/ui/enso";
import { Seal } from "@/components/ui/seal";
import { useHarvests, useHousehold, useJournal, useMembers, usePlantings, useSeeds } from "@/lib/data/hooks";
import { firstOfEach } from "@/lib/data/queries";
import { drawShareCard, shareCard } from "@/lib/share-card";
import { useToday } from "@/lib/use-today";
import { capitalise, numberWord } from "@/lib/words";
import { Section, shortDate } from "./parts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Counts as words, never charts: "eleven", "forty-odd". */
const TEENS = ["thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];

function countWords(n: number): string {
  if (n === 0) return "no";
  if (n <= 12) return numberWord(n);
  if (n < 20) return TEENS[n - 13];
  const tens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  return n < 100 ? `${tens[Math.floor(n / 10)]}${n % 10 ? "-odd" : ""}` : "over a hundred";
}

/** 14 Year in the field: what grew, firsts of each, moments, and a card to share. */
export function YearInField() {
  const household = useHousehold();
  const harvests = useHarvests();
  const plantings = usePlantings();
  const journal = useJournal();
  const seeds = useSeeds();
  const members = useMembers();
  const today = useToday();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!household || !harvests || !plantings || !journal || !seeds || !members || !today) return <PageLoader />;

  const year = today.slice(0, 4);
  const from = household.since > `${year}-01-01` ? household.since : `${year}-01-01`;
  const inYear = harvests.filter((h) => h.picked_on >= from && h.picked_on <= today);
  const crops = new Set(plantings.filter((p) => p.crop_id && p.status !== "planned" && p.started_on <= today && (!p.ended_on || p.ended_on >= from)).map((p) => p.crop_id!));
  const saved = seeds.filter((s) => s.source === "saved" && String(s.year) === year).length;
  const firsts = firstOfEach(harvests, from, today);
  const quotes = journal.filter((j) => j.written_on >= from && /[“"]/.test(j.text)).slice(0, 3);
  const writer = (id: string) => members.find((m) => m.id === id)?.name;
  const span = `${MONTHS[Number(from.slice(5, 7)) - 1]} to ${MONTHS[Number(today.slice(5, 7)) - 1]}`;
  const people = household.people_count ?? members.length;
  const line = `${capitalise(countWords(crops.size))} ${crops.size === 1 ? "crop" : "crops"}, ${countWords(inYear.length)} ${inYear.length === 1 ? "harvest" : "harvests"}${saved ? `, and ${countWords(saved)} ${saved === 1 ? "envelope" : "envelopes"} of seed saved` : ""}. Grown${household.place ? ` in ${household.place}` : ""} by ${people === 1 ? "one of us" : `${numberWord(people)} of us`}.`;
  const title = `${household.name.replace(/ family$/, "")}${household.name.endsWith("family") ? " field" : ""}, ${year}`;

  return (
    <div className="pb-10">
      <BackBar href="/journal" label="Journal" />
      <div className="rise flex flex-col gap-2 px-8 pt-3">
        <h1 className="font-mincho text-[34px] font-normal leading-[1.15]">Our year in the field</h1>
        <p className="text-[16px] text-ink-soft">
          {span}
          {household.place ? ` · ${household.place}` : ""}
        </p>
      </div>
      <ul className="flex flex-col px-8 pt-6">
        {[
          `${capitalise(countWords(crops.size))} ${crops.size === 1 ? "crop" : "crops"} grown`,
          `${capitalise(countWords(inYear.length))} ${inYear.length === 1 ? "harvest" : "harvests"}`,
          saved ? `${capitalise(countWords(saved))} ${saved === 1 ? "envelope" : "envelopes"} of seed saved` : null,
        ]
          .filter(Boolean)
          .map((t, i) => (
            <li key={i} className="rise border-t border-rule py-3.5 font-mincho text-[24px] last:border-b" style={{ "--i": i + 1 } as React.CSSProperties}>
              {t}
            </li>
          ))}
      </ul>
      {firsts.length ? (
        <Section title="First of each" i={4} className="pt-10">
          <ol className="flex flex-col gap-4 pt-4">
            {firsts.map((h) => (
              <li key={h.id} className="grid grid-cols-[64px_1fr] gap-3">
                <span className="font-mincho text-[16px] text-ink-soft">{shortDate(h.picked_on)}</span>
                <span className="text-[17px] leading-normal">
                  First {cropById(h.crop_id!)?.name.toLowerCase()}
                  {h.note ? `, ${h.note.charAt(0).toLowerCase()}${h.note.slice(1).replace(/\.$/, "")}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
      {quotes.length ? (
        <Section title="Moments we kept" i={5} className="pt-10">
          <div className="flex flex-col gap-5 pt-4">
            {quotes.map((q) => (
              <blockquote key={q.id} className="flex flex-col gap-1.5">
                <p className="font-mincho text-[19px] leading-[1.6]">{q.text.match(/[“"][^”"]+[”"]/)?.[0] ?? q.text}</p>
                <span className="text-[16px] text-ink-soft">— {writer(q.writer_id)}</span>
              </blockquote>
            ))}
          </div>
        </Section>
      ) : null}

      <section aria-label="Share card" className="rise mx-8 mt-12 flex flex-col items-center gap-4 border border-rule bg-card px-6 pb-7 pt-8 text-center" style={{ "--i": 6 } as React.CSSProperties}>
        <div className="relative h-[120px] w-[120px]">
          <svg width="120" height="120" aria-hidden className="block">
            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round" transform="rotate(-80 60 60)" style={brushDraw(2 * Math.PI * 48 * 0.9, 2 * Math.PI * 48, 200, 1300)} />
          </svg>
          <span className="absolute -bottom-1 -right-3">
            <Seal kind="収" size={44} press className="[animation-delay:1100ms,1380ms]" />
          </span>
        </div>
        <h2 className="font-mincho text-[24px] font-normal leading-tight">{title}</h2>
        <p className="text-[16px] leading-[1.6] text-ink-body">{line}</p>
        <span className="text-[15px] tracking-[.16em] text-ink-soft">うちばたけ · UCHIBATAKE</span>
      </section>
      <div className="rise flex flex-col gap-2 px-8 pt-5" style={{ "--i": 7 } as React.CSSProperties}>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const blob = await drawShareCard({ title, line, footer: "うちばたけ · UCHIBATAKE" });
              const r = await shareCard(blob, `uchibatake-${year}.png`);
              setNote(r === "downloaded" ? "Saved as a picture on this device." : null);
            } catch {
              setNote("That didn't work just now. Try again in a moment.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Share this card
        </Button>
        <p className="text-center text-[16px] text-ink-soft">{note ?? "Made on this phone. Nothing is uploaded."}</p>
      </div>
    </div>
  );
}
