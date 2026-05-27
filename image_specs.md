# TimeCompass Image Specifications

Complete inventory of every image asset in the repository — filenames, dimensions, locations, and how each is referenced — followed by a designer checklist for a full rebrand.

---

## 1. Source Graphics (high-resolution originals)

These files live in `graphics/` and serve as master originals from which deployed assets are derived.

| File | Dimensions | Format | Color mode |
|------|-----------|--------|------------|
| `graphics/Background.png` | 1024 × 1536 px | PNG | RGB (no transparency) |
| `graphics/Cover.png` | 1024 × 1536 px | PNG | RGB (no transparency) |
| `graphics/Icon.png` | 1024 × 1024 px | PNG | RGB (no transparency) |

---

## 2. Deployed Public Assets

These files live in `public/` and are copied verbatim into `dist/` by the Vite build. They are the files actually served to users.

| File | Dimensions | Format | Color mode | Actively referenced |
|------|-----------|--------|------------|-------------------|
| `public/background.png` | 1024 × 1536 px | PNG | RGB (no transparency) | Yes — `src/App.css` |
| `public/cover.png` | 1024 × 1536 px | PNG | RGB (no transparency) | No (present, unreferenced) |
| `public/app-icon.png` | 802 × 802 px | PNG | RGBA (transparency) | No (present, unreferenced) |
| `public/icon-180x180.png` | 180 × 180 px | PNG | RGBA (transparency) | Yes — `index.html` |
| `public/icon-180x180-maskable.png` | 180 × 180 px | PNG | RGBA (transparency) | No (present, unreferenced) |
| `public/icon-192x192.png` | 192 × 192 px | PNG | RGBA (transparency) | Yes — `public/manifest.json` |
| `public/icon-192x192-maskable.png` | 192 × 192 px | PNG | RGBA (transparency) | Yes — `public/manifest.json` |
| `public/icon-512x512.png` | 512 × 512 px | PNG | RGBA (transparency) | Yes — `public/manifest.json` |
| `public/icon-512x512-maskable.png` | 512 × 512 px | PNG | RGBA (transparency) | Yes — `public/manifest.json` |

---

## 3. References in `public/manifest.json`

The PWA manifest at `public/manifest.json` (also mirrored at `dist/manifest.json`) declares four icon entries:

```json
"icons": [
  {
    "src": "icon-192x192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "icon-512x512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "icon-192x192-maskable.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "maskable"
  },
  {
    "src": "icon-512x512-maskable.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "maskable"
  }
]
```

All four `src` values are relative paths resolved against the manifest URL, which is served from `/TimeCompass/` (the Vite `base` path). The manifest also sets:
- `background_color`: `#0f0f1a` (used as placeholder while icons load)
- `theme_color`: `#6c63ff`

---

## 4. References in `index.html`

`index.html` (project root) contains two image-related `<link>` tags:

```html
<!-- Line 9: PWA manifest (contains further icon references) -->
<link rel="manifest" href="/TimeCompass/manifest.json" />

<!-- Line 10: Apple home-screen icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/TimeCompass/icon-180x180.png" />
```

There are no `<img>` tags, inline `<svg>` image elements, or other image references in `index.html`. No `favicon.ico` exists; the app relies on the manifest icons and the apple-touch-icon for all platform-specific icon needs.

---

## 5. References in Source Code

### `src/App.css` — body background image

**Line 29:**
```css
background-image: url('/TimeCompass/background.png');
```
Applied to the `body` element. The image tiles/covers the full viewport. The app's dark background color (`#0f0f1a`) shows through until the image loads.

All other CSS "icon" references in `App.css` (`.icon-grid`, `.icon-option`) are CSS class names for UI widget layout, not image files.

### `src/components/SplashScreen.tsx` — user-uploaded prize image

The splash screen supports an optional "prize image" configured by the user:

```tsx
// Line 8
const { splashPhilosophyText, splashPrizeImage, splashDismissMode, splashDuration } = state.settings;

// Lines 56–65
{splashPrizeImage && (
  <img
    src={splashPrizeImage}
    alt="Prize"
    style={{ maxHeight: '60vh', maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
  />
)}
```

`splashPrizeImage` is a base64 data URL created from a file the user uploads at runtime via `src/App.tsx`. It is **not** a static asset checked into the repository; its dimensions are entirely determined by whatever image the user provides. This field is not part of a rebrand replacement set.

### `src/pages/FocusAreas.tsx` and `src/components/BottomNav.tsx`

