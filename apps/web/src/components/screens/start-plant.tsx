"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { placeOf } from "@/lib/place-climate";
import { cropById, windowsFor } from "@uchibatake/content";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BackBar, CloseButton } from "@/components/ui/bars";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChoiceList, Chips } from "@/components/ui/choice";
import { Hitokoto } from "@/components/ui/notes";
import { companionNote } from "@/lib/companions";
import { useHousehold, usePlantings, useSpaces } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { addPlanting, addTask, update } from "@/lib/data/repo";
import type { StartMethod } from "@/lib/data/types";
import { addDays, parseIsoDate } from "@/lib/dates";
import { rankSpaces } from "@/lib/fit";
import { useToday } from "@/lib/use-today";
import { dateWords } from "@/lib/words";

type Choice = { start?: StartMethod; space?: string; on?: string; planting?: string; task?: string };
const key = (crop: string) => `uchibatake-add-${crop}`;
const read = (crop: string): Choice => {
  try {
    return JSON.parse(sessionStorage.getItem(key(crop)) ?? "{}");
  } catch {
    return {};
  }
};
const write = (crop: string, c: Choice) => {
  try {
    sessionStorage.setItem(key(crop), JSON.stringify(c));
  } catch {
    // Not kept between screens; the flow still works on one screen at a time.
  }
};

const NUMERALS = ["一", "二", "三"];
const weekday = (iso: string) => parseIsoDate(iso).toLocaleDateString("en-GB", { weekday: "long" });

