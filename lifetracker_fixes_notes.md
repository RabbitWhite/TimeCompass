# Lifetracker PWA Fixes — Reviewer Notes

## Fix 1: Automated Cache Busting

### Is the SHA injection idempotent? — HIGH PRIORITY

**PASS.** The script always begins with `rm -rf dist && mkdir -p dist/...`, which deletes and
recreates the dist directory before any files are written. The heredoc then writes `dist/sw.js`
with the literal string `lifetracker-v11`, and `sed` immediately replaces it with
`lifetracker-<GIT_SHA>`. Running `build-cdn.sh` multiple times on the same commit will always
produce the same result. There is no risk of double-substitution or corruption.

### Does the pattern replace only the version string and nothing else? — HIGH PRIORITY

**PASS.** The sed pattern `s/lifetracker-v[0-9]*/lifetracker-${GIT_SHA}/` is scoped to the
literal prefix `lifetracker-v` followed by digits. In the heredoc that generates `dist/sw.js`,
this exact string appears exactly once: `const CACHE_NAME = 'lifetracker-v11';`. No other
content in the heredoc matches `lifetracker-v[0-9]*`. The pattern will not affect any other
strings (e.g. comments, URLs, or variable names).

**Minor note:** The sed pattern uses `[0-9]*` (zero or more digits). This means it would also
match the bare string `lifetracker-v` with no digits, but no such string exists in the heredoc
output, so this is harmless in practice.

---

## Fix 2: Google Calendar Token Expiry UX

### Is the 401 check on the correct response object? — HIGH PRIORITY

**PASS.** The check is `if (res.status === 401)` where `res` is the `Response` object returned
by `fetch(...)` at lines 95–98 of `Timeline.tsx`. This correctly inspects the HTTP status code
of the response from the Google Calendar API endpoint. It is NOT checking an API error body —
it reads the HTTP status directly from the `Response`, which is the correct and reliable place
to detect an authentication failure from Google's REST API.

### Does clearing state correctly disconnect the Calendar UI? — MEDIUM PRIORITY

**PASS.** The dispatch call sets both `googleAccessToken: ''` and `googleCalendarConnected: false`.
In the component's JSX (line 155), the "Google Calendar connected" banner is gated on
`state.settings.googleCalendarConnected`. Clearing `googleCalendarConnected` to `false` will
hide this banner, effectively disconnecting the Calendar UI. The `setShowSync(false)` call also
closes the sync modal. Both state fields are cleared atomically in a single `UPDATE_SETTINGS`
dispatch, so there is no intermediate render where one is cleared but not the other.

---

## Fix 3: manifest.json id Field

### Does the id value match the app's GitHub Pages base path? — LOW PRIORITY

**PASS.** The value `"id": "/Lifetracker/"` matches the app's GitHub Pages deployment path.
The base path is consistently `/Lifetracker/` throughout the codebase:
- `build-cdn.sh` line 43: replaces `import.meta.env.BASE_URL` with `"/Lifetracker/"`
- `dist/index.html`: `<base href="/Lifetracker/" />`
- `manifest.json` `start_url`: `"/Lifetracker/"`
- `manifest.json` `scope`: `"/Lifetracker/"`

The `id` field correctly matches all of these, ensuring PWA identity stability if `start_url`
changes in the future.

Both `public/manifest.json` and `dist/manifest.json` already contain the `"id"` field — no
changes were needed for Fix 3.

---

## State of Fixes at Commit Time

| Fix | Status | Files Changed |
|-----|--------|---------------|
| 1 — Cache busting | Already implemented in build-cdn.sh (GIT_SHA capture + sed); documented in migration_notes.md | migration_notes.md (new) |
| 2 — Calendar 401 UX | 401 check was already present; updated alert message to match spec | src/pages/Timeline.tsx |
| 3 — manifest.json id | Already present in both public/ and dist/ manifests; no code change needed | (none) |
