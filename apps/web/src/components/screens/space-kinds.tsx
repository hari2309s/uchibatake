"use client";

import { useRouter } from "next/navigation";
import { brushDraw } from "@/components/ui/enso";
import { Hitokoto } from "@/components/ui/notes";
import { NoticeRow } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/choice";
import { StepView } from "@/components/ui/step-view";
import { useData } from "@/lib/data/provider";
import { useSettings, useSpace } from "@/lib/data/hooks";
import { update } from "@/lib/data/repo";
import type { Planting, Space } from "@/lib/data/types";
import { addDays, parseIsoDate } from "@/lib/dates";
import { useForecastState } from "@/lib/forecast-context";
import { deg } from "@/lib/forecast";
import { read } from "@/lib/weather-rules";
import { useToday } from "@/lib/use-today";
import { numberWord, capitalise } from "@/lib/words";
import { plantName } from "./parts";

const label = "text-[15px] uppercase tracking-[.16em] text-ink-soft";

function Row({ k, children, i }: { k: string; children: React.ReactNode; i: number }) {
  return (
    <div className="rise grid grid-cols-[96px_1fr] gap-3 border-t border-rule py-3.5 last:border-b" style={{ "--i": i } as React.CSSProperties}>
      <span className={label}>{k}</span>
      <div className="flex flex-col gap-1 text-[17px] leading-normal">{children}</div>
    </div>
  );
}

const weekdayOf = (iso: string) => parseIsoDate(iso).toLocaleDateString("en-GB", { weekday: "long" });
const TANK = [
  { v: 0.25, w: "Low" },
  { v: 0.5, w: "Half" },
  { v: 0.66, w: "Two-thirds" },
  { v: 1, w: "Full" },
] as const;
const tankWords = (t: number) => (t >= 0.95 ? "Full" : t >= 0.6 ? "About two-thirds full" : t >= 0.4 ? "About half full" : "Getting low");

