# TimeCompass Component Audit

> Read-only audit of `src/` as of 2026-03-22 (post-restore commit 2fcc700).

---

## Data Model (`src/types.ts`)

| Type | Key Fields |
|------|-----------|
| `FocusArea` | id, name, color, icon, description, weeklyTargetHours, createdAt |
| `Project` | id, focusAreaId, name, description, status, githubUrl, trelloUrl |
| `TimeEntry` | id, focusAreaId, projectId, startTime, endTime, duration, note |
| `CalendarEvent` | id, title, description, start, end, focusAreaId, source (`manual`\|`google`) |
| `ActiveTracking` | focusAreaId, projectId, startTime |
| `WeeklyScore` | id, weekStart, totalPoints, achievementPoints, balancePoints, streakBonus, areaScores |
| `GamificationSettings` | enabled, monthlyBudget, pointsPerTargetHour, balanceBonus, streakBonus |
| `AppSettings` | timeWindowDays, googleClientId, googleAccessToken, googleCalendarConnected, gamification: GamificationSettings |
| `WeekTemplate` | id, name, description, focusAreaTargets, projectTargets, lastApplied |
| `AppState` | focusAreas, projects, timeEntries, calendarEvents, activeTracking, settings, weeklyScores, weekTemplates |

---

## State Management (`src/store.tsx`)

**Hook**: `useApp()` returns `{ state: AppState, dispatch }`

**Reducer actions**:
- Focus areas: `ADD_FOCUS_AREA`, `UPDATE_FOCUS_AREA`, `DELETE_FOCUS_AREA`
- Projects: `ADD_PROJECT`, `UPDATE_PROJECT`, `DELETE_PROJECT`
- Time entries: `ADD_TIME_ENTRY`, `UPDATE_TIME_ENTRY`, `DELETE_TIME_ENTRY`
- Calendar events: `SET_CALENDAR_EVENTS`, `ADD_CALENDAR_EVENT`, `DELETE_CALENDAR_EVENT`
- Tracking: `START_TRACKING`, `STOP_TRACKING`
- Settings: `UPDATE_SETTINGS`, `UPDATE_GAMIFICATION_SETTINGS`
- Gamification: `SAVE_WEEKLY_SCORE`
- Templates: `ADD_WEEK_TEMPLATE`, `UPDATE_WEEK_TEMPLATE`, `DELETE_WEEK_TEMPLATE`, `APPLY_WEEK_TEMPLATE`

**Persistence**: Auto-saves to `localStorage` key `timecompass-state` after every dispatch.

---

## Application Shell (`src/App.tsx`)

**Responsibilities**:
- Root `<AppProvider>` + React Router setup
- Header bar with settings icon (data export/import)
- Service worker update notification banner
- `<BottomNav>` rendered on all routes

**Routes**:

| Path | Component |
|------|-----------|
| `/` | Dashboard |
| `/areas` | FocusAreas |
| `/areas/:id` | FocusAreaDetail |
| `/timeline` | Timeline |
| `/track` | Tracking |
| `/stats` | Statistics |
| `/gamification` | Gamification |
| `/templates` | WeekTemplates |

**State reads**: `state` (for JSON export validation / import parsing)

---

## Shared / Reusable Components (`src/components/`)

### `BottomNav.tsx`
- **Responsibility**: Persistent bottom navigation bar with 5 tabs.
- **Tabs**: Home (`/`), Areas (`/areas`), Track (`/track`), Stats (`/stats`), Rewards (`/gamification`)
- **State reads**: None — uses `useNavigate` + `useLocation` from React Router only.
- **Components used**: None.

### `Modal.tsx`
- **Responsibility**: Generic modal wrapper (overlay + title bar + close button + `children`).
- **Props**: `title: string`, `onClose: () => void`, `children: ReactNode`
- **State reads**: None.
- **Components used**: None.

### `SplashScreen.tsx`
- **Responsibility**: One-time full-screen splash shown once per browser session.
- **Local state**: `visible` (from `sessionStorage`), `fading` (for CSS transition)
- **Behaviour**: Displays for ~2 s then fades out over 0.7 s; suppressed on subsequent page loads within session.
- **State reads**: None.
- **Components used**: None.

---

## Pages (`src/pages/`)

### `Dashboard.tsx` — `/`

**Responsibilities**: Home overview — active tracking status, this-week progress by area, upcoming calendar events, gamification reward card.

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.activeTracking` | Display live running session |
| `state.focusAreas` | Render per-area progress bars |
| `state.timeEntries` | Calculate weekly and daily minutes per area |
| `state.calendarEvents` | Show next 3 upcoming events |
| `state.settings.gamification` | Gate/render the euro reward card |
| `state.weeklyScores` | Compute current streak count |

**Local state**: `elapsed` (seconds, drives live timer display)

**Components used**: None (all sections rendered inline).

**Key features**:
- Live elapsed-time counter for active tracking session
- Per-area weekly progress bars (actual vs target hours)
- Upcoming events list (next 3, chronological)
- Monthly euro reward card with current-period earnings and budget
- Empty-state guidance when no areas exist

---

### `FocusAreas.tsx` — `/areas`

**Responsibilities**: List, create, edit, and delete focus areas.

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.focusAreas` | Render area cards |
| `state.projects` | Count projects per area |
| `state.timeEntries` | Compute weekly minutes per area |

