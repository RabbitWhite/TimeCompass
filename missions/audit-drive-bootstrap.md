# Audit: Drive Bootstrap on Blank Load

**Date:** 2026-05-10  
**Scope:** `src/store.tsx`, `src/App.tsx`, `src/utils/driveSync.ts`, `index.html`

---

## 1. `writeRecoveryRecord` call order in `saveState`

**File:** `src/store.tsx` lines 112–126

```typescript
function saveState(state: AppState) {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, state.settings.googleAccessToken ?? '');
    const { googleAccessToken: _omit, ...otherSettings } = state.settings;
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({   // ← main state written first
      ...state,
      settings: otherSettings,
      lastSavedTimestamp: now,
    }));
    writeRecoveryRecord(state.settings.googleClientId, state.settings.driveBackupEnabled); // ← AFTER
  } catch { /* ignore */ }
}
```

**Finding:** CORRECT. `writeRecoveryRecord` is called **after** the main state is written to localStorage. Order is fine.

---

## 2. `defaultState.focusAreas` field name and blank-state value

**File:** `src/store.tsx` lines 8–41

```typescript
const defaultState: AppState = {
  focusAreas: [],   // ← line 9
  ...
};
```

**Finding:** The field is named `focusAreas` (not `areas` or anything else) and defaults to an empty array `[]`. The `isBlank` check in `App.tsx` (`state.focusAreas.length === 0`) will not throw and will evaluate to `true` on a blank load.

---

## 3. Field name used throughout the app

The array of focus areas is consistently named **`focusAreas`** everywhere. No alternative name (`areas`, `focusarea`, etc.) is used. Complete usage inventory:

| File | Line(s) | Usage |
|---|---|---|
| `src/types.ts` | 124 | `focusAreas: FocusArea[]` — type definition |
| `src/store.tsx` | 9 | `focusAreas: []` — defaultState |
| `src/store.tsx` | 86 | `loaded.focusAreas.length` — load log |
| `src/store.tsx` | 131 | `ADD_FOCUS_AREA` reducer |
| `src/store.tsx` | 133 | `UPDATE_FOCUS_AREA` reducer |
| `src/store.tsx` | 137 | `DELETE_FOCUS_AREA` reducer |
| `src/App.tsx` | 58, 72–73, 93 | `state.focusAreas` — memos and score save guard |
| `src/App.tsx` | 220 | `state.focusAreas.length === 0` — isBlank check |
| `src/App.tsx` | 286, 447 | import validation and data display |
| `src/pages/Dashboard.tsx` | 50–51, 55, 79, 198 | score calc, weekly target, empty state |
| `src/pages/FocusAreaDetail.tsx` | 12 | `state.focusAreas.find(...)` |
| `src/pages/FocusAreas.tsx` | 141, 226 | list render, empty state |
| `src/pages/Statistics.tsx` | 59, 62, 70, 74, 124, 144–150, 209, 218 | filters, score calc, chart |
| `src/pages/Timeline.tsx` | 283 | area selector |
| `src/pages/Tracking.tsx` | 92, 95, 145, 158, 164, 200 | area list render, empty state |
| `src/pages/WeekTemplates.tsx` | 13, 17, 56, 60, 72, 75, 196 | template builder |
| `src/utils.ts` | 79, 89, 214, 226, 251, 254 | `computeMaxWeekPoints`, `calculateWeeklyScore` |

**No mismatches.** The name is `focusAreas` throughout.

---

## 4. Bootstrap `useEffect` order in `src/App.tsx`

Effects in order of appearance:

| Line | Description | Dependency array |
|---|---|---|
| 92 | Save weekly score when `currentScore` changes | `[currentScore]` |
| 98 | Wallet period credit accumulation | `[state.weeklyScores, state.settings.lastCreditedPeriodIndex, ...]` |
| 122 | SW update event listener | `[]` |
| 128 | Sync `driveNeedsReauth` state when setting changes | `[state.settings.driveBackupEnabled]` |
| **186** | **Drive restore effect** (mount-only) — restores from Drive if token exists; calls `attemptSilentReauth` if not | `[]` |
| **219** | **Bootstrap blank-load recovery effect** (mount-only) — reads recovery record and calls `attemptSilentReauth` on blank state | `[]` |

**Finding:** The Drive restore effect (line 186) **does appear before** the bootstrap effect (line 219), and **both have empty `[]` dependency arrays**. React runs all effects after the same render in order, so the restore effect fires first. However: on a genuinely blank load, `state.settings.driveBackupEnabled` is `false` (defaultState), so the restore effect exits immediately on line 187 (`if (!state.settings.driveBackupEnabled) return;`). The bootstrap effect then runs independently. The ordering is logically sound.