/** S01 Rack: a front view, shelves as ink lines, the plants on them, the grow light above. */
function Elevation({ space, plants }: { space: Space; plants: Planting[] }) {
  const n = Math.max(1, space.rack?.shelves ?? 1);
  const H = 44 + n * 62 + 24; // room for the bottom shelf's names
  const perShelf = Math.ceil(plants.length / n) || 1;
  return (
    <svg viewBox={`0 0 326 ${H}`} width="100%" height={H} aria-hidden className="block">
      {space.rack?.light === "yes" ? (
        <g className="fade-in">
          <line x1="40" y1="14" x2="286" y2="14" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
          {[70, 130, 196, 256].map((x) => (
            <line key={x} x1={x} y1="22" x2={x + (x < 163 ? -8 : 8)} y2="38" stroke="var(--ink)" strokeWidth="1.2" strokeDasharray="2 4" opacity=".6" />
          ))}
        </g>
      ) : null}
      <line x1="16" y1="30" x2="16" y2={H - 4} stroke="var(--ink)" strokeWidth="2" />
      <line x1="310" y1="30" x2="310" y2={H - 4} stroke="var(--ink)" strokeWidth="2" />
      {Array.from({ length: n }, (_, s) => {
        const y = 44 + (s + 1) * 62 - 8; // shelf line; names sit just under it
        const here = plants.slice(s * perShelf, (s + 1) * perShelf);
        return (
          <g key={s}>
            <line x1="16" y1={y} x2="310" y2={y} stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            {here.map((p, k) => {
              const x = 40 + (k + 0.5) * ((270 - 24) / here.length);
              return (
                <g key={p.id} className="fade-in" style={{ animationDelay: `${300 + (s * 3 + k) * 90}ms` }}>
                  <path d={`M ${x} ${y} q -10 -22 0 -34 q 10 12 0 34`} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
                  <path d={`M ${x} ${y} q -18 -12 -16 -24`} fill="none" stroke="var(--ink)" strokeWidth="1.2" opacity=".6" />
                  <text x={x} y={y + 18} textAnchor="middle" fontSize="15" className="fill-ink" style={{ fontFamily: "var(--font-gothic)" }}>
                    {plantName(p)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Water as a brush-filled vessel. */
function Vessel({ level }: { level: number }) {
  const h = Math.round(72 * Math.max(0, Math.min(1, level)));
  return (
    <svg width="44" height="88" viewBox="0 0 44 88" aria-hidden className="flex-none">
      <rect x="4" y="6" width="36" height="78" rx="8" fill="none" stroke="var(--ink)" strokeWidth="2" />
      <rect x="8" y={80 - h} width="28" height={h} rx="5" fill="var(--ink)" opacity=".85" style={{ transition: "y 700ms cubic-bezier(.2,.8,.3,1), height 700ms cubic-bezier(.2,.8,.3,1)" }} />
    </svg>
  );
}

export function RackPanel({ space, plants }: { space: Space; plants: Planting[] }) {
  const { db } = useData();
  const router = useRouter();
  const today = useToday();
  const rack = space.rack!;
  if (!today) return null;
  const water = rack.medium === "water";
  const due = rack.fed_on && rack.feed_every ? addDays(rack.fed_on, rack.feed_every) : null;
  const dueWords = !due ? null : due <= today ? "Due today" : due === addDays(today, 1) ? "Due tomorrow" : due <= addDays(today, 6) ? `Due ${weekdayOf(due)}` : `Due ${parseIsoDate(due).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
  return (
    <>
      <div className="rise px-8 pt-5" style={{ "--i": 1 } as React.CSSProperties}>
        <Elevation space={space} plants={plants} />
      </div>
      {water ? (
        <div className="flex flex-col px-8 pt-6">
          <div className="rise flex flex-col gap-3 border-t border-rule py-3.5" style={{ "--i": 2 } as React.CSSProperties}>
            <span className={label}>Water</span>
            <div className="flex items-center gap-4">
              <Vessel level={rack.tank ?? 0} />
              <span className="text-[17px]">{rack.tank !== null && rack.tank !== undefined ? tankWords(rack.tank) : "Not checked yet"}</span>
            </div>
            <Segmented
              label="How full is the tank?"
              value={String(TANK.find((t) => Math.abs(t.v - (rack.tank ?? -1)) < 0.05)?.v ?? "")}
              onChange={(v) => void update(db.spaces, space.id, { rack: { ...rack, tank: Number(v) } })}
              options={TANK.map((t) => ({ value: String(t.v), label: t.w }))}
              className="w-full [&>label]:min-w-0 [&>label]:flex-1"
            />
          </div>
          <Row k="Feed" i={3}>
            <span>{dueWords ?? (rack.fed_on ? `Last fed ${weekdayOf(rack.fed_on)}` : "Not fed yet")}</span>
            <button type="button" onClick={() => router.push(`/spaces/${space.id}/feed`)} className="tap inline-flex min-h-11 items-center self-start text-[16px] underline underline-offset-4">
              How to feed it
            </button>
          </Row>
          {typeof rack.ph === "number" ? (
            <Row k="Water taste" i={4}>
              {/* 5.5–6.5 is the range hydroponic growers aim for with leafy greens and herbs. */}
              <span>{rack.ph < 5.5 ? "A little sour" : rack.ph > 6.5 ? "A little hard" : "Just right"}</span>
              <span className="text-[15px] text-ink-soft">pH {rack.ph.toFixed(1)}</span>
            </Row>
          ) : null}
        </div>
      ) : null}
      {water ? <Hitokoto className="rise mx-8 mt-5">The roots drink fed water, so there&apos;s no soil to dry out. Keep the tank topped up instead.</Hitokoto> : null}
    </>
  );
}

/** S03 The ensō light clock: the brush arc is the light on; the vermilion dot is now. Reusable for any timer. */
function LightClock({ on, off, now }: { on: string; off: string; now: Date }) {
  const toH = (t: string) => Number(t.slice(0, 2)) + Number(t.slice(3, 5)) / 60;
  const a = toH(on);
  const b = toH(off);
  const hours = (b - a + 24) % 24;
  const r = 86;
  const c = 2 * Math.PI * r;
  const nowH = now.getHours() + now.getMinutes() / 60;
  const ang = ((nowH / 24) * 360 - 90) * (Math.PI / 180);
  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <svg width="220" height="220" aria-hidden className="block">
        <circle cx="110" cy="110" r={r} fill="none" stroke="var(--rule)" strokeWidth="2" />
        <circle cx="110" cy="110" r={r} fill="none" stroke="var(--ink)" strokeWidth="12" strokeLinecap="round" transform={`rotate(${(a / 24) * 360 - 90} 110 110)`} style={brushDraw((hours / 24) * c, c, 0, 1200)} />
        <circle cx={110 + r * Math.cos(ang)} cy={110 + r * Math.sin(ang)} r="7" fill="var(--shu)" className="pop" style={{ animationDelay: "1100ms" }} />
      </svg>
      {(["0", "6", "12", "18"] as const).map((t, i) => (
        <span key={t} className="absolute font-mincho text-[16px] text-ink-soft" style={[{ left: 104, top: -6 }, { right: -4, top: 98 }, { left: 100, bottom: -6 }, { left: -6, top: 98 }][i]}>
          {t}
        </span>
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] uppercase tracking-[.16em] text-ink-soft">{(nowH - a + 24) % 24 < hours ? "On" : "Off"}</span>
        <span className="font-mincho text-[22px]">
          {on} – {off}
        </span>
      </div>
    </div>
  );
}

export function LightShelfPanel({ space }: { space: Space }) {
  const { db } = useData();
  const rack = space.rack!;
  const on = rack.light_on ?? "06:00";
  const off = rack.light_off ?? "20:00";
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const mins = (toMin(off) - toMin(on) + 1440) % 1440;
  const hours = Math.round(mins / 30) / 2; // to the nearest half hour
  const hoursWords = hours === 0 ? "The light is off all day" : `${Number.isInteger(hours) ? capitalise(numberWord(hours)) : hours} ${hours === 1 ? "hour" : "hours"} of light`;
  return (
    <div className="rise flex flex-col gap-5 px-8 pt-6" style={{ "--i": 1 } as React.CSSProperties}>
      <LightClock on={on} off={off} now={new Date()} />
      <div className="flex flex-col gap-1.5 text-center">
        <span className="font-mincho text-[24px]">{hoursWords}</span>
        <span className="text-[16px] leading-normal text-ink-body">{hours >= 14 ? "Like a long June day. The rest is night." : hours >= 10 ? "A spring-length day. The rest is night." : "A short winter day."}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            ["On at", "light_on", on],
            ["Off at", "light_off", off],
          ] as const
        ).map(([k, f, v]) => (
          <label key={f} className="flex flex-col gap-1">
            <span className="text-[16px] text-ink-soft">{k}</span>
            <input type="time" value={v} onChange={(e) => e.target.value && void update(db.spaces, space.id, { rack: { ...rack, [f]: e.target.value } })} className="h-11 border-b-[1.5px] border-ink bg-transparent font-mincho text-[20px] text-ink" />
          </label>
        ))}
      </div>
      <Hitokoto title="Is it too close?">Hold your hand at the leaves for a minute. If it feels warm, lift the light a hand&apos;s width. Pale, stretched stems mean it&apos;s too far.</Hitokoto>
    </div>
  );
}

/** S04 Greenhouse: what we can say from the forecast (no sensors inside), then vents and water as plain rows. */
export function GreenhousePanel({ space }: { space: Space }) {
  const { forecast } = useForecastState();
  const settings = useSettings();
  const u = settings?.units;
  const r = forecast ? read(forecast) : null;
  const d0 = forecast?.days[0];
  const warm = !!d0 && d0.hi >= 10 && d0.sunshine >= 2 * 3600;
  // Same thresholds as the notices: heat first (a shut greenhouse cooks), then frost, then the everyday rhythm.
  const vents = !forecast
    ? "Open them on sunny days, and close them before evening."
    : r!.heatToday
      ? "Open them wide all day, and the door too if you can."
      : r!.frostTonight
        ? "Closed today. Keep them shut until tomorrow's sun."
        : warm
          ? "Open them a crack late in the morning, and close them by mid-afternoon."
          : "Keep them shut today: little sun to warm it.";
  const water = r?.frostTonight ? "Not today. Damp soil gets colder." : "In the morning, so the leaves dry by night.";
  return (
    <div className="flex flex-col px-8 pt-5">
      {r?.frostTonight ? (
        <div className="rise mb-5" style={{ "--i": 1 } as React.CSSProperties}>
          <NoticeRow kind="frost" title={`Frost tonight, down to ${deg(r.low, u)}`} detail="Shut the vents before dark, and fleece over the young plants." />
        </div>
      ) : null}
      <Row k="Right now" i={2}>
        <span>{forecast ? `${deg(forecast.now.tempC, u)} outside` : "No weather just now"}</span>
        <span className="text-[16px] text-ink-soft">{space.greenhouse?.heated === "no" ? "Not heated: inside is usually a few degrees warmer when it's shut." : space.greenhouse?.heated === "frost" ? "Kept just above freezing." : "Kept warm."}</span>
      </Row>
      {space.greenhouse?.vents.length ? <Row k="Vents" i={3}>{vents}</Row> : null}
      <Row k="Water" i={4}>
        {water}
      </Row>
    </div>
  );
}

/** S02 Feeding a water-grown rack: measure, mix, pour, check. Done records today as fed and the tank as full. */
export function FeedRack({ id }: { id: string }) {
  const { db } = useData();
  const router = useRouter();
  const space = useSpace(id);
  const today = useToday();
  if (!space?.rack || !today) return null;
  return (
    <StepView
      title={`Feeding the ${space.name.toLowerCase()}`}
      numerals
      onClose={() => router.back()}
      doneLabel="Back to the rack"
      onDone={async () => {
        await update(db.spaces, space.id, { rack: { ...space.rack!, fed_on: today, tank: 1 } });
        // Back to the rack we came from (not a second copy of it in history).
        if (window.history.length > 1) router.back();
        else router.replace(`/spaces/${space.id}`);
      }}
      steps={[
        { heading: "Measure the water", detail: "Fill the watering can with as much water as the tank needs to reach its line." },
        { heading: "Mix the feed", detail: "Add the feed your bottle's label says for that much water. Stir with a spoon, not your hand." },
        { heading: "Pour it in", detail: "Slowly, into the tank, not over the leaves." },
        { heading: "Check the line", detail: "The water should sit just under the line on the tank. If it's over, scoop a cup back out." },
      ]}
    />
  );
}
