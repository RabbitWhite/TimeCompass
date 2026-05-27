# TimeCompass Git History Audit
**Generated:** 2026-03-22
**Audited by:** Claude (claude/fix-mobile-syncing-a0x4o)

---

## 1. Full Commit History (Chronological, Oldest → Newest)

| # | SHA (short) | Date | Author | Message |
|---|-------------|------|--------|---------|
| 1 | `cdb0760` | 2026-02-14 | Claude | feat: implement TimeCompass mobile app with full feature set |
| 2 | `1e2a4d2` | 2026-02-15 | Claude | feat: add gamification system with points, balance scoring, and streaks |
| 3 | `f6e1e53` | 2026-02-15 | Claude | docs: add technical documentation and developer's toolbook |
| 4 | `a9385f5` | 2026-02-16 | Claude | ci: add GitHub Pages deployment for mobile testing |
| 5 | `74a0d90` | 2026-02-16 | Claude | feat: make PWA installable with icons and service worker |
| 6 | `d08bb06` | 2026-02-16 | Claude | chore: ignore tsbuildinfo files |
| 7 | `7cf39f3` | 2026-02-16 | Claude | feat: add project selector to live tracking and CSV export |
| 8 | `cfae20e` | 2026-02-16 | Claude | feat: fix 404 on cache clear, add data backup, rename projects to realizations |
| 9 | `5fd88a1` | 2026-02-16 | Claude | fix: switch to branch-based GitHub Pages deployment |
| 10 | `4b0a129` | 2026-02-16 | Claude | fix: switch to official GitHub Pages deployment actions |
| 11 | `de20ee8` | 2026-02-17 | Claude | fix: PWA 404 after clearing browser history |
| 12 | `7c7710d` | 2026-02-17 | Claude | fix: precache all build assets in service worker for reliable offline |
| 13 | `c6e739a` | 2026-02-17 | Claude | fix: resolve mobile syncing issues with SW updates and stale sessions |
| 14 | `3f5fa66` | 2026-02-20 | RabbitWhite | Added graphics for the project. |
| 15 | `489d651` | 2026-02-20 | RabbitWhite | Merge branch 'claude/timecompass-mobile-app-xnOiw' (into same) |
| 16 | `412b652` | 2026-02-20 | Claude | feat: integrate custom graphics (icon, splash screen, background) |
| 17 | `3c36a32` | 2026-02-20 | Claude | fix: gate deploy job on main branch |
| 18 | `c4586f5` | 2026-02-20 | Claude | fix: also allow deploy from feature branch |
| 19 | `65b277b` | 2026-02-20 | Claude | fix: replace deploy-pages with direct gh-pages branch push |
| 20 | `935d50d` | 2026-02-20 | Claude | fix: replace all icon files with Icon.png |
| 21 | `da1da70` | 2026-02-20 | Claude | fix: generate properly-sized icons from Icon.png |
| 22 | `0c2d369` | 2026-02-20 | Claude | fix: remove white background fringe from PWA icons |
| 23 | `63083f7` | 2026-02-20 | Claude | chore: add missing icon-180x180-maskable.png |
| 24 | `b313fc6` | 2026-02-20 | Claude | fix: eliminate white icon edges by making icons fully opaque |
| 25 | `575da26` | 2026-02-20 | Claude | fix: add Google Identity Services script for Calendar OAuth |
| 26 | `20f8225` | 2026-02-22 | Claude | **feat: add week templates for flexible weekly planning** |
| 27 | `f31e84f` | 2026-02-22 | Claude | fix: make Daily Activity bars visible for past days |
| 28 | `10f6c51` | 2026-02-22 | Claude | Fix Daily Activity bar chart bars always rendering at 0 height |
| 29 | `9cc0d65` | 2026-02-25 | Claude | Improve week templates UX and add default realization for new focus areas |
| 30 | `86b0d4b` | 2026-02-25 | Claude | **Replace points-based gamification with financial (euro) reward system** ← KEY |
| 31 | `c3d03b8` | 2026-02-25 | Claude | **Add Rewards tab to bottom nav and update Dashboard reward card** ← KEY |
| 32 | `4efa8ba` | 2026-02-25 | Claude | Fix reward period end date display across timezone boundaries |
| 33 | `082f677` | 2026-02-25 | Claude | **Fix period index and week-within-period calculations for non-UTC timezones** ← KEY |
| 34 | `c61f406` | 2026-02-25 | Claude | Improve UI/UX: better contrast, larger text, increased spacing |
| 35 | `e236f7a` | 2026-02-25 | Claude | Fix CI: clear proxy settings to allow npm registry access |
| 36 | `f038b88` | 2026-02-25 | Claude | Fix deployment: bypass npm registry by building with tsc + CDN |
| 37 | `093854b` | 2026-02-26 | Claude | Fix blank app: resolve React instance split and stale service worker |
| 38 | `fe89b3b` | 2026-02-26 | Claude | Strengthen UI legibility: contrast, text sizes, spacing, bars, borders |
| 39 | `542a435` | 2026-02-26 | Claude | Improve legibility: purple-tinted text colors + broader size bumps |
| 40 | `a4543ae` | 2026-02-26 | Claude | Fix chip overflow, boost text to near-white, fix tiny inline font sizes |
| 41 | `a50edfd` | 2026-02-26 | Claude | fix(sw): serve cached app when GitHub Pages returns 404 + cache CDN libs |
| 42 | `7865546` | 2026-02-26 | Claude | fix(sw): precache images + fix deploy conflict between two sessions |
| 43 | `f06f574` | 2026-02-26 | Claude | fix(sw): resilient install, add .nojekyll, safe navigate fallback |
| 44 | `a16c184` | 2026-03-18 | Claude | fix(deploy): switch to official GitHub Actions Pages API |
| 45 | `c495383` | 2026-03-18 | Claude | fix(deploy): update configure-pages to v5, opt into Node 24 |
| 46 | `8ed6923` | 2026-03-21 | Claude | docs: add security and PWA health audit report |
| 47 | `4319723` | 2026-03-21 | RabbitWhite | **Merge pull request #1** from claude/fix-mobile-syncing-a0x4o → Main |
| 48 | `f7867fe` | 2026-03-21 | RabbitWhite | **⚠️ Revert "Claude/fix mobile syncing a0x4o"** ← THE REVERT |
| 49 | `b72500b` | 2026-03-21 | RabbitWhite | **Merge pull request #2** (revert PR) → Main |
| 50 | `d558668` | 2026-03-21 | Claude | fix(build): automate cache busting via git SHA in sw.js |
| 51 | `501ddc9` | 2026-03-21 | Claude | fix(timeline): handle Google Calendar 401 with clear user prompt |
| 52 | `b02cab9` | 2026-03-21 | Claude | fix: cache busting, calendar 401 handling, manifest id |
| 53 | `e64f113` | 2026-03-21 | Claude | build: regenerate dist with SHA-stamped cache and all assets |
| 54 | `7dabd53` | 2026-03-21 | Claude | fix: base href, deploy branch case sensitivity |
| 55 | `43e31c8` | 2026-03-21 | RabbitWhite | Merge pull request #4 |
| 56 | `2b02c45` | 2026-03-21 | Claude | chore: remove stale dist artifacts (pre-build cleanup) |
| 57 | `5c542f2` | 2026-03-21 | Claude | build: fix tsconfig, regenerate complete dist |
| 58 | `4478f03` | 2026-03-21 | Claude | docs: add deploy audit 2 findings |
| 59 | `98a3778` | 2026-03-21 | RabbitWhite | Merge pull request #5 |
| 60 | `00dd835` | 2026-03-21 | Claude | **restore: recover all files lost in revert b72500b** |
| 61 | `d54936d` | 2026-03-21 | Claude | fix(WeekTemplates): annotate Set<string> for tsconfig.cdn.json strictness |
| 62 | `b6d099a` | 2026-03-21 | RabbitWhite | Merge pull request #6 |
| 63 | `7095054` | 2026-03-21 | Claude | ci: deploy only from main branch, not feature branch |
| 64 | `e83cdd1` | 2026-03-21 | Claude | fix: correct branch trigger case to Main |
| 65 | `542c4f9` | 2026-03-21 | RabbitWhite | Merge pull request #7 |
| 66 | `2eefdf2` | 2026-03-21 | Claude | fix: correct branch trigger case to Main |
| 67 | `ea01666` | 2026-03-22 | Claude | docs: add AGENTS.md with project conventions |

