"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { placeOf } from "@/lib/place-climate";
import { cropById } from "@uchibatake/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useHousehold, usePlanting, useSpaces } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { removePlanting, update } from "@/lib/data/repo";
import { rankSpaces } from "@/lib/fit";
import { useToday } from "@/lib/use-today";
import { plantName } from "./parts";

/** M10 Edit plant: its name, where it grows (ranked, with reasons), when it started. Remove is quiet and asks once. */
export function EditPlant({ id }: { id: string }) {
  const { db } = useData();
  const router = useRouter();
  const p = usePlanting(id);
  const spaces = useSpaces();
  const household = useHousehold();
  const today = useToday();
  const [name, setName] = useState<string | null>(null);
  const [space, setSpace] = useState<string | null>(null);
  const [started, setStarted] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  if (p === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!p || !spaces || !today) return <PageLoader back={{ href: "/spaces", label: "Spaces" }} />;
  const crop = p.crop_id ? cropById(p.crop_id) : undefined;
  const ranked = crop ? rankSpaces(crop, spaces, today.slice(5), placeOf(household)) : spaces.map((s) => ({ space: s, score: 1 as const, reason: "" }));
  const value = { name: name ?? p.nickname ?? plantName(p), space: space ?? p.space_id, started: started ?? p.started_on };

  const save = async () => {
    const defaultName = crop?.name ?? p.own_name;
    await update(db.plantings, p.id, {
      nickname: value.name.trim() && value.name.trim() !== defaultName ? value.name.trim() : null,
      own_name: crop ? p.own_name : value.name.trim() || p.own_name,
      space_id: value.space,
      started_on: value.started,
    });
    router.replace(`/plants/${p.id}`);
  };

  return (
    <div className="pb-9">
      <BackBar
        href={`/plants/${p.id}`}
        label={plantName(p)}
        right={
          <button type="button" onClick={save} className="tap flex min-h-11 items-center px-2 text-[17px] font-medium">
            Save
          </button>
        }
      />
      <div className="flex flex-col gap-[22px] px-8 pt-2">
        <h1 className="rise font-mincho text-[30px] font-normal leading-[1.2]">Edit plant</h1>
        <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
          <Field label="Name" value={value.name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="rise" style={{ "--i": 2 } as React.CSSProperties}>
          <ChoiceList legend="Space" variant="radio" value={[value.space]} onChange={([v]) => setSpace(v)} options={ranked.map((f) => ({ value: f.space.id, label: f.space.name, hint: f.space.id === p.space_id ? `Where it is now. ${f.reason}` : f.reason, disabled: f.score === 0 && f.space.id !== p.space_id }))} />
        </div>
        <label className="rise flex min-h-14 items-center justify-between border-b border-rule" style={{ "--i": 3 } as React.CSSProperties}>
          <span className="text-[17px]">Started</span>
          <input type="date" max={today} value={value.started} onChange={(e) => e.target.value && setStarted(e.target.value)} className="h-11 bg-transparent text-right font-mincho text-[20px] text-ink" />
        </label>
      </div>
      <div className="rise flex flex-col gap-2.5 px-8 pt-10" style={{ "--i": 4 } as React.CSSProperties}>
        <Button onClick={save}>Save</Button>
        <button type="button" className="tap min-h-11 text-[16px] text-ink-soft" onClick={() => setAsking(true)}>
          Remove this plant
        </button>
      </div>
      <Sheet open={asking} onClose={() => setAsking(false)} title={`Remove ${plantName(p).toLowerCase()}?`}>
        <div className="flex flex-col gap-4 px-8 pb-[34px] pt-3">
          <p className="text-[17px] leading-[1.6] text-ink-body">
            It leaves the {spaces.find((s) => s.id === p.space_id)?.name.toLowerCase() ?? "field"}. Journal pages about it stay. If it simply finished, <Link href={`/plants/${p.id}`} className="underline underline-offset-4">mark the end of its season</Link> instead, when that arrives.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await removePlanting(db, p.id);
              router.replace(`/spaces/${p.space_id}`);
            }}
          >
            Remove it
          </Button>
          <button type="button" className="min-h-11 text-[16px] text-ink-soft" onClick={() => setAsking(false)}>
            Keep it
          </button>
        </div>
      </Sheet>
    </div>
  );
}
