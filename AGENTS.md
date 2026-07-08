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

## Discord MCP Missions
These rules apply to any task that uses the Discord MCP server tools.

### Capability Check — Run Before Any Other Steps
- Call discord_list_servers to confirm the bot is connected and retrieve the guild ID. The guild ID is also available in the DISCORD_GUILD_ID environment variable.
- Call discord_get_server_info to verify the bot has the permissions required for the planned operations. Check the following before proceeding:
  - Creating, editing, or deleting channels: requires Manage Channels
  - Managing roles: requires Manage Roles
  - Sending or managing messages: requires Send Messages and View Channel
  - Creating or managing webhooks: requires Manage Webhooks
- List the available MCP tools and confirm every tool the mission requires is present in the manifest. If any required tool is missing, stop and report — do not attempt workarounds such as delete-and-recreate in place of a rename.
- If any capability check fails, stop immediately and report what is missing. Do not proceed with partial execution.

### Safety Rules
- Never delete an existing channel, message, role, or webhook unless the brief explicitly instructs it and explicitly acknowledges that the action is irreversible and may result in permanent loss of message history or configuration.
- Never rename a channel via delete-and-recreate without explicit instruction acknowledging history loss. A true rename (preserving history) requires the edit_channel tool — if that tool is not available, stop and report rather than substituting delete-and-recreate.
- Do one operation at a time. Confirm success of each operation before proceeding to the next.
- Do not modify any channel, role, or permission that is not explicitly listed in the mission brief.

### Common Guild Information
- Bot name: DevHub Agent#0197
- Guild ID: available in DISCORD_GUILD_ID environment variable
- Server name: My Dev Hub

## MISSION TIERS

Every mission is classified before work starts. When in doubt, it is Tier 1.

Tier 1 — full architect loop. A brief is drafted and approved in the planning conversation before Claude Code begins. Applies to: anything touching build, deploy, or CI configuration including GitHub Actions and Pages; cross-file structural changes or refactors; renames of files, namespaces, or identifiers used across files; anything touching authentication or OAuth; Unity scene or prefab wiring; Unreal Engine physics or input; database or storage schema changes; anything the mission itself describes as an audit.

Tier 2 — direct with plan approval. No separate brief. Claude Code is invoked directly in plan mode, presents its plan in-session, and proceeds only after explicit approval. Applies to: single-file bug fixes; dependency version bumps; documentation, lore, and other content-only text changes; adding tests without changing implementation; changes to standalone tooling scripts.

Escalation rule: if a Tier 2 mission turns out to require touching build or deploy configuration, more than three files, or anything on the Tier 1 list, stop immediately, report, and reclassify as Tier 1.

Both tiers: work on an agent/claude branch from main, open a PR targeting main, never merge without human review.
