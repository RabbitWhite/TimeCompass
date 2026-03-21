# Lifetracker — Security & PWA Health Audit

**Date:** 2026-03-21
**Auditor:** Claude Code
**Scope:** Pre-public repo migration + PWA stability review
**Files reviewed:** All `src/`, `dist/`, `.github/workflows/`, root config files

---

## Task 1 — Security Audit

### Scan: Hardcoded API keys, tokens, OAuth secrets

| Finding | File | Line | Severity |
|---------|------|------|----------|
| No hardcoded API keys found | — | — | CLEAR |
| No hardcoded OAuth client secrets found | — | — | CLEAR |
| No hardcoded access tokens found | — | — | CLEAR |
| No email addresses found | — | — | CLEAR |
| No personal names or account IDs found | — | — | CLEAR |
| No commented-out credentials found | — | — | CLEAR |

### Scan: .env files and config exposure

- **No `.env` files exist** anywhere in the repo.
- `.gitignore` correctly lists `.env` and `.env.local` — if created they will not be committed.
- `dist/` is intentionally tracked (pre-built for CI-less deploy) — this is documented in `.gitignore` with a comment. No secrets are present in `dist/`.

### Scan: Google OAuth handling

The app uses Google Identity Services (GIS) with an **Implicit / Token flow**. Two values relate to OAuth:

**`googleClientId`** — stored in `localStorage` via `store.tsx:15`
This is the user's own GCP OAuth Client ID, entered manually in the app's sync settings (`Timeline.tsx:19, 82, 86`). In OAuth2, a `client_id` for a browser-only app (no client secret) is **by design a public value** — it appears in redirect URIs and network requests. Storing it in `localStorage` is fine. Severity: **NONE**.

**`googleAccessToken`** — stored in `localStorage` via `store.tsx:15`, set at `Timeline.tsx:91`
This is a short-lived Google Calendar read-only access token (OAuth2 Bearer), persisted to `localStorage` after the user grants permission. It is not a secret the developer controls — it is the user's own credential for their own data.

- Token scope is limited: `calendar.readonly` only (`Timeline.tsx:87`)
- Token is stored alongside the rest of app state in a single `localStorage` key
- No token expiry or rotation logic is implemented — a stale token will simply fail when used

Severity: **LOW** — This is a personal-use PWA where the user is authenticating with their own Google account. The token grants access only to that user's own calendar. No developer credentials are at risk. For a shared/multi-user app this would be MEDIUM.

### Scan: Redirect URIs / config exposure

No hardcoded redirect URIs, no GCP project IDs, no service account files, no `credentials.json`.

### Verdict

> **No secrets, credentials, or personal data were found in any tracked file.**
> The repository is clean for public visibility from a secrets standpoint.

---

## Task 2 — PWA Health Audit

### Caching strategy (`dist/sw.js`)

**Critical asset caching on install** (`sw.js:5–25`): All JS modules, CSS, and `manifest.json` are listed in `CRITICAL_URLS`. If any single file fails to fetch during SW install, the install aborts and the old SW stays active. This is correct behaviour — it prevents a broken cache.

**Optional asset caching** (`sw.js:28–38`): Images are cached best-effort; individual failures are swallowed. Correct.

**CDN caching** (`sw.js:40–90`): `esm.sh` responses (React, react-router-dom) are cached on first load using a cache-first strategy. After first visit the app works fully offline. Correct.

**Navigation requests** (`sw.js:94–115`): Network-first for navigation. If the network returns a non-ok response (e.g. a GitHub Pages 404 when the repo was private), it falls back to the cached `index.html`. This is the explicit fix for the recurring 404 issue. Correct.

**Static asset requests** (`sw.js:117–127`): Cache-first with network fallback, caching new responses. Correct.

| Check | Status |
|-------|--------|
| All critical assets cached at install | ✓ Pass |
| Offline navigation falls back to cached app | ✓ Pass |
| CDN dependencies cached after first load | ✓ Pass |
| GitHub Pages 404 handled without breaking app | ✓ Pass |
| Old cache versions cleaned on activate | ✓ Pass |
| `skipWaiting` + `clients.claim()` for immediate activation | ✓ Pass |

### Fetch calls that fail without auth

`Timeline.tsx:95–98` makes a fetch to `https://www.googleapis.com/calendar/v3/...` with a Bearer token. This call:

- Only runs when the user explicitly presses the Google Calendar sync button
- Is wrapped in a try/catch (`Timeline.tsx:84–120`)
- Will silently fail when offline or when the token has expired

The service worker correctly **does not intercept** cross-origin requests to `googleapis.com` (`sw.js:92`), so these failures are isolated to the sync feature and do not affect the rest of the app. No error mode is triggered. The cached calendar events remain visible.

**Verdict:** The Google Calendar fetch failing without auth is expected, non-breaking, and handled.

### manifest.json review (`dist/manifest.json`)

