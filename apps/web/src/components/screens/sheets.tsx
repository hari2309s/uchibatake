"use client";

import { searchCrops } from "@uchibatake/content";
import { useState } from "react";
import { AvatarPicker } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useMembers } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { addSeed, addTask, create } from "@/lib/data/repo";
import { addDays, parseIsoDate } from "@/lib/dates";
import { useToday } from "@/lib/use-today";

/** A seed packet for the box: what, which kind, bought or saved, the year, and how long it keeps (if the packet says). */
export function AddSeedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db } = useData();
  const members = useMembers();
  const today = useToday();
  const year = today ? Number(today.slice(0, 4)) : new Date().getFullYear();
  const [f, setF] = useState({ name: "", variety: "", source: "bought" as "bought" | "saved", savedBy: [] as string[], year: "", goodUntil: "" });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  // Filed under a crop only when the name is exactly its name or another name it goes by.
  const typed = f.name.trim().toLowerCase();
  const crop = typed ? searchCrops(typed).find((c) => [c.name, ...(c.aka ?? [])].some((n) => n.toLowerCase() === typed)) : undefined;
  const yearOk = (v: string) => /^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= year + 1;
  return (
    <Sheet open={open} onClose={onClose} title="Add seeds">
      <form
        className="flex flex-col gap-5 px-8 pb-[34px] pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          await addSeed(db, {
            crop_id: crop?.id ?? null,
            name: crop?.name ?? f.name.trim(),
            variety: f.variety.trim() || null,
            source: f.source,
            saved_by: f.source === "saved" ? (f.savedBy[0] ?? null) : null,
            from_note: null,
            year: yearOk(f.year) ? Number(f.year) : year,
            good_until: /^\d{4}$/.test(f.goodUntil) ? Number(f.goodUntil) : null,
          });
          setF({ name: "", variety: "", source: "bought", savedBy: [], year: "", goodUntil: "" });
          onClose();
        }}
      >
        <Field label="What seeds?" placeholder="Broad beans, basil…" value={f.name} onChange={(e) => set({ name: e.target.value })} required />
        <Field label="Which kind? (on the packet)" placeholder="Aquadulce Claudia" value={f.variety} onChange={(e) => set({ variety: e.target.value })} />
        <Chips legend="Where from?" multiple={false} value={[f.source]} onChange={([v]) => set({ source: v as "bought" | "saved" })} options={[{ value: "bought", label: "Bought" }, { value: "saved", label: "Saved by us" }]} />
        {f.source === "saved" && members ? <AvatarPicker legend="Who saved them?" members={members.map((m) => ({ id: m.id, name: m.name, mark: m.mark }))} value={f.savedBy} onChange={(v) => set({ savedBy: v.slice(-1) })} /> : null}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Year" inputMode="numeric" placeholder={String(year)} value={f.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          <Field label="Good until" inputMode="numeric" placeholder="If it says" value={f.goodUntil} onChange={(e) => set({ goodUntil: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
        </div>
        <Button type="submit" disabled={!f.name.trim()}>
          Put them in the box
        </Button>
      </form>
    </Sheet>
  );
}

/** "Give a small job": who, what, when. It shows on Today that day, and on their own page. */
export function GiveJobSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db } = useData();
  const members = useMembers();
  const today = useToday();
  const [who, setWho] = useState<string[]>([]);
  const [what, setWhat] = useState("");
  const [detail, setDetail] = useState("");
  const [when, setWhen] = useState("today");
  if (!today || !members) return null;
  // This week's Saturday, offered only when it's still two or more days away (Mon–Thu).
  const dow = parseIsoDate(today).getDay();
  const saturday = dow >= 1 && dow <= 4 ? addDays(today, 6 - dow) : null;
  const due = when === "today" ? today : when === "tomorrow" ? addDays(today, 1) : (saturday ?? today);
  return (
    <Sheet open={open} onClose={onClose} title="Give a small job">
      <form
        className="flex flex-col gap-5 px-8 pb-[34px] pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!who[0] || !what.trim()) return;
          await addTask(db, { title: what.trim(), detail: detail.trim() || null, how: null, why: null, space_id: null, planting_ids: [], due_on: due, due_time: null, slot: null, assignee_id: who[0], done_at: null, done_by: null, snoozed_until: null, skipped_at: null, source: "user", rule_key: null });
          setWhat("");
          setDetail("");
          setWho([]);
          onClose();
        }}
      >
        <AvatarPicker legend="Who?" members={members.map((m) => ({ id: m.id, name: m.name, mark: m.mark }))} value={who} onChange={(v) => setWho(v.slice(-1))} />
        <Field label="The job" placeholder="Snail check, after dark" value={what} onChange={(e) => setWhat(e.target.value)} required />
        <Field label="A little more (optional)" placeholder="With a torch, round the beds" value={detail} onChange={(e) => setDetail(e.target.value)} />
        <Chips legend="When?" multiple={false} value={[when]} onChange={([v]) => setWhen(v)} options={[{ value: "today", label: "Today" }, { value: "tomorrow", label: "Tomorrow" }, ...(saturday ? [{ value: "saturday", label: "Saturday" }] : [])]} />
        <Button type="submit" disabled={!who[0] || !what.trim()}>
          Give the job
        </Button>
      </form>
    </Sheet>
  );
}

/** M18d "Add a reminder": what, which day, and a time if it matters. Once, or every day. */
export function AddReminderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, householdId } = useData();
  const today = useToday();
  const blank = { title: "", on: "", time: "", repeat: "none" as "none" | "daily" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const close = () => {
    setF(blank); // starts fresh next time
    onClose();
  };
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const on = f.on || today || "";
  return (
    <Sheet open={open} onClose={close} title="Add a reminder">
      <form
        className="flex flex-col gap-5 px-8 pb-[34px] pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.title.trim() || !on || busy) return;
          setBusy(true);
          try {
            await create(db.reminders, { title: f.title.trim(), on, time: f.time || null, repeat: f.repeat, task_id: null, planting_id: null, done_at: null }, householdId);
            close();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="What to remember?" placeholder="Bring the basil in" value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} required />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Day" type="date" min={today ?? undefined} value={on} onChange={(e) => set({ on: e.target.value })} />
          <Field label="Time (if it matters)" type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />
        </div>
        {/* True of the code: lib/notify.ts sends reminder notes while the app is open (not by push). */}
        {f.time ? <p className="-mt-2 text-[15px] leading-normal text-ink-soft">With notes allowed, a note comes around then while Uchibatake is open on this phone.</p> : null}
        <Chips legend="How often?" multiple={false} value={[f.repeat]} onChange={([v]) => set({ repeat: v as "none" | "daily" })} options={[{ value: "none", label: "Once" }, { value: "daily", label: "Every day" }]} />
        <Button type="submit" disabled={!f.title.trim() || busy}>
          Add the reminder
        </Button>
      </form>
    </Sheet>
  );
}
