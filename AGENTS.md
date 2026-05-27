# TimeCompass — Agent Guidelines

**Project:** TimeCompass (formerly LifeTracker)
**Local path:** ~/Workspace/TimeCompass
**GitHub repo:** github.com/RabbitWhite/TimeCompass
**Deployed at:** https://rabbitwhite.github.io/TimeCompass/

# Agent Guidelines

- Default branch is main — all PRs target main, all workflow triggers use main
- GitHub Pages deploys via GitHub Actions from dist/ — never change Pages source setting to "Deploy from branch"
- Never push directly to main — always use a PR
- Run ./build-cdn.sh and verify dist/ is complete before committing
- Never revert a PR without first auditing exactly what will be lost
- At the start of every session, check for missions/next_mission.md — if it exists, read it and execute it

## Post-Merge Checklist

After any mission that touches src/, public/, or any file that feeds into the build:

- The human must run bash build-cdn.sh locally after merging
- Then commit and push dist/ with message: Rebuild dist after [mission name]
- Never run build-cdn.sh autonomously
- Never commit dist/ as part of a mission branch — dist/ is always rebuilt and committed separately by the human after merge

This step is required for changes to go live on GitHub Pages. Forgetting it means the deployed app does not reflect the merged changes.

## Build Environment

### build-cdn.sh
- Uses `npx tsc` — do not call `tsc` directly, it is not in PATH
- Uses `python` — do not use `python3`, it is not in PATH on Windows
- Must be run from the repo root
- Regenerates `dist/` — always run before deploying
- Never run autonomously — always wait for explicit instruction
- tsconfig.cdn.json ignoreDeprecations must be "5.0" not "6.0"
- build-cdn.sh uses macOS sed — always use sed -i '' not sed -i
