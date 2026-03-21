# LifeTracker Deploy Audit 2

**Date:** 2026-03-21
**Branch:** claude/fix-mobile-syncing-a0x4o

---

## 1. What files does the root actually need — is the app supposed to run from root-level files or from dist/?

**The app is intended to run from `dist/` only.**

The root `index.html` is a **Vite development entry point**, not a production file:

```html
<!-- root/index.html — DEV ONLY -->
<script type="module" src="/src/main.tsx"></script>
```

It references `src/main.tsx` — a TypeScript file that only works when Vite's dev server is running (`npm run dev`). Served statically (as GitHub Pages does), this script tag will 404 immediately and the app will be blank.

The production-ready file is **`dist/index.html`**, which:
- Loads React from CDN via an importmap (esm.sh)
- References compiled `main.js` with the correct base path `/Lifetracker/main.js`
- Includes the compiled CSS link
- Includes the Google GSI client script

The rest of `dist/` is equally purpose-built for static serving:
- All `.js` files are compiled TypeScript with JSX transpiled and `.js` extensions on imports
- `sw.js` has the `__PRECACHE_MANIFEST__` placeholder replaced with actual URLs + a git-SHA cache name
- `manifest.json`, icons, `.nojekyll`, and `404.html` are all production assets
- There are no npm dependencies — React loads from CDN via importmap

**Root-level JS/TS files (`src/`) are source only and must never be served directly.**

---

## 2. Should GitHub Pages be changed to deploy from dist/, or should build output go to root?

**GitHub Pages source must be set to "GitHub Actions" — not to any branch + folder.**

This is the core issue. There are two mutually exclusive ways to configure GitHub Pages:

| Mode | How it works |
|---|---|
| **Deploy from branch** | Pages statically serves a specific branch + folder (e.g. `main /`, `main /docs`, or a `gh-pages` branch). GitHub reads directly from git. |
| **GitHub Actions** | Pages receives its content from a workflow via `actions/upload-pages-artifact` + `actions/deploy-pages`. Git content is irrelevant to serving. |

The current `deploy.yml` uses the **GitHub Actions** method. It uploads `./dist` as the Pages artifact and deploys it via `actions/deploy-pages`. This is correct.

However, if the Pages source in repo Settings is set to **"Deploy from branch → main → / (root)"**, then:
- The workflow's artifact upload is **ignored entirely**
- GitHub Pages serves the raw root `index.html` (the broken dev file)
- The workflow "succeeds" but its artifact is never used

**The fix is purely a repo settings change — no code changes required:**

> **Settings → Pages → Build and deployment → Source → GitHub Actions**

Once set to "GitHub Actions", the workflow takes over and Pages will serve `dist/` content as intended. The root `index.html` becomes irrelevant to production serving (it stays in the repo as a dev convenience only).

---

## 3. Is deploy.yml using upload-pages-artifact with path: ./dist — contradiction with Pages set to root?

**Yes — confirmed contradiction.**

`deploy.yml` (`.github/workflows/deploy.yml`):

```yaml
- uses: actions/upload-pages-artifact@v3
  with:
    path: ./dist

# ...

- id: deployment
  uses: actions/deploy-pages@v4
```

This is the **correct workflow configuration** for deploying `dist/`. The workflow:
1. Installs dependencies (`npm install`)
2. Runs the full build (`tsc -b && vite build && node generate-sw-manifest.js`)
3. Uploads `./dist` as the Pages artifact
4. Deploys that artifact via the Pages API

**But** if GitHub Pages in repo settings is configured to serve from the branch root, the Pages API deployment from the workflow is superseded by the branch-based serving. The `actions/deploy-pages` step may appear to succeed (it uploads the artifact successfully), yet the site served to visitors comes from git — the root `index.html` with its `src/main.tsx` reference.

This explains exactly why the root `index.html` is being served: the Pages source setting is overriding the workflow's artifact.

---

## Findings Summary

| Question | Finding |
|---|---|
| Where should the app run from? | `dist/` only. Root `index.html` is dev-only (requires Vite). |
| Should Pages deploy from `dist/` or root? | From `dist/` via GitHub Actions — never from root. |
| Is there a contradiction in deploy.yml vs Pages config? | Yes. Workflow correctly targets `dist/`, but Pages source setting (root) overrides it. |

---

## Single Correct Deploy Configuration

### Code (already correct — no changes needed):
- `deploy.yml` — correct as-is (`path: ./dist`, uses `upload-pages-artifact` + `deploy-pages`)
- `vite.config.ts` — correct (`base: '/Lifetracker/'`)
- `dist/index.html` — correct production entry point
- `root/index.html` — fine as a dev file, irrelevant to production

### One required change (repo settings, not code):

> **GitHub repo → Settings → Pages → Build and deployment → Source → set to "GitHub Actions"**

This single change makes the workflow the authority for what gets served. From that point:
- Every push to `Main` (or `claude/lifetracker-mobile-app-xnOiw`) triggers a build + deploy of `dist/`
- The site at `https://<owner>.github.io/Lifetracker/` will serve `dist/index.html`
- The root `index.html` will never be served in production

### Nothing else needs to change.
