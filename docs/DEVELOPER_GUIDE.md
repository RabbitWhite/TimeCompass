# LifeTracker Developer's Toolbook

A practical guide for updating content, settings, and behavior of the LifeTracker app.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [File Map](#2-file-map)
3. [Adding & Editing Focus Area Icons](#3-adding--editing-focus-area-icons)
4. [Adding & Editing Focus Area Colors](#4-adding--editing-focus-area-colors)
5. [Changing Default Settings](#5-changing-default-settings)
6. [Modifying Gamification Parameters](#6-modifying-gamification-parameters)
7. [Adding a New Data Field to an Entity](#7-adding-a-new-data-field-to-an-entity)
8. [Adding a New Action to the Store](#8-adding-a-new-action-to-the-store)
9. [Adding a New Page / Route](#9-adding-a-new-page--route)
10. [Updating the Timeline Time-Window Options](#10-updating-the-timeline-time-window-options)
11. [Google Calendar Integration Setup](#11-google-calendar-integration-setup)
12. [Editing the Level System](#12-editing-the-level-system)
13. [Styling & Theming](#13-styling--theming)
14. [localStorage & Data Migration](#14-localstorage--data-migration)
15. [Common Patterns & Recipes](#15-common-patterns--recipes)

---

## 1. Project Setup

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (hot-reload)
npm run build        # TypeScript check + production build to dist/
npm run preview      # Serve the production build locally
```

**Dependencies:** React 18, react-router-dom 6, Vite 5, TypeScript 5. No other runtime libraries.

---

## 2. File Map

```
src/
├── main.tsx              ← Entry point (StrictMode, BrowserRouter, AppProvider)
├── App.tsx               ← Root layout: header, Routes, BottomNav
├── App.css               ← All styles (single file, CSS custom properties)
├── types.ts              ← All interfaces, action types, constants
├── store.tsx             ← React Context + useReducer state management
├── utils.ts              ← Date helpers, scoring engine, icon SVGs
├── vite-env.d.ts         ← Vite type declarations
├── components/
│   ├── BottomNav.tsx      ← 5-tab navigation bar
│   └── Modal.tsx          ← Reusable bottom-sheet modal
└── pages/
    ├── Dashboard.tsx      ← Home screen with widgets
    ├── FocusAreas.tsx     ← Focus area CRUD listing
    ├── FocusAreaDetail.tsx ← Single area detail + project CRUD
    ├── Timeline.tsx       ← Calendar event viewer + Google sync
    ├── Tracking.tsx       ← Live stopwatch + manual entries
    ├── Statistics.tsx     ← Charts and stats
    └── Gamification.tsx   ← Points, levels, scores
```

---

## 3. Adding & Editing Focus Area Icons

Icons are defined in two places that must stay in sync:

### a) Icon name list (for the picker UI)

**File:** `src/types.ts`, line ~113

```typescript
export const AREA_ICONS = [
  'code', 'camera', 'book', 'music', 'brush', 'fitness',
  'science', 'travel', 'food', 'film', 'game', 'chat',
  'heart', 'star', 'bolt', 'globe',
];
```

Add your new icon name to this array.

### b) SVG path data (for rendering)

**File:** `src/utils.ts`, function `getIconSvg()` (~line 180)

```typescript
const icons: Record<string, string> = {
  code: 'M9.4 16.6L4.8 12l4.6...',
  // ...add your icon here:
  myicon: 'M12 2C6.48 2 2 6.48...',
};
```

The value is the `d` attribute of an SVG `<path>` element inside a `viewBox="0 0 24 24"` container. Get paths from [Material Design Icons](https://fonts.google.com/icons) or any 24x24 SVG icon set.

**Steps:**
1. Add the icon name string to `AREA_ICONS` in `types.ts`
2. Add the matching `name: 'svg-path-d'` entry in `getIconSvg()` in `utils.ts`
3. The icon automatically appears in the color/icon picker when creating or editing focus areas

---

## 4. Adding & Editing Focus Area Colors

**File:** `src/types.ts`, line ~119

```typescript
export const AREA_COLORS = [
  '#6c63ff', '#ff6584', '#43b88c', '#f5a623', '#4fc3f7',
  '#ab47bc', '#ef5350', '#66bb6a', '#ffa726', '#26c6da',
  '#ec407a', '#7e57c2', '#29b6f6', '#9ccc65', '#ff7043',
  '#78909c',
];
```

Add, remove, or replace hex color strings. These appear in the color grid when creating/editing focus areas. No other files need updating.

---

## 5. Changing Default Settings

**File:** `src/store.tsx`, `defaultState` object (~line 6)

```typescript
const defaultState: AppState = {
  focusAreas: [],
  projects: [],
  timeEntries: [],
  calendarEvents: [],
  activeTracking: null,
  settings: {
    timeWindowDays: 7,                    // Default timeline window
    googleCalendarConnected: false,
    googleAccessToken: '',
    googleClientId: '',
    gamification: {
      pointsPerTargetHour: 10,            // Points per target hour achieved
      balanceBasePoints: 20,              // Balance bonus per area
      streakBonusPoints: 15,             // Streak bonus per consecutive week
      enabled: true,                      // Gamification on/off
    },
  },
  weeklyScores: [],
};
```

Changes here affect **new installations only**. Existing users have state persisted in localStorage; see [Section 14](#14-localstorage--data-migration) for migration.

**Note:** The `loadState()` function deep-merges stored state with `defaultState`, so adding a new field with a default value will automatically populate it for existing users without data loss.

---

## 6. Modifying Gamification Parameters

### At Runtime (User-Facing)

Users can adjust all three point parameters from the **Gamification** page > **Settings** gear icon. Changes dispatch `UPDATE_GAMIFICATION_SETTINGS` and take effect immediately.

### At Code Level

**Scoring formula** is in `src/utils.ts`, function `calculateWeeklyScore()` (~line 78).

| Parameter | What it controls | Default |
|-----------|-----------------|---------|
| `pointsPerTargetHour` | Points earned per hour of target when 100% met | 10 |
| `balanceBasePoints` | Base bonus per area for balanced usage | 20 |
| `streakBonusPoints` | Bonus per consecutive all-targets-met week | 15 |

**Balance formula:**
```
completionRate[i] = min(1, actualHours[i] / targetHours[i])
balanceRatio = max(0, 1 - 2 * stddev(completionRates))
balancePoints = balanceRatio * avgCompletion * balanceBasePoints * numAreas
```

**To change the scoring logic** (e.g., allow extra credit, change balance sensitivity):
1. Edit `calculateWeeklyScore()` in `src/utils.ts`
2. The function returns a `WeeklyScore` object; keep its shape intact
3. The gamification page consumes the result via `useMemo`

---

## 7. Adding a New Data Field to an Entity

Example: Adding a `priority` field to `FocusArea`.

### Step 1: Update the interface

**File:** `src/types.ts`

```typescript
export interface FocusArea {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  weeklyTargetHours: number;
  createdAt: string;
  priority: number;    // ← NEW
}
```

### Step 2: Set a default in the reducer/load

No code change needed if the field is optional. If required, add it to where `FocusArea` objects are created. The `loadState()` function spreads `defaultState`, so existing stored data will simply have `priority` as `undefined` unless you add migration logic.

### Step 3: Update the creation form

**File:** `src/pages/FocusAreas.tsx`, inside the `save()` function:

```typescript
const area: FocusArea = {
  // ...existing fields...
  priority: parseInt(priorityValue) || 0,  // ← NEW
};
```

Also add an `<input>` in the form JSX.

### Step 4: Use the field in display

Reference `area.priority` wherever you want to display or sort by the new field.

---

## 8. Adding a New Action to the Store

### Step 1: Define the action type

**File:** `src/types.ts`, in the `AppAction` union type:

```typescript
export type AppAction =
  | { type: 'ADD_FOCUS_AREA'; payload: FocusArea }
  // ...existing actions...
  | { type: 'MY_NEW_ACTION'; payload: MyPayloadType };  // ← NEW
```

### Step 2: Handle it in the reducer

**File:** `src/store.tsx`, in the `reducer()` function:

```typescript
case 'MY_NEW_ACTION':
  return { ...state, someField: action.payload };
```

### Step 3: Dispatch from a component

```typescript
const { dispatch } = useApp();
dispatch({ type: 'MY_NEW_ACTION', payload: myValue });
```

State changes trigger `saveState()` automatically via the `useEffect` in `AppProvider`.

---

## 9. Adding a New Page / Route

### Step 1: Create the page component

Create `src/pages/MyPage.tsx`:

```typescript
import { useApp } from '../store';

export default function MyPage() {
  const { state, dispatch } = useApp();
  return <div>{/* page content */}</div>;
}
```

### Step 2: Register the route

**File:** `src/App.tsx`

```typescript
import MyPage from './pages/MyPage';
// ...
<Routes>
  {/* ...existing routes... */}
  <Route path="/mypage" element={<MyPage />} />
</Routes>
```

### Step 3: Add navigation (optional)

To add a bottom nav tab, edit `src/components/BottomNav.tsx`. The current layout supports 5 tabs; adding more may require adjusting the CSS grid or switching to a scrollable tab bar.

Alternatively, link from an existing page:

```typescript
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
// ...
<button onClick={() => navigate('/mypage')}>Go</button>
```

---

## 10. Updating the Timeline Time-Window Options

**File:** `src/pages/Timeline.tsx`, line ~7

```typescript
const TIME_WINDOWS = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
];
```

Add or modify entries. The `days` value is the look-ahead window from today. The active selection is persisted in `settings.timeWindowDays`.

---

## 11. Google Calendar Integration Setup

### For End Users

1. Create a project in Google Cloud Console
2. Enable the **Google Calendar API**
3. Create an **OAuth 2.0 Client ID** (Web application type)
4. Add your app's origin to "Authorized JavaScript origins"
5. Add the Google Identity Services script to `index.html`:
   ```html
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   ```
6. In the app, go to **Timeline > Sync** and paste your Client ID

### For Developers

The sync logic is in `src/pages/Timeline.tsx`, function `syncGoogle()` (~line 80):

- Uses Google Identity Services `initTokenClient()` for OAuth
- Requests scope: `calendar.readonly`
- Fetches from Calendar API v3: `calendars/primary/events`
- Synced events get `source: 'google'` and `id` prefixed with `gcal-`
- On re-sync, all google-sourced events are replaced; manual events are kept

To support additional Google APIs, modify the `scope` parameter and add fetch logic after receiving the access token.

---

## 12. Editing the Level System

**File:** `src/utils.ts`, function `getLevelFromPoints()` (~line 163)

```typescript
const thresholds = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000];
const titles = [
  'Beginner', 'Apprentice', 'Journeyman', 'Adept',
  'Expert', 'Master', 'Grandmaster', 'Legend',
  'Mythic', 'Transcendent', 'Ascended',
];
```

**Rules:**
- `thresholds` and `titles` arrays must be the same length
- `thresholds` must be sorted ascending
- `thresholds[0]` should be `0` (starting level)
- The last level's "next threshold" is calculated as `lastThreshold + 1000`

To add a new level, append to both arrays:
```typescript
const thresholds = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000, 7500];
const titles = [..., 'Ascended', 'Eternal'];
```

---

## 13. Styling & Theming

**File:** `src/App.css` — single file containing all styles.

### CSS Custom Properties (Theme Variables)

Defined at the top of `App.css` in `:root`:

```css
:root {
  --bg: #0f0f1a;
  --surface: #1a1a2e;
  --surface-elevated: #252542;
  --primary: #6c63ff;
  --primary-hover: #5a52e0;
  --text: #e8e8f0;
  --text-secondary: #9898b0;
  --text-muted: #5a5a7a;
  --success: #43b88c;
  --warning: #f5a623;
  --error: #ef5350;
  --border: #2a2a45;
  --radius: 12px;
  --radius-sm: 8px;
}
```

**To create a light theme:** Override these variables in a `.light-theme` class or media query:

```css
.light-theme {
  --bg: #f5f5f5;
  --surface: #ffffff;
  --text: #1a1a2e;
  /* ...etc */
}
```

### Style Organization

The CSS file is organized by section with comment headers:

| Section | Description |
|---------|-------------|
| Base / Reset | `*`, `body`, scrollbar |
| Layout | `.app-layout`, `.app-header`, `.app-content` |
| Cards | `.card`, `.card-header`, `.card-title` |
| Forms | `.form-group`, `.form-input`, `.form-select` |
| Buttons | `.btn`, `.btn-primary`, `.fab` |
| Navigation | `.bottom-nav`, `.nav-item` |
| Tracking | `.tracker-banner`, `.tracking-time` |
| Timeline | `.timeline-controls`, `.event-card` |
| Statistics | `.stat-card`, `.pie-chart` |
| Gamification | `.gamification-hero`, `.score-card`, `.balance-meter` |
| Modals | `.modal-backdrop`, `.modal-content` |

---

## 14. localStorage & Data Migration

### How Persistence Works

- **Save:** `saveState(state)` writes the full `AppState` as JSON to `localStorage` key `lifetracker-state` on every state change (via `useEffect` in `AppProvider`)
- **Load:** `loadState()` reads and deep-merges with `defaultState` on app start

### Forward Compatibility

The `loadState()` function uses spread merging:

```typescript
return {
  ...defaultState,
  ...parsed,
  settings: {
    ...defaultState.settings,
    ...parsed.settings,
    gamification: {
      ...defaultState.settings.gamification,
      ...parsed.settings?.gamification,
    },
  },
};
```

This means:
- **New top-level fields** added to `defaultState` are automatically available
- **New settings fields** are automatically filled with defaults
- **New gamification fields** are automatically filled with defaults
- **Removed fields** in stored data are harmless (they're just ignored)

### Manual Data Reset

To clear all user data, delete the localStorage key:

```javascript
localStorage.removeItem('lifetracker-state');
location.reload();
```

### Import/Export (Manual)

```javascript
// Export
const data = localStorage.getItem('lifetracker-state');
console.log(data); // Copy the JSON

// Import
localStorage.setItem('lifetracker-state', '{"focusAreas":[...]}');
location.reload();
```

Alternatively, dispatch `LOAD_STATE` with a full `AppState` object to replace everything programmatically:

```typescript
dispatch({ type: 'LOAD_STATE', payload: importedState });
```

---

## 15. Common Patterns & Recipes

### Access State and Dispatch

Every component inside `<AppProvider>` can use:

```typescript
import { useApp } from '../store';

const { state, dispatch } = useApp();
```

### Generate Unique IDs

```typescript
import { generateId } from '../utils';
const id = generateId(); // e.g. "lz8k3f2abc1d2e3"
```

Uses `Date.now()` (base-36) + random suffix. Sufficient for client-side uniqueness.

### Create a Modal Form

```typescript
import Modal from '../components/Modal';

{showForm && (
  <Modal title="My Form" onClose={() => setShowForm(false)}>
    <div className="form-group">
      <label className="form-label">Field</label>
      <input className="form-input" value={val} onChange={...} />
    </div>
    <div className="modal-actions">
      <button className="btn btn-primary" onClick={save}>Save</button>
    </div>
  </Modal>
)}
```

### Filter Entries by Current Week

```typescript
import { isThisWeek } from '../utils';

const thisWeekEntries = state.timeEntries.filter(e => isThisWeek(e.startTime));
```

### Calculate Time Spent per Area

```typescript
const areaMinutes = state.timeEntries
  .filter(e => e.focusAreaId === area.id && isThisWeek(e.startTime))
  .reduce((sum, e) => sum + e.duration, 0);
const areaHours = areaMinutes / 60;
```

### Dispatch Multiple Related Changes

Actions are synchronous and each triggers a re-render + localStorage save. For bulk operations, consider combining logic into a single action or dispatching in sequence:

```typescript
// Update all allocations at once
Object.entries(allocations).forEach(([id, hours]) => {
  const area = state.focusAreas.find(a => a.id === id);
  if (area) {
    dispatch({ type: 'UPDATE_FOCUS_AREA', payload: { ...area, weeklyTargetHours: hours } });
  }
});
```

### Add a Stat Card

Follow the pattern in `src/pages/Statistics.tsx`:

```tsx
<div className="stat-card">
  <div className="stat-value">{value}</div>
  <div className="stat-label">My Metric</div>
</div>
```

### Navigate Between Pages

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/areas');          // Go to focus areas
navigate(`/areas/${id}`);    // Go to specific area detail
navigate('/');               // Go home
```

---

## Quick Reference: All Dispatch Actions

| Action | Payload | Effect |
|--------|---------|--------|
| `ADD_FOCUS_AREA` | `FocusArea` | Appends to `focusAreas` |
| `UPDATE_FOCUS_AREA` | `FocusArea` | Replaces matching by `id` |
| `DELETE_FOCUS_AREA` | `string` (id) | Removes area + its projects + time entries |
| `ADD_PROJECT` | `Project` | Appends to `projects` |
| `UPDATE_PROJECT` | `Project` | Replaces matching by `id` |
| `DELETE_PROJECT` | `string` (id) | Removes project |
| `ADD_TIME_ENTRY` | `TimeEntry` | Appends to `timeEntries` |
| `UPDATE_TIME_ENTRY` | `TimeEntry` | Replaces matching by `id` |
| `DELETE_TIME_ENTRY` | `string` (id) | Removes time entry |
| `SET_CALENDAR_EVENTS` | `CalendarEvent[]` | Replaces all calendar events |
| `ADD_CALENDAR_EVENT` | `CalendarEvent` | Appends to `calendarEvents` |
| `DELETE_CALENDAR_EVENT` | `string` (id) | Removes calendar event |
| `START_TRACKING` | `ActiveTracking` | Sets `activeTracking` |
| `STOP_TRACKING` | *(none)* | Sets `activeTracking` to `null` |
| `UPDATE_SETTINGS` | `Partial<AppSettings>` | Shallow-merges into `settings` |
| `UPDATE_GAMIFICATION_SETTINGS` | `Partial<GamificationSettings>` | Shallow-merges into `settings.gamification` |
| `SAVE_WEEKLY_SCORE` | `WeeklyScore` | Upserts by `weekStart`, keeps 52 weeks |
| `LOAD_STATE` | `AppState` | Replaces entire state |