**Secondary concern:** Both mount-only effects close over the initial `state` snapshot (at mount). If the first effect dispatches `LOAD_STATE` before the second effect's async callbacks complete, the second effect is still reading stale state. In the blank-load scenario this is not an issue because the restore effect bails out early, but if both effects could race (e.g., Drive enabled with no token), both would call `attemptSilentReauth` independently and whichever callback fires last would overwrite the earlier one.

---

## 5. GIS script load timing vs. `useEffect` mount

**File:** `index.html` line 12

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

The GIS script is loaded with **both `async` and `defer`**. With `async`, the script executes as soon as it is downloaded — there is **no guarantee** it will have executed before React's component tree mounts and `useEffect` callbacks fire.

React `useEffect` runs after the browser has painted the first frame (post-DOMContentLoaded). An `async` script may execute before or after DOMContentLoaded depending on network latency and the script's position in the HTML. Since the GIS script is loaded from a CDN, on slow connections or on first load (cold cache), it will very likely **not yet be executed** when both mount-only effects fire.

**Finding: `window.google` is NOT guaranteed to exist when `attemptSilentReauth` is called on mount. This is a real race condition.**

---

## 6. `attemptSilentReauth` behavior when `window.google` is undefined

**File:** `src/utils/driveSync.ts` lines 111–130

```typescript
export function attemptSilentReauth(
  clientId: string,
  scope: string,
  callback: (token: string | null) => void,
): void {
  if (!clientId) { callback(null); return; }
  try {
    const tokenClient = (window as any).google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope,
      prompt: '',
      callback: (response: any) => {
        callback(!response.error && response.access_token ? response.access_token : null);
      },
    });
    tokenClient?.requestAccessToken({ prompt: '' });
  } catch {
    callback(null);
  }
}
```

**When `window.google` is `undefined`:**

1. `(window as any).google?.accounts?.oauth2?.initTokenClient({...})` — optional chaining short-circuits; the `initTokenClient` call is never made; the object literal passed as an argument (which contains the `callback`) is evaluated but immediately discarded.
2. `tokenClient` is assigned `undefined`.
3. `tokenClient?.requestAccessToken({ prompt: '' })` — optional chaining short-circuits; no call is made.
4. No exception is thrown (optional chaining never throws).
5. **The `callback` is NEVER called** — not with a token, not with `null`.
6. The function returns silently.

**Finding: CRITICAL BUG.** When the GIS script has not yet loaded, `attemptSilentReauth` silently drops the callback. In the bootstrap effect (line 219), this means:
- `doRecovery(token)` never runs (no restore attempted).
- `setShowDriveRecoveryPrompt(true)` never runs (no fallback banner shown).
- The user sees a blank app with no indication that their Drive data could not be reached.

---

## Summary of Findings

| # | Item | Status | Severity |
|---|---|---|---|
| 1 | `writeRecoveryRecord` called after main state write in `saveState` | ✅ Correct | — |
| 2 | `defaultState.focusAreas` exists and is `[]`; `isBlank` check safe | ✅ Correct | — |
| 3 | Field name is `focusAreas` everywhere — no mismatches | ✅ Correct | — |
| 4 | Bootstrap effect (line 219) appears after Drive restore effect (line 186); both have `[]` deps | ✅ Correct order | — |
| 5 | GIS `<script async defer>` — no guarantee `window.google` exists at mount | ⚠️ Race condition | High |
| 6 | `attemptSilentReauth` silently drops callback when `window.google` is undefined | 🔴 Bug | Critical |

### Root Cause of Bootstrap Failure

On a blank load, the bootstrap `useEffect` calls `attemptSilentReauth`. If the GIS script (loaded `async`) has not yet executed, `window.google` is `undefined`. Due to optional chaining in `attemptSilentReauth`, the callback is never called — neither `doRecovery` nor `setShowDriveRecoveryPrompt(true)` fires. The app stays blank with no recovery banner and no error.

### Recommended Fix

In `attemptSilentReauth`, after the optional-chaining chain evaluates to `undefined` (i.e., `tokenClient` is `undefined` after `initTokenClient` call), call `callback(null)` to ensure the caller always receives a result:

```typescript
if (!tokenClient) { callback(null); return; }
```

This single guard added after the `initTokenClient` call ensures the fallback banner is shown when GIS is unavailable, rather than silently doing nothing. A more robust approach would also add a `window.onGoogleLibraryLoad` / `gsi/client` load-complete listener and retry, but the null-callback fix alone unblocks the recovery banner.

Additionally, the `isBlank` condition (`state.focusAreas.length === 0 || !state.settings.googleClientId`) will trigger recovery for any user missing a `googleClientId` even if they have data — this is a minor logic smell, though the subsequent `readRecoveryRecord()` guard limits actual harm.
