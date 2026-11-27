"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { JournalSheet } from "./journal-editor";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { cropById } from "@uchibatake/content";
import Link from "next/link";
import { Seal } from "@/components/ui/seal";
import { useHarvests, useJournal, useMembers } from "@/lib/data/hooks";
import { harvestTotals } from "@/lib/data/queries";
import { useToday } from "@/lib/use-today";
import { numberWord } from "@/lib/words";
import { Section, shortDate } from "./parts";

const monthOf = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

/** 07 Journal: the family's field, written down, newest first, by month. */
export function Journal({ writing: fromRoute = false }: { writing?: boolean } = {}) {
  const router = useRouter();
  const [writing, setWriting] = useState(fromRoute);
  const closeWriting = () => {
    setWriting(false);
    // Opened at /journal/new: back to the journal itself.
    if (fromRoute) router.replace("/journal");
  };
  const entries = useJournal();
  const members = useMembers();
  const harvests = useHarvests();
  const today = useToday();
  if (!entries || !today) return <PageLoader />;
  const year = today.slice(0, 4);
  const months = [...new Set(entries.map((e) => monthOf(e.written_on)))];
  const writer = (id: string) => members?.find((m) => m.id === id)?.name ?? "";
  const totals = harvestTotals((harvests ?? []).filter((h) => h.picked_on.startsWith(year))).sort((a, b) => b.pickings - a.pickings);

  return (
    <div className="pb-6">
      <div className="rise flex items-start justify-between px-8 pt-[30px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-mincho text-[34px] font-normal">Journal</h1>
          <p className="text-[16px] text-ink-soft">Our family&apos;s field, written down.</p>
        </div>
        <button type="button" onClick={() => setWriting(true)} aria-label="Write a new page" className="tap pop flex h-12 w-12 flex-none items-center justify-center rounded-full bg-ink text-[22px] text-on-ink">
          ✎
        </button>
      </div>

      <div className="rise flex gap-6 px-8 pt-4" style={{ "--i": 1 } as React.CSSProperties}>
        <Link href="/journal/seeds" className="tap flex min-h-11 items-center text-[16px] underline underline-offset-4">
          Seed box
        </Link>
        <Link href="/journal/year" className="tap flex min-h-11 items-center text-[16px] underline underline-offset-4">
          Our year in the field
        </Link>
      </div>
      {entries.length === 0 ? <EmptyState line="The first page is waiting for something small." action="Write the first note" onAction={() => setWriting(true)} /> : null}

      {months.map((month, mi) => (
        <section key={month} aria-label={month} className="rise" style={{ "--i": mi + 1 } as React.CSSProperties}>
          <div className="flex items-baseline gap-3.5 px-8 pt-[30px]">
            <h2 className="font-mincho text-[22px] font-normal">{month.split(" ")[0]}</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
            <span className="font-mincho text-[16px] text-ink-soft">{month.split(" ")[1]}</span>
          </div>
          {entries
            .filter((e) => monthOf(e.written_on) === month)
            .map((e, i) => (
              <Link key={e.id} href={`/journal/${e.id}`} className={`tap mx-8 flex flex-col gap-2 pt-5 ${i ? "mt-1.5 border-t border-rule" : ""}`}>
                <span className="flex items-baseline justify-between">
                  <span className="text-[15px] uppercase tracking-[.12em] text-ink-soft">
                    {shortDate(e.written_on)} · {writer(e.writer_id)}
                  </span>
                  {e.seal ? <Seal kind={e.seal} size={28} /> : null}
                </span>
                {e.title ? <span className="font-mincho text-[21px]">{e.title}</span> : null}
                <span className="line-clamp-3 text-[16px] leading-[1.6] text-ink-body">{e.text}</span>
              </Link>
            ))}
        </section>
      ))}

      {totals.length ? (
        <Section title="From the field this season" i={months.length + 1} className="pt-10">
          <ul className="pt-3">
            {totals.slice(0, 8).map((t) => (
              <li key={t.cropId ?? "own"} className="flex items-baseline justify-between border-t border-rule py-[13px] last:border-b">
                <span className="text-[17px]">{(t.cropId && cropById(t.cropId)?.name) ?? "Our own plants"}</span>
                <span className="font-mincho text-[18px]">
                  {numberWord(t.pickings)} {t.pickings === 1 ? "picking" : "pickings"}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <JournalSheet open={writing} onClose={closeWriting} atOwnAddress={fromRoute} />
    </div>
  );
}
