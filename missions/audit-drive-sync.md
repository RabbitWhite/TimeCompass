# Drive Sync Audit — `syncToDrive` Call Sites

Audited files: `src/App.tsx`, `src/utils/driveSync.ts`  
Date: 2026-05-26

---

## Function definition

**`src/utils/driveSync.ts:97–104`**

```ts
export async function syncToDrive(
  token: string,
  state: object,
  existingFileId: string | null = null
): Promise<string | null> {
  if (!Array.isArray((state as any).focusAreas) || (state as any).focusAreas.length === 0) return null;
  return uploadBackup(token, state, existingFileId);
}
```

The function has one internal guard: it bails out (returns `null`) if `focusAreas` is not a non-empty array. Otherwise it delegates directly to `uploadBackup`.

---

## Call sites

### Call site 1 — `src/App.tsx:174`

```ts
const newFileId = await syncToDrive(token, s, driveFileId);
```

#### Trigger

A `visibilitychange` DOM event where `document.visibilityState === 'hidden'` (user tabs away, minimises the browser, locks the screen, etc.).  
The listener is registered inside a `useEffect` that re-runs only when `state.settings.driveBackupEnabled` or `dispatch` changes.

**Trigger type:** browser event (`visibilitychange`)

#### Conditions that must all be true before the call fires

| # | Condition | Where checked |
|---|-----------|---------------|
| 1 | `state.settings.driveBackupEnabled === true` | `useEffect` early return, `App.tsx:158` — if false the listener is never attached |
| 2 | `document.visibilityState === 'hidden'` | top of `handleVisibilityChange`, `App.tsx:161` |
| 3 | A valid Drive token exists in `sessionStorage` | `const token = getDriveToken(); if (!token) return;`, `App.tsx:162–163` |
| 4 | Local data is newer than the last Drive sync (`hasUnsavedDiff`) | `App.tsx:169–172` — either `driveLastSynced` is falsy, or `lastSavedTimestamp > driveLastSynced` |
| 5 | `state.focusAreas` is a non-empty array | inside `syncToDrive` itself, `driveSync.ts:102` — returns `null` without uploading if not |

#### Token check

**Yes** — an explicit token check is performed before the call.

Token is retrieved by `getDriveToken()` (`driveSync.ts:5–7`):

```ts
export function getDriveToken(): string | null {
  return sessionStorage.getItem('googleAccessToken');
}
```

The token lives in `sessionStorage` under the key `googleAccessToken`. It is written there by two paths:

- `App.tsx:474` — inside the Drive-recovery banner's restore button handler:  
  `sessionStorage.setItem('googleAccessToken', token)` (then also dispatched to Redux via `UPDATE_SETTINGS`)
- `App.tsx:145` / `App.tsx:215` — via Redux `UPDATE_SETTINGS` with `{ googleAccessToken: ... }`.  
  The store must persist this back to `sessionStorage`; `getDriveToken` reads directly from `sessionStorage`, not from Redux state.

If `getDriveToken()` returns `null` or an empty string, `handleVisibilityChange` returns early at `App.tsx:163` and `syncToDrive` is never reached.

#### Post-call behaviour

If `newFileId` is truthy, `App.tsx:176–180` dispatches `UPDATE_SETTINGS` with:
- `driveLastSynced`: current ISO timestamp
- `driveFileId`: the file ID returned by Drive

---

## Other files

No other file in `src/` imports or calls `syncToDrive`. The grep scan confirmed the only call site is `App.tsx:174`.

---

## Summary of risks / observations

1. **Single call path.** There is exactly one call site. All sync-on-save logic flows through the `visibilitychange` handler; there is no periodic sync interval and no explicit "save now" button.

2. **Token lives in sessionStorage only.** `getDriveToken` reads from `sessionStorage`, which is cleared when the tab is closed. If the user closes and reopens the tab, `getDriveToken` will return `null` even though `driveBackupEnabled` is `true`, which prevents the upload and triggers the reauth banner.

3. **No retry on failure.** If `syncToDrive` / `uploadBackup` returns `null` (network error, expired token mid-session), `driveLastSynced` is not updated. The next `visibilitychange` event will retry because `hasUnsavedDiff` will still be `true`.

4. **staleRef pattern.** The handler closes over `stateRef.current` (not `state`) to avoid stale-closure issues. This is correct, but it means the `driveBackupEnabled` guard is evaluated at `useEffect` registration time, not at event-fire time. If `driveBackupEnabled` is toggled off and back on, the effect re-registers correctly because it depends on `[state.settings.driveBackupEnabled, dispatch]`.

5. **Internal guard on empty state.** `syncToDrive` itself refuses to upload if `focusAreas` is empty (condition 5 above). This is a second layer of protection but is not surfaced as an error to the caller.
