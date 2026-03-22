# Lifetracker UX Redesign — Implementation Plan

## Codebase Snapshot

- **utils.ts** — pure helpers + gamification math + period utilities (`getPeriodIndex`, `getPeriodDateRange`, `getWeekWithinPeriod`). No period-aware "catch-up" function yet.
- **BottomNav.tsx** — 5 tabs: Home `/`, Areas `/areas`, Track `/track`, Stats `/stats`, Rewards `/gamification`.
- **App.tsx** — routes for all pages; gear button opens Data Management modal only; no gamification settings.
- **Tracking.tsx** — tracker banner, quick-start buttons, weekly allocation editor (with progress bars + templates link), today's log list, manual entry modal.
- **Dashboard.tsx** — welcome header, active tracking banner, 3 stat cards (today/week/target), euro reward card, per-area weekly progress bars, upcoming calendar events list. No standalone streak display.
- **Statistics.tsx** — period selector, area filter, 4 summary stat cards, pie chart, actual vs target bars (week only), daily bar chart. No gamification content.
- **FocusAreas.tsx** — area cards tap → navigate to `/areas/:id`. Cards show project count badge, weekly progress bar. Edit area via pencil button → modal.
- **FocusAreaDetail.tsx** — separate route `/areas/:id`; shows area info, projects list, project add/edit modal. All CRUD via dispatch.
- **Gamification.tsx** — settings modal, current period reward card, this-week score breakdown, per-area progress bars, past periods table, weekly history chart. Contains the only `SAVE_WEEKLY_SCORE` dispatch (`useEffect` on `currentScore`).

---

## Risks & Ambiguities

1. **`SAVE_WEEKLY_SCORE` dispatch lives only in Gamification.tsx** — deleting it without moving this `useEffect` will stop scores being persisted. Must move to App.tsx before deletion.
2. **Default route conflict** — brief says "Update App.tsx default route from `/` to `/track`." Dashboard currently lives at `/`. Two options: (a) keep Dashboard at `/` labeled "Status" in nav and add `<Navigate to="/track" />` as index; (b) move Dashboard to `/status` and make `/` redirect. **Decision needed: should Dashboard move to `/status` or stay at `/`?** Plan assumes option (b): Dashboard moves to `/status`, root `/` redirects to `/track`.
3. **Stats sort uses `getCatchUpAreas` (current period) but displayed data may be from a different period selector** — areas in "Last Week" view will be ordered by current-period standing, not last-week standing. Brief says "consistent ranking logic"; treating this as intentional.
4. **`getCatchUpAreas` `settings` param** — not mathematically needed for period-completion %; included as per spec. Will accept but not use it beyond type consistency.
5. **Period target prorating** — `getCatchUpAreas` will use full 4-week target as denominator (consistent with existing `periodProgressPct` in Gamification.tsx). Early in a period all areas appear far behind; acceptable per existing behaviour.
6. **"Streak count" removal from Dashboard** — streak is computed in Dashboard.tsx for gamification but never rendered as a visible element. Removal is a no-op on display; the computed `previousStreak` / `currentScore` variables can be deleted along with the stats cards.
7. **FocusAreaDetail.tsx** — brief does not say to delete the file, only to remove the separate route and inline the functionality. Plan: route removed from App.tsx; file left in place but orphaned (can be cleaned up later).
8. **`/gamification` route** — stays in App.tsx until Gamification.tsx is deleted in step 8; removed at that point.
9. **Actual vs Target chart in Stats** — currently only shown for `this_week` / `last_week`. Brief says keep it; no change to that condition.
10. **`getCatchUpAreas` gap value** — brief says "time behind target"; return `Math.max(0, periodTargetMinutes - actualMinutes)` so completed areas show 0 gap.

---

## New Type / Function Spec

### `getCatchUpAreas` (utils.ts)

```
getCatchUpAreas(
  focusAreas: FocusArea[],
  timeEntries: TimeEntry[],
  settings: GamificationSettings,
  n: number
): Array<{ area: FocusArea; gapMinutes: number }>
```

