"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackBar } from "@/components/ui/bars";
import { Button } from "@/components/ui/button";
import { Segmented, Switch } from "@/components/ui/choice";
import { Hitokoto } from "@/components/ui/notes";
import { PermissionPage } from "@/components/ui/permission";
import { Sheet } from "@/components/ui/sheet";
import { signOutHere } from "@/lib/auth";
import { forgetFieldDB } from "@/lib/data/db";
import { useHousehold, useSettings } from "@/lib/data/hooks";
import { useData } from "@/lib/data/provider";
import { setSettings } from "@/lib/data/repo";
import { deleteGuestField, endSession, forgetRememberedAccount } from "@/lib/data/session";
import type { Settings as S } from "@/lib/data/types";
import { download, exportField } from "@/lib/export";
import { notesAllowed } from "@/lib/notify";
import { isoDate } from "@/lib/dates";
import { deleteAccountEverywhere } from "@/lib/data/sharing";
import { RemoteError } from "@/lib/data/sync";
import { AUTH_CONFIGURED } from "@/lib/supabase";
import { SharingSection } from "./sharing-section";

const head = "px-8 pt-7 text-[15px] font-normal uppercase tracking-[.16em] text-ink-soft";

function Row({ label, children, i }: { label: string; children: React.ReactNode; i: number }) {
  return (
    <div className="rise flex min-h-14 items-center justify-between gap-3 border-b border-rule" style={{ "--i": i } as React.CSSProperties}>
      <span className="text-[17px]">{label}</span>
      {children}
    </div>
  );
}

