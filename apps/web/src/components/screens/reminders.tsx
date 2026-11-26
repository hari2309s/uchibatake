"use client";

import { useState } from "react";
import Link from "next/link";
import { AddReminderSheet } from "./sheets";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { useLiveQuery } from "dexie-react-hooks";
import { BackBar } from "@/components/ui/bars";
import { Switch } from "@/components/ui/choice";
import { NoticeRow } from "@/components/ui/notice";
import { Seal } from "@/components/ui/seal";
import { useReminders, useSettings } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { live, remove, setSettings, update } from "@/lib/data/repo";
import type { Reminder } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { addDays, isoDate, parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { capitalise, numberWord } from "@/lib/words";

/** 13a Reminders: today's notice, today, this week, and how we remind you. */
export function Reminders() {
  const { db } = useData();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Reminder | null>(null);
  const reminders = useReminders();
  const settings = useSettings();
  const today = useToday();
  const notice = useLiveQuery(async () => (today ? (await live(db.notices)).find((n) => n.for_date === today) : undefined), [db, today]);
  if (!reminders || !today) return <PageLoader />;
  const weekEnd = addDays(today, 7);
  const todays = reminders.filter((r) => r.on === today || (r.repeat === "daily" && r.on <= today));
  const week = reminders.filter((r) => r.repeat === "none" && r.on > today && r.on <= weekEnd);
  const later = reminders.filter((r) => (r.repeat === "none" || r.on > today) && r.on > weekEnd);
  // Done counts for the day it was ticked (a daily one comes back tomorrow).
  const doneToday = (r: Reminder) => !!r.done_at && isoDate(new Date(r.done_at)) === today;
  const left = notice?.checklist.filter((c) => !c.done_at).length ?? 0;
  // M18d: nothing today, nothing this week, no notice.
  const empty = !todays.length && !week.length && !later.length && !notice;

  const cells = (time: string, title: string, done: boolean) => (
    <>
      <span className="font-mincho text-[17px]">{time}</span>
      <span className={done ? "text-[17px] text-ink-soft" : "text-[17px]"}>{title}</span>
      {done ? <Seal kind="済" size={28} label="Done" /> : <span />}
    </>
  );
  const grid = "grid min-h-16 w-full grid-cols-[86px_1fr_32px] items-center gap-2.5 text-left";
  const row = (time: string, title: string, done: boolean, key: string, i: number, r?: Reminder) => (
    <li key={key} className="rise border-b border-rule" style={{ "--i": i } as React.CSSProperties}>
      {r ? (
        <button type="button" className={`tap ${grid}`} onClick={() => setOpen(r)} aria-label={`${title}, ${time}${done ? ", done" : ""}`}>
          {cells(time, title, done)}
        </button>
      ) : (
        <div className={grid}>{cells(time, title, done)}</div>
      )}
    </li>
  );
  const day = (on: string) => parseIsoDate(on).toLocaleDateString("en-GB", { weekday: "short" });

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
      {empty ? (
        <EmptyState line="Nothing to remember today. The field is resting." action="Add a reminder" onAction={() => setAdding(true)} />
      ) : (
        <>
      <h2 className="px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">Today</h2>
      <ul className="px-8 pt-1">
        {todays.length ? todays.map((r, i) => row(r.time ?? "Today", r.title, doneToday(r), r.id, i + 2, r)) : <li className="py-4 text-[16px] text-ink-soft">Nothing to remember today. The field is resting.</li>}
        {notice ? row("Before dark", `${capitalise(numberWord(notice.checklist.length))} ${notice.kind === "frost" ? "frost" : notice.kind === "heat" ? "heat" : "rain"} ${notice.checklist.length === 1 ? "job" : "jobs"}`, left === 0, "notice", todays.length + 2) : null}
      </ul>
      {week.length ? (
        <>
          <h2 className="px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">This week</h2>
          <ul className="px-8 pt-1">{week.map((r, i) => row(`${day(r.on)}${r.time ? ` ${r.time}` : ""}`, r.title, !!r.done_at, r.id, i + 5, r))}</ul>
        </>
      ) : null}
      {later.length ? (
        <>
          <h2 className="px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft">Later</h2>
          <ul className="px-8 pt-1">{later.map((r, i) => row(parseIsoDate(r.on).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), r.title, !!r.done_at, r.id, i + 6, r))}</ul>
        </>
      ) : null}
      <div className="rise px-8 pt-6" style={{ "--i": 7 } as React.CSSProperties}>
        <button type="button" onClick={() => setAdding(true)} className="tap flex min-h-16 w-full items-center justify-center gap-2.5 border-[1.5px] border-dashed border-rule-dash text-[17px] font-medium">
          <span aria-hidden className="text-[22px]">
            +
          </span>
          Add a reminder
        </button>
      </div>
        </>
      )}
      <AddReminderSheet open={adding} onClose={() => setAdding(false)} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""}>
        {open ? (
          <div className="flex flex-col gap-3 px-8 pb-[34px] pt-3">
            <Button
              onClick={async () => {
                await update(db.reminders, open.id, { done_at: doneToday(open) ? null : Date.now() });
                setOpen(null);
              }}
            >
              {doneToday(open) ? "Not done after all" : "Done today"}
            </Button>
            <button
              type="button"
              className="min-h-11 text-[16px] text-ink-soft underline underline-offset-4"
              onClick={async () => {
                await remove(db.reminders, open.id);
                setOpen(null);
              }}
            >
              Remove this reminder
            </button>
          </div>
        ) : null}
      </Sheet>
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
        {/* True of the code: notes on the phone are set in Settings (lib/notify.ts, lib/push.ts). */}
        <p className="pt-3 text-[16px] leading-normal text-ink-soft">
          Notes on your phone, and when they come, are in{" "}
          <Link href="/settings" className="underline underline-offset-4">
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