- Determine current period via `getPeriodIndex(getWeekStart())` → `getPeriodDateRange(idx)`
- For each area with `weeklyTargetHours > 0`: sum `timeEntries` within `[period.start, period.end]`
- `pct = actualMinutes / (area.weeklyTargetHours * 4 * 60)`
- Sort ascending by `pct`; return first `n` with `gapMinutes = Math.max(0, target - actual)`
- Areas with `weeklyTargetHours === 0` excluded

---

## Implementation Plan (file by file)

---

### 1. `utils.ts`

- Add import of `GamificationSettings` to the existing type import line (already imported).
- Add `getCatchUpAreas` pure function after the existing period utilities block.
- Export it.
- No other changes.

---

### 2. `BottomNav.tsx`

- Replace `tabs` array with new 5-tab definition:

| # | Label | Path | Icon |
|---|-------|------|------|
| 1 | Track | `/track` | clock icon (existing) |
| 2 | Status | `/status` | home/dashboard icon |
| 3 | Calendar | `/timeline` | calendar icon |
| 4 | Stats | `/stats` | bar chart icon (existing) |
| 5 | Areas | `/areas` | globe/circle icon (existing) |

- Remove Rewards tab (`/gamification`).
- Update `isActive`: `/track` and `/areas` already use `startsWith`; `/status` needs exact or `startsWith('/status')`; `/timeline` uses `startsWith`.
- Remove the special-case exact match for `/` (no longer a tab path).

---

### 3. `App.tsx`

- Add state: `showGamSettings`, `editSettings` (mirrors Gamification.tsx pattern).
- Add `useEffect` for `SAVE_WEEKLY_SCORE` (moved from Gamification.tsx) — needs `calculateWeeklyScore`, `getWeekStart`, `getPeriodIndex`, `computeMaxWeekPoints` imports and `previousStreak` computation.
- Add gamification settings modal JSX (full copy from Gamification.tsx `showSettings` modal, rewired to new state vars).
- Change gear button to open gamification settings; move data management to a separate small "data" icon button or add it as a second option — **decision**: add a second button (download icon) for data management; gear opens gamification settings.
- Routes changes:
  - Change `<Route path="/" element={<Dashboard />} />` → `<Route path="/" element={<Navigate to="/track" replace />} />`
  - Add `<Route path="/status" element={<Dashboard />} />`
  - Remove `<Route path="/gamification" element={<Gamification />} />` (keep until step 8, remove here for cleanliness since nav no longer links to it)
  - Keep `<Route path="/areas/:id" element={<FocusAreaDetail />} />` until FocusAreas inline expansion is done in step 7; remove in step 7.
- Add imports: `Navigate` from react-router-dom, gamification utils, `GamificationSettings` type.
- Remove `Gamification` import (or leave and remove in step 8).

---

### 4. `Tracking.tsx`

- **Remove**:
  - `showAllocation` state + `openAllocation` / `saveAllocations` / `allocations` state
  - `weekEntries` computation
  - Weekly Allocation section header + per-area allocation bars + total target line
  - Templates button
  - Today's Log section header + `todayEntries` list
  - Allocation editor modal
  - `isThisWeek`, `getWeekStart` imports (unused after removal)
- **Keep**: tracker banner, `formatElapsed`, quick-start buttons, manual entry modal, `elapsed` state/timer.
- **Add**:
  - Import `getCatchUpAreas` from utils, import `getPeriodIndex`, `getPeriodDateRange`, `getWeekStart` (for period computation inside getCatchUpAreas — but getCatchUpAreas is self-contained, so only import `getCatchUpAreas`).
  - Import `GamificationSettings` — actually `getCatchUpAreas` takes `settings`; pass `state.settings.gamification`.
  - Compute `catchUpAreas = getCatchUpAreas(state.focusAreas, state.timeEntries, state.settings.gamification, 3)`.
  - Render "Catch Up" section below Quick Start:
    - Section header "Catch Up"
    - For each `{ area, gapMinutes }`: show area name (with colour dot) + formatted gap time behind (`formatDuration(gapMinutes)` + " behind")
    - If all areas on track (gapMinutes === 0 for all 3), show "All areas on track" message.
    - Only render section if `catchUpAreas.length > 0`.
