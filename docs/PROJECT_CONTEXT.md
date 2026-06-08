# Project Context

## Session Bootstrap

This repository is a native WeChat Mini Program for managing badminton contests. The main value is creating a doubles match, generating balanced doubles pairings from player skill scores, storing matches locally, entering scores, and viewing player statistics.

For a new coding session, read this file first, then inspect the specific page or function you plan to touch. Non-trivial changes should follow the repository instructions from `AGENTS.md`: brainstorm/design first, wait for approval, write a plan, then implement surgically.

## What This Project Is

- Product: badminton contest management Mini Program.
- Runtime: WeChat Mini Program, configured by `app.json` and `project.config.json`.
- Data persistence: local device storage via `wx.getStorageSync`, `wx.setStorageSync`, and `wx.removeStorageSync`.
- Primary storage key: `matches`.
- Current branch when this context was written: `master...origin/master`; `git status` may print `fsmonitor_ipc__send_query` before normal branch output.

The app currently focuses on doubles. The create page exposes `单打` and `双打`, but `generateSinglesMatches` is an empty implementation.

## Repository Map

- `app.json`: Mini Program pages, tab bar, global window settings, and component framework settings.
- `app.js`, `app.wxss`: app shell files with little business logic.
- `pages/index/`: startup page that redirects to `pages/create-match/create-match` via `wx.switchTab`.
- `pages/create-match/`: main creation UI and the active doubles match-generation algorithm. This is the most important area for scheduling changes.
- `pages/match-list/`: loads `matches` from local storage, sorts by `createTime` or `id` descending, navigates to detail, and deletes matches.
- `pages/match-detail/`: displays match info and generated pairings, stores scores/completed state, and calculates ranking statistics.
- `pages/profile/`: user profile, data import/export, and data clearing.
- `pages/logs/`: standard logs page scaffold.
- `test/test-doubles-match.js`: Node.js smoke test with a copied version of the doubles algorithm stripped of `wx` dependencies.
- `utils/badminton-planning.js`: currently only an empty `generateMatches` stub; it is not the active runtime path.
- `utils/badminton_planning.py` and `utils/dp.py`: exploratory Python algorithm files, not used by the Mini Program runtime.
- `chore/`: experiment inputs, benchmark scripts, logs, and sample stored data.
- `docs/superpowers/`: prior design and implementation-plan notes, especially around MRV backtracking and `courtCount`.

## Runtime And Tooling

Open the project in WeChat Developer Tools. There is no `package.json` or npm-based app runner in the current repository.

Useful local commands:

```bash
node test/test-doubles-match.js
rg --files
git status --short --branch
```

`test/test-doubles-match.js` is the main quick verification command for doubles scheduling. It is not a full test suite; it is a smoke test with duplicated algorithm code.

## Main User Flows

Create match:

1. User opens the create tab.
2. User enters match name, type, max players, court count, player names, and player skill scores.
3. User taps create, then chooses `levelGap` and `rounds`.
4. `createMatch` calls `generateDoublesMatches` for doubles.
5. Generated match data is prepended into `wx` local storage key `matches`.
6. App switches to the match-list tab.

View and score match:

1. Match list loads local `matches`, sorts newest first, and opens detail via `pages/match-detail/match-detail?id=<id>`.
2. Detail page loads the match by numeric `id`.
3. Users enter team scores and toggle each generated match between complete and modify states.
4. Completed matches move below incomplete matches.
5. Switching to the statistics tab recalculates wins and score difference.

Import/export:

1. Profile page can import pasted JSON arrays.
2. Valid imported matches are appended to existing local `matches`.
3. Export copies raw JSON to the clipboard.
4. Clear data removes the `matches` key.

## Data Model

Top-level match objects are stored in local storage under `matches` as an array. The create path currently writes this shape:

```js
{
  id: Date.now(),
  name: string,
  date: "YYYY-MM-DD",
  time: "HH:mm",
  location: "待定",
  type: "单打" | "双打",
  maxPlayers: number,
  players: [{ name: string, score: number }],
  levelGap: number,
  rounds: number,
  status: "报名中",
  createTime: string,
  matches: GeneratedMatch[],
  playerCounts: { [playerName]: number },
  byeCounts: {}
}
```

Generated doubles matches use this shape:

```js
{
  id: number,
  team1: {
    player1: { name: string, level: number },
    player2: { name: string, level: number },
    levelSum: number,
    score?: string
  },
  team2: {
    player1: { name: string, level: number },
    player2: { name: string, level: number },
    levelSum: number,
    score?: string
  },
  levelDiff: number,
  completed?: boolean,
  hasConflict?: boolean,
  conflictWith?: number,
  conflictScore?: number
}
```

Important compatibility notes:

- `match-detail` expects `match.rounds` to exist and shows an error if it is missing.
- `completed` is added lazily when details are loaded.
- Team `score` fields are created by score inputs in `match-detail`, not during scheduling.
- Imported data validation is intentionally shallow: it checks required top-level fields and basic player/status validity, but not the full generated match schema.

## Doubles Match Generation

The active doubles algorithm lives inside `pages/create-match/create-match.js`. It is page-local, not imported from `utils`.

Main path:

1. `generateDoublesMatches`
2. Build `playersObj` as `{ [name]: score }`.
3. Optionally shuffle `playerList` if `shouldShufflePlayers` is enabled.
4. Retry up to `MAX_RETRIES = 5` when conflict count remains nonzero.
5. `generatePlayerPairs` creates all 2-player combinations.
6. `generateValidMatches` pairs two disjoint pairs into one doubles match when `abs(level1 - level2) <= levelGap`.
7. `selectMatchesByStrategy` tries:
   - `selectBalancedMatchesBackTraceMRV`
   - `selectBalancedMatches`
8. `formatMatches` converts raw pairings into UI data.
9. `optimizeMatchSequence` tries to reduce same-round player conflicts.
10. `calculateTotalConflicts` evaluates conflicts by grouping matches into batches of `courtCount`.

Core constraints:

- Doubles requires at least 4 players.
- `numMatches` must be positive.
- `levelGap` cannot be negative.
- Exact equal participation requires `(numMatches * 4) % playerCount === 0`; MRV returns `null` if this is not true.
- Round options are currently `n`, `2n`, and `3n`, where `n = players.length`.
- `courtCount` is exposed as 1 or 2 courts in the UI. Conflict detection is generic batch logic over `courtCount`, but the UI only offers those two values.

MRV backtracking notes:

- `selectBalancedMatchesBackTraceMRV` maps players to numeric indexes and uses in-place arrays for counts.
- It tracks `counts`, `supply`, `used`, `excluded`, and selected match indexes.
- It has both a `TIME_LIMIT = 10000` ms and `STEP_LIMIT = 200000`.
- It returns formatted matches on success and `null` on timeout, step limit, or unsatisfied constraints.
- If MRV fails, the random brute-force fallback `selectBalancedMatches` can still throw after 10,000 attempts.

Conflict optimization notes:

- Conflicts mean repeated players inside one simultaneous court batch, not merely adjacent list items.
- `calculateTotalConflicts`, `reorderMatchesByConflict`, and `showConflictSummary` all use `courtCount` batches.
- Conflict-heavy batches are marked with `hasConflict`, `conflictWith`, and `conflictScore`, then moved later.
- `attemptOptimization` is greedy and starts from the first match, so generated order can be input-order sensitive.

## Scoring And Statistics

`pages/match-detail/match-detail.js` owns score entry and statistics.

- `onScoreInput` mutates `team1.score` or `team2.score` in page state.
- `toggleComplete` toggles `completed`, sorts incomplete matches before completed matches, and persists updated `matches` back into the stored match object.
- `calculatePlayerStats` only counts completed matches with both team scores.
- Wins are credited to players on the higher-scoring team.
- Score difference is added positively for winners and negatively for losers.
- Ties do not affect wins or score difference.
- Ranking sort is by wins descending, then score difference descending.

## Import, Export, And Local Data

`pages/profile/profile.js` manages user profile and local data utilities.

- Import expects a JSON array.
- Valid imported matches receive `importTime` and are appended after existing matches.
- Export copies `JSON.stringify(matches, null, 2)` to the clipboard.
- Clear removes `matches` from local storage.
- User profile uses older `wx.getUserInfo` style in places; treat profile API changes carefully if modernizing.

## Verification

Before claiming scheduling work is complete, run:

```bash
node test/test-doubles-match.js
```

Expected signs of success:

- Process exits with code 0.
- Output reports `出场次数是否均等: ✅ 是`.
- Output reports `同轮次冲突数: ✅ 0` or an explicit conflict count depending on the sample.

If you change scheduling logic in `pages/create-match/create-match.js`, also update `test/test-doubles-match.js` if the copied algorithm should remain representative. This duplication is a known maintenance hazard.

For Mini Program UI changes, verify in WeChat Developer Tools. There is no local web dev server for this project.

## Known Risks And Sharp Edges

- `generateSinglesMatches` is empty, even though the UI allows choosing `单打`.
- The active scheduling implementation is embedded in `pages/create-match/create-match.js`, making the file large and easy to accidentally break.
- `test/test-doubles-match.js` duplicates page logic instead of importing it.
- `utils/badminton-planning.js` is not used and should not be mistaken for the real algorithm.
- Dynamic programming helper functions at the end of `create-match.js` appear not to be connected to `selectMatchesByStrategy`.
- `sleep(ms)` is a synchronous busy wait and can block the Mini Program main thread.
- `calculateSearchSpace` still includes a state-space multiplier, but the active MRV strategy no longer depends on that older backtracking gate.
- Round options are based on player count only; not every arbitrary future option will satisfy equal-participation divisibility.
- Player identity is the player name string. Duplicate names can collide in `playersObj`, `playerCounts`, and statistics.
- Imported data can bypass many invariants because validation is shallow.
- Match deletion and clear-data operations are destructive local-storage changes.

## Working Guidelines For Future Sessions

- Preserve user changes. Do not reset or revert unrelated files.
- Keep changes surgical; this codebase is small but the create page is dense.
- For non-trivial edits, follow the repository workflow: design approval first, then plan, then implementation.
- For algorithm changes, start by reading `pages/create-match/create-match.js`, `test/test-doubles-match.js`, and the relevant docs under `docs/superpowers`.
- Prefer extracting reusable algorithm logic only if the user approves that refactor; it is a real behavioral surface because the current runtime code is page-local.
- When touching local-storage schema, account for older imported or already-stored matches.
- When touching score/statistics behavior, check both `match-detail.js` and `match-detail.wxml`.
- When touching create-form options, check both `create-match.js` and `create-match.wxml`.