**Note on branching:** `master` and `Main` diverged early. All active development happened on `claude/fix-mobile-syncing-a0x4o` → merged into `Main` via PRs. The branch `claude/timecompass-mobile-app-xnOiw` was the initial dev branch.

---

## 2. Reverted / Lost Commits

### The Revert Event

**Revert commit:** `f7867fe` — "Revert 'Claude/fix mobile syncing a0x4o'"
**Merged via:** PR #2 → `b72500b` on 2026-03-21 ~10:41 UTC+1
**What it undid:** All work from the entire `claude/fix-mobile-syncing-a0x4o` branch that had been merged in PR #1 (`4319723`).

This single revert wiped **64 files, 5,307 line deletions** — the largest destructive event in the repo's history. It included all the mobile-syncing fixes, **all euro/reward system code**, week templates, SplashScreen, icon scripts, and the rebuilt `dist/`.

### Recovery Attempt

**Restore commit:** `00dd835` — "restore: recover all files lost in revert b72500b"
**What it restored:** WeekTemplates.tsx, SplashScreen.tsx, FocusAreas.tsx, Statistics.tsx, Tracking.tsx, store.tsx, types.ts, App.css, App.tsx, main.tsx, icon scripts, dist/ assets, deploy.yml.
**What it did NOT restore (still missing today):**
- `src/utils.ts` — euro utility functions
- `src/pages/Gamification.tsx` — full euro reward UI
- `src/pages/Dashboard.tsx` — euro reward card
- `src/components/BottomNav.tsx` — "Rewards" tab

