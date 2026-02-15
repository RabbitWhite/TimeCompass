# LifeTracker Technical Documentation

## 1. Architecture Overview

### 1.1 High-Level System Diagram

```
+------------------------------------------------------------------+
|                        index.html                                 |
|  +------------------------------------------------------------+  |
|  |  main.tsx                                                   |  |
|  |  +-----------+  +---------------+  +---------------------+ |  |
|  |  | StrictMode|->| BrowserRouter |->|    AppProvider       | |  |
|  |  +-----------+  +---------------+  |  (React Context +    | |  |
|  |                                    |   useReducer store)  | |  |
|  |                                    +----------+-----------+ |  |
|  |                                               |             |  |
|  |                                    +----------v-----------+ |  |
|  |                                    |       App.tsx         | |  |
|  |                                    |  +------+ +--------+ | |  |
|  |                                    |  |Header| |BottomNav| | |  |
|  |                                    |  +------+ +--------+ | |  |
|  |                                    |  +------------------+ | |  |
|  |                                    |  |  <Routes>        | | |  |
|  |                                    |  |  7 page routes   | | |  |
|  |                                    |  +------------------+ | |  |
|  |                                    +-----------------------+ |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
         |                                        |
+--------v--------+                    +----------v-----------+
|   localStorage   |                    | Google Calendar API   |
| (lifetracker-    |                    | (external, optional)  |
|  state)          |                    +-----------------------+
+------------------+
```

### 1.2 Component Tree

```
<StrictMode>
  <BrowserRouter>
    <AppProvider>                         ── React Context provider
      <App>                              ── Layout shell
        <header.app-header />            ── Fixed top bar
        <main.app-content>
          <Routes>
            / .............. <Dashboard />
            /areas ......... <FocusAreas />
            /areas/:id ..... <FocusAreaDetail />
            /timeline ...... <Timeline />
            /track ......... <Tracking />
            /stats ......... <Statistics />
            /gamification .. <Gamification />
          </Routes>
        </main>
        <BottomNav />                    ── Fixed bottom tab bar
      </App>
    </AppProvider>
  </BrowserRouter>
</StrictMode>
```

### 1.3 Subsystem Relationships

```
+------------------+       +------------------+       +------------------+
|    types.ts      |<------+    store.tsx      |<------+     pages/*      |
|  (data models,   |       | (Context, reducer |       | (UI components   |
|   action types,  |       |  load/save to     |       |  that read state |
|   constants)     |       |  localStorage)    |       |  and dispatch    |
+--------+---------+       +--------+---------+       |  actions)        |
         ^                          ^                  +--------+---------+
         |                          |                           |
+--------+---------+       +--------+---------+       +--------+---------+
|    utils.ts      |       | components/       |       |   App.css        |
| (date helpers,   |       | Modal.tsx         |       | (all styles,     |
|  scoring engine, |       | BottomNav.tsx     |       |  CSS custom      |
|  ID generation,  |       +------------------+       |  properties)     |
|  icon SVG paths) |                                   +------------------+
+------------------+
```

### 1.4 Technology Stack

| Layer          | Technology                         |
|----------------|------------------------------------|
| Framework      | React 18 (functional components)   |
| Language       | TypeScript 5                       |
| Build Tool     | Vite 5                             |
| Routing        | react-router-dom 6                 |
| State          | React Context + useReducer         |
| Persistence    | localStorage (JSON serialization)  |
| Styling        | Plain CSS with custom properties   |
| Charts         | Hand-rolled SVG (pie, bar)         |
| Calendar Sync  | Google Calendar API v3 + GIS OAuth |
| Deployment     | PWA-ready (manifest.json)          |

---

## 2. Data Model

### 2.1 Entity Relationship Diagram