**Local state**: `showForm`, `editing` (area id or null), form fields (`name`, `description`, `color`, `icon`, `targetHours`)

**Components used**: `Modal`

**Key features**:
- Area cards with color swatch, icon, weekly progress bar, project count
- Add / edit / delete areas via modal form
- Color picker (9 presets) and icon picker (16 icons)
- Auto-creates a "Default" project on new area creation
- Empty-state CTA

---

### `FocusAreaDetail.tsx` — `/areas/:id`

**Responsibilities**: Detail view for one focus area; manage its projects (called "realizations" in UI).

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.focusAreas` | Look up area by route param id |
| `state.projects` | Filter projects by `focusAreaId` |
| `state.timeEntries` | Weekly minutes for this area |

**Local state**: `showForm`, `editing` (project id or null), form fields (`pName`, `pDesc`, `pGithub`, `pTrello`, `pStatus`)

**Components used**: `Modal`

**Key features**:
- Area summary card (icon, color, target hours, weekly progress)
- Project list with status badges (`active`, `completed`, `paused`)
- Clickable GitHub and Trello URLs per project
- Add / edit / delete projects via modal form
- Back-navigation chevron

---

### `Timeline.tsx` — `/timeline`

**Responsibilities**: Calendar view of events; manual event entry; Google Calendar OAuth sync.

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.calendarEvents` | Render all events, grouped by day |
| `state.focusAreas` | Link events to areas; render area color chips |
| `state.settings.googleClientId` | OAuth client id |
| `state.settings.googleAccessToken` | Stored access token |
| `state.settings.googleCalendarConnected` | Connected status flag |

**Local state**: `showForm`, `showSync`, `windowDays`, `clientId`, event form fields (`eTitle`, `eDesc`, `eStart`, `eEnd`, `eArea`)

**Components used**: `Modal`

**Key features**:
- Configurable time window (1 day → 1 month)
- Manual event creation with area linkage
- Google Calendar OAuth read-only integration (token stored in settings)
- Day-grouped event list with area color chips
- Delete for manually-created events (source = `manual`)

---

### `Tracking.tsx` — `/track`

**Responsibilities**: Live time tracking (start/stop), manual time entry, weekly allocation editor.

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.activeTracking` | Running session; area/project, start time |
| `state.focusAreas` | Quick-start buttons; target display |
| `state.projects` | Project selector for active session |
| `state.timeEntries` | Today's log list; this-week totals per area |

**Local state**: `elapsed`, `showManual`, `showAllocation`, manual-form fields, `allocations` map (areaId → hours)

**Components used**: `Modal`

**Key features**:
- Quick-start buttons per focus area
- Live HH:MM:SS timer with stop button
- Warning banner for sessions > 8 hours or stale sessions
- Manual time entry modal (area, project, date, duration, note)
- Weekly allocation editor modal (override target hours per area for the week)
- Today's log list with delete
- Link to `/templates`

---

### `Statistics.tsx` — `/stats`

**Responsibilities**: Analytics dashboard with charts over a selectable period.

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.timeEntries` | All entries; filtered by period and area |
| `state.focusAreas` | Area names, colors, target hours |
| `state.projects` | Project name lookup for entry detail |

**Local state**: `period` (`this_week` | `last_week` | `this_month` | `last_30`), `filterArea` (area id or `all`)

**Components used**: None (inline SVG charts).

**Key features**:
- Period selector (4 options)
- Per-area filter chip
- Summary stat cards (total time, session count, avg/day, avg/session)
- Pie chart — time distribution by area
- Actual vs target comparison bar chart
- Daily activity bar chart
- CSV export of filtered entries

---

### `Gamification.tsx` — `/gamification`

