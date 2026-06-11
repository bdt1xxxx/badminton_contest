# Project Context

Last updated: 2026-06-09

## How To Use This File

Goal: let a new Claude/Codex session load this project context in 1-2 minutes.

Recommended session start:

1. Read this file once.
2. Run `git status --short --branch` to confirm branch and local changes.
3. Open the specific page/module you will modify.
4. For non-trivial changes, follow `AGENTS.md` workflow (design -> approval -> plan -> implement).

## Project Snapshot

- Product: WeChat Mini Program for badminton contest management.
- Main supported mode: doubles (`双打`).
- Singles (`单打`) UI exists, but scheduling implementation is incomplete (`generateSinglesMatches` is empty).
- Runtime: native Mini Program (`app.json`, page-based architecture), no npm app runner.
- Storage: local device storage via `wx.getStorageSync` / `wx.setStorageSync`.
- Primary storage key: `matches`.

## Core Product Flows

### 1) Create match

1. User fills match form on `pages/create-match/create-match`.
2. For doubles, app generates pairings with the in-page algorithm.
3. New match object is prepended into storage key `matches`.
4. App navigates to match list tab.

### 2) Score and ranking

1. `pages/match-list` loads and sorts matches (newest first).
2. `pages/match-detail` edits scores and completion state.
3. Ranking is recalculated from completed matches only.

### 3) Import / export

1. `pages/profile` imports JSON arrays into `matches`.
2. Export copies raw JSON to clipboard.
3. Clear removes `matches` from storage.

## Key Code Map

- `app.json`: global app/page config.
- `pages/index/`: startup redirect to create page.
- `pages/create-match/create-match.js`: active doubles scheduling logic (most critical file).
- `pages/match-list/match-list.js`: match list load/sort/delete/navigation.
- `pages/match-detail/match-detail.js`: score input, completion toggle, stats.
- `pages/profile/profile.js`: import/export/clear local data.
- `test/test-doubles-match.js`: Node smoke test with copied scheduling logic.
- `utils/badminton-planning.js`: stub, not active runtime path.
- `docs/superpowers/`: historical design/plan docs.

## Data Contract (Storage)

Stored under key `matches` as an array of match objects.

Important fields expected by runtime:

- Match-level: `id`, `name`, `type`, `players`, `rounds`, `matches`, `status`, `createTime`.
- Generated match-level: `team1`, `team2`, `levelDiff`, optional `completed`, conflict metadata.

Compatibility note:

- `pages/match-detail` expects `rounds`; missing it can break detail display.

## Scheduling System Notes (Doubles)

Active algorithm location: `pages/create-match/create-match.js`.

High-level pipeline:

1. Build player map/list.
2. Generate all 2-player pairs.
3. Build valid doubles matches under `levelGap` constraint.
4. Select balanced matches (MRV backtracking first, fallback random strategy).
5. Format output and optimize order by `courtCount` conflict reduction.

Key constraints:

- Need at least 4 players for doubles.
- Equal participation target depends on `(numMatches * 4) % playerCount === 0`.
- MRV has time/step limits and can return `null`.
- Fallback strategy can still fail after many attempts.

Conflict definition:

- Conflict is per simultaneous court batch (`courtCount`), not just adjacent list rows.

## Verification Commands

Primary quick check:

```bash
node test/test-doubles-match.js
```

Useful repo checks:

```bash
git status --short --branch
rg --files
```

Notes:

- This repo currently has no full automated test suite.
- `test/test-doubles-match.js` duplicates scheduling logic; keep it aligned when algorithm changes.

## Known Gaps / Risks

1. Singles scheduling is not implemented.
2. Core doubles algorithm is embedded in a large page file (high regression risk).
3. Test logic duplicates production logic (drift risk).
4. `utils/badminton-planning.js` can be mistaken as active implementation but is not.

## Session Startup Prompt (Copy/Paste)

Use this at the start of a new Claude/Codex chat:

```text
Read docs/PROJECT_CONTEXT.md first, then run `git status --short --branch`.
I will tell you the exact feature/bug target next.
For non-trivial changes, follow AGENTS.md workflow:
1) design with options/tradeoffs and wait for my approval
2) write implementation plan
3) implement surgically in relevant files
4) run verification commands and summarize results
Do not refactor unrelated code.
```

## Update Rules

Update this file when one of these changes:

1. Core user flows change.
2. Storage schema expectations change.
3. Scheduling strategy/path changes.
4. Verification command or project bootstrap process changes.

Keep this file concise. Deep technical analysis should go into `docs/superpowers/specs/` or code comments near implementation.