```
+---------------+       1:N       +---------------+
|   FocusArea   |<----------------|    Project     |
|---------------|                  |---------------|
| id            |                  | id            |
| name          |    1:N           | focusAreaId   |---+
| color         |<--------+       | name          |   |
| icon          |         |       | description   |   |
| description   |         |       | githubUrl     |   |
| weeklyTarget  |         |       | trelloUrl     |   |
| createdAt     |         |       | status        |   |
+-------+-------+         |       | createdAt     |   |
        |                 |       +---------------+   |
        | 1:N             |                            |
+-------v-------+         |       +---------------+   |
|   TimeEntry   |---------+       | CalendarEvent |   |
|---------------|                  |---------------|   |
| id            |                  | id            |   |
| focusAreaId   |                  | title         |   |
| projectId     |----- 0..1 ------| focusAreaId   |   |
| startTime     |                  | start / end   |   |
| endTime       |                  | source        |   |
| duration      |                  | calendarName  |   |
| note          |                  +---------------+   |
+---------------+                                      |
                                                       |
+------------------+          +-------------------+    |
| WeeklyScore      |          | ActiveTracking    |    |
|------------------|          |-------------------|    |
| weekStart        |          | focusAreaId       |----+
| achievementPts   |          | projectId         |
| balancePts       |          | startTime         |
| streakBonus      |          +-------------------+
| totalPoints      |
| areaScores[]     |          +-------------------+
| balanceRatio     |          | GamificationSettings
| streakWeeks      |          |-------------------|
+------------------+          | pointsPerTargetHr |
                              | balanceBasePoints |
                              | streakBonusPoints |
                              | enabled           |
                              +-------------------+
```

### 2.2 Interface Specifications

#### `FocusArea`
| Attribute          | Type     | Description                                |
|--------------------|----------|--------------------------------------------|
| `id`               | `string` | Unique identifier (base36 timestamp+random)|
| `name`             | `string` | Display name (e.g. "Game Development")     |
| `color`            | `string` | Hex color code from `AREA_COLORS`          |
| `icon`             | `string` | Icon key from `AREA_ICONS`                 |
| `description`      | `string` | Free-text description                      |
| `weeklyTargetHours`| `number` | Target hours per week                      |
| `createdAt`        | `string` | ISO 8601 timestamp                         |

#### `Project`
| Attribute     | Type                                   | Description                  |
|---------------|----------------------------------------|------------------------------|
| `id`          | `string`                               | Unique identifier            |
| `focusAreaId` | `string`                               | FK to parent FocusArea       |
| `name`        | `string`                               | Project name                 |
| `description` | `string`                               | Free-text description        |
| `githubUrl`   | `string`                               | GitHub repository URL        |
| `trelloUrl`   | `string`                               | Trello board URL             |
| `status`      | `'active' \| 'paused' \| 'completed'` | Current project status       |
| `createdAt`   | `string`                               | ISO 8601 timestamp           |

#### `TimeEntry`
| Attribute     | Type     | Description                          |
|---------------|----------|--------------------------------------|
| `id`          | `string` | Unique identifier                    |
| `focusAreaId` | `string` | FK to FocusArea                      |
| `projectId`   | `string` | FK to Project (empty if none)        |
| `startTime`   | `string` | ISO 8601 start timestamp             |
| `endTime`     | `string` | ISO 8601 end timestamp               |
| `duration`    | `number` | Duration in **minutes**              |
| `note`        | `string` | Optional note                        |

#### `CalendarEvent`
| Attribute      | Type                    | Description                    |
|----------------|-------------------------|--------------------------------|
| `id`           | `string`                | Unique (prefixed `gcal-` for Google) |
| `title`        | `string`                | Event title                    |
| `description`  | `string`                | Event description              |
| `start`        | `string`                | ISO 8601 start                 |
| `end`          | `string`                | ISO 8601 end                   |
| `focusAreaId`  | `string`                | FK to FocusArea (empty if unlinked) |
| `source`       | `'google' \| 'manual'` | Origin of the event            |
| `calendarName` | `string`                | Display name of source calendar|

#### `GamificationSettings`
| Attribute            | Type      | Default | Description                                   |
|----------------------|-----------|---------|-----------------------------------------------|
| `pointsPerTargetHour`| `number` | `10`    | Points per target-hour at full completion      |
| `balanceBasePoints`  | `number`  | `20`    | Base balance bonus per area                    |
| `streakBonusPoints`  | `number`  | `15`    | Points per consecutive week at 100%            |
| `enabled`            | `boolean` | `true`  | Master toggle for gamification                 |

