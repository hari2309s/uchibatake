"use client";

import { Seal } from "@/components/ui/seal";
import { useMembers, useTasksForDay } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { completeTask, reopenTask } from "@/lib/data/repo";

/** Today's small jobs, each ticked with a 済 (Home's list; the full Home comes in Phase 4). */
export function TodayList({ day }: { day: string }) {
  const { db } = useData();
  const tasks = useTasksForDay(day);
  const members = useMembers();
  const me = members?.find((m) => m.role === "owner")?.id ?? null;
  if (!tasks) return null;
  if (!tasks.length) return <p className="pt-3 text-[16px] text-ink-soft">Nothing to do today. The field is resting.</p>;
  return (
    <ul className="mt-2">
      {tasks.map((t) => (
        <li key={t.id} className="border-b border-rule last:border-b-0">
          <label className="flex min-h-[72px] cursor-pointer items-center gap-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
            <input type="checkbox" className="sr-only" checked={!!t.done_at} onChange={() => void (t.done_at ? reopenTask(db, t.id) : completeTask(db, t.id, me))} />
            <span className="flex h-11 w-11 flex-none items-center justify-center">
              {t.done_at ? <Seal kind="済" press /> : <span aria-hidden className="h-[26px] w-[26px] rounded-full border-[1.5px] border-ink" />}
            </span>
            <span className="flex flex-col gap-[3px] py-2">
              <span className={t.done_at ? "text-[17px] font-medium text-ink-soft" : "text-[17px] font-medium"}>{t.title}</span>
              {t.detail ? <span className="text-[16px] text-ink-soft">{t.detail}</span> : null}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
