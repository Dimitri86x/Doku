const CACHE_NAME = 'flexfundament-v5';
const ASSETS = [
    './index.html',
    './manifest.json',
    // Hier können noch weitere Bilder oder Skripte ergänzt werden
];

// Install Event - Cacht statische Assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(ASSETS);
            })
    );
    // Sofort aktivieren, ohne auf Restart zu warten
    self.skipWaiting();
});

// Activate Event - Alte Caches aufräumen
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Offline-first Strategie
self.addEventListener('fetch', event => {
    // Falls es sich um Anfragen zur gleichen Origin handelt (Navigation / Assets)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Wenn im Cache, gib das gecachte zurück
                if (response) {
                    return response;
                }
                // Wenn nicht im Cache, mach einen Netzwerk-Request
                return fetch(event.request).then(
                    networkResponse => {
                        // Response klonen und dem Cache hinzufügen falls ok und von uns (GET)
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            }).catch(() => {
                // Falls Offline und Request fehlschlägt, und ein HTML Dokument angefragt wird
                // können wir die index.html ausliefern
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});