---

## 3. Files and Lines Affected by Each Lost Commit

### Commit `86b0d4b` — "Replace points-based gamification with financial (euro) reward system"
**Date:** 2026-02-25 08:52 UTC
**Files changed:** 4 files, +285 / -128 lines

#### `src/types.ts` — line 75 (1 line added)
```ts
// ADDED — currently present ✓ (restored by 00dd835)
monthlyRewardBudget: number;   // euros per 4-week period, 0 = disabled
```

#### `src/store.tsx` — line 22 (1 line added)
```ts
// ADDED — currently present ✓ (restored by 00dd835)
monthlyRewardBudget: 0,
```

#### `src/utils.ts` — lines 184–227 (44 lines added)
```ts
// ADDED — currently MISSING ✗
const PERIOD_ANCHOR_MS = new Date('2020-01-06T00:00:00.000Z').getTime();
const WEEK_MS = 7 * 24 * 3600 * 1000;
const PERIOD_MS = 4 * WEEK_MS;

export function getPeriodIndex(weekStart: Date): number { ... }
export function getPeriodDateRange(periodIndex: number): { start: Date; end: Date } { ... }
export function computeMaxWeekPoints(focusAreas, settings): number { ... }
export function pointsToEuros(actualPoints, maxWeekPoints, budget): number { ... }
export function formatEuros(amount: number): string { ... }
```

#### `src/pages/Gamification.tsx` — full rewrite (~367 lines modified)
The entire page was rewritten from an XP/level UI to a financial reward UI. Currently MISSING:
- `Monthly Reward` card with large `€X.XX earned this period` display
- Progress bar from €0 → budget cap
- Period date range and "Week X of 4" indicator
- `Total acquired (past periods)` tally
- `This Week` card now shows pts breakdown + per-week euro estimate in header
- `Past Periods` list showing € earned per period (grouped by 4-week block)
- Weekly history chart bars now sized in pixels (not %) and labelled with € when budget set
- Settings modal with `Monthly reward budget (€)` field at the top

---

### Commit `c3d03b8` — "Add Rewards tab to bottom nav and update Dashboard reward card"
**Date:** 2026-02-25 09:01 UTC
**Files changed:** 2 files, +38 / -19 lines

#### `src/components/BottomNav.tsx` — currently MISSING ✗
The Timeline tab (`/timeline`) was removed from the bottom nav and replaced with a Rewards tab (`/gamification`).

**Current state (wrong):**
```ts
{ path: '/timeline', label: 'Timeline', icon: '...' }
// no Rewards/gamification tab
```
**Should be:**
```ts
// Timeline tab removed
{ path: '/gamification', label: 'Rewards', icon: 'M19 5h-2V3H7v2H5...(trophy cup SVG)' }
```

#### `src/pages/Dashboard.tsx` — currently MISSING ✗
The reward card was changed from a level/XP display to a euro reward display, and the gating condition was relaxed.

