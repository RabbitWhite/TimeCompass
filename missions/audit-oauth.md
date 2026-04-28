# OAuth / Google Authentication Audit

**Date:** 2026-04-28  
**Scope:** All OAuth and Google Identity Services code in the Lifetracker (Time Compass) repo

---

## Files Containing OAuth Logic

| File | Role |
|------|------|
| `index.html:12` | Loads the Google Identity Services (GIS) script from `https://accounts.google.com/gsi/client` |
| `src/pages/Timeline.tsx:80–127` | `syncGoogle()` — triggers OAuth token request for Calendar + Drive scopes; handles 401 |
| `src/App.tsx:117–132` | `reauthDrive()` — triggers re-auth when Drive backup needs reconnection |
| `src/App.tsx:170–183` | Mount effect — restores data from Drive if token is present on startup |
| `src/App.tsx:113–115` | Effect — detects missing token and sets `driveNeedsReauth` banner |
| `src/store.tsx:42–108` | `loadState()` / `saveState()` — controls where token is read from / written to |
| `src/utils/driveSync.ts:5–7` | `getDriveToken()` — single source of truth for reading the stored token |

---

## 1. Token Storage

### Access Token
- Stored in **`sessionStorage`** under the key `'googleAccessToken'`.
- Written by `saveState()` in `src/store.tsx:98`:  
  ```ts
  sessionStorage.setItem('googleAccessToken', state.settings.googleAccessToken ?? '');
  ```
- Read back into state by `loadState()` at `src/store.tsx:67`:  
  ```ts
  const googleAccessToken = sessionStorage.getItem('googleAccessToken') ?? '';
  ```
- Intentionally **excluded** from `localStorage` — `saveState()` destructures it out before serialising (`src/store.tsx:100`).
- All Drive API consumers read it via `getDriveToken()` in `src/utils/driveSync.ts:5`.

### Refresh Token
- **Not stored anywhere.** The app uses the GIS **token (implicit) flow** via `google.accounts.oauth2.initTokenClient`, which issues short-lived access tokens only and does not provide refresh tokens.

### Other Auth State
- `googleClientId` — stored in `localStorage` as part of the main app state blob.
- `googleCalendarConnected` — boolean flag in `localStorage`; indicates whether the user previously authorised Calendar access.

---

## 2. Silent Re-authentication on App Startup

**There is no silent re-authentication.**

On mount, `App.tsx:113–115` checks:
```ts
setDriveNeedsReauth(state.settings.driveBackupEnabled && !getDriveToken());
```
If the token is absent (e.g. after a page refresh, since `sessionStorage` is cleared), the app shows a **"Drive backup needs reconnection"** banner. The user must click "Sign in" to trigger a new GIS `requestAccessToken()` popup — no automatic re-auth occurs.

There is also a mount effect (`App.tsx:170–183`) that, if Drive backup is enabled **and a token already exists** in sessionStorage, automatically fetches the remote backup and restores it if newer than local state. This is a data-sync step, not an authentication step.

---

## 3. Token Expiry Handling

**There is no proactive expiry check and no automatic refresh.**

- GIS access tokens typically expire in 1 hour. The app does not track or check the expiry time.
- The only reactive handling is in `Timeline.tsx:99–103`: if a Google Calendar API call returns **HTTP 401**, the token is cleared and the user is alerted to reconnect:
  ```ts
  if (res.status === 401) {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { googleAccessToken: '', googleCalendarConnected: false } });
    alert('Google Calendar session expired — please reconnect.');
  }
  ```
- Drive API calls in `src/utils/driveSync.ts` have **no 401 handling** — they silently return `null` on any error.
- `checkDriveScope()` in `driveSync.ts:9–18` can call the `tokeninfo` endpoint to verify scope validity, but it is not wired up to a polling loop or expiry timer.
- Because the token lives in `sessionStorage`, it is automatically discarded on tab/window close, providing natural expiry isolation between browser sessions.

---

## Summary of Findings

| Concern | Finding |
|---------|---------|
| Access token storage | `sessionStorage` (cleared on tab close) |
| Refresh token storage | None — implicit flow, no refresh tokens issued |
| Client ID storage | `localStorage` (persists across sessions) |
| Silent re-auth on startup | No — shows banner, requires user action |
| Automatic token refresh | No — no refresh mechanism exists |
| Expiry check | No proactive check; reactive 401 handling only in Calendar sync path |
| Drive 401 handling | Missing — errors silently swallowed |
| OAuth library | Google Identity Services (`gsi/client`), token (implicit) flow |

### Security Notes
1. Using `sessionStorage` for the access token is better than `localStorage` (shorter lifetime, not accessible to other tabs), but the token is still readable by any same-origin JavaScript.
2. The absence of refresh tokens means users are frequently prompted to re-authorise, but also limits the blast radius of a token leak.
3. Drive sync errors are silently ignored — a revoked or expired token during a background sync will fail without user feedback beyond the "needs reconnection" banner on next load.
4. The `checkDriveScope` utility exists but is never called in the active code paths, leaving scope validation unused.
