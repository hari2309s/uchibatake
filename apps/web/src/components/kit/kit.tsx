"use client";

import { useEffect, useState } from "react";
import { ActionDock, Button, ButtonLink } from "@/components/ui/button";
import { BackBar, CloseButton, Progress } from "@/components/ui/bars";
import { Avatar, AvatarPicker, AvatarStack, type PickMember } from "@/components/ui/avatar";
import { ChoiceList, Chips, Segmented, Switch, Tabs } from "@/components/ui/choice";
import { BrokenEnso, BrushLines, Enso, InkDropLoader } from "@/components/ui/enso";
import { Field, PhotoSlot } from "@/components/ui/field";
import { MonthStrip } from "@/components/ui/month-strip";
import { Hitokoto, Mottainai } from "@/components/ui/notes";
import { FullNotice, NoticeRow, type NoticeItem, type NoticeKind } from "@/components/ui/notice";
import { PermissionPage, type PermissionKind } from "@/components/ui/permission";
import { PhotoFrame } from "@/components/ui/photo";
import { Seal, SEAL_NAMES, type SealKind } from "@/components/ui/seal";
import { Sheet } from "@/components/ui/sheet";
import { StepView } from "@/components/ui/step-view";
import { Stepper } from "@/components/ui/stepper";
import { Eyebrow, Lede, SectionHeading, Title } from "@/components/ui/text";
import { BottomNav } from "@/components/ui/shell";
import { setTheme } from "@/lib/theme";
import { useThemePref } from "@/lib/use-theme";

const FAMILY: PickMember[] = [
  { id: "hari", name: "Hari", mark: { kind: "initial", letter: "H" } },
  { id: "saskia", name: "Saskia", mark: { kind: "initial", letter: "S" } },
  { id: "ida", name: "Ida", mark: { kind: "initial", letter: "I" } },
  { id: "mira", name: "Mira", mark: { kind: "leaf" } },
  { id: "sem", name: "Sem", mark: { kind: "bean" } },
  { id: "noor", name: "Noor", mark: { kind: "sprout" } },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-rule px-8 py-8">
      <Eyebrow as="h2">{title}</Eyebrow>
      {children}
    </section>
  );
}

