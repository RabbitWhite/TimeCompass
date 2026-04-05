# Build Automation Audit — `.github/workflows/deploy.yml`

Audited: 2026-04-05

---

## Current file contents

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [Main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
        env:
          FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## Findings

### Triggers

| Trigger | Detail |
|---|---|
| `push` to `Main` | Runs automatically on every commit merged to `Main` |
| `workflow_dispatch` | Can also be triggered manually from the GitHub Actions UI |

### Steps

1. **`actions/checkout@v4`** — Checks out the repository at the pushed commit. The `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env var opts into Node 24 for the action runner; no effect on the build itself.
2. **`actions/configure-pages@v5`** — Configures the GitHub Pages environment (sets base URL etc.).
3. **`actions/upload-pages-artifact@v3`** — Packages the `dist/` directory as the Pages artifact. This is where the deployed content comes from.
4. **`actions/deploy-pages@v4`** — Publishes the uploaded artifact to GitHub Pages and outputs the live URL.

### Does it compile anything?

**No.** The workflow uploads whatever is already present in `dist/` at checkout time. It assumes `dist/` is pre-built and committed to the repository. There is no install, no TypeScript compilation, and no call to `build-cdn.sh`.

### Current dependency on committed dist/

Because `dist/` is listed in `.gitignore`, it is normally untracked. The `build/ux-redesign-dist` branch force-added it as a workaround, but on a normal `Main` push `dist/` will not be present in the checkout, and the upload step will fail or deploy stale/empty content.

---

## What would need to change to run `./build-cdn.sh` automatically

### 1. Install TypeScript on the runner

`build-cdn.sh` invokes `tsc` directly (no `node_modules`). The `ubuntu-latest` runner does not include `tsc` by default. It must be installed before the build step, e.g.:

```yaml
- name: Install TypeScript
  run: npm install -g typescript
```

### 2. Add a build step before the upload

Insert a new step between checkout and `Setup Pages`:

```yaml
- name: Build
  run: bash ./build-cdn.sh
```

### 3. Remove dist/ from .gitignore (or leave it untracked)

If `dist/` is built on the runner there is no need to commit it. The `.gitignore` entry can stay as-is; the runner generates `dist/` at build time and the upload step consumes it from the working directory — it is never committed.

### Minimal final workflow shape

```yaml
steps:
  - uses: actions/checkout@v4
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

  - name: Install TypeScript
    run: npm install -g typescript

  - name: Build
    run: bash ./build-cdn.sh

  - name: Setup Pages
    uses: actions/configure-pages@v5

  - name: Upload artifact
    uses: actions/upload-pages-artifact@v3
    with:
      path: dist

  - name: Deploy to GitHub Pages
    id: deployment
    uses: actions/deploy-pages@v4
```

No other permissions, secrets, or caching changes are strictly required, though adding a `actions/cache` step for the global `tsc` install would speed up repeated runs.
