"use client";

import type { Place } from "@uchibatake/content";
import { placeOf } from "@/lib/place-climate";
import { CROPS, cropById } from "@uchibatake/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/choice";
import { brushDraw } from "@/components/ui/enso";
import { Mottainai } from "@/components/ui/notes";
import { useHarvests, useHousehold, useMembers, usePlanting, useSpace } from "@/lib/data/hooks";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { addJournalEntry, endPlanting } from "@/lib/data/repo";
import type { Planting } from "@/lib/data/types";
import { harvestTotals } from "@/lib/data/queries";
import { parseIsoDate } from "@/lib/dates";
import { fitFor } from "@/lib/fit";
import { useToday } from "@/lib/use-today";
import { plantName } from "./parts";

const CAUSES = { cold: "Too cold", dry: "Too dry", pests: "Pests", unsure: "Not sure" } as const;

/** A ring that almost closes and never will (M11), or one that closes fully (M12). */
function Ring({ closed, size }: { closed: boolean; size: number }) {
  const r = size * 0.41;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} aria-hidden className="block flex-none">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink)" strokeWidth={size * 0.062} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={brushDraw(closed ? c : c * 0.93, c, 0, 1300)} />
      <circle cx={size / 2 + 1} cy={size / 2 - 1} r={r * 0.91} fill="none" stroke="var(--ink)" strokeWidth={size * 0.016} strokeLinecap="round" opacity=".4" transform={`rotate(-80 ${size / 2} ${size / 2})`} style={brushDraw(closed ? 2 * Math.PI * r * 0.91 * 0.82 : c * 0.7, 2 * Math.PI * r * 0.91, 300, 1300)} />
    </svg>
  );
}

/** Something easier to try next in the same spot, from the data (very easy or easy, can start now). */
function nextFor(p: Planting, space: ReturnType<typeof useSpace>, md: string, place: Place | null) {
  if (!space || !place) return undefined;
  return CROPS.filter((c) => c.sources.length && c.id !== p.crop_id && (c.difficulty === "very-easy" || c.difficulty === "easy")).find((c) => fitFor(c, space, md, place).score === 2);
}

/** M11: a plant didn't make it. A broken ensō, one honest line, what we learned, and something easier next. */
export function PlantLost({ id }: { id: string }) {
  const { db, session } = useData();
  const router = useRouter();
  const p = usePlanting(id);
  const space = useSpace(p?.space_id ?? "");
  const household = useHousehold();
  const members = useMembers();
  const today = useToday();
  const [cause, setCause] = useState<keyof typeof CAUSES | null>(null);
  const [learn, setLearn] = useState(true);
  const [busy, setBusy] = useState(false);
  if (p === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!p || !today) return null;
  const name = plantName(p);
  const next = nextFor(p, space, today.slice(5), placeOf(household));
  const since = parseIsoDate(p.started_on).toLocaleDateString("en-GB", { month: "long" });

  return (
    <div className="pb-9">
      <BackBar href={`/plants/${p.id}`} label={name} />
      <div className="flex flex-col gap-3.5 px-8">
        <div className="rise flex items-center gap-[18px]">
          <Ring closed={false} size={64} />
          <h1 className="font-mincho text-[28px] font-normal leading-[1.2]">The {name.toLowerCase()} didn&apos;t make it.</h1>
        </div>
        <p className="rise font-mincho text-[17px] leading-[1.55] text-ink-body" style={{ "--i": 1 } as React.CSSProperties}>
          Plants are like that sometimes. It was with you since {since}.
        </p>
        <div className="rise" style={{ "--i": 2 } as React.CSSProperties}>
          <Chips legend="What do you think happened?" multiple={false} value={cause ? [cause] : []} onChange={([v]) => setCause(v as keyof typeof CAUSES)} options={Object.entries(CAUSES).map(([value, label]) => ({ value, label }))} />
        </div>
        <label className="rise flex min-h-[52px] cursor-pointer items-center gap-3.5 border-y border-rule" style={{ "--i": 3 } as React.CSSProperties}>
          <input type="checkbox" className="sr-only" checked={learn} onChange={() => setLearn((v) => !v)} />
          <span aria-hidden className="flex h-[26px] w-[26px] flex-none items-center justify-center border-[1.5px] border-ink text-[16px]">
            {learn ? <span className="pop">✓</span> : null}
          </span>
          <span className="flex-1 text-[17px]">Save &ldquo;What we learned&rdquo; to the Journal</span>
        </label>
        {next ? (
          <Link href={`/crops/${next.id}?space=${space?.id ?? ""}`} className="rise tap flex min-h-14 items-center justify-between" style={{ "--i": 4 } as React.CSSProperties}>
            <span className="flex flex-col gap-0.5">
              <span className="text-[16px] text-ink-soft">An easier next plant</span>
              <span className="text-[17px]">
                {next.name}, same spot
              </span>
            </span>
            <span aria-hidden className="text-[20px]">
              ›
            </span>
          </Link>
        ) : null}
        <Mottainai className="rise">Compost it, roots and all, unless it looked diseased. It feeds the next one.</Mottainai>
        <div className="pt-4">
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              await endPlanting(db, p.id, today, cause ?? "unsure");
              if (learn) {
                const writer = meOf(members, session)?.id ?? members?.[0]?.id;
                if (writer)
                  await addJournalEntry(db, {
                    writer_id: writer,
                    written_on: today,
                    title: `What we learned from the ${name.toLowerCase()}`,
                    text: cause && cause !== "unsure" ? `It didn't make it. We think it was ${CAUSES[cause].toLowerCase()}.` : "It didn't make it, and we're not sure why.",
                    seal: null,
                    planting_ids: [p.id],
                    space_ids: space ? [space.id] : [],
                    photo_ids: [],
                    kind: "learned",
                  });
              }
              router.replace(space ? `/spaces/${space.id}` : "/spaces");
            }}
          >
            Say goodbye
          </Button>
        </div>
      </div>
    </div>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** M12: end of season. The ensō closes; who picked, with one 収 per picking, in no order of rank; what next. */