function Pane({ theme }: { theme: "light" | "dark" }) {
  const [where, setWhere] = useState<string[]>(["balcony", "windowsill"]);
  const [exp, setExp] = useState<string[]>(["never"]);
  const [sun, setSun] = useState<string[]>(["full"]);
  const [foods, setFoods] = useState<string[]>(["tomatoes"]);
  const [unit, setUnit] = useState<"count" | "weight">("weight");
  const [grams, setGrams] = useState(400);
  const [people, setPeople] = useState(6);
  const [pickers, setPickers] = useState(["saskia", "mira"]);
  const [frostOn, setFrostOn] = useState(true);
  const [tab, setTab] = useState("balcony");
  const [stampKey, setStampKey] = useState(0);
  const [picked, setPicked] = useState<SealKind | null>("芽");
  const [enso, setEnso] = useState(60);
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [steps, setSteps] = useState(false);
  const [permission, setPermission] = useState<PermissionKind | null>(null);
  const [items, setItems] = useState<NoticeItem[]>([
    { id: "a", text: "Fleece over the spinach and lamb's lettuce", done: true },
    { id: "b", text: "Slide the basil back from the window glass", done: false },
    { id: "c", text: "Move the strawberry pots against the wall", done: false },
  ]);
  // Full-screen views start at the top, like a real screen change.
  useEffect(() => {
    if (notice || steps || permission) window.scrollTo(0, 0);
  }, [notice, steps, permission]);
  const toggle = (id: string) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  if (notice)
    return (
      <div className={`${theme} washi`}>
        <FullNotice
          kind={notice}
          onClose={() => setNotice(null)}
          dateLine={notice === "frost" ? undefined : notice === "heat" ? "Thursday, 29 October · rooftop" : "Monday, 18 January · tonight"}
          title={notice === "frost" ? "Frost tonight" : notice === "heat" ? "38° and steamy on the rooftop" : "A monsoon night ahead"}
          body={notice === "frost" ? "Down to −2° around five in the morning. The sun sets at 16:36." : notice === "heat" ? "Too hot for leaves in full sun. Three things before noon:" : "The wet season is at its heaviest. Three things before dark:"}
          listHeading={notice === "frost" ? "Three things before dark" : undefined}
          items={items}
          onToggle={toggle}
          primary={{ label: notice === "frost" ? "All done" : "All three done", onClick: () => setNotice(null) }}
          secondary={{ label: notice === "frost" ? "Remind me at 16:00" : "Remind me in an hour", onClick: () => setNotice(null) }}
        />
      </div>
    );

  if (permission)
    return (
      <div className={`${theme} washi`}>
        <PermissionPage kind={permission} onAllow={() => setPermission(null)} onNotNow={() => setPermission(null)} />
      </div>
    );

  if (steps)
    return (
      <div className={`${theme} washi`}>
        <StepView
          title="Plant garlic cloves"
          onClose={() => setSteps(false)}
          onDone={() => setSteps(false)}
          steps={[
            { heading: "Pick the biggest cloves.", detail: "Big clove, big bulb." },
            { heading: "Push each clove in, pointy end up.", detail: "About a finger deep, and a hand apart." },
            { heading: "Cover them with a blanket of leaves.", detail: "It keeps the frost off. Then let winter do the rest." },
          ]}
        />
      </div>
    );

  return (
    <div className={`${theme} washi min-w-0 flex-1`}>
      <div className="mx-auto flex max-w-[480px] flex-col">
        <BackBar href="/" label="Home" right={<CloseButton href="/" />} />
        <div className="flex flex-col gap-3 px-8 pb-8 pt-2">
          <Eyebrow>{theme === "light" ? "Light · washi" : "Dark · night washi"}</Eyebrow>
          <Title size={40}>Rainbows hide</Title>
          <Lede>No more rainbows until spring. The light over the canals is thin and low.</Lede>
          <SectionHeading aside="A few small things">Today</SectionHeading>
        </div>

        <Section title="Buttons">
          <Button>Continue</Button>
          <Button variant="accent">Grow this</Button>
          <Button variant="outline">Back</Button>
          <Button variant="quiet">How to plant cloves</Button>
          <ButtonLink href="/dev/kit" size="lg">
            <Seal kind="済" size={36} /> Done
          </ButtonLink>
        </Section>

        <Section title="Progress">
          <Progress total={6} current={1} />
          <Progress total={4} current={2} fill />
        </Section>

        <Section title="Single and multi choice">
          <ChoiceList
            legend="Where will you grow?"
            hideLegend
            value={where}
            onChange={setWhere}
            options={[
              { value: "balcony", label: "Balcony", hint: "Pots and planters outside" },
              { value: "windowsill", label: "Indoors, on a windowsill", hint: "Herbs and small greens" },
              { value: "rack", label: "Vertical rack", hint: "Shelves, towers, water-grown" },
              { value: "farm", label: "Farm", disabled: true, tag: "COMING SOON" },
            ]}
          />
          <ChoiceList
            legend="Have you grown things before?"
            hideLegend
            variant="card"
            value={exp}
            onChange={setExp}
            options={[
              { value: "never", label: "Never grown anything", hint: "Perfect. We'll start with forgiving plants.", leading: <Enso value={18} size={44} /> },
              { value: "some", label: "A plant or two", hint: "You've kept a houseplant alive.", leading: <Enso value={40} size={44} /> },
              { value: "veg", label: "A few vegetables", hint: "Tomatoes or herbs, a season or two.", leading: <Enso value={64} size={44} /> },
            ]}
          />
          <Tabs label="Spaces" value={tab} onChange={setTab} tabs={[{ value: "balcony", label: "Balcony" }, { value: "sill", label: "Windowsill" }, { value: "garden", label: "Back garden" }]} />
          <ChoiceList
            legend="How much sun does the spot get?"
            hideLegend
            variant="radio"
            value={sun}
            onChange={setSun}
            options={[
              { value: "full", label: "Full sun", hint: "6 hours or more of direct light. Sunny most of the day." },
              { value: "part", label: "Part sun", hint: "3 to 6 hours. Only mornings, or only afternoons." },
              { value: "shade", label: "Shade", hint: "Under 3 hours. Bright, but the sun rarely reaches it." },
            ]}
          />
        </Section>

        <Section title="Chips, segmented, switch">
          <Chips
            legend="What does your family love to eat?"
            value={foods}
            onChange={setFoods}
            options={[
              { value: "tomatoes", label: "Tomatoes" },
              { value: "herbs", label: "Herbs" },
              { value: "greens", label: "Leafy greens" },
              { value: "miso", label: "Miso soup things" },
            ]}
          />
          <div className="flex items-center justify-between">
            <span>How much?</span>
            <Segmented label="Measure by" value={unit} onChange={setUnit} options={[{ value: "count", label: "Count" }, { value: "weight", label: "Weight" }]} />
          </div>
          <div className="flex min-h-[60px] items-center justify-between border-b border-rule">
            <span>Frost warnings</span>
            <Switch label="Frost warnings" checked={frostOn} onChange={setFrostOn} />
          </div>
        </Section>

        <Section title="Gentle stepper">
          <Stepper label="How much" value={grams} display={unit === "weight" ? `about ${grams} g` : `${Math.round(grams / 100)}`} measure="a big colander" step={unit === "weight" ? 50 : 100} min={0} onChange={setGrams} />
          <div className="flex items-center justify-between">
            <span>People at home</span>
            <Stepper label="People at home" size="small" value={people} min={1} max={20} onChange={setPeople} />
          </div>
        </Section>

        <Section title="Family marks">
          <div className="flex items-center gap-3">
            <Avatar mark={{ kind: "initial", letter: "H" }} size={44} quiet />
            <AvatarStack marks={FAMILY.slice(0, 3).map((m) => m.mark)} />
          </div>
          <AvatarPicker legend="Who picked it?" members={FAMILY} value={pickers} onChange={setPickers} />
        </Section>

        <Section title="Ensō progress">
          <div className="flex flex-wrap items-center gap-3">
            {[10, 25, 45, 70, 90, 100].map((v) => (
              <Enso key={v} value={v} label={`${v}% of the way`} />
            ))}
            <Enso value={100} closed label="Season complete" />
          </div>
          <label className="flex items-center gap-4">
            <span className="text-[16px] text-ink-soft">Value</span>
            <input type="range" min={0} max={100} value={enso} onChange={(e) => setEnso(Number(e.target.value))} className="flex-1 accent-current" />
            <Enso value={enso} size={88} />
          </label>
        </Section>

        <Section title="Hanko seals">
          <div className="flex items-center gap-6">
            <Seal key={stampKey} kind="収" size={88} press label="Harvest logged" />
            <Button variant="quiet" className="w-auto" onClick={() => setStampKey((k) => k + 1)}>
              Replay the stamp
            </Button>
          </div>
          <fieldset>
            <legend className="text-[16px] text-ink-soft">Add a seal</legend>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {(Object.keys(SEAL_NAMES) as SealKind[]).map((k) => (
                <label key={k} className="flex min-h-11 cursor-pointer flex-col items-center gap-[5px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
                  <input type="radio" name={`seal-${theme}`} className="sr-only" checked={picked === k} onChange={() => setPicked(k)} />
                  <Seal kind={k} size={48} outline={picked !== k} press={picked === k} />
                  <span className={picked === k ? "text-[16px] font-bold" : "text-[16px]"}>{SEAL_NAMES[k]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="ひとこと and もったいない">
          <Hitokoto>Not sure? Look at the spot at 10, at 1, and at 4 o&apos;clock. Count how many times the sun is on it.</Hitokoto>
          <Hitokoto from="Ida">&ldquo;Keep the biggest cloves for planting. Big clove, big bulb.&rdquo;</Hitokoto>
          <Mottainai>Save the kale stems and leek tops for tomorrow&apos;s soup. Potato peels roast into crisps.</Mottainai>
        </Section>

        <Section title="Notices">
          <NoticeRow kind="frost" title="Frost tonight" detail="Three things to do before dark" href="#" />
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setNotice("frost")}>
              霜 Frost
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotice("heat")}>
              暑 Heat
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotice("rain")}>
              雨 Rain
            </Button>
          </div>
        </Section>

        <Section title="Month strip">
          <SectionHeading>The year in Amsterdam</SectionHeading>
          <MonthStrip plant={[9, 10, 11]} harvest={[5, 6]} now={10} caption="The dot is now. In Amsterdam, plant before mid-December and lift in June or July." />
        </Section>

        <Section title="Sheet and step view">
          <Button onClick={() => setSheet(true)}>Log a harvest</Button>
          <Button variant="outline" onClick={() => setSteps(true)}>
            Plant garlic cloves
          </Button>
          <Sheet open={sheet} onClose={() => setSheet(false)} title="Log a harvest">
            <div className="flex flex-col gap-5 px-8 pt-4">
              <Stepper label="How much" value={grams} display={`about ${grams} g`} measure="a big colander" step={50} onChange={setGrams} />
              <AvatarPicker legend="Who picked it?" members={FAMILY} value={pickers} onChange={setPickers} />
              <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                <PhotoSlot />
                <Field label="A note" hideLabel placeholder="For Saturday's stamppot" />
              </div>
            </div>
            <ActionDock>
              <Button onClick={() => setSheet(false)}>Save harvest</Button>
            </ActionDock>
          </Sheet>
        </Section>

        <Section title="Before we ask (M04–M06)">
          <div className="grid grid-cols-3 gap-2">
            {(["location", "notifications", "camera"] as const).map((k) => (
              <Button key={k} variant="outline" size="sm" onClick={() => setPermission(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Fields and photos">
          <Field label="Name" defaultValue="Kalettes" />
          <PhotoFrame caption="photo · the kale, this week" />
        </Section>

        <Section title="Waiting and errors">
          <div className="flex flex-col items-center gap-[26px]">
            <InkDropLoader label="Gathering today's weather" />
            <span className="font-mincho text-[20px] text-ink-body">Gathering today&apos;s weather…</span>
          </div>
          <BrushLines />
          <div className="flex flex-col items-center gap-2.5 pt-6 text-center">
            <BrokenEnso />
            <span className="pt-6 font-mincho text-[32px]">Something slipped</span>
          </div>
        </Section>

        <BottomNav />
      </div>
    </div>
  );
}

export function Kit() {
  const pref = useThemePref();
  return (
    <div className="flex flex-col">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-4 px-8 py-4">
        <Title size={28}>Kit</Title>
        <Segmented
          label="App theme"
          value={pref}
          onChange={setTheme}
          options={[
            { value: "system", label: "Auto" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>
      <div className="flex flex-col lg:flex-row">
        <Pane theme="light" />
        <Pane theme="dark" />
      </div>
    </div>
  );
}