#### `WeeklyScore`
| Attribute          | Type          | Description                              |
|--------------------|---------------|------------------------------------------|
| `weekStart`        | `string`      | ISO 8601 Monday 00:00:00                 |
| `achievementPoints`| `number`      | Sum of per-area target-based points      |
| `balancePoints`    | `number`      | Uniformity bonus                         |
| `streakBonus`      | `number`      | Consecutive-week bonus                   |
| `totalPoints`      | `number`      | achievement + balance + streak           |
| `areaScores`       | `AreaScore[]` | Per-area breakdown                       |
| `balanceRatio`     | `number`      | 0..1 uniformity measure                  |
| `streakWeeks`      | `number`      | Current streak length                    |

#### `AreaScore`
| Attribute       | Type     | Description                              |
|-----------------|----------|------------------------------------------|
| `focusAreaId`   | `string` | FK to FocusArea                          |
| `targetHours`   | `number` | Target hours for the week                |
| `actualHours`   | `number` | Actual hours tracked                     |
| `completionRate`| `number` | min(1, actual/target)                    |
| `pointsEarned`  | `number` | completionRate * pointsPerHour * target  |

---

## 3. State Management

### 3.1 Store Architecture

```
+-----------------------------+
|       AppProvider           |
|  (src/store.tsx)            |
|-----------------------------|
|  useReducer(reducer,        |
|             loadState)      |
|                             |
|  useEffect -> saveState()   |   <-- auto-persist on every change
|                             |
|  AppContext.Provider         |
|    value={state, dispatch}  |
+-----------------------------+
         |
         v
+-----------------------------+
|  useApp() hook              |
|  returns {state, dispatch}  |
|  used by all page components|
+-----------------------------+
```

### 3.2 Action Dispatch Flow

```
 User interaction
       |
       v
 Page Component
   calls dispatch({type, payload})
       |
       v
 reducer(state, action)          ── pure function, returns new state
       |
       v
 React re-renders affected components
       |
       v
 useEffect detects state change
       |
       v
 saveState() -> localStorage.setItem('lifetracker-state', JSON.stringify(state))
```

### 3.3 Complete Action Catalog

| Action Type                    | Payload                       | Effect                                                      |
|--------------------------------|-------------------------------|-------------------------------------------------------------|
| `ADD_FOCUS_AREA`               | `FocusArea`                   | Appends to `focusAreas[]`                                   |
| `UPDATE_FOCUS_AREA`            | `FocusArea`                   | Replaces matching entry by `id`                             |
| `DELETE_FOCUS_AREA`            | `string` (id)                 | Removes area **and** its projects **and** its time entries   |
| `ADD_PROJECT`                  | `Project`                     | Appends to `projects[]`                                     |
| `UPDATE_PROJECT`               | `Project`                     | Replaces matching entry by `id`                             |
| `DELETE_PROJECT`               | `string` (id)                 | Removes project                                             |
| `ADD_TIME_ENTRY`               | `TimeEntry`                   | Appends to `timeEntries[]`                                  |
| `UPDATE_TIME_ENTRY`            | `TimeEntry`                   | Replaces matching entry by `id`                             |
| `DELETE_TIME_ENTRY`            | `string` (id)                 | Removes entry                                               |
| `SET_CALENDAR_EVENTS`          | `CalendarEvent[]`             | Replaces entire events array (used after Google sync)       |
| `ADD_CALENDAR_EVENT`           | `CalendarEvent`               | Appends single event                                        |
| `DELETE_CALENDAR_EVENT`        | `string` (id)                 | Removes event                                               |
| `START_TRACKING`               | `ActiveTracking`              | Sets `activeTracking`                                       |
| `STOP_TRACKING`                | _(none)_                      | Sets `activeTracking` to `null`                             |
| `UPDATE_SETTINGS`              | `Partial<AppSettings>`        | Shallow-merges into `settings`                              |
| `UPDATE_GAMIFICATION_SETTINGS` | `Partial<GamificationSettings>` | Shallow-merges into `settings.gamification`                |
| `SAVE_WEEKLY_SCORE`            | `WeeklyScore`                 | Upserts by `weekStart`; keeps latest 52 weeks               |
| `LOAD_STATE`                   | `AppState`                    | Replaces entire state                                       |

