"use client";

import { PageLoader } from "@/components/ui/page-loader";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Seal } from "@/components/ui/seal";
import { useMembers, useTasksForDay } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { completeTask, reopenTask } from "@/lib/data/repo";
import { useToday } from "@/lib/use-today";
import { capitalise, numberWord } from "@/lib/words";

/** M14 Kid job view: big words, their own mark, and a box they press to stamp 済 themselves. */
export function KidJobs({ memberId }: { memberId: string }) {
  const { db } = useData();
  const today = useToday();
  const members = useMembers();
  const tasks = useTasksForDay(today ?? "");
  const me = members?.find((m) => m.id === memberId);
  if (!today || !members || !tasks) return <PageLoader />;
  if (!me)
    return (
      <div className="flex min-h-dvh flex-col items-start gap-4 px-8 pt-16">
        <p className="text-[19px] text-ink-body">We can&apos;t find that page of jobs.</p>
        <Link href="/family" className="tap flex min-h-14 items-center text-[19px] underline underline-offset-[5px]">
          Back to the family
        </Link>
      </div>
    );
  // "Mira's job: a snail check" → "Snail check" (a plain prefix, never a pattern built from a name).
  const jobName = (title: string) => {
    const prefix = `${me.name}'s job: `;
    const rest = title.toLowerCase().startsWith(prefix.toLowerCase()) ? title.slice(prefix.length) : title;
    return capitalise(rest.replace(/^an?\s+/i, ""));
  };
  const jobs = tasks.filter((t) => t.assignee_id === me.id);
  const left = jobs.filter((t) => !t.done_at).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col gap-[22px] px-8 pt-10">
        <div className="rise flex items-center gap-4">
          <span className="scale-[1.55]">
            <Avatar mark={me.mark} size={46} selected />
          </span>
          <div className="flex flex-col gap-0.5 pl-3">
            <h1 className="font-mincho text-[40px] font-normal leading-none">Hi, {me.name}</h1>
            <span className="text-[19px] text-ink-soft">{jobs.length === 0 ? "No jobs today" : left === 0 ? "All done today" : `${capitalise(numberWord(left))} ${left === 1 ? "job" : "jobs"} today`}</span>
          </div>
        </div>
        <ul className="flex flex-col border-b border-rule">
          {jobs.map((t, i) => (
            <li key={t.id} className="rise flex items-center gap-5 border-t border-rule py-[22px]" style={{ "--i": i + 1 } as React.CSSProperties}>
              <div className="flex flex-1 flex-col gap-1.5">
                <span className="font-mincho text-[30px] leading-[1.2]">{jobName(t.title)}</span>
                {t.detail ? <span className="text-[19px] leading-[1.45] text-ink-soft">{t.detail}</span> : null}
              </div>
              <label className="tap flex h-24 w-24 flex-none cursor-pointer items-center justify-center rounded-[6px] border-[2.5px] border-dashed border-ink has-[:checked]:border-transparent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ink">
                <input type="checkbox" className="sr-only" aria-label={`${t.title}: done`} checked={!!t.done_at} onChange={() => void (t.done_at ? reopenTask(db, t.id) : completeTask(db, t.id, me.id))} />
                {t.done_at ? <Seal kind="済" size={88} press /> : null}
              </label>
            </li>
          ))}
        </ul>
        {jobs.length ? <p className="rise text-[19px] leading-normal text-ink-body">Press the box when you&apos;re done. You get to stamp it yourself.</p> : null}
      </div>
      <div className="mt-auto flex items-center justify-between px-8 pb-10 pt-10">
        <Link href="/family" className="tap flex min-h-14 items-center text-[19px] underline underline-offset-[5px]">
          Not {me.name}?
        </Link>
        <Link href="/" className="tap flex min-h-14 items-center text-[19px] text-ink-soft">
          Grown-ups ›
        </Link>
      </div>
    </div>
  );
}