export function SeasonEnd({ id }: { id: string }) {
  const { db, session } = useData();
  const router = useRouter();
  const p = usePlanting(id);
  const space = useSpace(p?.space_id ?? "");
  const harvests = useHarvests(id);
  const members = useMembers();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  if (p === null) return <BackBar href="/spaces" label="Spaces" />;
  if (!p || !today || !harvests || !members) return null;
  const name = plantName(p);
  const crop = p.crop_id ? cropById(p.crop_id) : undefined;
  const t = harvestTotals(harvests, "planting")[0];
  const first = [...harvests].sort((a, b) => a.picked_on.localeCompare(b.picked_on))[0];
  const firstBy = first ? members.filter((m) => first.picked_by.includes(m.id)).map((m) => m.name) : [];
  const total = t ? [t.count ? `about ${t.count} ${(crop?.name ?? "").toLowerCase()}`.trim() : null, t.grams ? `about ${t.grams >= 1000 ? `${(t.grams / 1000).toFixed(1)} kg` : `${t.grams} g`}` : null].filter(Boolean).join(" and ") : null;
  const pickers = members.filter((m) => t?.pickers[m.id]);
  const plural = name.endsWith("s");

  const finish = async (next: string, note: string) => {
    if (busy) return;
    setBusy(true);
    await endPlanting(db, p.id, today);
    const writer = meOf(members, session)?.id ?? members[0]?.id;
    if (writer) await addJournalEntry(db, { writer_id: writer, written_on: today, title: `The ${name.toLowerCase()} ${plural ? "are" : "is"} done for the year`, text: note, seal: "済", planting_ids: [p.id], space_ids: space ? [space.id] : [], photo_ids: [], kind: "note" });
    router.replace(next);
  };

  return (
    <div className="pb-9">
      <BackBar href={`/plants/${p.id}`} label={name} />
      <div className="flex flex-col gap-5 px-8 pt-1">
        <div className="rise flex items-center gap-[18px]">
          <Ring closed size={84} />
          <div className="flex flex-col gap-1">
            <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">Last picking</span>
            <h1 className="font-mincho text-[28px] font-normal leading-[1.2]">
              The {name.toLowerCase()} {plural ? "are" : "is"} done for the year.
            </h1>
          </div>
        </div>
        {first ? (
          <div className="rise flex flex-col" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="flex items-baseline justify-between gap-3 border-t border-rule py-3.5">
              <span className="text-[16px] text-ink-soft">First picking</span>
              <span className="text-right font-mincho text-[20px]">
                {Number(first.picked_on.slice(8))} {MONTHS[Number(first.picked_on.slice(5, 7)) - 1]}
                {firstBy.length ? `, by ${firstBy.join(" and ")}` : ""}
              </span>
            </div>
            {total ? (
              <div className="flex items-baseline justify-between gap-3 border-y border-rule py-3.5">
                <span className="text-[16px] text-ink-soft">Picked this year</span>
                <span className="text-right font-mincho text-[20px]">{total}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="rise text-[17px] text-ink-body">No pickings were logged this time. That&apos;s alright.</p>
        )}
        {pickers.length ? (
          <div className="rise flex flex-col gap-3" style={{ "--i": 2 } as React.CSSProperties}>
            <span className="text-[16px] text-ink-soft">Who picked</span>
            <div className="flex flex-wrap justify-between gap-y-4">
              {pickers.map((m, i) => (
                <div key={m.id} className="flex flex-col items-center gap-2">
                  <Avatar mark={m.mark} size={44} />
                  <div className="flex max-w-[78px] flex-wrap justify-center gap-[3px]" aria-label={`${m.name}: ${t!.pickers[m.id]} pickings`}>
                    {Array.from({ length: t!.pickers[m.id] }, (_, k) => (
                      <span key={k} className="pop flex h-[22px] w-[22px] items-center justify-center rounded-[3px] bg-shu font-mincho text-[15px] leading-none text-on-ink" style={{ animationDelay: `${500 + (i * 4 + k) * 60}ms` }} aria-hidden>
                        収
                      </span>
                    ))}
                  </div>
                  <span className="text-[16px]">{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="rise flex flex-col gap-2.5 pt-2" style={{ "--i": 3 } as React.CSSProperties}>
          <span className="text-[16px] text-ink-soft">What next?</span>
          <div className="grid grid-cols-3 gap-2.5">
            {crop?.id === "strawberries" ? (
              <button type="button" disabled={busy} className="tap flex min-h-[96px] flex-col items-center justify-center gap-2 border border-rule bg-card" onClick={() => finish(`/spaces/${space?.id ?? ""}`, "We'll keep the runners for new plants.")}>
                <span className="text-[16px]">Keep runners</span>
              </button>
            ) : null}
            <button type="button" disabled={busy} className="tap flex min-h-[96px] flex-col items-center justify-center gap-2 border border-rule bg-card" onClick={() => finish(space ? `/spaces/${space.id}` : "/spaces", "Into the compost, to feed the next one.")}>
              <span className="text-[16px]">Compost</span>
            </button>
            <button type="button" disabled={busy} className="tap flex min-h-[96px] flex-col items-center justify-center gap-2 border border-rule bg-card" onClick={() => finish("/add", "Something new goes in next.")}>
              <span className="text-[16px]">Plant next</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
