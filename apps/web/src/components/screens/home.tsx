"use client";

import Link from "next/link";
import { TodayList } from "@/components/app/today-list";
import { ButtonLink } from "@/components/ui/button";
import { Enso } from "@/components/ui/enso";
import { NoticeRow } from "@/components/ui/notice";
import { useHousehold, usePlantings, useSettings, useSpaces, useTasksForDay } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { useLiveQuery } from "dexie-react-hooks";
import { live } from "@/lib/data/repo";
import { growthStatus, readyWords } from "@/lib/growth";
import { isIndoors, spaceLine } from "@/lib/space-words";
import { useToday } from "@/lib/use-today";
import { capitalise, numberWord } from "@/lib/words";
import { plantName, PlantCell, Section, SeasonHeader } from "./parts";

/** "Two things to do before dark", "One thing…", "All done". */
export function thingsLeft(n: number): string {
  if (n === 0) return "All done";
  return `${capitalise(numberWord(n))} ${n === 1 ? "thing" : "things"} to do before dark`;
}

/** 02 Home: the season, today's small things, the spaces, what's ready soon. */
export function Home() {
  const { db } = useData();
  const today = useToday();
  const household = useHousehold();
  const settings = useSettings();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const tasks = useTasksForDay(today ?? "");
  const notice = useLiveQuery(async () => (today ? (await live(db.notices)).find((n) => n.for_date === today) : undefined), [db, today]);
  if (!today || !household || !plantings) return null;

  const growing = (plantings ?? []).filter((p) => p.status === "growing");
  const open = tasks?.filter((t) => !t.done_at).length ?? 0;
  const ready = growing
    .map((p) => ({ p, g: growthStatus(p, today, { indoors: isIndoors(spaces?.find((s) => s.id === p.space_id)), climate: household.climate }) }))
    .filter((x) => x.g.readyInDays !== null && x.g.readyInDays <= 42)
    .sort((a, b) => a.g.readyInDays! - b.g.readyInDays!)
    .slice(0, 6);

  return (
    <div className="pb-6">
      <SeasonHeader household={household} settings={settings} today={today} />

      {notice ? (
        <div className="rise mx-8 mt-7" style={{ "--i": 1 } as React.CSSProperties}>
          <NoticeRow kind={notice.kind} title={notice.kind === "frost" ? "Frost tonight" : notice.kind === "heat" ? "Hot today" : "Heavy rain"} detail={thingsLeft(notice.checklist.filter((c) => !c.done_at).length)} href={`/notice/${notice.id}`} />
        </div>
      ) : null}

      {tasks?.length || growing.length ? (
        <Section title="Today" aside={open ? (open === 1 ? "One small thing" : open >= 6 ? `${capitalise(numberWord(open))} things, no rush` : "A few small things") : "All done"} i={2}>
          <TodayList day={today} />
        </Section>
      ) : null}

      {plantings.length === 0 ? (
        // 15a: the first day. An open ensō that hasn't started closing, and one thing to do.
        <section className="rise flex flex-col items-center gap-5 px-8 pt-12 text-center" style={{ "--i": 3 } as React.CSSProperties} aria-label="Your field is waiting">
          <Enso value={6} size={120} />
          <h2 className="font-mincho text-[30px] font-normal">Your field is waiting</h2>
          <p className="max-w-[300px] text-[17px] leading-[1.6] text-ink-body">Start with one plant. We&apos;ll suggest one that suits the season and your space.</p>
          <div className="flex w-full flex-col gap-2.5 pt-2">
            <ButtonLink href="/add">Add your first plant</ButtonLink>
            {spaces?.length ? null : (
              <ButtonLink href="/spaces/new" variant="quiet">
                Set up a space first
              </ButtonLink>
            )}
          </div>
        </section>
      ) : spaces?.length ? (
        <Section title="My spaces" aside="See all" href="/spaces" i={3}>
          <div className="flex flex-col gap-3.5 pt-1">
            {spaces.map((s, si) => {
              const here = growing.filter((p) => p.space_id === s.id);
              return (
                <div key={s.id} className="rise flex flex-col gap-[18px] border border-rule bg-card p-5" style={{ "--i": si } as React.CSSProperties}>
                  <Link href={`/spaces/${s.id}`} className="tap flex items-baseline justify-between gap-3">
                    <span className="font-mincho text-[21px]">{s.name}</span>
                    <span className="text-right text-[16px] text-ink-soft">{spaceLine(s)}</span>
                  </Link>
                  {here.length ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                      {here.map((p, k) => (
                        <PlantCell key={p.id} p={p} today={today} compact indoors={isIndoors(s)} i={k + 1} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[16px] text-ink-soft">Nothing growing here yet.</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      ) : (
        <Section title="My spaces" i={3}>
          <p className="pt-2 text-[16px] text-ink-soft">A windowsill is enough to begin.</p>
        </Section>
      )}

      {ready.length ? (
        <Section title="Ready soon" i={4}>
          <ul className="pt-3">
            {ready.map(({ p, g }, i) => (
              <li key={p.id} className="rise border-t border-rule last:border-b" style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/plants/${p.id}`} className="tap flex items-baseline justify-between py-3.5">
                  <span className="text-[17px]">{plantName(p)}</span>
                  <span className="font-mincho text-[22px]">{readyWords(g.readyInDays!)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
