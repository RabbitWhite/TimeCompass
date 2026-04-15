#!/bin/bash
set -e

echo "Building Lifetracker (CDN mode, no npm required)..."

GIT_SHA=$(git rev-parse --short HEAD)

# Clean dist
rm -rf dist
mkdir -p dist/pages dist/components

# 1. Compile TypeScript -> JavaScript using globally installed npx tsc
echo "Compiling TypeScript..."
npx tsc -p tsconfig.cdn.json

# 2. Post-process compiled JS files
echo "Post-processing JavaScript files..."
python << 'PYEOF'
import re
import os
import glob

def process_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # Add .js extension to relative imports/exports that are missing it
    def add_js_ext(m):
        prefix = m.group(1)
        import_path = m.group(2)
        suffix = m.group(3)
        # Only modify relative paths without extensions
        if import_path.startswith('.') and '.' not in os.path.basename(import_path):
            import_path += '.js'
        return prefix + import_path + suffix

    content = re.sub(
        r'((?:from|import)\s+["\'])(\.[^"\']+)(["\'])',
        add_js_ext, content
    )

    # Replace import.meta.env.BASE_URL with the actual base path
    content = content.replace('import.meta.env.BASE_URL', '"/Lifetracker/"')

    # Remove CSS side-effect imports
    content = re.sub(r'import\s+["\'][^"\']+\.css["\'];?\n?', '', content)

    with open(path, 'w') as f:
        f.write(content)

js_files = glob.glob('dist/**/*.js', recursive=True) + glob.glob('dist/*.js')
for js_file in js_files:
    process_file(js_file)

print(f"  Processed {len(js_files)} JavaScript files")
PYEOF

# 3. Copy static assets from public/
echo "Copying static assets..."
cp public/* dist/ 2>/dev/null || true
touch dist/.nojekyll  # Prevents GitHub Pages from running Jekyll on the static files

# 4. Copy CSS
cp src/App.css dist/

# 5. Generate sw.js with correct precache list (replaces the Vite placeholder version)
cat > dist/sw.js << 'SWEOF'
const CACHE_NAME = 'lifetracker-v11';
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
SWEOF

# Stamp the cache name with the current git SHA so every deploy
# gets a fresh cache without manual version bumping.
sed -i "s/lifetracker-v[0-9]*/lifetracker-${GIT_SHA}/" dist/sw.js

# 6. Create index.html with corrected import maps
# - react-dom added (not just react-dom/client) for react-router-dom's internal imports
# - react-router-dom uses ?external=react,react-dom so it doesn't bundle its own React,
#   preventing the "two React instances" problem that breaks Context
cat > dist/index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
  <head>
    <base href="/Lifetracker/" />
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#0f0f1a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/Lifetracker/manifest.json" />
    <link rel="apple-touch-icon" sizes="180x180" href="/Lifetracker/icon-180x180.png" />
    <link rel="stylesheet" href="/Lifetracker/App.css" />
    <title>LifeTracker</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18",
        "react/jsx-runtime": "https://esm.sh/react@18/jsx-runtime",
        "react-dom": "https://esm.sh/react-dom@18",
        "react-dom/client": "https://esm.sh/react-dom@18/client",
        "react-router-dom": "https://esm.sh/react-router-dom@6?external=react,react-dom"
      }
    }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/Lifetracker/main.js"></script>
  </body>
</html>
HTML

echo ""
echo "Build complete! Output in dist/"
echo "Files:"
find dist -name "*.js" -o -name "*.html" -o -name "*.css" | sort