---

## 4. Control & Data Flow Diagrams

### 4.1 Time Tracking Flow

```
User taps "Quick Start"        User taps "Stop"
on Tracking page               on tracker banner
       |                              |
       v                              v
dispatch(START_TRACKING, {      1. Calculate duration = now - startTime
  focusAreaId,                  2. If duration > 0:
  projectId: '',                     dispatch(ADD_TIME_ENTRY, {
  startTime: now.toISO()               focusAreaId, projectId,
})                                      startTime, endTime: now,
       |                               duration (minutes), note: ''
       v                           })
state.activeTracking = {        3. dispatch(STOP_TRACKING)
  focusAreaId, ...              4. state.activeTracking = null
}                                      |
       |                              v
       v                        TimeEntry persisted to localStorage
setInterval every 1s            Gamification scores recalculated
  -> update elapsed timer       Weekly progress bars update
```

### 4.2 Gamification Scoring Flow

```
calculateWeeklyScore(focusAreas, timeEntries, settings, weekStart, prevStreak)
       |
       +---> 1. Filter areas with weeklyTargetHours > 0
       |
       +---> 2. For each area:
       |         areaMinutes = sum(entries in week for this area)
       |         completionRate = min(1.0, actualHours / targetHours)   <-- CAPPED
       |         pointsEarned = completionRate * pointsPerTargetHour * targetHours
       |
       +---> 3. achievementPoints = sum(all area pointsEarned)
       |
       +---> 4. Balance calculation (only if 2+ areas):
       |         rates = [completionRate for each area]
       |         avg = mean(rates)
       |         stddev = sqrt(mean((r - avg)^2))
       |         balanceRatio = max(0, 1 - 2 * stddev)
       |         balancePoints = balanceRatio * avg * basePoints * numAreas
       |                                    ^
       |                 scales to 0 if no work done (avg=0)
       |
       +---> 5. Streak:
       |         allMet = every area has completionRate >= 1.0
       |         streakWeeks = allMet ? prevStreak + 1 : 0
       |         streakBonus = streakWeeks * streakBonusPoints
       |
       +---> 6. totalPoints = achievement + balance + streak
       |
       v
  WeeklyScore object returned and saved via SAVE_WEEKLY_SCORE
```

**Why over-investing is not rewarded:**
- `completionRate` is capped at 1.0 -- 20h on a 10h target = 1.0, not 2.0
- Balance uses stddev -- if one area is at 1.0 and another at 0.0, stddev = 0.5, `balanceRatio = 0`
- Net effect: excess hours produce zero additional achievement points AND destroy the balance bonus

### 4.3 Google Calendar Sync Flow

```
User opens Sync modal on Timeline page
       |
       v
User enters Google API Client ID, clicks "Connect"
       |
       v
window.google.accounts.oauth2.initTokenClient({
  client_id, scope: 'calendar.readonly', callback
})
       |
       v
tokenClient.requestAccessToken()  --> Google OAuth popup
       |
       v
callback receives access_token
       |
       v
fetch('googleapis.com/calendar/v3/calendars/primary/events',
      { timeMin: now, timeMax: now + windowDays,
        singleEvents: true, orderBy: startTime })
       |
       v
Map API items -> CalendarEvent[] (source: 'google', id: 'gcal-{id}')
       |
       v
dispatch(SET_CALENDAR_EVENTS, [...manualEvents, ...googleEvents])
dispatch(UPDATE_SETTINGS, { googleCalendarConnected: true })
```

### 4.4 Page Navigation Flow

