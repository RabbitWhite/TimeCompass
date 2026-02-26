const CACHE_NAME = 'lifetracker-v5';
const BASE = '/Lifetracker/';

const PRECACHE_URLS = [
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
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
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(BASE + 'index.html'))
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
