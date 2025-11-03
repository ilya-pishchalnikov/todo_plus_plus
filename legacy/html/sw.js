// sw.js - Service Worker
const CACHE_NAME = "todopp-offline-cache-v1.0." + Date.now(); // Increment cache version to ensure update
const OFFLINE_URL = "/index.html"; // Fallback URL for offline access

// List of URLs to cache during installation
const URLS_TO_CACHE = [
    "/",
    "/appevent.js",
    "/datastore.js",
    "/dragndrop.js",
    "/eventstore.js",
    "/favicon.ico",
    "/globals.js",
    "/index.html",
    "/logger.js",
    "/login.html",
    "/login.js",
    "/manifest.json",
    "/menu.js",
    "/popup.js",
    "/script.js",
    "/style.css",
    "/utils.js",
    "/img/cancelled.svg",
    "/img/done.svg",
    "/img/inprogress.svg",
    "/img/question.svg",
    "/img/todo.svg",
];

// Install event: Caches essential files
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((error) => {
                return Promise.all(
                    URLS_TO_CACHE.map((url) =>
                        caches
                            .open(CACHE_NAME)
                            .then((cache) =>
                                cache
                                    .add(url)
                                    .catch((e) =>
                                        console.error(
                                            `Failed to cache ${url}:`,
                                            e
                                        )
                                    )
                            )
                    )
                );
            })
    );
});

// Activate event: Cleans up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                return clients.claim(); // Takes control of existing clients immediately
            })
    );
});

// Fetch event: Serves content from cache or network
self.addEventListener("fetch", (event) => {
    // We only want to handle GET requests, not POST or others
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request) // Try to fetch from the network first
            .then((response) => {
                // If network request is successful, clone the response and cache it
                // Then return the response
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                // If network fails, try to get from cache
                return caches
                    .match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        } else {
                            // If not in cache, fallback to the offline page
                            return caches.match(OFFLINE_URL);
                        }
                    })
                    .catch((error) => {
                        console.error(
                            "[Service Worker] Error during fetch or caching:",
                            error
                        );
                        // Fallback to offline page even if cache.match fails
                        return caches.match(OFFLINE_URL);
                    });
            })
    );
});