```
                              +--------+
            +---------------->|  Home  |<-----------------+
            |                 | (/)    |                   |
            |                 +---+----+                   |
            |                     |                        |
            |          gamification widget tap              |
            |                     v                        |
            |            +-----------------+               |
            |            | Gamification    |               |
            |            | (/gamification) |               |
            |            +--------+--------+               |
            |                     | back button            |
            v                     v                        |
      +-----+-----+    +--------+--------+    +-----------+---+
      |   Areas   |--->| Area Detail     |    |   Timeline    |
      |  (/areas) |    | (/areas/:id)    |    |  (/timeline)  |
      +-----------+    +-----------------+    +---------------+
            ^                                        ^
            |              BottomNav                 |
      +-----+-----+                          +------+------+
      |   Track   |                          |    Stats    |
      |  (/track) |                          |   (/stats)  |
      +-----------+                          +-------------+

  All 5 bottom tabs are always accessible.
  Gamification is reached only via Dashboard widget or direct URL.
  FocusAreaDetail is reached only by tapping a focus area card.
```

---

## 5. Function Reference

### 5.1 Utility Functions (`src/utils.ts`)

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `generateId()` | _(none)_ | `string` | Produces a unique ID from `Date.now()` (base36) + random chars. |
| `formatDate(dateStr)` | `string` (ISO) | `string` | Formats as `"Mon, Jan 5"`. |
| `formatTime(dateStr)` | `string` (ISO) | `string` | Formats as `"02:30 PM"`. |
| `formatDuration(minutes)` | `number` | `string` | Returns `"2h 30m"`, `"45m"`, or `"3h"`. |
| `getWeekStart(date?)` | `Date` (default: now) | `Date` | Returns Monday 00:00:00 of the given date's week. |
| `getWeekEnd(date?)` | `Date` (default: now) | `Date` | Returns Sunday 23:59:59 of the given date's week. |
| `isThisWeek(dateStr)` | `string` (ISO) | `boolean` | True if the date falls within the current Mon-Sun. |
| `getDaysBetween(start, end)` | `Date, Date` | `Date[]` | Returns an array of `Date` objects, one per day. |
| `isSameDay(a, b)` | `Date, Date` | `boolean` | Compares year+month+day. |
| `minutesBetween(start, end)` | `string, string` | `number` | Difference in minutes between two ISO timestamps. |
| `calculateWeeklyScore(...)` | `FocusArea[], TimeEntry[], GamificationSettings, Date, number` | `WeeklyScore` | Core gamification engine (see Section 4.2). |
| `getWeekLabel(weekStartISO)` | `string` | `string` | Returns `"Jan 6 - Jan 12"` style label. |
| `getLevelFromPoints(points)` | `number` | `{level, title, nextThreshold, progress}` | Maps cumulative points to a level tier (0-10). |
| `getIconSvg(icon)` | `string` | `string` | Returns SVG `d` path for the given icon key. |

### 5.2 Store Functions (`src/store.tsx`)

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `loadState()` | _(none)_ | `AppState` | Reads and parses `localStorage['lifetracker-state']`; merges with defaults for forward-compatibility. |
| `saveState(state)` | `AppState` | `void` | Serializes state to localStorage. |
| `reducer(state, action)` | `AppState, AppAction` | `AppState` | Pure reducer handling all 18 action types. |
| `AppProvider({children})` | `ReactNode` | JSX | Context provider; initializes reducer with `loadState`, auto-saves on every state change. |
| `useApp()` | _(none)_ | `{state, dispatch}` | Hook to access global state and dispatch from any component. |

### 5.3 Level Thresholds

| Level | Title         | Points Required |
|-------|---------------|-----------------|
| 0     | Beginner      | 0               |
| 1     | Apprentice    | 50              |
| 2     | Journeyman    | 150             |
| 3     | Adept         | 300             |
| 4     | Expert        | 500             |
| 5     | Master        | 800             |
| 6     | Grandmaster   | 1,200           |
| 7     | Legend        | 1,800           |
| 8     | Mythic        | 2,500           |
| 9     | Transcendent  | 3,500           |
| 10    | Ascended      | 5,000           |

---