/** 03a How are you starting? → 03b Where, and when? → 03c Your first three steps. */
export function StartPlant({ cropId, step }: { cropId: string; step: "start" | "where" | "steps" }) {
  const router = useRouter();
  const { db } = useData();
  const crop = cropById(cropId);
  const household = useHousehold();
  const spaces = useSpaces();
  const plantings = usePlantings();
  const today = useToday();
  // This screen mounts after the field has opened (in the browser), so session storage is there to read.
  const spaceParam = useSearchParams().get("space");
  const [choice, setChoice] = useState<Choice>(() => {
    const c = typeof window === "undefined" ? {} : read(cropId);
    return spaceParam ? { ...c, space: spaceParam } : c;
  });
  const [ownDate, setOwnDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (c: Partial<Choice>) =>
    setChoice((x) => {
      const n = { ...x, ...c };
      write(cropId, n);
      return n;
    });
  if (!crop) return <BackBar href="/add" label="Add a plant" />;
  if (!today || !household || !spaces) return <PageLoader back={{ href: "/add", label: "Add a plant" }} />;

  const eyebrow = <div className="text-[15px] uppercase tracking-[.16em] text-ink-soft">{crop.name}</div>;
  const header = (
    <div className="flex h-12 items-center justify-end px-5">
      <CloseButton href={`/crops/${crop.id}`} />
    </div>
  );

  if (step === "start") {
    const opt = (v: StartMethod, label: string, a: { ok: boolean; why?: string }) => ({ value: v, label, hint: a.why, disabled: !a.ok });
    return (
      <div className="flex min-h-[calc(100dvh-120px)] flex-col">
        {header}
        <div className="rise flex flex-col gap-2 px-8 pt-2">
          {eyebrow}
          <h1 className="font-mincho text-[32px] font-normal leading-[1.2]">How are you starting?</h1>
        </div>
        <div className="px-8 pt-5">
          <ChoiceList<StartMethod>
            legend="How are you starting?"
            hideLegend
            variant="radio"
            value={choice.start ? [choice.start] : []}
            onChange={([v]) => set({ start: v })}
            options={[
              opt("seed", crop.sowVerb === "Plant" ? "From cloves" : "From seed", crop.start.seed),
              opt("plant", "A young plant", crop.start.plant),
              opt("scraps", "Regrow from scraps", crop.start.scraps),
              { value: "existing", label: "Already growing", hint: "Add plants you already have." },
            ]}
          />
        </div>
        <div className="mt-auto px-8 pb-[34px] pt-8">
          <Button disabled={!choice.start} onClick={() => router.push(`/add/${crop.id}/where${spaceParam ? `?space=${encodeURIComponent(spaceParam)}` : ""}`)}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  const md = today.slice(5);
  const place = placeOf(household);
  const ranked = rankSpaces(crop, spaces, md, place);
  const spaceId = choice.space ?? ranked.find((f) => f.score > 0)?.space.id;
  const space = spaces.find((s) => s.id === spaceId);
  const saturday = addDays(today, ((6 - parseIsoDate(today).getDay() + 7) % 7) || 7);
  const on = choice.on ?? today;
  const verb = choice.start === "plant" ? "Plant" : choice.start === "scraps" ? "Start" : choice.start === "existing" ? "Add" : (crop.sowVerb ?? "Sow");

  if (step === "where") {
    const note = space ? companionNote(crop.id, space, plantings ?? []) : null;
    return (
      <div className="flex min-h-[calc(100dvh-120px)] flex-col">
        {header}
        <div className="rise flex flex-col gap-2 px-8 pt-2">
          {eyebrow}
          <h1 className="font-mincho text-[32px] font-normal leading-[1.2]">Where, and when?</h1>
        </div>
        <div className="px-8 pt-5">
          {ranked.length ? (
            <ChoiceList
              legend="Where will it grow?"
              hideLegend
              variant="radio"
              value={spaceId ? [spaceId] : []}
              onChange={([v]) => set({ space: v })}
              options={ranked.map((f) => ({ value: f.space.id, label: f.space.name, hint: f.reason, disabled: f.score === 0 }))}
            />
          ) : (
            <p className="text-[17px] text-ink-body">Add a space first, so it has somewhere to grow.</p>
          )}
        </div>
        {choice.start !== "existing" ? (
          <div className="px-8 pt-6">
            <Chips
              legend={`When will you ${verb.toLowerCase()}?`}
              multiple={false}
              value={[ownDate ? "date" : on === today ? "today" : on === saturday ? "saturday" : "date"]}
              onChange={([v]) => {
                setOwnDate(v === "date");
                if (v !== "date") set({ on: v === "today" ? today : saturday });
              }}
              options={[
                { value: "today", label: "Today" },
                { value: "saturday", label: weekday(saturday) === "Saturday" ? "Saturday" : weekday(saturday) },
                { value: "date", label: "Pick a date" },
              ]}
            />
            {ownDate || (on !== today && on !== saturday) ? (
              <label className="pop mt-3 flex min-h-11 items-center justify-between gap-3 text-[16px] text-ink-soft">
                <span>Which day?</span>
                <input type="date" min={today} value={on} onChange={(e) => e.target.value && set({ on: e.target.value })} className="h-11 border-b-[1.5px] border-ink bg-transparent font-mincho text-[17px] text-ink" />
              </label>
            ) : null}
          </div>
        ) : null}
        {note ? <Hitokoto className="rise mx-8 mt-6">{note}</Hitokoto> : null}
        <div className="mt-auto px-8 pb-[34px] pt-8">
          <Button
            disabled={!space || saving}
            onClick={async () => {
              if (!space || saving) return;
              setSaving(true);
              const start = choice.start ?? "seed";
              const startedOn = start === "existing" ? today : on;
              // Chosen for a later day: planned, until its start job is ticked.
              const status = start !== "existing" && on > today ? "planned" : "growing";
              const fields = { crop_id: crop.id, own_name: null, nickname: null, space_id: space.id, start_method: start, started_on: startedOn, status, ended_on: null, lost_cause: null, quantity_note: null } as const;
              // Back from the steps and Continue again: the same plant, updated, never a second one.
              const existing = choice.planting ? await db.plantings.get(choice.planting) : undefined;
              const p = existing && !existing.deleted_at ? ((await update(db.plantings, existing.id, fields)) ?? existing) : await addPlanting(db, fields);
              let taskId: string | undefined = choice.task;
              if (status === "planned" && !taskId) {
                const t = await addTask(db, {
                  title: `${verb} ${crop.name.toLowerCase()}`,
                  detail: `In the ${space.name.toLowerCase()}.`,
                  how: crop.howTo?.[0]?.steps.map((s) => s.heading).join(" ") ?? null,
                  why: "You planned it for today.",
                  space_id: space.id,
                  planting_ids: [p.id],
                  due_on: on,
                  due_time: null,
                  slot: null,
                  assignee_id: null,
                  done_at: null,
                  done_by: null,
                  snoozed_until: null,
                  skipped_at: null,
                  source: "user",
                  rule_key: `start:${p.id}`,
                });
                taskId = t.id;
              }
              set({ space: space.id, planting: p.id, task: taskId, on: startedOn });
              setSaving(false);
              router.push(`/add/${crop.id}/steps`);
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // step === "steps": the first three steps, from the crop's own how-to or its care lines.
  const w = windowsFor(crop, place);
  const ready = w?.harvest?.find((x) => !(x.from === "01-01" && x.to === "12-31"));
  const howTo = crop.howTo?.[0]?.steps;
  const when = on === today ? "today" : `on ${weekday(on)}`;
  const steps: { title: string; detail?: string; tag?: string }[] =
    howTo && howTo.length >= 3
      ? howTo.slice(0, 3).map((s, i) => ({ title: s.heading, detail: s.detail, tag: i === 0 && choice.task ? `On your list · ${weekday(on)}` : undefined }))
      : [
          { title: `${verb} ${crop.name.toLowerCase()} ${when}`, detail: (choice.start === "plant" ? crop.start.plant.why : choice.start === "scraps" ? crop.start.scraps.why : crop.start.seed.why) ?? undefined, tag: choice.task ? `On your list · ${weekday(on)}` : undefined },
          { title: "Keep it watered", detail: crop.care?.water ?? "Keep the soil just moist while it settles." },
          { title: ready ? `Ready from ${dateWords(ready.from)}` : "Then, when it's ready", detail: crop.care?.pick },
        ];
  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col">
      <div className="rise flex flex-col gap-2 px-8 pt-10">
        <div className="text-[15px] uppercase tracking-[.16em] text-ink-soft">
          {crop.name} · {space?.name}
        </div>
        <h1 className="font-mincho text-[34px] font-normal leading-[1.2]">Your first three steps</h1>
      </div>
      <ol className="flex flex-col px-8 pt-5">
        {steps.map((s, i) => (
          <li key={i} className="rise flex gap-[18px] border-t border-rule py-[18px] last:border-b" style={{ "--i": i + 1 } as React.CSSProperties}>
            <span aria-hidden className="w-6 font-mincho text-[24px] leading-none">
              {NUMERALS[i]}
            </span>
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="font-mincho text-[21px]">{s.title}</span>
              {s.detail ? <span className="text-[16px] leading-normal text-ink-body">{s.detail}</span> : null}
              {s.tag ? <span className="self-start rounded-[2px] border border-ink-soft px-2 py-1 text-[16px]">{s.tag}</span> : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-auto flex flex-col gap-2.5 px-8 pb-[34px] pt-8">
        <Button
          onClick={() => {
            // The flow is finished: the next "Grow this" starts fresh.
            write(cropId, {});
            router.replace(choice.planting ? `/plants/${choice.planting}` : "/");
          }}
        >
          Done
        </Button>
        <ButtonLink href={`/crops/${crop.id}`} variant="quiet">
          Read the grow guide
        </ButtonLink>
      </div>
    </div>
  );
}
