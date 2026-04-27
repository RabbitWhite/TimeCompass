# Audit: Time Compass Graphics Assets

## TimeCompass_Intro.mp4

The symlink `public/TimeCompass_Intro.mp4 -> ../graphics/TimeCompass_Intro.mp4`
has been replaced with the real MP4 file placed directly at
`public/TimeCompass_Intro.mp4`. Do not convert it back to a symlink.

If the file is ever lost, place the real MP4 directly at `public/TimeCompass_Intro.mp4`
before running `./build-cdn.sh`. The build script will warn (but not abort) if it
is absent.

## cover.png

`public/cover.png` is a real file and is used as the static fallback image
shown when the intro video fails to load. Do not delete or move it.
# Audit: Time Compass Graphics — 2026-04-27

## 1. Active Branch & Related Branches

**Active branch:** `claude/audit-time-compass-MjsDE`

**All local branches:**
- `Main`
- `claude/audit-time-compass-MjsDE` ← current

**All remote branches:**
- `origin/Main`
- `origin/claude/audit-time-compass-MjsDE`

**Finding:** No branch named `time-compass-graphics` or any close variant exists locally or remotely. The graphics-related work was already merged into `Main` via PRs (most recently PR #47, feature/intro-animation).

---

## 2. public/ Image Files

| File | Size (bytes) | Notes |
|------|-------------|-------|
| `public/TimeCompass_Intro.mp4` | symlink → `../graphics/TimeCompass_Intro.mp4` | Not an image; video for splash |
| `public/app-icon.png` | 1,369,400 | Unclear current usage |
| `public/background.png` | 2,135,920 | Used by `body { background-image }` in App.css |
| `public/cover.png` | 2,826,969 | **Orphaned** — SplashScreen no longer references it |
| `public/icon-180x180.png` | 57,203 | Used by `<link rel="apple-touch-icon">` in index.html |
| `public/icon-180x180-maskable.png` | 27,967 | Exists in public/ but **not in manifest.json** |
| `public/icon-192x192.png` | 64,802 | In manifest.json (purpose: any) |
| `public/icon-192x192-maskable.png` | 31,785 | In manifest.json (purpose: maskable) |
| `public/icon-512x512.png` | 408,474 | In manifest.json (purpose: any) |
| `public/icon-512x512-maskable.png` | 212,695 | In manifest.json (purpose: maskable) |

---

## 3. graphics/ Directory

`graphics/` **exists** at the repo root. Contents:

| File | Size (bytes) |
|------|-------------|
| `graphics/Background.png` | 2,135,920 |
| `graphics/Cover.png` | 2,826,969 |
| `graphics/Icon.png` | 1,675,931 |
| `graphics/TimeCompass_Intro.mp4` | 1,746,962 |

`graphics/` is the canonical source-of-truth for raw assets. `public/background.png` and `public/cover.png` are byte-for-byte identical to their `graphics/` counterparts. The icon files in `public/` (180, 192, 512 variants) are presumably derived from `graphics/Icon.png` but the generation pipeline is not documented.

The video is **not copied** to `public/` — instead `public/TimeCompass_Intro.mp4` is a local-dev symlink (`../graphics/TimeCompass_Intro.mp4`). The build pipeline copies it to `dist/` via a separate step (commit b2b3fe1).

---

## 4. CSS Color Scheme Variables (App.css)

All variables are defined in `:root` — parchment/amber theme is in place:

| Variable | Value |
|----------|-------|
| `--bg` | `#f0e6d0` (parchment cream) |
| `--surface` | `#e8d9be` |
| `--surface-alt` | `#ddd0aa` |
| `--surface-elevated` | `#d4c4a0` |
| `--surface-hover` | `#cbb890` |
| `--primary` | `#c9963a` (golden amber) |
| `--primary-hover` | `#b8832a` |
| `--primary-dim` | `rgba(201, 150, 58, 0.15)` |
| `--text` | `#3d2b1f` (dark brown) |
| `--text-secondary` | `#6b4c35` |
| `--text-muted` | `#9b7b5a` |
| `--border` | `#c4a882` |
| `--success` | `#5a7a5a` |
| `--warning` | `#c9963a` |
| `--error` | `#8b3a2a` |
| `--radius` | `14px` |
| `--radius-sm` | `10px` |

**Body background:** `background-color: #f0e6d0` (hardcoded, duplicates `--bg`) + `background-image: url('/Lifetracker/background.png')`

**manifest.json theme:** `background_color: "#f0e6d0"`, `theme_color: "#c9963a"` — matches CSS variables correctly.

### Dark Theme Bleed (PROBLEM)

Several structural elements use hardcoded dark RGBA values that contradict the parchment theme:

| Element | Hardcoded Dark Value |
|---------|---------------------|
| `.app-header` | `background: rgba(15, 15, 30, 0.72)` |
| `.bottom-nav` | `background: rgba(15, 15, 30, 0.78)` |
| `.modal-content` | `background: rgba(22, 22, 40, 0.97)` |
| `.splash-screen` | `background: #0b1120` (**orphaned class**) |

These were never updated when the palette switched from dark-mode to parchment.

---

## 5. SplashScreen.tsx — Timing Logic & Image Source

**File:** `src/components/SplashScreen.tsx`

The splash screen has been **fully replaced** with a video player. There is no `setTimeout` or cover image anymore.

**Current implementation:**
- Renders a fullscreen `<video>` tag with `src="/Lifetracker/TimeCompass_Intro.mp4"`
- `autoPlay`, `muted`, `playsInline`
- Dismisses via `onEnded` (natural completion) or `onError` (fallback)
- Session-gated: `sessionStorage.getItem('timecompass-intro-shown')` — shows only once per browser session

**Dead code:** The component destructures four settings properties that are no longer used:
```ts
const { splashPhilosophyText, splashPrizeImage, splashDismissMode, splashDuration } = state.settings;
```
None of these four variables are referenced anywhere in the new video implementation.

**Orphaned CSS:** `.splash-screen` and `.splash-cover` classes remain in App.css (lines 126–147) but are never applied — the new component uses only inline styles.

---

## 6. manifest.json — Icons Array

```json
[
  { "src": "icon-192x192.png",          "sizes": "192x192", "type": "image/png", "purpose": "any"       },
  { "src": "icon-512x512.png",          "sizes": "512x512", "type": "image/png", "purpose": "any"       },
  { "src": "icon-192x192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"  },
  { "src": "icon-512x512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"  }
]
```

**Gap:** `icon-180x180.png` and `icon-180x180-maskable.png` exist in `public/` but are absent from `manifest.json`. The 180×180 non-maskable icon IS wired for Apple via `index.html`:
```html
<link rel="apple-touch-icon" sizes="180x180" href="/Lifetracker/icon-180x180.png" />
```
The maskable 180×180 variant (`icon-180x180-maskable.png`) is present in public/ but referenced nowhere.

---

## 7. Open Pull Requests

**No open PRs** exist in the `rabbitwhite/lifetracker` repository as of this audit.

Graphics-related work was delivered across several merged PRs:
- **PR #47** (feature/intro-animation) — replaced SplashScreen with video player; most recent merge
- Earlier PRs (#44–#46) covered Drive sync; graphics/parchment theme changes appear to have landed before those in the Main branch history

No `.github/` issues or PRs reference `time-compass-graphics` as a branch name.

---

## 8. Summary

### What Appears Complete

| Item | Status |
|------|--------|
| Parchment CSS color variables (`:root`) | ✅ Done |
| `background.png` wired as body background | ✅ Done |
| `manifest.json` parchment colors match CSS | ✅ Done |
| PWA icons 192/512 (any + maskable) in manifest | ✅ Done |
| Apple Touch Icon 180×180 in index.html | ✅ Done |
| `TimeCompass_Intro.mp4` in `graphics/` + symlinked to `public/` | ✅ Done |
| SplashScreen migrated from static image to video | ✅ Done |
| Video auto-dismisses on end/error | ✅ Done |
| Session gate prevents replay on navigation | ✅ Done |

### What Appears Broken or Missing

| Item | Detail |
|------|--------|
| **Dark theme bleed in header/nav/modal** | `.app-header`, `.bottom-nav`, `.modal-content` use hardcoded near-black `rgba(15,15,30,...)` values — visually inconsistent with parchment theme |
| **Dead code in SplashScreen.tsx** | Four settings variables destructured but never used: `splashPhilosophyText`, `splashPrizeImage`, `splashDismissMode`, `splashDuration` |
| **Orphaned CSS classes** | `.splash-screen` + `.splash-cover` in App.css are unreferenced (new component uses inline styles) |
| **cover.png orphaned** | `public/cover.png` (2.8MB) still present but no longer referenced by any component |
| **icon-180x180-maskable.png unreferenced** | Present in `public/` but missing from `manifest.json` and not linked in `index.html` |
| **app-icon.png unclear usage** | `public/app-icon.png` (1.36MB) — not in manifest, no grep evidence of usage in components |
| **Video symlink not production-safe** | `public/TimeCompass_Intro.mp4` is a symlink for local dev only; production serving depends on the build pipeline copying the real file — this is fragile and environment-dependent |
| **Icon generation pipeline undocumented** | `graphics/Icon.png` is the source icon but no script/task generates the derived 180/192/512 variants; relationship is implicit |

### What Remains from the Original Brief

| Brief Item | Current State |
|-----------|---------------|
| **Graphics swap** (background, cover, icon) | Partially done — background.png is live; cover.png present but now unused (splash replaced by video); icon source in graphics/ but derivation pipeline unclear |
| **CSS parchment theme** | Mostly done — variables correct, but dark-mode bleed in structural components (header, nav, modals) not yet fixed |
| **Icon shape fix** | Uncertain — icons are present and wired, but it's unclear if the 180/192/512 files were regenerated from the new `graphics/Icon.png`; maskable-180 variant is dangling |
| **Splash timing fix** | Superseded — the timed splash was replaced entirely with a video player (auto-dismisses on end). The timing logic is gone; this could be considered resolved or could be considered scope-changed depending on the brief |
