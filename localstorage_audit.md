# localStorage Audit — src/store.tsx

Audit date: 2026-04-21  
Scope: every localStorage/sessionStorage read and write in the entire codebase.

---

## 1. Storage keys

| Constant | Value |
|---|---|
| `STORAGE_KEY` | `timecompass-state` |
| `LEGACY_STORAGE_KEY` | `lifetracker-state` |
| `SESSION_TOKEN_KEY` | `googleAccessToken` (sessionStorage only) |
| `SPLASH_SESSION_KEY` | `splash-shown` (sessionStorage, in SplashScreen.tsx) |

---

## 2. Every localStorage.setItem call

### 2a. Migration copy — `loadState`, line 48
```ts
localStorage.setItem(STORAGE_KEY, legacy);
```
Writes the raw string from `LEGACY_STORAGE_KEY` directly into `STORAGE_KEY` without parsing or validating it. If the legacy value is corrupt JSON, it copies the corruption into the new key. Runs only when `STORAGE_KEY` is absent (see §4).

### 2b. Normal save — `saveState`, line 93
```ts
localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, settings: otherSettings }));
```
Serialises the entire in-memory state (minus `googleAccessToken`) and overwrites `STORAGE_KEY`. Called from the `useEffect` in `AppProvider` on every state change, subject to the `loadFailed` guard (see §3).

**No other file calls `localStorage.setItem`.** Pages and components only call `dispatch`; they never touch localStorage directly.

---

## 3. Every localStorage.removeItem call

### 3a. Migration cleanup — `loadState`, line 49
```ts
localStorage.removeItem(LEGACY_STORAGE_KEY);
```
Deletes the old key immediately after copying it to the new key. This is a one-shot destructive operation — once it runs the legacy data is permanently gone from localStorage (though it now lives under `STORAGE_KEY`).

**No other `removeItem` call exists anywhere in the codebase.**  
**No `localStorage.clear()` call exists anywhere in the codebase.**

---

## 4. Migration logic — can it run more than once?

```ts
if (!localStorage.getItem(STORAGE_KEY)) {   // line 45
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}
```

The outer guard `!localStorage.getItem(STORAGE_KEY)` means migration only runs when `STORAGE_KEY` is absent. After the first successful migration, `STORAGE_KEY` exists, so the block is never entered again. **Migration cannot run more than once per device as long as `STORAGE_KEY` persists.**

**Edge case — re-entry risk:** If `STORAGE_KEY` is absent AND `LEGACY_STORAGE_KEY` is also absent (fresh install, or after manual key deletion), neither branch executes and migration is silently skipped. No data is written or lost.

**Edge case — corrupt legacy value:** If `LEGACY_STORAGE_KEY` contains malformed JSON it is still copied verbatim to `STORAGE_KEY`. `JSON.parse` will later throw on that value, setting `loadFailed = true` and leaving the corrupt string in localStorage untouched (the `loadFailed` guard prevents `saveState` from overwriting it). This is safe behaviour but silently propagates a corrupt value to the new key.

---

## 5. saveState — when is it called?

`saveState` is called from a single `useEffect` in `AppProvider`:

```ts
// store.tsx lines 212–216
useEffect(() => {
  if (!loadFailed) {
    saveState(state);
  }
}, [state]);
```

`saveState` runs synchronously after **every** state change (every dispatch), with one exception: if `loadFailed` is `true` the call is skipped entirely for the lifetime of the current page load.

`loadFailed` is a module-level `let` variable initialised to `false`. It is set to `true` in two places:
- Inner catch (JSON.parse failure), line 59
- Outer catch (unexpected error in loadState), line 82

`loadFailed` is **never reset to `false`**. Once set, saving is disabled for the rest of the session. A page reload is required to re-attempt loading and re-enable saving.

**saveState itself** has a bare `catch { /* ignore */ }` at line 94. If `JSON.stringify` or `localStorage.setItem` throws (e.g. QuotaExceededError), the failure is silently swallowed and the stored value is left at whatever it was before the failed write. There is no retry, no user notification, and no flag set.

---

## 6. HARD_RESET reducer case

```ts
// store.tsx lines 187–201
case 'HARD_RESET':
  return {
    ...state,
    timeEntries: [],
    calendarEvents: [],
    weeklyScores: [],
    walletTransactions: [],
    activeTracking: null,
    settings: {
      ...state.settings,
      walletBalance: 0,
      lastCreditedPeriodIndex: -1,
      periodResetDate: null,
    },
  };
```

`HARD_RESET` **does not touch localStorage directly**. It returns a new state object; `saveState` then writes that state to localStorage on the next render cycle (because `loadFailed` is `false` during a normal session). This means a `HARD_RESET` **intentionally and permanently overwrites** `STORAGE_KEY` with emptied arrays and zeroed wallet fields, while preserving `focusAreas`, `projects`, `weekTemplates`, and all other settings.