## 6. Page Components

### 6.1 `Dashboard` (`src/pages/Dashboard.tsx`)

**Route:** `/`

**Purpose:** Landing page showing overview of all subsystems.

**Sections rendered (top to bottom):**
1. Welcome header with current date
2. Active tracking banner (conditional, if `activeTracking !== null`)
3. Summary stats grid: Today / This Week / Target
4. Gamification widget (conditional, links to `/gamification`)
5. Weekly progress bars per focus area
6. Upcoming events (top 3 from `calendarEvents`)
7. Empty state with CTA (if no focus areas)

**Key state reads:** `activeTracking`, `focusAreas`, `timeEntries`, `calendarEvents`, `weeklyScores`, `settings.gamification`

### 6.2 `FocusAreas` (`src/pages/FocusAreas.tsx`)

**Route:** `/areas`

**Purpose:** CRUD listing of all focus areas.

**Features:**
- Card per area showing: icon, name, project count, weekly hours, progress bar
- FAB (+) opens creation modal
- Edit button on each card opens edit modal (same form, pre-filled)
- Delete available inside edit modal
- Tap card navigates to `/areas/:id`

**Modal form fields:** Name, Description, Weekly Target Hours, Color (8x2 grid), Icon (8x2 grid)

### 6.3 `FocusAreaDetail` (`src/pages/FocusAreaDetail.tsx`)

**Route:** `/areas/:id`

**Purpose:** Detail view for a single area with its projects.

**Features:**
- Area header card with stats
- Project list with status badges and GitHub/Trello links
- Add/edit/delete projects via modal
- Back navigation to `/areas`

**Modal form fields:** Project Name, Description, Status (select), GitHub URL, Trello URL

### 6.4 `Timeline` (`src/pages/Timeline.tsx`)

**Route:** `/timeline`

**Purpose:** Near-future event viewer with Google Calendar sync.

**Features:**
- Time window selector chips: 1 Day, 3 Days, 1 Week, 2 Weeks, 1 Month
- Events grouped by day, sorted chronologically
- Manual event creation via FAB (+)
- Google Calendar sync modal (OAuth flow)
- Connection status banner
- Delete button on manual events

**Event form fields:** Title, Description, Start (datetime-local), End (datetime-local), Focus Area link (select)

### 6.5 `Tracking` (`src/pages/Tracking.tsx`)

**Route:** `/track`

**Purpose:** Real-time stopwatch tracking and manual entry.

**Sections:**
1. Tracker banner (live HH:MM:SS or "Ready to track")
2. Quick Start grid (2-column buttons per area)
3. Weekly Allocation progress bars per area
4. Today's Log with delete per entry

**Modals:**
- Manual Time Entry: Focus Area, Project, Date, Start Time, End Time, Note
- Weekly Allocation: hours/week input per area, shows total

### 6.6 `Statistics` (`src/pages/Statistics.tsx`)

**Route:** `/stats`

**Purpose:** Time usage analytics with charts.

**Controls:** Period selector (This Week, Last Week, This Month, Last 30 Days), Area filter dropdown.

**Charts:**
- Stats grid (4 cards): Total Time, Sessions, Avg/Day, Avg Session
- Pie chart (SVG): time distribution by area
- Comparison bars: Actual vs Target (weekly periods only)
- Daily activity bar chart

### 6.7 `Gamification` (`src/pages/Gamification.tsx`)

**Route:** `/gamification`

**Purpose:** Points dashboard, scoring breakdown, history, and settings.

**Sections:**
1. Hero: level badge, title, total points, XP progress bar
2. This Week score card: achievement / balance / streak breakdown
3. Area Scores: per-area progress bar with points earned
4. Balance Meter: color-coded bar (green/yellow/red) with advisory text
5. History: 8-week bar chart + list of past weekly scores
6. Empty state (if no areas with targets)

**Settings modal:** Points per target hour, Balance bonus per area, Streak bonus per week, Enable/Disable toggle

---

## 7. Shared Components

### 7.1 `BottomNav` (`src/components/BottomNav.tsx`)