**Current state (wrong):**
```ts
// import still uses getLevelFromPoints (old)
import { ..., getLevelFromPoints } from '../utils';
// gated on focus areas having targets (wrong)
{gamSettings.enabled && state.focusAreas.some(a => a.weeklyTargetHours > 0) && (
  <div className="dash-points-card" ...>
    <div className="dash-points-level">Lv.{level.level} {level.title}</div>
    <div className="dash-points-total">{Math.round(allTimePoints)} pts total</div>
    ...
    <div className="dash-points-week">+{currentScore.totalPoints}</div>
    <div className="dash-points-label">this week</div>
  </div>
)}
```
**Should be:**
```ts
// import uses euro helpers
import { ..., getPeriodIndex, getPeriodDateRange, computeMaxWeekPoints, pointsToEuros, formatEuros } from '../utils';
// always visible when gamification enabled (no focusAreas gate)
{gamSettings.enabled && (
  <div className="dash-points-card" ...>
    <div className="dash-points-level">Monthly Reward</div>
    <div className="dash-points-total">
      {budget > 0 ? `Period from ${periodStart.toLocaleDateString(...)}` : `${pts} pts this week`}
    </div>
    ...
    {budget > 0 ? (
      <>
        <div className="dash-points-week">€{formatEuros(currentPeriodEuros)}</div>
        <div className="dash-points-label">of €{formatEuros(budget)}</div>
      </>
    ) : (
      <>
        <div className="dash-points-week">{Math.round(currentScore.totalPoints)}</div>
        <div className="dash-points-label">pts this week</div>
      </>
    )}
  </div>
)}
```

---

### Commit `4efa8ba` — "Fix reward period end date display across timezone boundaries"
**Date:** 2026-02-25 11:38 UTC
**Files changed:** `src/utils.ts`, 1 line (in `getPeriodDateRange`)

```ts
// WRONG (original): end = start + 28 days - 1ms (shows same day as next period start in UTC+2)
const end = new Date(start.getTime() + PERIOD_MS - 1);

// CORRECT: end = start + 27 days (Sunday of week 4, non-overlapping Mon–Sun)
const end = new Date(start.getTime() + 27 * 24 * 3600 * 1000);
```
Currently MISSING ✗ (utils.ts euro functions are not present at all)

---

### Commit `082f677` — "Fix period index and week-within-period calculations for non-UTC timezones"
**Date:** 2026-02-25 12:02 UTC
**Files changed:** `src/utils.ts` (+14 lines), `src/pages/Gamification.tsx` (7 lines changed)

This was the **most feature-complete commit** for the euro/reward system.

#### `src/utils.ts` — timezone-safe `getPeriodIndex` + new `getWeekWithinPeriod` helper
```ts
// CORRECTED getPeriodIndex (uses noon UTC to avoid timezone boundary errors):
export function getPeriodIndex(weekStart: Date): number {
  const noonUTC = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 12);
  return Math.floor((noonUTC - PERIOD_ANCHOR_MS) / PERIOD_MS);
}

// NEW helper (also MISSING):
export function getWeekWithinPeriod(weekStart: Date, periodIndex: number): number {
  const periodStartDate = new Date(PERIOD_ANCHOR_MS + periodIndex * PERIOD_MS);
  const weekNoon = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 12);
  const periodNoon = Date.UTC(periodStartDate.getUTCFullYear(), periodStartDate.getUTCMonth(), periodStartDate.getUTCDate(), 12);
  return Math.min(4, Math.max(1, Math.floor((weekNoon - periodNoon) / WEEK_MS) + 1));
}
```

#### `src/pages/Gamification.tsx` — uses `getWeekWithinPeriod` instead of raw ms arithmetic
```ts
// WRONG (raw ms, timezone-unsafe):
const weekWithinPeriod = Math.floor(
  (currentWeekStart.getTime() - periodStart.getTime()) / (7 * 24 * 3600 * 1000),
) + 1;

// CORRECT (timezone-safe):
const weekWithinPeriod = getWeekWithinPeriod(currentWeekStart, currentPeriodIdx);
```

---

## 4. Changes Related to Points Tracking, Euro Currency, Scoring System

### Summary of the euro system (last seen at `082f677`, 2026-02-25 12:02 UTC)

The euro system converts accumulated weekly points to prize money using this formula:
```
earned = min(budget, (actualPoints / (maxWeekPoints × 4)) × budget)
```

**Key design:**
- Time is divided into rolling 4-week "periods" anchored to 2020-01-06 (a known Monday)
- Each period has a budget cap (`monthlyRewardBudget`, stored in `GamificationSettings`)
- `computeMaxWeekPoints()` calculates the theoretical maximum points per week from current focus area targets and point settings
- Streak bonus can push earnings above base max but is still capped at budget
- If budget = 0, the system falls back to displaying raw points (fully backwards-compatible)