These files reference CSS class names containing "icon" (`icon-grid`, `icon-option`) and render SVG path data inline as React elements. They do **not** reference any image files.

---

## 6. No Other Image Formats

The repository contains no `.ico`, `.jpg`/`.jpeg`, `.gif`, `.svg` (file), `.webp`, or `.bmp` files. Every image asset is PNG. All in-UI iconography (navigation icons, focus-area icons) is rendered as inline SVG `<path>` data — not image files — and therefore is not part of the image replacement set.

---

## 7. Designer Replacement Checklist

The following table is the complete set of files a designer must provide to fully rebrand the app. Replace every file listed here and no other image references in the codebase need to change.

### Required (actively referenced in code or manifest)

| # | Filename | Dimensions | Notes |
|---|----------|-----------|-------|
| 1 | `public/background.png` | **1024 × 1536 px** | Full-bleed portrait background applied to `body` via CSS. No transparency — the image fills the entire app background on all screen sizes. Match the existing dark palette (`#0f0f1a` base) or replace entirely. |
| 2 | `public/icon-192x192.png` | **192 × 192 px** | PWA home-screen icon (`purpose: any`). Can have transparent regions. Used by Android and desktop browsers. |
| 3 | `public/icon-512x512.png` | **512 × 512 px** | PWA high-res icon (`purpose: any`). Used by splash screens and app stores. Can have transparent regions. |
| 4 | `public/icon-192x192-maskable.png` | **192 × 192 px** | PWA maskable icon (`purpose: maskable`). Must follow the [maskable icon spec](https://web.dev/maskable-icon/): keep all visual content inside the central **safe zone** (roughly 80% of the canvas, i.e. within a centered 154 × 154 px circle). The full 192 × 192 px area, including edges, will be visible and should have a solid, opaque background color. |
| 5 | `public/icon-512x512-maskable.png` | **512 × 512 px** | PWA maskable icon (`purpose: maskable`). Same maskable requirements as above; safe zone is a centered ~410 × 410 px circle. Full canvas must be opaque. |
| 6 | `public/icon-180x180.png` | **180 × 180 px** | Apple touch icon (iOS home screen, `<link rel="apple-touch-icon">`). No transparency — Apple renders this on a white/rounded-rect background if transparent; provide a solid background. Exactly 180 × 180 px per Apple guidelines. |

### Present in `public/` but not currently referenced

These files exist in the deployed directory but have no active reference in HTML, CSS, JS, or the manifest. They may have been intended for marketing, app store listings, or future use. Replace them to keep assets consistent, but the app will not break if they are omitted.

| # | Filename | Dimensions | Notes |
|---|----------|-----------|-------|
| 7 | `public/cover.png` | **1024 × 1536 px** | Portrait cover image, possibly for app store or onboarding use. No transparency. |
| 8 | `public/app-icon.png` | **802 × 802 px** | Square icon at a non-standard size. No reference found in code or manifest. Purpose unclear; may be a draft or staging asset. |
| 9 | `public/icon-180x180-maskable.png` | **180 × 180 px** | Maskable variant of the Apple touch icon size. Not referenced anywhere. |

### Source master files (optional but recommended)

Replace these to keep the `graphics/` source library consistent with deployed assets.

| # | Filename | Dimensions | Notes |
|---|----------|-----------|-------|
| 10 | `graphics/Icon.png` | **1024 × 1024 px** | Master icon at full resolution. Deployed icon sizes are derived from this. |
| 11 | `graphics/Background.png` | **1024 × 1536 px** | Master background at full resolution. |
| 12 | `graphics/Cover.png` | **1024 × 1536 px** | Master cover image at full resolution. |

---

## 8. Summary

| Category | Count | Files |
|----------|-------|-------|
| Actively referenced PNG assets | 6 | `background.png`, `icon-180x180.png`, `icon-192x192.png`, `icon-192x192-maskable.png`, `icon-512x512.png`, `icon-512x512-maskable.png` |
| Present but unreferenced PNG assets | 3 | `cover.png`, `app-icon.png`, `icon-180x180-maskable.png` |
| Source master PNG files | 3 | `graphics/Icon.png`, `graphics/Background.png`, `graphics/Cover.png` |
| Dynamic (user-uploaded, not static) | 1 | `splashPrizeImage` (base64 data URL, not a file) |
| **Total static image files in repo** | **12** | |

No SVG files, ICO files, JPEG, GIF, WebP, or BMP files exist anywhere in the repository. All in-app iconography is rendered as inline SVG `<path>` elements in React components and is not part of the image asset replacement set.
