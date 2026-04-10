# Agent Guidelines

- Default branch is Main (capital M) — all PRs target Main, all workflow triggers use Main
- GitHub Pages deploys via GitHub Actions from dist/ — never change Pages source setting to "Deploy from branch"
- Never push directly to Main — always use a PR
- Run ./build-cdn.sh and verify dist/ is complete before committing
- Never revert a PR without first auditing exactly what will be lost
- At the start of every session, check for missions/next_mission.md — if it exists, read it and execute it

## Build Environment

### build-cdn.sh
- Uses `npx tsc` — do not call `tsc` directly, it is not in PATH
- Uses `python` — do not use `python3`, it is not in PATH on Windows
- Must be run from the repo root
- Regenerates `dist/` — always run before deploying
- Never run autonomously — always wait for explicit instruction
