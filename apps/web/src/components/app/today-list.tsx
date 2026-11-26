"use client";

import Link from "next/link";
import { useState } from "react";
import { Seal } from "@/components/ui/seal";
import { useMembers, useTasksForDay } from "@/lib/data/hooks";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { completeTask, reopenTask } from "@/lib/data/repo";
import type { Task } from "@/lib/data/types";
import { listWords } from "@/lib/words";

function Row({ t, me, i }: { t: Task; me: string | null; i: number }) {
  const { db } = useData();
  return (
    <li className="rise flex min-h-[72px] items-center gap-4 border-b border-rule last:border-b-0" style={{ "--i": i } as React.CSSProperties}>
      <label className="tap flex h-11 w-11 flex-none cursor-pointer items-center justify-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
        <input type="checkbox" className="sr-only" aria-label={t.title} checked={!!t.done_at} onChange={() => void (t.done_at ? reopenTask(db, t.id) : completeTask(db, t.id, me))} />
        {t.done_at ? <Seal kind="済" press /> : <span aria-hidden className="pop h-[26px] w-[26px] rounded-full border-[1.5px] border-ink" />}
      </label>
      <Link href={`/today/${t.id}`} className="tap flex min-w-0 flex-1 flex-col gap-[3px] py-2">
        <span className={t.done_at ? "text-[17px] font-medium text-ink-soft transition-colors duration-500" : "text-[17px] font-medium transition-colors duration-500"}>{t.title}</span>
        {t.detail ? <span className="text-[16px] text-ink-soft">{t.detail}</span> : null}
      </Link>
    </li>
  );
}

/**
 * Today's small jobs. A busy day (jobs with a time of day) is grouped into
 * Morning round / Before dark (S06), and done jobs fold into one 済 row.
 */
export function TodayList({ day }: { day: string }) {
  const tasks = useTasksForDay(day);
  const [showDone, setShowDone] = useState(false);
  const members = useMembers();
  const { session } = useData();
  const me = meOf(members, session)?.id ?? null;
  if (!tasks) return null;
  if (!tasks.length) return <p className="fade-in pt-3 text-[16px] text-ink-soft">Nothing to do today. The field is resting.</p>;

  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at);
  const grouped = open.some((t) => t.slot) && open.length >= 4;
  const groups: [string | null, string | null, Task[]][] = grouped
    ? [
        ["Morning round", "before nine", open.filter((t) => t.slot === "morning")],
        ["During the day", null, open.filter((t) => !t.slot)],
        ["Before dark", "after dinner", open.filter((t) => t.slot === "evening")],
      ]
    : [[null, null, open]];
  // Two or more done: one quiet 済 row. One: it stays in the list.
  const fold = done.length >= 2 && !showDone;

  let i = 0;
  return (
    <div className="mt-2">
      {groups
        .filter(([, , ts]) => ts.length)
        .map(([title, when, ts]) => (
          <div key={title ?? "all"}>
            {title ? (
              <div className="flex items-baseline justify-between pb-1 pt-[18px]">
                <span className="font-mincho text-[20px]">{title}</span>
                {when ? <span className="text-[15px] text-ink-soft">{when}</span> : null}
              </div>
            ) : null}
            <ul>
              {ts.map((t) => (
                <Row key={t.id} t={t} me={me} i={i++} />
              ))}
            </ul>
          </div>
        ))}
      {done.length ? (
        fold ? (
          <button type="button" aria-expanded={false} onClick={() => setShowDone(true)} className="rise tap flex min-h-[64px] w-full items-center gap-4 border-t border-rule text-left" style={{ "--i": i } as React.CSSProperties}>
            <span className="flex h-11 w-11 flex-none items-center justify-center">
              <Seal kind="済" />
            </span>
            <span className="flex-1 text-[16px] text-ink-soft">
              {done.length} done today · {listWords(done.map((t, k) => (k ? t.title.toLowerCase() : t.title)))}
            </span>
            <span aria-hidden className="text-[20px]">
              ›
            </span>
          </button>
        ) : (
          <ul className={open.length ? "border-t border-rule" : ""}>
            {done.map((t) => (
              <Row key={t.id} t={t} me={me} i={i++} />
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