- Move `+ Manual` button into Quick Start section header (or keep below Catch Up); keep it accessible.
- Keep manual entry modal unchanged.

---

### 5. `Dashboard.tsx`

- **Remove**:
  - `dash-summary` stat cards block (today / this week / target)
  - `areaHours` computation
  - Weekly Progress section (section header + per-area bars)
  - `upcomingEvents` computation
  - Upcoming events section
  - `isThisWeek`, `formatTime`, `formatDate` imports if unused after removal
  - `todayEntries`, `todayMinutes`, `totalMinutes`, `totalTarget`, `weekEntries` variables
  - `streak`-related variables (`previousStreak`, `currentScore`) — these exist but are only used for euro card; keep if euro card is kept (it is)
- **Keep**: active tracking banner, euro reward card (`gamSettings.enabled` block).
- **Add**:
  - Period total time vs target progress bar.
  - Compute: `periodEntries = state.timeEntries` filtered to current period date range using `getPeriodDateRange(getPeriodIndex(getWeekStart()))`.
  - `periodActualMinutes = periodEntries.reduce(...)`.
  - `periodTargetMinutes = state.focusAreas.reduce((s, a) => s + a.weeklyTargetHours * 4 * 60, 0)`.
  - `periodPct = periodTargetMinutes > 0 ? Math.min(1, periodActualMinutes / periodTargetMinutes) : 0`.
  - Render: section header "Period Progress", single bar track + fill, label showing `formatDuration(periodActualMinutes)` / `formatDuration(periodTargetMinutes)`.
- Remove `navigate` import if no longer used (euro card currently has `onClick={() => navigate('/gamification')}` — change to remove or point to `/stats`).
- The `dash-welcome` header (date display) — brief doesn't mention removing it; keep.

---

### 6. `Statistics.tsx`

- **Remove**: `stats-grid` block (4 stat cards: total time, sessions, avg/day, avg session). Keep variables if used elsewhere — `totalMinutes`, `entryCount`, `avgPerDay` are only used in the stat cards; remove them too.
- **Change sort order** of `areaBreakdown`:
  - Currently: `sort((a, b) => b.minutes - a.minutes)` (highest minutes first).
  - New: sort by lowest period-completion percentage first.
  - Compute `catchUpOrder = getCatchUpAreas(state.focusAreas, state.timeEntries, state.settings.gamification, state.focusAreas.length)` — returns all areas sorted by lowest period %.
  - Use index in `catchUpOrder` to sort `areaBreakdown`. Areas with no entries still appear at end.
  - Import `getCatchUpAreas`.
- **Add gamification historical content** (moved from Gamification.tsx):
  - Add all required imports: `calculateWeeklyScore`, `getWeekStart`, `getPeriodIndex`, `getPeriodDateRange`, `getWeekWithinPeriod`, `computeMaxWeekPoints`, `pointsToEuros`, `formatEuros`, `getWeekLabel`.
  - Add required state: `previousStreak` (useMemo), `currentScore` (useMemo), `currentPeriodIdx`, `maxWeekPts`, `currentPeriodPoints`, `currentPeriodEuros`, `periodProgressPct`, `pastPeriods`, `totalAcquiredEuros`, `budget`.
  - **Do NOT add `SAVE_WEEKLY_SCORE` dispatch here** — that lives in App.tsx.
  - Sections to add at bottom of Statistics view (below daily chart, above empty state):
    1. **This Week score breakdown** — `score-card` with achievement/balance/streak/total rows (from Gamification.tsx "This Week" block).
    2. **Past Periods table** — existing JSX from Gamification.tsx.
    3. **Weekly History bar chart** — existing JSX from Gamification.tsx.
  - Wrap all three sections in `{gamSettings.enabled && (...)}`.
  - Add `const gamSettings = state.settings.gamification;` at top of component.
  - The Actual vs Target chart currently shows only for `this_week` / `last_week` periods. Keep this condition.