| Field | Value | Status |
|-------|-------|--------|
| `name` | LifeTracker | ✓ |
| `short_name` | LifeTracker | ✓ |
| `description` | Present | ✓ |
| `start_url` | `/Lifetracker/` | ✓ |
| `scope` | `/Lifetracker/` | ✓ |
| `display` | `standalone` | ✓ |
| `theme_color` | `#6c63ff` | ✓ |
| `background_color` | `#0f0f1a` | ✓ |
| `orientation` | `portrait` | ✓ |
| Icons 192px (any) | ✓ | ✓ |
| Icons 512px (any) | ✓ | ✓ |
| Icons 192px maskable | ✓ | ✓ |
| Icons 512px maskable | ✓ | ✓ |
| `id` field | Missing | LOW — recommended by Chrome for stable PWA identity |
| `screenshots` | Missing | LOW — optional, used in install prompts |
| `categories` | Missing | LOW — optional metadata |

Manifest meets all **required** fields for PWA installability.

### GitHub Pages base path handling

`sw.js:2` hardcodes `const BASE = '/Lifetracker/';`
`manifest.json` hardcodes `"start_url": "/Lifetracker/"` and `"scope": "/Lifetracker/"`
`dist/index.html` uses `<base href="/Lifetracker/">` (set by `build-cdn.sh`)

All three are consistent. The path is tied to the GitHub repository name `Lifetracker`. If the repo is ever renamed, all three locations must be updated and the app rebuilt. This is a maintenance note, not a defect.

### Offline / error fallback

- Navigation fallback: cached `index.html` served when network fails or returns non-ok (`sw.js:102, 111`)
- `dist/404.html` exists and redirects GitHub Pages 404s to the correct SPA base URL
- No dedicated offline page — the full app shell is served instead, which is acceptable for a single-user personal app

---

## Task 3 — Summary & Recommendations

### 1. Safe to make public?

**YES**

No secrets, API keys, tokens, personal data, or credentials were found in any tracked file. The repository is safe to make public as-is.

---

### 2. PWA stability issues — ranked by impact

| Rank | Issue | Impact |
|------|-------|--------|
| 1 | **Cache version is manually bumped** (`CACHE_NAME = 'lifetracker-v11'` in `sw.js:1`). If a new deploy is pushed without bumping this string, users continue serving the old cached version indefinitely until they manually clear the browser cache. | HIGH — silent stale-content bugs after deploy |
| 2 | **`skipWaiting` fires unconditionally** (`sw.js:59`). If the user has the app open in two tabs, the new SW activates immediately and the old tab gets the new code without a reload, which can cause state mismatches. | MEDIUM — rare for a personal single-tab app |
| 3 | **Google Calendar access token persisted in `localStorage`** with no expiry check. When the token expires, the next sync silently fails with no error message to the user beyond a JS exception reaching the `catch` block at `Timeline.tsx:118` which only alerts about the GIS script not being loaded — not about a token error. | MEDIUM — confusing UX, not a security issue |
| 4 | **No `id` field in manifest.json**. Without it, Chrome uses `start_url` as the PWA identity. If `start_url` ever changes, the browser treats it as a new app and the user loses their installed home-screen icon. | LOW |
| 5 | **CDN dependency on `esm.sh`**. If `esm.sh` is down on a user's first visit, React and react-router-dom fail to load and the app is broken (not even `index.html` renders). Subsequent visits work from cache. | LOW — first-visit only, no mitigation currently |

---

### 3. Recommended fixes — priority order

**Priority 1 — Automate cache busting (HIGH impact, medium effort)**
Replace the hardcoded `lifetracker-v11` string in `sw.js` with a build-time hash injected by `build-cdn.sh` (e.g. `lifetracker-<git-sha-short>`). This ensures every deploy automatically invalidates the old cache without a manual bump. Currently, forgetting to bump the version is the most likely cause of a future "app stuck on old version" bug.

**Priority 2 — Fix Google Calendar token expiry UX (MEDIUM impact, low effort)**
When the Calendar API returns a 401, clear `googleAccessToken` and `googleCalendarConnected` from state and show a "Re-connect Google Calendar" prompt. The current catch block at `Timeline.tsx:118` only handles the case where the GIS script isn't loaded.

**Priority 3 — Add `id` to manifest.json (LOW impact, trivial effort)**
Add `"id": "/Lifetracker/"` to `dist/manifest.json` (and `public/manifest.json` if it exists). One line, prevents PWA identity drift if `start_url` ever changes.

**Priority 4 — `skipWaiting` guard (LOW impact for personal app, good practice)**
Replace unconditional `self.skipWaiting()` with a message-based activation: only call `skipWaiting()` when the user dismisses an "Update available" prompt. `src/main.tsx` already dispatches an `swUpdated` event — this mechanism is in place but the SW side doesn't wait for it.

**Priority 5 — Token storage hygiene (LOW risk, medium effort)**
Move `googleAccessToken` from `localStorage` (persisted across sessions) to `sessionStorage` (cleared when the tab closes). The token is short-lived anyway. The `googleClientId` should remain in `localStorage` so the user doesn't have to re-enter it.
