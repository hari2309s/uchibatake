"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { FullNotice } from "@/components/ui/notice";
import { useMembers, useSettings } from "@/lib/data/hooks";
import { deg } from "@/lib/forecast";
import { meOf } from "@/lib/data/me";
import { useData } from "@/lib/data/provider";
import { create, toggleNoticeItem, update } from "@/lib/data/repo";
import { useToday } from "@/lib/use-today";
import { capitalise, numberWord } from "@/lib/words";
import { Redirect } from "@/components/app/redirect";

/** 13b: the full-screen notice. Each tick stamps 済. */
export function NoticeView({ id }: { id: string }) {
  const { db, householdId, session } = useData();
  const router = useRouter();
  const today = useToday();
  const members = useMembers();
  const settings = useSettings();
  const notice = useLiveQuery(async () => {
    const n = await db.notices.get(id);
    return n && !n.deleted_at ? n : null;
  }, [db, id]);
  const me = meOf(members, session)?.id ?? null;
  // Opened from a link with no app history behind it: go Home rather than out of the app.
  const leave = () => (window.history.length > 1 ? router.back() : router.replace("/"));
  if (notice === null) return <Redirect to="/" />;
  if (!notice) return null;
  const title = notice.kind === "frost" ? "Frost tonight" : notice.kind === "heat" ? "Hot today" : "Heavy rain tonight";
  const body = notice.kind === "frost" && notice.low !== null ? `Down to ${deg(notice.low, settings?.units)} in the night.` : "";
  return (
    <FullNotice
      kind={notice.kind}
      title={title}
      body={body}
      listHeading={`${capitalise(numberWord(notice.checklist.length))} ${notice.checklist.length === 1 ? "thing" : "things"} before dark`}
      items={notice.checklist.map((c) => ({ id: c.id, text: c.text, done: !!c.done_at }))}
      onToggle={(item) => void toggleNoticeItem(db, notice.id, item, me)}
      onClose={leave}
      primary={{
        label: "All done",
        onClick: async () => {
          await update(db.notices, notice.id, { checklist: notice.checklist.map((c) => (c.done_at ? c : { ...c, done_at: Date.now(), done_by: me })) });
          leave();
        },
      }}
      secondary={{
        label: notice.remind_at ? `Remind me at ${notice.remind_at}` : "Remind me later",
        onClick: async () => {
          if (today) await create(db.reminders, { title: `${title}: ${notice.checklist.filter((c) => !c.done_at).length} things before dark`, on: today, time: notice.remind_at, repeat: "none", task_id: null, planting_id: null, done_at: null }, householdId);
          leave();
        },
      }}
    />
  );
}
