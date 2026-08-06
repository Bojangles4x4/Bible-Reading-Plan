const CACHE_NAME = "ten-category-bible-plan-v9-guided-session";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./lsb-audio-map.json",
  "./v8-player.js?v=8",
  "./v9-reading-session.js?v=9"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

async function audioMapResponse() {
  const cache = await caches.open(CACHE_NAME);
  const stableUrl = new URL("./lsb-audio-map.json", self.registration.scope).href;
  try {
    const response = await fetch(stableUrl, { cache: "no-store" });
    if (response.ok) await cache.put(stableUrl, response.clone());
    return response;
  } catch {
    const cached = await cache.match(stableUrl);
    if (cached) return cached;
    return new Response(JSON.stringify({ chapters: {}, mapped: 0, expected: 1189, complete: false }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function navigationResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put("./index.html", response.clone());
    return response;
  } catch {
    return (await cache.match("./index.html")) || Response.error();
  }
}

async function staticResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin) return;

  if (url.pathname.endsWith("/lsb-audio-map.json")) {
    event.respondWith(audioMapResponse());
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(navigationResponse(event.request));
    return;
  }

  event.respondWith(staticResponse(event.request));
});