**Responsibilities**: Rewards and scoring view — current-period progress, historical scores, settings.

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.settings.gamification` | All settings (budget, points config, enabled flag) |
| `state.focusAreas` | Area names, targets for per-area score bars |
| `state.timeEntries` | Calculate current week's score |
| `state.weeklyScores` | Historical data; streak count; past periods |

**Local state**: `showSettings`, `editSettings` (draft copy of `GamificationSettings`)

**Components used**: `Modal`

**Key features**:
- Monthly euro reward card: current earnings, progress bar, period date range, week-within-period label
- Achievement / Balance / Streak score breakdown with explanations
- Per-area progress bars (points earned vs max per area)
- Balance meter (std-deviation-based ratio visualised)
- Past 6 periods summary table with totals
- Weekly history bar chart (last 8 weeks)
- Settings modal: budget, points-per-target-hour, balance bonus, streak bonus, enable/disable toggle
- Disabled state with single "Enable Rewards" button

---

### `WeekTemplates.tsx` — `/templates`

**Responsibilities**: Create and manage weekly time-allocation presets (templates).

**State reads**:
| Field | Purpose |
|-------|---------|
| `state.weekTemplates` | List all templates |
| `state.focusAreas` | Available areas for target configuration |
| `state.projects` | Project-level targets within areas |

**Local state**: `view` (`list` | `editor`), `editingId`, `tName`, `tDescription`, `tTargets` map, `expandedAreas` set, `confirmApplyId`, applied-notification flag

**Components used**: `Modal`

**Key features**:
- Two-panel layout: template list and template editor
- Full CRUD for templates
- Hierarchical target editor: area targets with optional project-level sub-targets
- Project rows toggle-expanded per area
- 168 h/week cap enforced on total targets
- Apply confirmation modal; updates `weeklyTargetHours` on matching areas
- Last-applied timestamp and project-count badges on list cards

---

## Utility Functions (`src/utils.ts`)

### ID generation
- `generateId()` — timestamp + random suffix

### Date / time formatting
| Function | Output |
|----------|--------|
| `formatDate(dateStr)` | `"Mon, Jan 1"` |
| `formatTime(dateStr)` | `"09:30"` (24-hour) |
| `formatDuration(minutes)` | `"1h 30m"` |
| `formatEuros(amount)` | locale decimal string, 2dp |
| `getWeekLabel(weekStartISO)` | `"Jan 1 – Jan 7"` |

### Date calculations
| Function | Description |
|----------|-------------|
| `getWeekStart(date)` | Monday 00:00 of the week containing `date` |
| `getWeekEnd(date)` | Sunday 23:59 of same week |
| `isThisWeek(dateStr)` | Boolean check |
| `getDaysBetween(start, end)` | Array of `Date` objects |
| `isSameDay(a, b)` | Ignore-time equality |
| `minutesBetween(start, end)` | Duration in minutes |

### Gamification scoring
| Function | Description |
|----------|-------------|
| `calculateWeeklyScore(focusAreas, timeEntries, settings, weekStart, prevStreak)` | Returns `WeeklyScore`; achievement = min(1, actual/target)×pts×target; balance = stddev ratio × avg completion × balanceBonus; streak = if all targets met |
| `getLevelFromPoints(totalPoints)` | Returns `{ level, title, nextThreshold, progress }` — 11 levels: Beginner → Ascended |
| `getPeriodIndex(weekStart)` | Timezone-safe integer index for the 4-week rolling period |
| `getPeriodDateRange(periodIndex)` | `{ start, end }` Date objects for a period |
| `getWeekWithinPeriod(weekStart, periodIndex)` | Week number 1–4 within its period (timezone-safe) |
| `computeMaxWeekPoints(focusAreas, settings)` | Maximum achievable weekly points (no streak) |
| `pointsToEuros(actualPoints, maxWeekPoints, budget)` | Proportional euro amount for that week |

### SVG icons
- `getIconSvg(icon)` — returns SVG path string for 16 named icons (code, camera, book, music, brush, fitness, science, travel, food, film, game, chat, heart, star, bolt, globe)

---

## Architecture Summary

```
src/
├── types.ts            # All TypeScript interfaces
├── store.tsx           # AppProvider + useApp() hook + reducer + localStorage persistence
├── utils.ts            # Pure functions: dates, scoring, formatting, icons
├── App.tsx             # Root: router, header, AppProvider, BottomNav
├── App.css             # Global CSS variables and styles
├── main.tsx            # React entry point, SW registration
│
├── components/
│   ├── BottomNav.tsx   # Tab navigation (no state)
│   ├── Modal.tsx       # Generic modal wrapper (no state)
│   └── SplashScreen.tsx # One-time session splash
│
└── pages/
    ├── Dashboard.tsx       # Overview, active timer, reward card
    ├── FocusAreas.tsx      # Area CRUD list
    ├── FocusAreaDetail.tsx # Single area + project CRUD
    ├── Timeline.tsx        # Calendar events + Google Calendar sync
    ├── Tracking.tsx        # Live timer + manual entry + allocations
    ├── Statistics.tsx      # Analytics charts + CSV export
    ├── Gamification.tsx    # Euro rewards, scores, history, settings
    └── WeekTemplates.tsx   # Template CRUD + apply
```

**Data flow**: All pages call `useApp()` to read `state` and `dispatch` actions. No prop drilling. Single source of truth in context, auto-persisted to localStorage.

**External dependencies**: React Router DOM (routing), Google Calendar REST API (Timeline page, optional).