`HARD_RESET` is dispatched from a single place: the confirmation button in `App.tsx` line 464, behind a `showHardResetConfirm` gate.

**HARD_RESET preserves:** `focusAreas`, `projects`, `weekTemplates`, `settings.gamification`, `settings.googleClientId`, `settings.splashPhilosophyText`, and all other settings fields not explicitly zeroed.

**HARD_RESET clears:** `timeEntries`, `calendarEvents`, `weeklyScores`, `walletTransactions`, `activeTracking`, `walletBalance`, `lastCreditedPeriodIndex`, `periodResetDate`.

---

## 7. LOAD_STATE reducer case

```ts
// store.tsx lines 156–157
case 'LOAD_STATE':
  return action.payload;
```

This is a **full replacement** — it discards all current in-memory state and replaces it with the payload verbatim. `saveState` then persists the payload to localStorage on the next render cycle.

`LOAD_STATE` is dispatched from one place: the `importData` function in `App.tsx` lines 123–138:

```ts
const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string);
      if (data.focusAreas && data.timeEntries) {
        dispatch({ type: 'LOAD_STATE', payload: data });
      }
    } catch { /* invalid file */ }
  };
  reader.readAsText(file);
};
```

**Risk:** The only validation before dispatching `LOAD_STATE` is `data.focusAreas && data.timeEntries` — both properties simply need to be truthy. An import file that passes this check but contains empty arrays (`focusAreas: [], timeEntries: []`) would pass validation and silently replace all data with empty state, which `saveState` would then persist. There is no confirmation prompt, no backup of existing state, and no schema validation.

---

## 8. Can defaultState be saved back to localStorage?

**Current state (after the fix in this branch):** No. The `loadFailed` flag prevents `saveState` from running when `loadState` returned `defaultState` due to a parse or unexpected error.

**Remaining scenarios where defaultState IS correctly written to localStorage:**

| Scenario | Is the write correct? |
|---|---|
| First ever install (no stored data) — `loadState` returns `defaultState`, `loadFailed` is `false` | Yes — first write is expected |
| User dispatches `HARD_RESET` | Yes — intentional user action |
| User imports a file via `LOAD_STATE` that passes the `focusAreas && timeEntries` check but has empty arrays | **Potentially unintended** — see §7 |

**Scenario that no longer causes silent data loss (fixed):**

| Old scenario | Status |
|---|---|
| `JSON.parse` throws on corrupt stored value → `saveState(defaultState)` fires on next render | Fixed: `loadFailed = true` blocks the save |

---

## 9. sessionStorage usage

| Location | Key | Operation | Purpose |
|---|---|---|---|
| `store.tsx:90` | `googleAccessToken` | `setItem` | Persists short-lived OAuth token for session only |
| `store.tsx:63` | `googleAccessToken` | `getItem` | Reads token back during load |
| `SplashScreen.tsx:13` | `splash-shown` | `getItem` | Checks if splash was already shown this session |
| `SplashScreen.tsx:14` | `splash-shown` | `setItem` | Marks splash as shown for the rest of the session |

sessionStorage is never used for persistent app data. It cannot cause data loss across page reloads.

---

## 10. Files that do NOT touch localStorage

All source files outside `src/store.tsx` — including all pages (`Dashboard.tsx`, `FocusAreas.tsx`, `FocusAreaDetail.tsx`, `Timeline.tsx`, `Tracking.tsx`, `Statistics.tsx`, `WeekTemplates.tsx`), all components (`Modal.tsx`, `BottomNav.tsx`), `App.tsx`, `utils.ts`, `types.ts`, `main.tsx`, and `dist/sw.js` — contain **zero** `localStorage.setItem`, `localStorage.removeItem`, or `localStorage.clear` calls. The only localStorage writes in the entire codebase are in `src/store.tsx`.

---

## 11. Summary of data-loss risks

| Risk | Severity | Status |
|---|---|---|
| Corrupt JSON in `STORAGE_KEY` causes `saveState(defaultState)` to fire | Critical | **Fixed** — `loadFailed` guard blocks the write |
| Migration copies corrupt legacy JSON verbatim to new key | Low | Open — corrupt data is preserved, not lost; `loadFailed` guard prevents overwrite |
| `LOAD_STATE` import dispatched with empty arrays if file passes minimal validation | Medium | Open — no schema depth check, no pre-import backup, no confirmation |
| `saveState` silently swallows `QuotaExceededError` | Low | Open — write fails silently, stored state becomes stale; no user feedback |
| `loadFailed` is never reset; saving disabled for entire session after one error | Low | Open — requires page reload to recover; could be confusing if user tries to add data after a load error |
