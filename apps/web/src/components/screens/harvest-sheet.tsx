"use client";

import { useState } from "react";
import { AvatarPicker } from "@/components/ui/avatar";
import { ActionDock, Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Seal } from "@/components/ui/seal";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { useMembers } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { logHarvest } from "@/lib/data/repo";
import type { Planting } from "@/lib/data/types";
import { useToday } from "@/lib/use-today";
import { listWords } from "@/lib/words";
import { plantName } from "./parts";

/** An everyday measure for a weight (06a: "a big colander"). */
export function measureFor(grams: number): string {
  if (grams < 60) return "a small handful";
  if (grams < 150) return "a bowl";
  if (grams < 300) return "a full bowl";
  if (grams < 700) return "a big colander";
  return "a basket";
}

/** 06a Log a harvest, then 06b: the 収 seal presses in. */
export function HarvestSheet({ planting, spaceName, open, onClose }: { planting: Planting; spaceName: string; open: boolean; onClose: () => void }) {
  const { db } = useData();
  const today = useToday();
  const members = useMembers();
  const [unit, setUnit] = useState<"count" | "g">("g");
  const [grams, setGrams] = useState(200);
  const [count, setCount] = useState(3);
  const [pickers, setPickers] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [stamped, setStamped] = useState<string | null>(null);
  const [stampKey, setStampKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const name = plantName(planting);
  const close = () => {
    setStamped(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={stamped ? "Harvest logged" : "Log a harvest"}>
      {stamped ? (
        <div className="flex flex-col items-center px-8 pb-[34px] text-center">
          <div className="mt-8">
            <Seal key={stampKey} kind="収" size={88} press label="Harvest logged" />
          </div>
          <p className="mt-7 px-2 text-[17px] leading-[1.55] text-ink-body">{stamped}</p>
          <button type="button" className="mt-2.5 min-h-11 text-[16px] text-ink-soft underline underline-offset-4" onClick={() => setStampKey((k) => k + 1)}>
            Replay the stamp
          </button>
          <div className="mt-6 w-full">
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!today || saving) return;
            setSaving(true);
            const amount = unit === "g" ? grams : count;
            await logHarvest(db, {
              planting_id: planting.id,
              crop_id: planting.crop_id,
              amount,
              unit,
              measure: unit === "g" ? measureFor(grams) : null,
              picked_by: pickers,
              picked_on: today,
              note: note.trim() || null,
              photo_ids: [],
            });
            const who = members?.filter((m) => pickers.includes(m.id)).map((m) => m.name) ?? [];
            const howMuch = unit === "g" ? `about ${grams} g` : `${count}`;
            setStamped(`${name}, ${howMuch}${who.length ? `, picked by ${listWords(who)}` : ""}.`);
            setNote("");
            setSaving(false);
          }}
        >
          <div className="mx-8 mt-4 flex min-h-14 items-center justify-between border-y border-rule">
            <span className="text-[17px] font-medium">
              {name} · {spaceName}
            </span>
          </div>
          <div className="mx-8 mt-[18px] flex items-center justify-between">
            <span className="text-[17px]">How much?</span>
            <Segmented label="Measure by" value={unit} onChange={setUnit} options={[{ value: "count", label: "Count" }, { value: "g", label: "Weight" }]} />
          </div>
          <div className="mx-8 mt-3.5">
            {unit === "g" ? (
              <Stepper label="How much, in grams" value={grams} display={`about ${grams} g`} measure={measureFor(grams)} step={50} min={50} max={5000} onChange={setGrams} />
            ) : (
              <Stepper label="How many" value={count} display={String(count)} step={1} min={1} max={500} onChange={setCount} />
            )}
          </div>
          <div className="mx-6 mt-5">{members ? <AvatarPicker legend="Who picked it?" members={members.map((m) => ({ id: m.id, name: m.name, mark: m.mark }))} value={pickers} onChange={setPickers} /> : null}</div>
          <div className="mx-8 mt-[18px]">
            <Field label="A note" hideLabel placeholder="For Saturday's stamppot" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <ActionDock>
            <Button type="submit" disabled={saving}>
              Save harvest
            </Button>
          </ActionDock>
        </form>
      )}
    </Sheet>
  );
}
