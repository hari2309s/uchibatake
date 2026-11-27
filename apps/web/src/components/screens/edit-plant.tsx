"use client";

import { placeOf } from "@/lib/place-climate";
import { cropById } from "@uchibatake/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useHousehold, useSpaces } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { removePlanting, update } from "@/lib/data/repo";
import type { Planting } from "@/lib/data/types";
import { rankSpaces } from "@/lib/fit";
import { useToday } from "@/lib/use-today";
import { plantName } from "./parts";

/**
 * M10 Edit plant, as a drawer: its name, where it grows (ranked, with
 * reasons), when it started. Remove is quiet and asks once, in the same drawer.
 */
export function EditPlantSheet({ planting, open, onClose, atOwnAddress = false }: { planting: Planting; open: boolean; onClose: () => void; atOwnAddress?: boolean }) {
  // The drawer's own title follows the step, so it's announced: "Edit plant", then "Remove kale?".
  const [asking, setAsking] = useState(false);
  const close = () => {
    setAsking(false);
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={asking ? `Remove ${plantName(planting).toLowerCase()}?` : "Edit plant"} backCloses={!atOwnAddress}>
      {open ? <EditPlantForm p={planting} onDone={close} asking={asking} setAsking={setAsking} /> : null}
    </Sheet>
  );
}

function EditPlantForm({ p, onDone, asking, setAsking }: { p: Planting; onDone: () => void; asking: boolean; setAsking: (v: boolean) => void }) {
  const { db } = useData();
  const router = useRouter();
  const spaces = useSpaces();
  const household = useHousehold();
  const today = useToday();
  const [name, setName] = useState<string | null>(null);
  const [space, setSpace] = useState<string | null>(null);
  const [started, setStarted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!spaces || !today) return <div className="min-h-[40dvh]" aria-busy="true" />;
  const crop = p.crop_id ? cropById(p.crop_id) : undefined;
  const ranked = crop ? rankSpaces(crop, spaces, today.slice(5), placeOf(household)) : spaces.map((s) => ({ space: s, score: 1 as const, reason: "" }));
  const value = { name: name ?? p.nickname ?? plantName(p), space: space ?? p.space_id, started: started ?? p.started_on };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const defaultName = crop?.name ?? p.own_name;
      await update(db.plantings, p.id, {
        nickname: value.name.trim() && value.name.trim() !== defaultName ? value.name.trim() : null,
        own_name: crop ? p.own_name : value.name.trim() || p.own_name,
        space_id: value.space,
        started_on: value.started,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  if (asking)
    return (
      <div className="flex flex-col gap-4 px-8 pb-[34px] pt-3">
        <p className="text-[17px] leading-[1.6] text-ink-body">
          It leaves the {spaces.find((s) => s.id === p.space_id)?.name.toLowerCase() ?? "field"}. Journal pages about it stay.
          {p.status === "growing" ? (
            <>
              {" "}
              If it simply finished,{" "}
              <Link href={`/plants/${p.id}/end`} className="underline underline-offset-4">
                mark the end of its season
              </Link>{" "}
              instead.
            </>
          ) : null}
        </p>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await removePlanting(db, p.id);
              router.replace(`/spaces/${p.space_id}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          Remove it
        </Button>
        <button type="button" className="min-h-11 text-[16px] text-ink-soft" onClick={() => setAsking(false)}>
          Keep it
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-[22px] px-8 pb-[34px] pt-3">
      <Field label="Name" value={value.name} onChange={(e) => setName(e.target.value)} />
      <ChoiceList legend="Space" variant="radio" value={[value.space]} onChange={([v]) => setSpace(v)} options={ranked.map((f) => ({ value: f.space.id, label: f.space.name, hint: f.space.id === p.space_id ? `Where it is now. ${f.reason}` : f.reason, disabled: f.score === 0 && f.space.id !== p.space_id }))} />
      <label className="flex min-h-14 items-center justify-between border-b border-rule">
        <span className="text-[17px]">Started</span>
        <input type="date" max={today} value={value.started} onChange={(e) => e.target.value && setStarted(e.target.value)} className="h-11 bg-transparent text-right font-mincho text-[20px] text-ink" />
      </label>
      <div className="flex flex-col gap-2.5 pt-2">
        <Button onClick={save} disabled={busy}>
          Save
        </Button>
        <button type="button" className="tap min-h-11 text-[16px] text-ink-soft" onClick={() => setAsking(true)}>
          Remove this plant
        </button>
      </div>
    </div>
  );
}
