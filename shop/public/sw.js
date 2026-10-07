// Lets the app install on phones and shows a friendly page when offline.
// Prices change daily, so pages always come from the network.
const OFFLINE_HTML = `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center">
<h1>You're offline</h1><p>Connect to the internet to see the latest prices.</p></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } }),
    ),
  );
});
