const CACHE_VERSION = "dayli-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/brand/logo.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith("dayli-") && key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: try the network first so content stays fresh, fall
  // back to the cached shell (or the offline page) when there is none.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          // Serve an exact cache hit for this URL when we have one …
          const cached = await caches.match(request);
          if (cached) return cached;
          // … otherwise redirect to /offline instead of serving its cached
          // HTML at a mismatched URL, which would fight Next's router and
          // trigger a hydration error once the client bundle takes over.
          return Response.redirect(OFFLINE_URL, 302);
        }),
    );
    return;
  }

  // Static assets: cache-first, refreshed in the background.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

// Called from a reminder-action button click below — fires without opening
// the app, authenticated by the per-reminder signature the push payload
// carried (see supabase/functions/reminder-action).
const REMINDER_ACTION_URL = "https://jghfdzmvvizddomwqtzq.supabase.co/functions/v1/reminder-action";

// Real Web Push: the send-due-reminders edge function posts a JSON payload
// of { title, body, tag, url, reminderId, sig, hasTask } — this is what
// lets a reminder reach the device even with dayli fully closed, not just
// while a tab is open. `url` is the specific event/tasks-list destination
// a plain tap should open (send-due-reminders decides it, since it's the
// one that knows whether this reminder was for an event or a task);
// reminderId/sig/hasTask back the "Erledigt"/"1 Std. später" action
// buttons below.
self.addEventListener("push", (event) => {
  let payload = { title: "Erinnerung", body: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  const actions = [{ action: "snooze", title: "1 Std. später" }];
  if (payload.hasTask) actions.unshift({ action: "done", title: "Erledigt" });

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: payload.url || "/", reminderId: payload.reminderId, sig: payload.sig },
      actions: payload.reminderId && payload.sig ? actions : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { reminderId, sig, url } = event.notification.data ?? {};

  if ((event.action === "done" || event.action === "snooze") && reminderId && sig) {
    event.waitUntil(
      fetch(REMINDER_ACTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId, action: event.action, sig }),
      }).catch(() => {
        // Best-effort — nothing to show the user if this fails silently.
      }),
    );
    return;
  }

  const targetUrl = url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          // An already-open window only gets brought to the front by
          // focus() alone — it stays on whatever page it happened to be
          // showing. navigate() first so a background tap on an event
          // reminder actually lands on that event, not just "the app,
          // wherever it was".
          if ("navigate" in client) {
            return client
              .navigate(targetUrl)
              .then((navigated) => (navigated || client).focus())
              .catch(() => client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
