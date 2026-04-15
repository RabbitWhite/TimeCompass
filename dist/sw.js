const CACHE_NAME = 'timecompass-d05a261';
const BASE = '/Lifetracker/';

// Critical files: if any of these fail to cache, the SW install fails (app won't work)
const CRITICAL_URLS = [
  BASE + 'index.html',
  BASE + 'App.css',
  BASE + 'main.js',
  BASE + 'App.js',
  BASE + 'store.js',
  BASE + 'utils.js',
  BASE + 'types.js',
  BASE + 'components/BottomNav.js',
  BASE + 'components/Modal.js',
  BASE + 'components/SplashScreen.js',
  BASE + 'pages/Dashboard.js',
  BASE + 'pages/FocusAreaDetail.js',
  BASE + 'pages/FocusAreas.js',
  BASE + 'pages/Gamification.js',
  BASE + 'pages/Statistics.js',
  BASE + 'pages/Timeline.js',
  BASE + 'pages/Tracking.js',
  BASE + 'pages/WeekTemplates.js',
  BASE + 'manifest.json',
];

// Optional files: cached best-effort; a failure here does NOT abort SW install
const OPTIONAL_URLS = [
  BASE + 'background.png',
  BASE + 'cover.png',
  BASE + 'app-icon.png',
  BASE + 'icon-192x192.png',
  BASE + 'icon-192x192-maskable.png',
  BASE + 'icon-512x512.png',
  BASE + 'icon-512x512-maskable.png',
  BASE + 'icon-180x180.png',
  BASE + 'icon-180x180-maskable.png',
];

// CDN origins whose responses should also be cached for offline use
const CDN_ORIGINS = ['https://esm.sh'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache critical files (throws on failure → SW install aborts)
      cache.addAll(CRITICAL_URLS).then(() =>
        // Cache images best-effort — individual failures are swallowed
        Promise.all(
          OPTIONAL_URLS.map((url) =>
            fetch(url)
              .then((resp) => (resp.ok ? cache.put(url, resp) : null))
              .catch(() => null)
          )
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache CDN library files (React, react-dom, react-router-dom) after first load
  // so the app works fully offline on subsequent visits.
  if (CDN_ORIGINS.some((origin) => event.request.url.startsWith(origin))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // GitHub Pages returns a 404 HTML page when the repo is private.
          // A 404 is a successful HTTP response so .catch() never fires —
          // explicitly check response.ok and fall back to the cached app.
          if (!response.ok) {
            return caches.match(BASE + 'index.html').then(
              (cached) => cached || response  // return error response if nothing cached yet
            );
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(BASE + 'index.html').then((cached) => cached || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