**The formula functions in `src/utils.ts` (all currently missing):**

| Function | Purpose | Last seen |
|----------|---------|-----------|
| `getPeriodIndex(date)` | Maps a week-start date to its 4-week period index | `082f677` |
| `getPeriodDateRange(idx)` | Returns `{start, end}` Date objects for a period | `082f677` |
| `getWeekWithinPeriod(date, idx)` | Returns 1–4 (week number within period), timezone-safe | `082f677` |
| `computeMaxWeekPoints(areas, settings)` | Max achievable pts/week from current targets | `86b0d4b` |
| `pointsToEuros(pts, maxWeekPts, budget)` | Converts accumulated points to € amount | `86b0d4b` |
| `formatEuros(amount)` | Formats number as `de-DE` locale (e.g. `12,50`) | `86b0d4b` |

**Data model additions (currently present ✓):**
- `GamificationSettings.monthlyRewardBudget: number` (`src/types.ts:75`) — restored by `00dd835`
- `defaultState.gamificationSettings.monthlyRewardBudget: 0` (`src/store.tsx:22`) — restored by `00dd835`

---

## 5. Current State vs Most Feature-Rich Point

The most feature-rich state for the euro/reward system was at commit `082f677` (2026-02-25 12:02 UTC).

### Gap Analysis: What Exists in History but is Missing Now

| File | Feature in history | Current state | Status |
|------|--------------------|---------------|--------|
| `src/utils.ts` | `getPeriodIndex`, `getPeriodDateRange`, `getWeekWithinPeriod`, `computeMaxWeekPoints`, `pointsToEuros`, `formatEuros` (lines 184–246 at `082f677`) | None of these functions exist | **MISSING** |
| `src/pages/Gamification.tsx` | Full euro UI: Monthly Reward card, period progress bar, week-within-period indicator, total acquired tally, Past Periods list, euro-labelled history chart, budget settings field (482 lines at `082f677`) | Old points/level UI (371 lines), no euro display anywhere | **MISSING** |
| `src/pages/Dashboard.tsx` | Euro reward card: shows `€X.XX of €budget`, period start date, trophy cup icon, always visible when gamification enabled | Old level card: shows `Lv.X Title`, `N pts total`, hidden unless focus areas have targets | **MISSING** |
| `src/components/BottomNav.tsx` | Rewards tab (trophy cup icon, `/gamification`) replacing Timeline tab | Timeline tab (`/timeline`), no Rewards/gamification tab | **MISSING** |
| `src/types.ts` | `monthlyRewardBudget: number` in `GamificationSettings` | Present ✓ | **OK** |
| `src/store.tsx` | `monthlyRewardBudget: 0` default | Present ✓ | **OK** |

### What was correctly restored by `00dd835`

The restore commit successfully recovered all of the following:
- `src/pages/WeekTemplates.tsx` (entire file, 406 lines)
- `src/components/SplashScreen.tsx` (entire file, 31 lines)
- `src/pages/FocusAreas.tsx` (21 lines of changes)
- `src/pages/Statistics.tsx` (10 lines)
- `src/pages/Tracking.tsx` (20 lines)
- `src/store.tsx` (28 lines — including `monthlyRewardBudget` default)
- `src/types.ts` (29 lines — including `monthlyRewardBudget` field)
- `src/App.tsx`, `src/App.css`, `src/main.tsx`
- All `scripts/` icon generation scripts
- All `public/` and `dist/` assets
- `deploy.yml` workflow

### What was NOT restored (the gap)

The restore commit's own stat listing confirms these four files were not touched:
- `src/utils.ts` ← 46 lines of euro helper functions not restored
- `src/pages/Gamification.tsx` ← reverted to old 371-line points/level version
- `src/pages/Dashboard.tsx` ← reverted to old level card
- `src/components/BottomNav.tsx` ← Timeline tab back, Rewards tab gone

---

## Conclusion

The user's suspicion is confirmed. **The euro/reward system was fully implemented across 4 commits between 2026-02-25 08:52 and 12:02 UTC**, representing the most feature-complete state of the points/reward system. The March 21 revert (`f7867fe`) wiped it, and the subsequent restore (`00dd835`) recovered everything *except* the four files listed above.

**Nothing has been changed or restored.** This is a read-only audit. To restore the missing functionality, the changes from commits `86b0d4b`, `c3d03b8`, `4efa8ba`, and `082f677` need to be re-applied to those four files.