| Prop | Type | Description |
|------|------|-------------|
| _(none)_ | | Uses `useLocation` + `useNavigate` internally |

5 tabs: Home (`/`), Areas (`/areas`), Timeline (`/timeline`), Track (`/track`), Stats (`/stats`).
Active state determined by `location.pathname.startsWith(path)` (exact match for `/`).

### 7.2 `Modal` (`src/components/Modal.tsx`)

| Prop       | Type         | Description                    |
|------------|--------------|--------------------------------|
| `title`    | `string`     | Header text                    |
| `onClose`  | `() => void` | Called on overlay click or X   |
| `children` | `ReactNode`  | Modal body content             |

Slides up from bottom. Closes on backdrop click (`e.target === e.currentTarget`).

---

## 8. Styling Architecture

All styles live in a single file `src/App.css` organized into sections:

| Section              | Class Prefix        | Purpose                           |
|----------------------|---------------------|-----------------------------------|
| Variables            | `:root`             | CSS custom properties (colors, spacing) |
| Reset                | `*, body`           | Box-sizing, font, tap highlight   |
| Layout               | `.app-layout/header/content` | Fixed header + scrollable content |
| Bottom Nav           | `.bottom-nav, .nav-item` | Fixed bottom tab bar         |
| Cards                | `.card, .card-*`    | Surface containers                |
| Buttons              | `.btn, .btn-*`      | Action buttons (primary/secondary/danger/ghost) |
| FAB                  | `.fab`              | Floating action button            |
| Forms                | `.form-*`           | Input, textarea, select, label    |
| Modal                | `.modal-*`          | Bottom-sheet modal overlay        |
| Focus Areas          | `.area-icon, .color-grid, .icon-grid` | Area-specific UI   |
| Projects             | `.project-*`        | Project cards and links           |
| Timeline             | `.timeline-*, .day-*, .event-*` | Event list UI         |
| Tracking             | `.tracker-*, .quick-*` | Timer and quick-start buttons  |
| Allocation           | `.allocation-*, .bar-*` | Progress bars                 |
| Statistics           | `.stat-*, .chart-*, .comparison-*` | Charts and stat cards |
| Gamification         | `.gamification-*, .score-*, .balance-*, .history-*, .dash-points-*` | Scoring UI |
| Toggle               | `.toggle-btn/knob`  | iOS-style toggle switch           |
| Utility              | `.text-*, .mt-*, .flex-*` | Spacing and typography helpers |

**Theme variables (dark theme):**
```
--bg:               #0f0f1a     (page background)
--surface:          #1a1a2e     (card background)
--surface-elevated: #252540     (input/nested background)
--primary:          #6c63ff     (accent purple)
--text:             #ffffff     (primary text)
--text-secondary:   #a0a0b0     (secondary text)
--success:          #4caf50     (green)
--warning:          #f5a623     (amber/gold)
--error:            #ef5350     (red)
```

---

## 9. Constants

### 9.1 Available Icons (`AREA_ICONS`)

`code`, `camera`, `book`, `music`, `brush`, `fitness`, `science`, `travel`, `food`, `film`, `game`, `chat`, `heart`, `star`, `bolt`, `globe`

### 9.2 Available Colors (`AREA_COLORS`)

`#6c63ff`, `#ff6584`, `#43b88c`, `#f5a623`, `#4fc3f7`, `#ab47bc`, `#ef5350`, `#66bb6a`, `#ffa726`, `#26c6da`, `#ec407a`, `#7e57c2`, `#29b6f6`, `#9ccc65`, `#ff7043`, `#78909c`

### 9.3 Timeline Windows

| Label    | Days |
|----------|------|
| 1 Day    | 1    |
| 3 Days   | 3    |
| 1 Week   | 7    |
| 2 Weeks  | 14   |
| 1 Month  | 30   |

### 9.4 Statistics Periods

| Key          | Label        |
|--------------|--------------|
| `this_week`  | This Week    |
| `last_week`  | Last Week    |
| `this_month` | This Month   |
| `last_30`    | Last 30 Days |
