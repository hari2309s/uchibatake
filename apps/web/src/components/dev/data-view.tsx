"use client";

import { cropById } from "@uchibatake/content";
import { Button } from "@/components/ui/button";
import { Column } from "@/components/ui/shell";
import { TodayList } from "@/components/app/today-list";
import { Eyebrow, SectionHeading, Title } from "@/components/ui/text";
import { isoDate } from "@/lib/dates";
import { useHarvests, useHousehold, useJournal, useMembers, usePlantings, useSeeds, useSpaces } from "@/lib/data/hooks";
import { DataProvider, useData } from "@/lib/data/provider";
import { harvestTotals } from "@/lib/data/queries";
import { endSession, startDemo, startGuest } from "@/lib/data/session";
import { signOutHere } from "@/lib/auth";

function Choose() {
  return (
    <Column className="gap-4 px-8 pt-16">
      <Title>Data</Title>
      <p className="text-ink-body">No field on this device yet.</p>
      <Button onClick={() => void startDemo()}>Explore the demo</Button>
      <Button variant="outline" onClick={startGuest}>
        Start my own field
      </Button>
    </Column>
  );
}

function Inside() {
  const { session } = useData();
  const household = useHousehold();
  const members = useMembers();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const harvests = useHarvests();
  const journal = useJournal();
  const seeds = useSeeds();
  const today = isoDate();
  const totals = harvests ? harvestTotals(harvests) : [];

  return (
    <Column className="gap-8 px-8 pb-16 pt-10">
      <div className="flex flex-col gap-2">
        <Eyebrow>{session.kind === "demo" ? "Demo" : session.kind === "guest" ? "Guest" : "Account"} · on this device</Eyebrow>
        <Title>{household?.name ?? ""}</Title>
        <p className="text-ink-soft">{household?.place}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-y border-rule py-4 text-[16px]">
        {(
          [
            ["People", members?.length],
            ["Spaces", spaces?.length],
            ["Growing", plantings?.filter((p) => p.status === "growing").length],
            ["Harvests", harvests?.length],
            ["Journal pages", journal?.length],
            ["Seed packets", seeds?.length],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-ink-soft">{k}</dt>
            <dd data-testid={`count-${k}`} className="font-mincho">
              {v ?? ""}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="today" className="flex flex-col">
        <SectionHeading id="today" aside="A few small things">
          Today
        </SectionHeading>
        <TodayList day={today} />
      </section>

      <section aria-labelledby="totals" className="flex flex-col gap-2">
        <SectionHeading id="totals">From the field</SectionHeading>
        <ul>
          {totals.map((t) => (
            <li key={t.cropId ?? "own"} className="flex justify-between border-t border-rule py-3.5">
              <span>{(t.cropId && cropById(t.cropId)?.name) ?? "Own plant"}</span>
              <span className="font-mincho text-[19px]">
                {t.pickings} {t.pickings === 1 ? "picking" : "pickings"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Button
        variant="outline"
        onClick={async () => {
          if (session.kind === "account") await signOutHere();
          endSession();
        }}
      >
        {session.kind === "account" ? "Sign out" : `Leave ${session.kind === "demo" ? "the demo" : "this field"}`}
      </Button>
    </Column>
  );
}

export function DataView() {
  return (
    <DataProvider fallback={<Choose />}>
      <Inside />
    </DataProvider>
  );
}
