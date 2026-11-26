"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { useLiveQuery } from "dexie-react-hooks";
import { BackBar } from "@/components/ui/bars";
import { Switch } from "@/components/ui/choice";
import { NoticeRow } from "@/components/ui/notice";
import { Seal } from "@/components/ui/seal";
import { useReminders, useSettings } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { live, setSettings } from "@/lib/data/repo";
import { addDays, parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { capitalise, numberWord } from "@/lib/words";

/** 13a Reminders: today's notice, today, this week, and how we remind you. */
export function Reminders() {
  const { db } = useData();
  const reminders = useReminders();
  const settings = useSettings();
  const today = useToday();
  const notice = useLiveQuery(async () => (today ? (await live(db.notices)).find((n) => n.for_date === today) : undefined), [db, today]);
  if (!reminders || !today) return <PageLoader />;
  const weekEnd = addDays(today, 7);
  const todays = reminders.filter((r) => r.on === today || r.repeat === "daily");
  const week = reminders.filter((r) => r.repeat === "none" && r.on > today && r.on <= weekEnd);
  const left = notice?.checklist.filter((c) => !c.done_at).length ?? 0;

  const row = (time: string, title: string, done: boolean, key: string, i: number) => (
    <li key={key} className="rise grid min-h-16 grid-cols-[86px_1fr_32px] items-center gap-2.5 border-b border-rule" style={{ "--i": i } as React.CSSProperties}>
      <span className="font-mincho text-[17px]">{time}</span>
      <span className={done ? "text-[17px] text-ink-soft" : "text-[17px]"}>{title}</span>
      {done ? <Seal kind="済" size={28} label="Done" /> : <span />}
    </li>
  );

  return (
    <div className="pb-9">
      <BackBar href="/profile" label="Profile" />
      <div className="rise px-8 pt-3">
        <h1 className="font-mincho text-[34px] font-normal">Reminders</h1>
      </div>
      {notice ? (
        <div className="rise mx-8 mt-5" style={{ "--i": 1 } as React.CSSProperties}>
          <NoticeRow kind={notice.kind} title={notice.kind === "frost" ? "Frost tonight" : notice.kind === "heat" ? "Hot today" : "Heavy rain"} detail={left ? `${capitalise(numberWord(left))} things to do before dark` : "All done"} href={`/notice/${notice.id}`} />
        </div>
      ) : null}
      <h2 className="px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">Today</h2>
      <ul className="px-8 pt-1">
        {todays.length ? todays.map((r, i) => row(r.time ?? "Today", r.title, !!r.done_at && r.on === today, r.id, i + 2)) : <li className="py-4 text-[16px] text-ink-soft">Nothing to remember today. The field is resting.</li>}
        {notice ? row("Before dark", `${capitalise(numberWord(notice.checklist.length))} ${notice.kind === "frost" ? "frost" : notice.kind === "heat" ? "heat" : "rain"} ${notice.checklist.length === 1 ? "job" : "jobs"}`, left === 0, "notice", todays.length + 2) : null}
      </ul>
      {week.length ? (
        <>
          <h2 className="px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">This week</h2>
          <ul className="px-8 pt-1">{week.map((r, i) => row(`${parseIsoDate(r.on).toLocaleDateString("en-GB", { weekday: "short" })}${r.time ? ` ${r.time}` : ""}`, r.title, !!r.done_at, r.id, i + 5))}</ul>
        </>
      ) : null}
      <h2 className="px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">How we remind you</h2>
      <div className="px-8 pt-1">
        <div className="flex min-h-[60px] items-center justify-between border-b border-rule">
          <span className="text-[17px]">Frost warnings</span>
          <Switch label="Frost warnings" checked={settings?.frostWarnings ?? true} onChange={(frostWarnings) => void setSettings(db, { frostWarnings })} />
        </div>
        <div className="flex min-h-[60px] items-center justify-between border-b border-rule">
          <span className="text-[17px]">Quiet hours</span>
          <span className="text-[16px] text-ink-soft">
            {settings?.quietHours.from} to {settings?.quietHours.to}
          </span>
        </div>
        <div className="flex min-h-[60px] items-center justify-between border-b border-rule">
          <span className="text-[17px]">Daily round</span>
          <span className="text-[16px] text-ink-soft">{settings?.dailyRound ? `Once, at ${settings.dailyRound}` : "Off"}</span>
        </div>
        {/* Notifications aren't sent yet (Phase 9): say so rather than imply they are. */}
        <p className="pt-3 text-[16px] leading-normal text-ink-soft">These live in the app for now. Notes on your phone come later, and only if you allow them.</p>
      </div>
    </div>
  );
}
