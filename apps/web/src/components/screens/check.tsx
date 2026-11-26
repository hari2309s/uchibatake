"use client";

import { cropById } from "@uchibatake/content";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/choice";
import { InkDropLoader } from "@/components/ui/enso";
import { PermissionPage } from "@/components/ui/permission";
import { useLiveQuery } from "dexie-react-hooks";
import { getMeta, setMeta } from "@/lib/data/db";
import { usePlanting, useSpace } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { addTask } from "@/lib/data/repo";
import { addDays, parseIsoDate } from "@/lib/dates";
import { diagnose, shrink, SYMPTOMS, type Diagnosis, type Symptom } from "@/lib/diagnose";
import { useToday } from "@/lib/use-today";
import { plantName } from "./parts";

const NUMERALS = ["一", "二", "三", "四"];

/** Four ink brackets over the photo (07a's viewfinder). */
function Corners() {
  const c = "absolute h-7 w-7 border-ink";
  return (
    <>
      <span aria-hidden className={`${c} left-3 top-3 border-l-[3px] border-t-[3px]`} />
      <span aria-hidden className={`${c} right-3 top-3 border-r-[3px] border-t-[3px]`} />
      <span aria-hidden className={`${c} bottom-3 left-3 border-b-[3px] border-l-[3px]`} />
      <span aria-hidden className={`${c} bottom-3 right-3 border-b-[3px] border-r-[3px]`} />
    </>
  );
}

