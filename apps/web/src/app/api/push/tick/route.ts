import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { isDue } from "@/lib/push-time";

/*
 * The daily note while the app is closed. Called every 15 minutes by Supabase
 * (pg_cron, see supabase/migrations/20261127000000_uchi_push.sql) with a shared
 * secret. Each phone whose time has come (or came within the last hour, if a
 * run was missed), in its own time zone, gets a push
 * with no field data in it: just "wake up"; sw.js writes the note from the
 * phone's own field.
 *
 * Server-only env: UCHI_CRON_SECRET, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * (mailto: or https:), SUPABASE_SECRET_KEY (service role). Public:
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY, NEXT_PUBLIC_SUPABASE_URL.
 */

interface Sub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  hour: number;
  minute: number;
  tz: string;
  last_sent_on: string | null;
}

const PAGE = 1000;
const BATCH = 25;
const SEND_TIMEOUT_MS = 10_000;
const RUN_BUDGET_MS = 50_000;
/** The same allowlist as the table: never post anywhere else. */
const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\//;

export const maxDuration = 60;

function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = process.env.UCHI_CRON_SECRET;
  if (!secret || !sameSecret(req.headers.get("x-cron-secret") ?? "", secret)) return new Response("Forbidden", { status: 403 });
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!pub || !priv || !subject || !url || !key) return new Response("Not set up", { status: 503 });
  webpush.setVapidDetails(subject, pub, priv);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const now = new Date();
  const started = Date.now();
  let sent = 0;
  let removed = 0;
  let failed = 0;
  let after = "00000000-0000-0000-0000-000000000000";
  for (;;) {
    const { data, error } = await admin.from("uchi_push").select("id,endpoint,p256dh,auth,hour,minute,tz,last_sent_on").gt("id", after).order("id").limit(PAGE);
    if (error) return new Response("Couldn't read", { status: 500 });
    const page = (data ?? []) as Sub[];
    if (!page.length) break;
    after = page[page.length - 1].id;
    const due = page.map((s) => ({ s, ...isDue(s, now) })).filter((x) => x.due);
    for (let i = 0; i < due.length && Date.now() - started < RUN_BUDGET_MS; i += BATCH) {
      await Promise.all(
        due.slice(i, i + BATCH).map(async ({ s, date }) => {
          if (!PUSH_HOST.test(s.endpoint)) {
            await admin.from("uchi_push").delete().eq("id", s.id);
            removed++;
            return;
          }
          try {
            // The only payload: which wake this is. Nothing about the field.
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ wake: "daily" }), { TTL: 3600, urgency: "normal", timeout: SEND_TIMEOUT_MS });
            await admin.from("uchi_push").update({ last_sent_on: date }).eq("id", s.id);
            sent++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
              await admin.from("uchi_push").delete().eq("id", s.id); // unsubscribed or expired
              removed++;
            } else failed++;
          }
        })
      );
    }
    if (page.length < PAGE || Date.now() - started >= RUN_BUDGET_MS) break;
  }
  return Response.json({ sent, removed, failed });
}
