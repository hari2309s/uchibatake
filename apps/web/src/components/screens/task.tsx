"use client";

import { cropById } from "@uchibatake/content";
import { useRouter } from "next/navigation";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Seal } from "@/components/ui/seal";
import { useMembers, usePlantings, useSpace, useTask } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { completeTask, reopenTask, skipTask, snoozeTask } from "@/lib/data/repo";
import { addDays } from "@/lib/dates";
import { useToday } from "@/lib/use-today";
import { listWords } from "@/lib/words";
import { plantName } from "./parts";

/** M09 Task detail: how, why today, and four calm ways to answer it. */
export function TaskDetail({ id }: { id: string }) {
  const { db } = useData();
  const router = useRouter();
  const task = useTask(id);
  const space = useSpace(task?.space_id ?? "");
  const plantings = usePlantings();
  const members = useMembers();
  const today = useToday();
  if (task === null) return <BackBar href="/" label="Today" />;
  if (!task || !today) return null;
  const me = members?.find((m) => m.role === "owner")?.id ?? null;
  const plants = (plantings ?? []).filter((p) => task.planting_ids.includes(p.id)).map((p, i) => (i ? plantName(p).toLowerCase() : plantName(p)));
  const context = [space?.name, plants.length ? listWords(plants).replace(/^./, (c) => c.toLowerCase()) : null].filter(Boolean).join(" · ");
  const assignee = members?.find((m) => m.id === task.assignee_id);
  const doneBy = members?.find((m) => m.id === task.done_by);
  // A watering job on one crop can borrow that crop's own water line as the tip.
  const crop = task.planting_ids.length === 1 ? cropById((plantings ?? []).find((p) => p.id === task.planting_ids[0])?.crop_id ?? "") : undefined;
  const rows = ([["How", task.how ?? (crop?.care?.water && /water/i.test(task.title) ? crop.care.water : null)], ["Why today", task.why ?? task.detail]] as const).filter(([, v]) => v);
  const leave = () => router.push("/");

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col pb-6">
      <BackBar href="/" label="Today" />
      <div className="rise flex flex-col gap-2 px-8 pt-1">
        <h1 className="font-mincho text-[30px] font-normal leading-[1.2] text-balance">{task.title}</h1>
        {context ? <p className="text-[17px] leading-[1.6] text-ink-body">{context}</p> : null}
        {assignee ? <p className="text-[16px] text-ink-soft">{assignee.name}&apos;s job</p> : null}
      </div>
      {rows.length ? (
        <div className="rise mt-4 flex flex-col px-8" style={{ "--i": 1 } as React.CSSProperties}>
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[64px_1fr] gap-3 border-t border-rule py-3 last:border-b">
              <span className="text-[16px] text-ink-soft">{k}</span>
              <span className="text-[17px] leading-[1.55]">{v}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rise mt-auto flex flex-col gap-1.5 px-8 pt-8" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="flex min-h-[58px] items-center justify-center gap-4 pb-2.5">
          {task.done_at ? (
            <>
              <Seal kind="済" size={44} press label="Done" />
              <span className="text-[16px] text-ink-soft">{doneBy ? `Done by ${doneBy.name}` : "Done"}</span>
            </>
          ) : null}
        </div>
        <Button onClick={() => void (task.done_at ? reopenTask(db, task.id) : completeTask(db, task.id, me))}>{task.done_at ? "Undo" : "Done"}</Button>
        {task.done_at ? null : (
          <div className="grid grid-cols-3 border-t border-rule pt-1">
            <button
              type="button"
              className="tap min-h-12 text-[15px] leading-[1.3] text-ink-soft"
              onClick={async () => {
                await completeTask(db, task.id, me);
                leave();
              }}
            >
              Already done
            </button>
            <button
              type="button"
              className="tap min-h-12 text-[15px] text-ink-soft"
              onClick={async () => {
                await snoozeTask(db, task.id, addDays(today, 1));
                leave();
              }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className="tap min-h-12 text-[15px] text-ink-soft"
              onClick={async () => {
                await skipTask(db, task.id);
                leave();
              }}
            >
              Skip this one
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
