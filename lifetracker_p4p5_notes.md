# Lifetracker PWA Hygiene Review Notes — P4/P5 Fixes

## Fix 1: skipWaiting Guard (HIGH)

**Was SKIP_WAITING already posted from src/main.tsx?**
No. Prior to this fix, `src/main.tsx` only dispatched a `sw-update-ready` DOM custom event when
a new service worker entered the `installed` state. There was no `postMessage` call to the waiting
SW. The SKIP_WAITING post has been added as part of this fix.

**Does the SW correctly ignore activation until the message arrives?**
Yes. The unconditional `self.skipWaiting()` call has been removed from the `install` event
handler in both `public/sw.js` and `dist/sw.js`. A `message` event listener has been added that
calls `self.skipWaiting()` only when `event.data?.type === 'SKIP_WAITING'`. The SW will not
self-activate on install — it waits for the explicit message from the app.

Changes applied to:
- `public/sw.js` — removed `self.skipWaiting()` from install handler; added message listener
- `dist/sw.js` — same changes applied to the deployed/built version
- `src/main.tsx` — added `newWorker.postMessage({ type: 'SKIP_WAITING' })` in the statechange
  handler, alongside the existing `sw-update-ready` dispatch

---

## Fix 2: googleAccessToken Storage Hygiene (HIGH)

**Does googleClientId remain in localStorage?**
Yes. `googleClientId` is part of the `settings` object that is serialized as part of the main
app state blob and saved to `localStorage` under the key `lifetracker-state`. The fix
explicitly omits only `googleAccessToken` from that blob before writing to `localStorage`.
`googleClientId` is untouched.

**Are all googleAccessToken reads and writes moved to sessionStorage?**
Yes. In `src/store.tsx`:

- `saveState()` now:
  1. Writes `state.settings.googleAccessToken` to `sessionStorage` under key `googleAccessToken`
  2. Destructures `googleAccessToken` out of `settings` before saving the rest of the state
     to `localStorage` — the token no longer appears in the localStorage blob

- `loadState()` now:
  1. Reads the main state blob from `localStorage` as before
  2. Reads `googleAccessToken` separately from `sessionStorage`
  3. Overlays the sessionStorage value onto `settings.googleAccessToken` in the returned state

Since sessionStorage is cleared when the browser session ends, the short-lived token will
no longer survive browser restarts.

**Were any other token-related keys accidentally moved?**
No. The only key moved is `googleAccessToken`. A grep of the codebase confirms no other
token-related localStorage accesses exist in `src/` beyond the centralised `saveState` /
`loadState` functions in `src/store.tsx`. The `googleClientId` key was not moved.

---

## Summary

| Check | Result |
|---|---|
| SKIP_WAITING posted from main.tsx before fix | No — added as part of fix |
| SW guards activation on message only | Yes |
| googleClientId remains in localStorage | Yes |
| googleAccessToken reads/writes moved to sessionStorage | Yes |
| Other token keys accidentally moved | None |