/** 07a Something looks wrong? → 07b what it probably is, and what to do, gentlest first. */
export function CheckPlant({ id }: { id: string }) {
  const { db } = useData();
  const router = useRouter();
  const p = usePlanting(id);
  const space = useSpace(p?.space_id ?? "");
  const today = useToday();
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [asking, setAsking] = useState(false);
  const [phase, setPhase] = useState<"ask" | "looking" | "result">("ask");
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  // Known up front, so the camera can open straight from the tap (iOS needs the click inside the tap).
  const cameraAsked = useLiveQuery(() => getMeta<boolean>(db, "cameraAsked"), [db]);
  if (p === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!p || !today) return null;
  const crop = p.crop_id ? cropById(p.crop_id) : undefined;
  const name = plantName(p);

  const pick = async (input: HTMLInputElement) => {
    const f = input.files?.[0];
    input.value = ""; // the same photo can be chosen again
    if (!f) return;
    try {
      setPhoto(await shrink(f));
      setPhotoNote(null);
    } catch {
      setPhotoNote("We couldn't open that photo. Try another, or take one now.");
    }
  };
  const openCamera = () => {
    // The camera page (M06) comes before the phone's own prompt, once.
    if (!cameraAsked) return setAsking(true);
    camera.current?.click();
  };

  if (asking)
    return (
      <PermissionPage
        kind="camera"
        onNotNow={() => setAsking(false)}
        onAllow={() => {
          camera.current?.click(); // inside the tap
          setAsking(false);
          void setMeta(db, "cameraAsked", true);
        }}
      />
    );

  if (!crop?.problems?.length)
    return (
      <div className="pb-9">
        <BackBar href={`/plants/${p.id}`} label={name} />
        <div className="rise flex flex-col gap-3 px-8 pt-3">
          <h1 className="font-mincho text-[30px] font-normal">Something looks wrong?</h1>
          <p className="text-[17px] leading-[1.6] text-ink-body">We don&apos;t have a checked list of problems for {name.toLowerCase()} yet, so we won&apos;t guess. A garden centre can look at a leaf with you.</p>
        </div>
      </div>
    );

  if (phase === "looking")
    return (
      <div className="flex flex-col items-center gap-6 pt-32">
        <InkDropLoader label="Looking closely" />
        <span className="font-mincho text-[20px] text-ink-body">Looking closely…</span>
      </div>
    );

  if (phase === "result" && result) {
    const likely = result.likely;
    const fixes = likely?.fixes ?? [];
    const symptomWords = symptoms.map((s) => SYMPTOMS.find((x) => x.value === s)!.label.toLowerCase()).join(", ");
    const remindOn = addDays(today, 3);
    // The job's name is the first fix's first sentence ("Pick them off by hand").
    const job = fixes[0] ? fixes[0].split(/(?<=\.)\s/)[0].replace(/\.$/, "") : null;
    return (
      <div className="pb-9">
        <BackBar href={`/plants/${p.id}`} label={name} />
        <div className="rise flex flex-col gap-2 px-8 pt-2">
          <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">
            {crop.name}
            {symptomWords ? ` · ${symptomWords}` : ""}
          </span>
          <h1 className="font-mincho text-[28px] font-normal leading-[1.25]">{likely ? "Here's what it might be." : "We're not sure from this."}</h1>
        </div>
        {likely ? (
          <>
            <section className="rise mx-8 mt-6 flex flex-col gap-1.5 border-t-[5px] border-ink pt-4" style={{ "--i": 1 } as React.CSSProperties} aria-label="Most likely">
              <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">Most likely</span>
              <span className="font-mincho text-[26px]">{likely.name}</span>
              {likely.signs ? <span className="text-[16px] leading-normal text-ink-body">{likely.signs}</span> : null}
            </section>
            <section className="rise px-8 pt-6" style={{ "--i": 2 } as React.CSSProperties} aria-label="What to do">
              {fixes.length ? (
                <>
                  <p className="text-[17px]">Try these in order, gentlest first:</p>
                  <ol className="pt-2">
                    {fixes.map((f, i) => (
                      <li key={i} className="flex gap-4 border-t border-rule py-3.5 last:border-b">
                        <span aria-hidden className="w-6 font-mincho text-[22px] leading-none">
                          {NUMERALS[i]}
                        </span>
                        <span className="text-[17px] leading-normal">{f}</span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="text-[17px] leading-[1.6] text-ink-body">
                  We haven&apos;t checked the fixes for this one yet, so we won&apos;t guess.{" "}
                  {crop.sources[0] ? (
                    <a href={crop.sources[0].url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      The RHS page on {crop.name.toLowerCase()} has more.
                    </a>
                  ) : null}
                </p>
              )}
            </section>
            {result.also.length ? (
              <section className="rise px-8 pt-7" style={{ "--i": 3 } as React.CSSProperties} aria-label="It could also be">
                <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">It could also be</span>
                <ul className="pt-2">
                  {result.also.map((a) => (
                    <li key={a.id} className="flex flex-col gap-0.5 border-t border-rule py-3 last:border-b">
                      <span className="text-[17px] font-medium">{a.name}</span>
                      {a.signs ? <span className="text-[16px] text-ink-soft">{a.signs}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <p className="rise px-8 pt-5 text-[17px] leading-[1.6] text-ink-body">Nothing on our list for {crop.name.toLowerCase()} matches clearly. Look again in a few days; a fresh photo in daylight helps.</p>
        )}
        <div className="rise flex flex-col gap-2.5 px-8 pt-8" style={{ "--i": 4 } as React.CSSProperties}>
          {job ? (
            <Button
              disabled={!!added}
              onClick={async () => {
                await addTask(db, { title: job, detail: `For the ${name.toLowerCase()}: ${likely!.name.toLowerCase()}.`, how: fixes.join(" "), why: "From looking at the leaves together.", space_id: p.space_id, planting_ids: [p.id], due_on: today, due_time: null, slot: null, assignee_id: null, done_at: null, done_by: null, snoozed_until: null, skipped_at: null, source: "user", rule_key: `check:${p.id}:${likely!.id}:${today}` });
                setAdded("today");
              }}
            >
              {added === "today" ? "On today's list" : `Add "${job.charAt(0).toLowerCase()}${job.slice(1)}" to today`}
            </Button>
          ) : null}
          <button
            type="button"
            disabled={!!added}
            className="tap min-h-11 text-[16px] text-ink-soft"
            onClick={async () => {
              await addTask(db, { title: `A fresh photo of the ${name.toLowerCase()}`, detail: "To look again, in daylight.", how: null, why: "You weren't sure last time.", space_id: p.space_id, planting_ids: [p.id], due_on: remindOn, due_time: null, slot: null, assignee_id: null, done_at: null, done_by: null, snoozed_until: null, skipped_at: null, source: "user", rule_key: `recheck:${p.id}:${remindOn}` });
              setAdded("later");
            }}
          >
            {added === "later" ? `On your list for ${parseIsoDate(remindOn).toLocaleDateString("en-GB", { weekday: "long" })}` : "Not sure — ask again later"}
          </button>
          <button type="button" className="tap min-h-11 text-[16px] underline underline-offset-4" onClick={() => router.push(`/plants/${p.id}`)}>
            Back to the {name.toLowerCase()}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-9">
      <BackBar href={`/plants/${p.id}`} label={name} />
      <div className="rise flex flex-col gap-2 px-8 pt-2">
        <h1 className="font-mincho text-[30px] font-normal">Something looks wrong?</h1>
        <p className="text-[17px] leading-normal text-ink-body">Let&apos;s take a look together. Most problems are small.</p>
      </div>
      <div className="rise relative mx-8 mt-5 flex h-[240px] items-center justify-center overflow-hidden border border-rule bg-card" style={{ "--i": 1 } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a photo on this phone, not a hosted image */}
        {photo ? <img src={photo} alt={`Your photo of the ${name.toLowerCase()}`} className="pop h-full w-full object-cover" /> : <span className="text-[16px] text-ink-soft">A close look at the leaf</span>}
        <Corners />
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void pick(e.currentTarget)} />
      <input ref={upload} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void pick(e.currentTarget)} />
      <div className="rise grid grid-cols-2 gap-2.5 px-8 pt-3" style={{ "--i": 2 } as React.CSSProperties}>
        <Button variant="outline" size="sm" onClick={openCamera}>
          {photo ? "Take another" : "Take a photo"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => upload.current?.click()}>
          Upload
        </Button>
      </div>
      {photoNote ? (
        <p role="status" className="px-8 pt-2 text-[16px] text-ink-soft">
          {photoNote}
        </p>
      ) : null}
      <div className="px-8 pt-6">
        <Chips legend="What do you see?" value={symptoms} onChange={(v) => setSymptoms(v as Symptom[])} options={SYMPTOMS} />
      </div>
      <div className="rise flex flex-col gap-2.5 px-8 pt-7" style={{ "--i": 4 } as React.CSSProperties}>
        {/* Truthfulness: say where the photo goes before it goes. */}
        <p className="text-[15px] leading-normal text-ink-soft">
          {photo ? "When you tap below, this photo is sent to an AI service (Groq or OpenRouter) to read it. We don't keep it; their own rules apply. Your other photos stay on this phone." : "Without a photo, we'll go by what you see."}
        </p>
        <Button
          disabled={!photo && !symptoms.length}
          onClick={async () => {
            setPhase("looking");
            const r = await diagnose(crop.id, symptoms, photo);
            setResult(r);
            setPhase("result");
          }}
        >
          Look at it
        </Button>
      </div>
      <p className="px-8 pt-4 text-[15px] text-ink-soft">{space ? `In the ${space.name.toLowerCase()}.` : ""}</p>
    </div>
  );
}
