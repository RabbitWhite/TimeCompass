# Lifetracker Build & Deploy Pipeline Audit

_Date: 2026-03-21_

---

## 1. Pipeline Overview

The project has **two separate build pipelines** that both output to `dist/`:

| Pipeline | Trigger | Output |
|---|---|---|
| **Vite/npm** (`npm run build`) | CI/CD via `deploy.yml` | `dist/` (Vite bundle) |
| **CDN standalone** (`build-cdn.sh`) | Manual, run locally | `dist/` (tsc + CDN importmap) |

The CDN pipeline (`build-cdn.sh`) is the production-ready path: it compiles TypeScript directly, rewrites imports to use `esm.sh` CDN URLs, generates a self-contained `dist/index.html` with an importmap, stamps `sw.js` with a git SHA for cache busting, and copies static assets from `public/`. It does **not** require npm or Vite to run.

The Vite pipeline is what the CI workflow currently calls. It produces a standard Vite bundle but requires `npm install`.

---

## 2. GitHub Pages Deployment Configuration

**File:** `.github/workflows/deploy.yml`

```yaml
- uses: actions/upload-pages-artifact@v3
  with:
    path: ./dist        # ← deploys from dist/, not root
- uses: actions/deploy-pages@v4
```

**Finding:** GitHub Pages is already configured to serve from `dist/` via the official Pages Actions API (`upload-pages-artifact` + `deploy-pages`). The deployment source is **not** the repo root.

---

## 3. Option A vs Option B — Recommendation

### Option A — Keep deploying from `dist/` (recommended — already in effect)

**Already implemented.** The workflow uploads `./dist`, so Pages serves from `dist/`. Both the Vite and CDN pipelines output there naturally.

Pros:
- Clean separation: `src/` = source, `dist/` = build output
- No repo root pollution with generated artifacts
- Consistent with Vite conventions and the CDN build
- `dist/` is gitignored, so built files never accidentally land in source history (except for the few files deliberately tracked)

### Option B — Copy `dist/` contents to repo root (not recommended)

Cons:
- Mixes compiled JS/CSS/HTML artifacts with source files (`src/`, `public/`, `tsconfig.json`, etc.)
- Creates a confusing repo layout that is harder to maintain
- Would require modifying `build-cdn.sh` to copy ~20+ files after every build
- Breaks the standard Vite project structure

**Verdict: Option A is already correct. No change to the deployment path is needed.**

---

## 4. Issues Found

### 4.1 Missing `<base href="/Lifetracker/">` in `index.html` (root and CDN template)

Both the Vite source `index.html` (repo root) and the HTML template inside `build-cdn.sh` are missing:

```html
<base href="/Lifetracker/" />
```

This tag tells the browser that all relative URLs (including SPA navigation and service worker scope) are relative to `/Lifetracker/`. Without it:
- Client-side routing can break when navigating directly to sub-routes
- The service worker may register with the wrong scope
- Relative asset fetches may resolve against `/` instead of `/Lifetracker/`

**Fix:** Add `<base href="/Lifetracker/" />` as the first element inside `<head>` in both locations. (Vite already handles absolute asset URL prefixing via `vite.config.ts: base: '/Lifetracker/'`, so the `<base>` tag is an additional safety net for the browser's URL resolution.)

### 4.2 Workflow triggers on `main` (lowercase), but default branch is `Main` (uppercase)

```yaml
on:
  push:
    branches: [main, claude/lifetracker-mobile-app-xnOiw]
```

The remote default branch is `Main` (confirmed via `git ls-remote`). GitHub branch matching in workflow triggers is **case-sensitive**. Pushes to `Main` will not trigger the deploy workflow.

**Fix:** Change `main` to `Main` in `deploy.yml`.

### 4.3 `dist/` is in `.gitignore` but contains tracked files

`.gitignore` lists `dist`, yet `dist/sw.js`, `dist/manifest.json`, and `dist/pages/Timeline.js` are tracked in git. This creates confusion — git will warn about ignored-but-tracked files and the CDN build's generated files won't survive a clean checkout without running the build first.

This is a pre-existing structural issue; resolving it fully is out of scope for this audit but worth noting.

---

## 5. Changes Applied

1. **`index.html` (root):** Added `<base href="/Lifetracker/" />` as first child of `<head>`.
2. **`build-cdn.sh`:** Added `<base href="/Lifetracker/" />` to the generated `dist/index.html` template.
3. **`.github/workflows/deploy.yml`:** Changed trigger branch `main` → `Main` to match the actual default branch name.

No changes were made to the deployment path — it remains `./dist`, which is already correct (Option A).
