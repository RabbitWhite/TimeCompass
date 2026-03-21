# Agent Guidelines

- Default branch is Main (capital M) — all PRs target Main, all workflow triggers use Main
- GitHub Pages deploys via GitHub Actions from dist/ — never change Pages source setting to "Deploy from branch"
- Never push directly to Main — always use a PR
- Run ./build-cdn.sh and verify dist/ is complete before committing
- Never revert a PR without first auditing exactly what will be lost
