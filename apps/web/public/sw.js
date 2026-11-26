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