---

### 7. `FocusAreas.tsx`

- **Remove**:
  - `useNavigate` import and `navigate` call
  - `isThisWeek`, `formatDuration` imports (used only in progress bar; remove)
  - `weekMins` computation in area map
  - Progress bar `div` (bar-track + bar-fill)
  - `formatDuration(weekMins) this week` from card subtitle
  - Project count badge from subtitle (brief says remove; current subtitle shows `{projects.length} realization(s) • {formatDuration(weekMins)} this week`)
- **Add expanded area state**:
  - `const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null)`
  - Toggle: clicking an area card (not the edit button) sets `expandedAreaId` or collapses.
- **Add inline project CRUD state** (from FocusAreaDetail.tsx):
  - `showProjectForm`, `editingProject`, `pName`, `pDesc`, `pGithub`, `pTrello`, `pStatus` states
  - `openNewProject(areaId)`, `openEditProject(project)`, `saveProject()` functions
- **Add inline weekly target editing**:
  - When expanded, show an editable `input[type=number]` for `weeklyTargetHours` that dispatches `UPDATE_FOCUS_AREA` on change/blur.
  - Or use local state + save button — simpler to avoid dispatching on every keystroke.
- **Expanded area panel** renders below area card header:
  - Weekly target hours editable field
  - Projects list (from FocusAreaDetail project cards JSX)
  - "+ Add Realization" button
  - Project add/edit modal (same as FocusAreaDetail)
- **Add "Manage Templates" button**:
  - Add `useNavigate` back (for templates only)
  - Button at top of page (or bottom of area list) navigating to `/templates`
- **Area card `onClick`**: change from `navigate('/areas/${area.id}')` to `setExpandedAreaId(id => id === area.id ? null : area.id)`.
- Keep existing area create/edit modal unchanged.
- Remove the `projects.length` count from area card subtitle entirely (brief: "Remove... project count badges").

---

### 8. Delete `Gamification.tsx`

- Prerequisites: all content redistributed (settings modal → App.tsx, historical content → Statistics.tsx, `SAVE_WEEKLY_SCORE` → App.tsx).
- Remove `import Gamification from './pages/Gamification'` from App.tsx.
- Remove `<Route path="/gamification" ...>` from App.tsx (if not already done in step 3).
- Delete `src/pages/Gamification.tsx`.
- Verify no remaining imports of Gamification elsewhere.

---

### 9. Final check — `WeekTemplates.tsx`

- Confirm no changes to file itself.
- Confirm `/templates` route still present in App.tsx — it is (`<Route path="/templates" element={<WeekTemplates />} />`).
- Confirm WeekTemplates is no longer in BottomNav (removed in step 2).
- Confirm "Manage Templates" button in FocusAreas navigates to `/templates`.
- Confirm `/templates` route is not listed in any nav component.

---

## Decisions Needed Before Starting

1. **Dashboard route**: move to `/status` (recommended, cleaner) or keep at `/` with only redirect for fresh load?
2. **Header buttons in App.tsx**: single gear for gamification settings + separate icon for data management, or a combined settings panel? (Recommended: separate buttons — gear = gamification settings, download icon = data management, same as now.)
3. **`getCatchUpAreas` gap calculation**: use full 4-week period target or prorate by elapsed weeks? (Recommended: full period target, consistent with existing Gamification.tsx.)
4. **Stats sort**: apply `getCatchUpAreas` ordering even when stats period selector is not the current period? (Recommended: yes, per brief's "consistent ranking" requirement.)
5. **FocusAreaDetail.tsx file**: delete or leave orphaned after route removal? (Recommended: leave for now, delete in a follow-up cleanup.)
