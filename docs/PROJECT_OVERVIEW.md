# timecompass — Project Overview

_Edit the STATUS and KEY PATTERNS sections manually; they are preserved on re-run._

---

## 1. Status

<!-- STATUS:BEGIN -->

**Current milestone:** Stable — rename from LifeTracker complete, five-tab UX deployed

**Working:** Full PWA, Google Calendar OAuth, prize wallet, motivation splash, manual period reset

**Scaffolded / incomplete:** [fill in]

**Known technical debt:** [fill in]

**Next planned work:** [fill in]

<!-- STATUS:END -->

---

## 2. File Inventory

| File | Lines |
|------|-------|
| `src/App.tsx` | 894 |
| `src/main.tsx` | 35 |
| `src/store.tsx` | 277 |
| `src/types.ts` | 174 |
| `src/utils.ts` | 310 |
| `src/vite-env.d.ts` | 1 |
| `src/components/BottomNav.tsx` | 55 |
| `src/components/Modal.tsx` | 21 |
| `src/components/SplashScreen.tsx` | 36 |
| `src/pages/Dashboard.tsx` | 260 |
| `src/pages/FocusAreaDetail.tsx` | 219 |
| `src/pages/FocusAreas.tsx` | 360 |
| `src/pages/Statistics.tsx` | 491 |
| `src/pages/Timeline.tsx` | 336 |
| `src/pages/Tracking.tsx` | 239 |
| `src/pages/WeekTemplates.tsx` | 435 |
| `src/utils/backup.ts` | 18 |
| `src/utils/driveSync.ts` | 149 |

---

## 3. Component Inventory

| Component | File | Type | JSDoc |
|-----------|------|------|-------|
| `App` | `src/App.tsx` | function |  |
| `AppProvider` | `src/store.tsx` | function |  |
| `BottomNav` | `src/components/BottomNav.tsx` | function |  |
| `Modal` | `src/components/Modal.tsx` | function |  |
| `SplashScreen` | `src/components/SplashScreen.tsx` | function |  |
| `Dashboard` | `src/pages/Dashboard.tsx` | function |  |
| `FocusAreaDetail` | `src/pages/FocusAreaDetail.tsx` | function |  |
| `FocusAreas` | `src/pages/FocusAreas.tsx` | function |  |
| `Statistics` | `src/pages/Statistics.tsx` | function |  |
| `Timeline` | `src/pages/Timeline.tsx` | function |  |
| `Tracking` | `src/pages/Tracking.tsx` | function |  |
| `WeekTemplates` | `src/pages/WeekTemplates.tsx` | function |  |

---

## 4. Hooks and Utilities

| File | Description |
|------|-------------|
| `src/utils/backup.ts` |  |
| `src/utils/driveSync.ts` |  |

---

## 5. Key Patterns

<!-- PATTERNS:BEGIN -->

- Context + Reducer state management. React Router v6 hash routing. TypeScript throughout.

<!-- PATTERNS:END -->
