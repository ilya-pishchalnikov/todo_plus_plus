// sw.js - Service Worker
const CACHE_NAME = "todopp-offline-cache-v1.0.44";
const OFFLINE_URL = "/index.html";
const URLS_TO_CACHE = [
    "/"
    , "/appevent.js"
    , "/datastore.js"
    , "/dragndrop.js"
    , "/eventstore.js"
    , "/favicon.ico"
    , "/globals.js"
    , "/index.html"
    , "/logger.js"
    , "/login.html"
    , "/login.js"
    , "/menu.js"
    , "/popup.js"
    , "/html/script.js"
    , "/script.js"
    , "/style.css"
    , "/utils.js"
    , "/html/img/cancelled.svg"
    , "/html/img/done.svg"
    , "/html/img/inprogress.svg"
    , "/html/img/question.svg"
    , "/html/img/todo.svg"
];

// Install - Cache essential files
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                URLS_TO_CACHE.map(url => {
                    return fetch(url).then(response => {
                        // Create new response with explicit headers
                        const headers = new Headers(response.headers);
                        headers.set("Content-Type", getMimeType(url));

                        return new Response(response.body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: headers
                        });
                    }).then(newResponse => {
                        return cache.put(url, newResponse);
                    });
                })
            );
        }).then(() => {return self.skipWaiting();})
    );
});

function getMimeType(url) {
    if (url.endsWith(".js")) return "application/javascript";
    if (url.endsWith(".css")) return "text/css";
    if (url.endsWith(".json")) return "application/json";
    if (url.endsWith(".html")) return "text/html";
    if (url.endsWith(".ico")) return "image/x-icon";
    if (url.endsWith(".svg")) return "image/svg+xml";
    if (url == "/") return "text/html"
    return "text/plain";
}

// Fetch - Serve from cache when offline
self.addEventListener("fetch", (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request)
            .then(cachedResponse => {
                return cachedResponse || caches.match(OFFLINE_URL);
            }))
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      }).then(() => clients.claim())
    );
  });