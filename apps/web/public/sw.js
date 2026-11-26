/*
 * Uchibatake's service worker: the app works offline once visited.
 * - The app's own fixed files (/_next/static: code, styles, font slices) are
 *   kept as they're used (cache first; they never change under the same name).
 * - Pages: the network first, the kept copy when offline.
 * - Nothing else is cached: not the weather (kept on the device by the app),
 *   not sign-in, not plant diagnosis, not other sites.
 * Each deploy registers a new worker (?build=…); old caches are cleared.
 */
const BUILD = new URL(self.location.href).searchParams.get("build") || "dev";
const CACHE = `uchibatake-pages-${BUILD}`;
// Fixed files are named by their content, so one cache serves every build (an old page's code stays offline).
const STATIC = "uchibatake-static";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"]).catch(() => undefined)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("uchibatake-pages-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page asks the waiting worker to take over (the "update ready" strip).
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Pages and their data: network first, kept copy offline, the home page as a last resort.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === "navigate" || url.searchParams.has("_rsc"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const kept = await caches.match(req);
        if (kept) return kept;
        if (req.mode === "navigate") {
          const home = await caches.match("/");
          if (home) return home;
        }
        return Response.error();
      })
  );
});

/*
 * The daily note while the app is closed. The push carries nothing from the
 * field; this reads the phone's own field (IndexedDB) and writes the note:
 * today's small jobs, and a frost line when tonight goes to 0° or below
 * (today's frost notice, or the forecast for the rough area the app already
 * uses, from Open-Meteo). A push must always show a note, so there's a
 * gentle fallback.
 */
function idbOpen(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // A field that doesn't exist here: don't create it.
    req.onupgradeneeded = () => {
      req.transaction.abort();
      reject(new Error("no field"));
    };
  });
}
function idbAll(db, store) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) return resolve([]);
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}
function idbPut(db, store, value) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deg = (c, units) => `${String(Math.round(units === "F" ? (c * 9) / 5 + 32 : c)).replace("-", "\u2212")}°`;

async function dailyNote() {
  const state = await caches.open("uchibatake-state").then((c) => c.match("/__sw-state")).then((r) => (r ? r.json() : null)).catch(() => null);
  if (!state || !state.db) return null;
  const db = await idbOpen(state.db).catch(() => null);
  if (!db) return null;
  try {
    const today = isoDay(new Date());
    const [tasks, notices, households, plantings, meta] = await Promise.all(["tasks", "notices", "households", "plantings", "meta"].map((s) => idbAll(db, s)));
    const settings = (meta.find((m) => m.key === "settings") || {}).value || {};
    const units = settings.units === "F" ? "F" : "C";
    // The same jobs Home shows today (not done, not skipped, due or snoozed to today or before).
    const open = tasks.filter((t) => !t.deleted_at && !t.skipped_at && !t.done_at && ((t.snoozed_until && t.snoozed_until > t.due_on ? t.snoozed_until : t.due_on) <= today));
    // Frost: today's notice, or tonight's forecast low when something is growing.
    let low = null;
    const notice = notices.find((n) => !n.deleted_at && n.kind === "frost" && n.for_date === today);
    const frostOn = settings.frostWarnings !== false;
    if (frostOn && notice && notice.low !== null) low = notice.low;
    else if (frostOn && plantings.some((p) => !p.deleted_at && p.status === "growing")) {
      const h = households.find((x) => !x.deleted_at);
      if (h && h.area) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${h.area.lat}&longitude=${h.area.lon}&daily=temperature_2m_min&timezone=auto&forecast_days=2`;
        const f = await fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const tonight = f && f.daily && f.daily.temperature_2m_min ? f.daily.temperature_2m_min[1] : null;
        if (typeof tonight === "number" && tonight <= 0) low = tonight;
      }
    }
    const jobs = open.length === 0 ? "Nothing to do today. The field is resting." : open.length === 1 ? `One small thing: ${open[0].title.charAt(0).toLowerCase()}${open[0].title.slice(1)}.` : `${open.length} small things today. No rush.`;
    const note = low !== null && low <= 0 ? { title: "Frost tonight", body: `Down to ${deg(low, units)}. ${jobs}`, url: notice ? `/notice/${notice.id}` : "/" } : { title: "Today in the field", body: jobs, url: "/" };
    // The app won't send today's daily note again; its evening frost warning (jobs before dark) still comes.
    const sent = (meta.find((m) => m.key === "notesSent") || {}).value || {};
    await idbPut(db, "meta", { key: "notesSent", value: { ...sent, daily: today } });
    return note;
  } finally {
    db.close();
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    dailyNote()
      .catch(() => null)
      .then((note) => {
        const n = note || { title: "Uchibatake", body: "A look at today's field.", url: "/" };
        // The same tag as the in-app daily note, so it replaces rather than repeats.
        return self.registration.showNotification(n.title, { body: n.body, tag: "daily", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: n.url } });
      })
  );
});

// A tap on a note opens the app where it points.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const to = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.focus().then((w) => w && w.navigate(to));
      return self.clients.openWindow(to);
    })
  );
});
