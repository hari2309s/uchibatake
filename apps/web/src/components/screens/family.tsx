"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Mark } from "@/components/ui/avatar";
import { GiveJobSheet } from "./sheets";
import { Seal } from "@/components/ui/seal";
import { useHarvests, useMembers } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { completeTask, live, reopenTask } from "@/lib/data/repo";
import type { Member } from "@/lib/data/types";
import { addDays, isoDate, parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { capitalise, numberWord } from "@/lib/words";
import { useLiveQuery } from "dexie-react-hooks";
import { Section } from "./parts";

const ROLE_WORDS = { owner: "Looks after it all", editor: "Can edit everything", helper: "Helps out" } as const;

function memberLine(m: Member): string {
  const note = m.note ?? (m.role === "helper" ? null : ROLE_WORDS[m.role]);
  if (m.kind === "child") return [m.age ? String(m.age) : null, note].filter(Boolean).join(" · ");
  return note ?? ROLE_WORDS[m.role];
}

/** 10 Family: who's in it, this week's small jobs, and who helped, day by day. */
export function Family() {
  const { db } = useData();
  const [giving, setGiving] = useState(false);
  const members = useMembers();
  const harvests = useHarvests();
  const today = useToday();
  const tasks = useLiveQuery(() => live(db.tasks), [db]);
  if (!members || !today || !tasks) return null;

  // This week, Monday to Sunday.
  const dow = (parseIsoDate(today).getDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - dow));
  const jobs = tasks.filter((t) => t.assignee_id && week[0] <= t.due_on && t.due_on <= week[6]).sort((a, b) => a.due_on.localeCompare(b.due_on));
  // One seal per person per day they helped: a job ticked or a picking.
  const helped = week.map((day) => {
    const ids = new Set<string>();
    for (const t of tasks) if (t.done_at && t.done_by && isoDate(new Date(t.done_at)) === day) ids.add(t.done_by);
    for (const h of harvests ?? []) if (h.picked_on === day) h.picked_by.forEach((x) => ids.add(x));
    return members.filter((m) => ids.has(m.id));
  });
  const everyone = members.every((m) => helped.some((d) => d.some((x) => x.id === m.id)));
  const who = (id: string | null) => members.find((m) => m.id === id);
  // Whoever ticks a job did it: the person using the app (the owner, until each person signs in).
  const me = members.find((m) => m.role === "owner")?.id ?? null;

  return (
    <div className="pb-9">
      <div className="rise flex flex-col gap-2 px-8 pt-[22px]">
        <h1 className="font-mincho text-[34px] font-normal">Our family</h1>
        <p className="text-[16px] text-ink-soft">{capitalise(numberWord(members.length))} {members.length === 1 ? "person" : "people"}, one small field.</p>
      </div>
      <ul className="flex flex-col px-8 pt-[18px]">
        {members.map((m, i) => {
          const row = (
            <>
              <Avatar mark={m.mark} size={44} selected={m.role === "owner"} quiet={m.role === "editor"} />
              <span className="flex-1 text-[17px]">{m.name}</span>
              <span className="text-right text-[16px] text-ink-soft">{memberLine(m)}</span>
              {m.kind === "child" ? <span aria-hidden className="text-[20px]">›</span> : null}
            </>
          );
          return (
            <li key={m.id} className="rise border-t border-rule last:border-b" style={{ "--i": i + 1 } as React.CSSProperties}>
              {/* Children have their own page of jobs, with a box to stamp (M14). */}
              {m.kind === "child" ? (
                <Link href={`/kid/${m.id}`} className="tap flex min-h-[62px] items-center gap-3.5" aria-label={`${m.name}'s jobs`}>
                  {row}
                </Link>
              ) : (
                <div className="flex min-h-[62px] items-center gap-3.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>

      {jobs.length ? (
        <Section title="Small jobs this week" i={4} className="pt-[34px]">
          <ul className="pt-2">
            {jobs.map((t) => (
              <li key={t.id} className="border-b border-rule last:border-b-0">
                <label className="flex min-h-[72px] cursor-pointer items-center gap-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
                  <input type="checkbox" className="sr-only" checked={!!t.done_at} onChange={() => void (t.done_at ? reopenTask(db, t.id) : completeTask(db, t.id, me))} />
                  <span className="flex h-11 w-11 flex-none items-center justify-center">{t.done_at ? <Seal kind="済" press /> : <span aria-hidden className="h-[26px] w-[26px] rounded-full border-[1.5px] border-ink" />}</span>
                  <span className="flex flex-col gap-[3px]">
                    <span className={t.done_at ? "text-[17px] font-medium text-ink-soft" : "text-[17px] font-medium"}>{t.title}</span>
                    <span className="text-[16px] text-ink-soft">
                      {who(t.assignee_id)?.name} · {parseIsoDate(t.due_on).toLocaleDateString("en-GB", { weekday: "long" })}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="rise px-8 pt-4" style={{ "--i": 5 } as React.CSSProperties}>
        <button type="button" onClick={() => setGiving(true)} className="tap flex min-h-16 w-full items-center justify-center gap-2.5 border-[1.5px] border-dashed border-rule-dash text-[17px] font-medium">
          <span aria-hidden className="text-[22px]">
            +
          </span>
          Give a small job
        </button>
      </div>
      <GiveJobSheet open={giving} onClose={() => setGiving(false)} />

      <Section title="Who helped" aside="This week, day by day." i={5} className="pt-[34px]">
        <div className="grid grid-cols-7 gap-1 pt-4" role="list">
          {week.map((day, i) => (
            <div key={day} role="listitem" aria-label={`${parseIsoDate(day).toLocaleDateString("en-GB", { weekday: "long" })}: ${helped[i].map((m) => m.name).join(", ") || "no one yet"}`} className="flex flex-col items-center gap-1.5">
              <span aria-hidden className={day === today ? "text-[16px] font-bold" : "text-[16px] text-ink-soft"}>
                {"MTWTFSS"[i]}
              </span>
              <span aria-hidden className="flex min-h-[64px] flex-col items-center gap-1">
                {helped[i].length ? (
                  helped[i].slice(0, 3).map((m) => (
                    <span key={m.id} className="rise flex h-6 w-6 items-center justify-center rounded-[3px] bg-shu font-mincho text-[15px] text-on-ink" style={{ "--i": i, transform: "rotate(-4deg) scale(.8)" } as React.CSSProperties}>
                      <span className="scale-[.8]">
                        <Mark mark={m.mark} />
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="h-6 w-6 rounded-[3px] border-[1.5px] border-dashed border-rule-dash" />
                )}
              </span>
            </div>
          ))}
        </div>
        {everyone ? <p className="pt-3 text-[16px] text-ink-soft">Everyone lent a hand this week. Thank you.</p> : null}
      </Section>

      <Section title="Invite someone" i={6} className="pt-[34px]">
        {/* Design offers "Send a link". Sharing one field across phones needs sync, which isn't built yet, so we say so. */}
        <p className="pt-2 text-[17px] leading-[1.6] text-ink-body">A neighbour who waters when you&apos;re away? Invites arrive with sharing between phones, which is still to come.</p>
      </Section>
    </div>
  );
}
