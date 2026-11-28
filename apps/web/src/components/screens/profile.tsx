"use client";

import { PageLoader } from "@/components/ui/page-loader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/choice";
import { signOutHere } from "@/lib/auth";
import { useHousehold, useMembers, useSettings } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { setSettings } from "@/lib/data/repo";
import { endSession } from "@/lib/data/session";
import { parseIsoDate } from "@/lib/dates";
import { setTheme } from "@/lib/theme";
import { useThemePref } from "@/lib/use-theme";

function Row({ label, value, href, children, i }: { label: string; value?: string; href?: string; children?: React.ReactNode; i: number }) {
  const inner = (
    <>
      <span className="text-[17px]">{label}</span>
      {children ?? (
        <span className="flex items-center gap-2 text-right text-[16px] text-ink-soft">
          {value}
          {href ? <span aria-hidden className="text-[20px] text-ink">›</span> : null}
        </span>
      )}
    </>
  );
  const cls = "rise flex min-h-14 items-center justify-between gap-3 border-t border-rule last:border-b";
  const style = { "--i": i } as React.CSSProperties;
  return href ? (
    <Link href={href} className={cls} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {inner}
    </div>
  );
}

/** 08 Profile: the family, where things live, and the way out. */
export function Profile() {
  const { db, session } = useData();
  const router = useRouter();
  const household = useHousehold();
  const members = useMembers();
  const settings = useSettings();
  const theme = useThemePref();
  if (!household || !members) return <PageLoader />;
  const since = parseIsoDate(household.since).toLocaleDateString("en-GB", { month: "long" });
  const signedIn = session.kind === "account" ? (session.provider === "google" ? "Google" : session.email || "Email link") : session.kind === "demo" ? "The demo" : "This phone only";

  return (
    <div className="pb-9">
      <div className="rise flex flex-col gap-2 px-8 pt-[30px]">
        <h1 className="max-w-[300px] font-mincho text-[32px] font-normal leading-[1.15]">{household.name}</h1>
        <p className="text-[16px] text-ink-soft">Growing together since {since}</p>
      </div>
      <Link href="/family" className="rise grid gap-1 px-6 pt-6" style={{ gridTemplateColumns: `repeat(${Math.min(6, members.length)}, minmax(0, 1fr))`, "--i": 1 } as React.CSSProperties} aria-label="Our family">
        {members.slice(0, 6).map((m) => (
          <span key={m.id} className="flex flex-col items-center gap-1.5">
            <Avatar mark={m.mark} size={48} selected={m.role === "owner"} quiet={m.role !== "owner"} />
            <span className="text-center text-[16px] leading-tight">{m.name}</span>
          </span>
        ))}
      </Link>
      <div className="flex flex-col px-8 pt-[26px]">
        {household.address ? <Row i={2} label="Home" value={household.address} /> : null}
        <Row i={3} label="Family" value={`${members.length} of us`} href="/family" />
        <Row i={4} label="Reminders" href="/reminders" value={settings?.dailyRound ? `Once a day, ${settings.dailyRound}` : "Off"} />
        <Row i={5} label="Seed box" href="/journal/seeds" />
        <Row i={5} label="Grow all year" href="/grow" value="Shelter and warm spots" />
        <Row i={6} label="Location" value={household.area ? "On · for weather and seasons" : "Not set"} />
        <Row i={7} label="Units">
          <Segmented label="Units" value={settings?.units ?? "C"} onChange={(units) => void setSettings(db, { units })} options={[{ value: "C", label: "°C" }, { value: "F", label: "°F" }]} />
        </Row>
        <Row i={8} label="Lead with">
          <Segmented label="Lead with" value={settings?.seasonLead ?? "local"} onChange={(seasonLead) => void setSettings(db, { seasonLead })} options={[{ value: "local", label: household.place || "Here" }, { value: "japan", label: "Japan" }]} />
        </Row>
        <Row i={9} label="Look">
          <Segmented label="Look" value={theme} onChange={setTheme} options={[{ value: "system", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        </Row>
        <Row i={10} label="Signed in with" value={signedIn} />
        <Row i={11} label="Settings" href="/settings" value="Notes, data, privacy" />
      </div>
      <div className="rise px-8 pt-8" style={{ "--i": 11 } as React.CSSProperties}>
        <Button
          variant="outline"
          onClick={async () => {
            if (session.kind === "account") await signOutHere();
            endSession();
            router.replace("/");
          }}
        >
          {session.kind === "demo" ? "Leave the demo" : session.kind === "account" ? "Sign out" : "Leave this field"}
        </Button>
        {session.kind === "guest" ? <p className="pt-3 text-center text-[16px] text-ink-soft">Your field stays on this phone. &ldquo;Start my own field&rdquo; brings you back to it.</p> : null}
      </div>
    </div>
  );
}