/** M17 Settings and M17b Delete. */
export function SettingsView() {
  const { db, session } = useData();
  const router = useRouter();
  const household = useHousehold();
  const settings = useSettings();
  const [asking, setAsking] = useState<null | (() => void)>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!settings || !household) return null;
  const set = (p: Partial<S>) => void setSettings(db, p);
  // A note only counts as on when the phone allows notes: otherwise the switch shows off, and turning it on asks.
  const allowed = notesAllowed();
  const doExport = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      download(await exportField(db), `uchibatake-field-${isoDate()}.zip`);
    } catch {
      setNote("The export didn't work just now. Nothing has changed; try again.");
    } finally {
      setBusy(false);
    }
  };

  // Turning notes on asks first (M05), then the phone's own prompt.
  const withNotes = (then: () => void) => {
    if (notesAllowed()) return then();
    if (typeof Notification === "undefined") return setNote("This browser can't send notes. Everything still shows in the app.");
    setAsking(() => then);
  };

  if (asking)
    return (
      <PermissionPage
        kind="notifications"
        onNotNow={() => setAsking(null)}
        onAllow={async () => {
          const go = asking;
          setAsking(null);
          if ((await Notification.requestPermission()) === "granted") go();
          else setNote("Notes weren't allowed. You can change that in your phone's settings.");
        }}
      />
    );

  const signedIn = session.kind === "account" ? `${session.provider === "google" ? "Google" : "Email"} · ${session.name ?? session.email}` : session.kind === "demo" ? "The demo" : "This phone only";

  return (
    <div className="pb-10">
      <BackBar href="/profile" label="Profile" />
      <h1 className="rise px-8 pt-2 font-mincho text-[34px] font-normal">Settings</h1>

      <h2 className={head}>Account</h2>
      <div className="px-8">
        <Row label="Signed in with" i={1}>
          <span className="text-right text-[16px] text-ink-soft">{signedIn}</span>
        </Row>
        <Row label="Units" i={2}>
          <Segmented label="Units" value={settings.units} onChange={(units) => set({ units })} options={[{ value: "C", label: "°C" }, { value: "F", label: "°F" }]} />
        </Row>
        <Row label="Language" i={3}>
          <span className="text-[16px] text-ink-soft">English</span>
        </Row>
      </div>

      <h2 className={head}>Notes from the field</h2>
      <div className="px-8">
        <Row label="Daily note" i={4}>
          <span className="flex items-center gap-3">
            {settings.dailyRound && allowed ? <input type="time" aria-label="Daily note time" value={settings.dailyRound} onChange={(e) => e.target.value && set({ dailyRound: e.target.value })} className="h-11 bg-transparent font-mincho text-[18px] text-ink" /> : null}
            <Switch label="Daily note" checked={!!settings.dailyRound && allowed} onChange={(on) => (on ? withNotes(() => set({ dailyRound: settings.dailyRound ?? "08:00" })) : set({ dailyRound: null }))} />
          </span>
        </Row>
        <Row label="Frost warnings" i={5}>
          <Switch label="Frost warnings" checked={settings.frostWarnings && allowed} onChange={(on) => (on ? withNotes(() => set({ frostWarnings: true })) : set({ frostWarnings: false }))} />
        </Row>
        <Row label="Quiet hours" i={6}>
          <span className="flex items-center gap-2 font-mincho text-[18px]">
            <input type="time" aria-label="Quiet from" value={settings.quietHours.from} onChange={(e) => e.target.value && set({ quietHours: { ...settings.quietHours, from: e.target.value } })} className="h-11 bg-transparent text-ink" />
            <span className="text-ink-soft">–</span>
            <input type="time" aria-label="Quiet until" value={settings.quietHours.to} onChange={(e) => e.target.value && set({ quietHours: { ...settings.quietHours, to: e.target.value } })} className="h-11 bg-transparent text-ink" />
          </span>
        </Row>
        {/* True of the code: no push server yet, so notes come while the app is open or running. */}
        <p className="pt-3 text-[15px] leading-normal text-ink-soft">
          {notesAllowed() ? "Notes arrive while Uchibatake is open or running on this phone. Never during quiet hours." : "Notes are off on this phone. Turn one on above to allow them."}
        </p>
        {note ? (
          <p role="status" className="pt-2 text-[16px] text-ink-soft">
            {note}
          </p>
        ) : null}
      </div>

      <h2 className={head}>Seasons</h2>
      <div className="px-8">
        <Row label="Lead with" i={7}>
          <Segmented label="Lead with" value={settings.seasonLead} onChange={(seasonLead) => set({ seasonLead })} options={[{ value: "local", label: household.place || "Here" }, { value: "japan", label: "Japan" }]} />
        </Row>
      </div>

      <h2 className={head}>Share between phones</h2>
      <SharingSection />

      <h2 className={head}>Your data</h2>
      <div className="px-8">
        <Link href="/privacy" className="rise tap flex min-h-14 items-center justify-between border-b border-rule text-[17px]" style={{ "--i": 8 } as React.CSSProperties}>
          Privacy <span aria-hidden>›</span>
        </Link>
        <button
          type="button"
          disabled={busy}
          className="rise tap flex min-h-14 w-full items-center justify-between border-b border-rule text-left text-[17px]"
          style={{ "--i": 9 } as React.CSSProperties}
          onClick={doExport}
        >
          Export my field <span className="text-[16px] text-ink-soft">{busy ? "Putting it together…" : "Journal, harvests, photos ›"}</span>
        </button>
        <button type="button" className="rise tap flex min-h-14 w-full items-center text-left text-[17px] text-ink-soft" style={{ "--i": 10 } as React.CSSProperties} onClick={() => setDeleting(true)}>
          {session.kind === "account" ? "Delete account…" : session.kind === "demo" ? "Leave the demo…" : "Delete this field…"}
        </button>
      </div>

      <Sheet open={deleting} onClose={() => setDeleting(false)} title={session.kind === "account" ? "Delete your account?" : session.kind === "demo" ? "Leave the demo?" : "Delete this field?"}>
        <div className="flex flex-col gap-4 px-8 pb-[34px] pt-3">
          {session.kind === "demo" ? (
            <p className="text-[17px] leading-[1.6] text-ink-body">The demo goes back to how it was. Nothing of yours is touched.</p>
          ) : (
            <>
              {/* M17b: says exactly what goes. Without sync, the field is only on this phone. */}
              <p className="text-[17px] leading-[1.6] text-ink-body">
                This removes your field from this phone: the spaces and plants, the journal, the harvest log and the seed box. It&apos;s only kept here, so we can&apos;t bring it back.
                {session.kind === "account" ? " Your account goes too, and the shared copy of your field if no one else in the family is in it. Family members who joined keep the field on their phones." : ""}
              </p>
              <Hitokoto>You could export your field first, so the memories stay with you.</Hitokoto>
              <Button variant="outline" disabled={busy} onClick={doExport}>
                {busy ? "Putting it together…" : "Export my field first"}
              </Button>
            </>
          )}
          {note ? (
            <p role="status" className="text-[16px] text-ink-soft">
              {note}
            </p>
          ) : null}
          <Button
            disabled={busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setNote(null);
              try {
                if (session.kind === "guest") await deleteGuestField();
                else if (session.kind === "account") {
                  // The account on the server first (it needs a connection); then this phone.
                  if (AUTH_CONFIGURED)
                    await deleteAccountEverywhere().catch((e: unknown) => {
                      // Sharing was never set up on this server: there's no account data there to remove.
                      if (!(e instanceof RemoteError && e.kind === "schema")) throw e;
                    });
                  await forgetFieldDB(session.id);
                  forgetRememberedAccount();
                  endSession();
                  await signOutHere().catch(() => undefined);
                } else endSession();
                router.replace("/");
              } catch {
                setNote(typeof navigator !== "undefined" && !navigator.onLine ? "Deleting your account needs a connection. Nothing was removed." : "That didn't finish. Nothing more was removed; try again.");
                setBusy(false);
              }
            }}
          >
            {session.kind === "demo" ? "Leave the demo" : "Delete everything"}
          </Button>
          <button type="button" className="min-h-11 text-[16px] text-ink-soft" onClick={() => setDeleting(false)}>
            {session.kind === "account" ? "Keep my account" : "Keep it"}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
