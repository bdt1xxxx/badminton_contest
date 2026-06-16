# WeChat Mini Program Cloud Match Sharing (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cloud-backed match sharing and read-only viewer mode so matches can be shared by QR code while only owners can edit or delete cloud data.

**Architecture:** Keep current local `matches` list as the UI source of truth on device, and add a cloud mirror keyed by server-generated `matchId`. Every match detail open attempts cloud pull first, then falls back to local cache on failure. Edit/delete authority is enforced both in UI (`isEditable`) and cloud functions (`callerOpenId === ownerOpenId`).

**Tech Stack:** WeChat Mini Program (`wx.*` APIs), WeChat Cloud Database/Cloud Functions, existing pages under `pages/*`, local storage key `matches`.

---

### Task 1: Define Data Contract And Backward-Compatible Local Schema

**Files:**
- Modify: `docs/PROJECT_CONTEXT.md`
- Modify: `pages/create-match/create-match.js`
- Modify: `pages/match-detail/match-detail.js`
- Modify: `pages/match-list/match-list.js`

- [ ] **Step 1: Document the new cloud fields and compatibility rules**

Add explicit schema notes in `docs/PROJECT_CONTEXT.md`:
- `matchId: string` (cloud-generated unique id)
- `ownerOpenId: string`
- `updatedAt: number | string` (server timestamp)
- `version?: number` (optional optimistic version)
- `isEditable` is runtime-only UI state and must not be persisted to cloud.
- legacy local matches without `matchId` remain local-only and non-shareable until migrated/recreated.

- [ ] **Step 2: Add local normalization helper for legacy data**

In `pages/match-detail/match-detail.js` and `pages/match-list/match-list.js`, add a small normalization path so old data does not crash:
- missing `matchId` => treat as local-only record.
- missing `ownerOpenId` => `isEditable=false` unless explicitly created in this version.

- [ ] **Step 3: Verify no regression in local-only rendering**

Run app in WeChat DevTools with pre-existing local matches.
Expected: match list/detail still load; only cloud/share actions are hidden or disabled for legacy entries.

- [ ] **Step 4: Commit**

```bash
git add docs/PROJECT_CONTEXT.md pages/create-match/create-match.js pages/match-detail/match-detail.js pages/match-list/match-list.js
git commit -m "docs+compat: define cloud match fields and legacy normalization"
```

### Task 2: Add Cloud Functions For Create/Read/Update/Delete With Owner Check

**Files:**
- Create: `cloudfunctions/getOpenId/index.js`
- Create: `cloudfunctions/createMatch/index.js`
- Create: `cloudfunctions/getMatchById/index.js`
- Create: `cloudfunctions/updateMatch/index.js`
- Create: `cloudfunctions/deleteMatch/index.js`
- Create: `cloudfunctions/shared/utils.js` (optional shared guard helper if project layout allows)
- Modify: cloud function config files as required by current project structure

- [ ] **Step 1: Write function contract comments and response shape**

For each function define response shape:
- `createMatch` => `{ ok: true, matchId, ownerOpenId, updatedAt, version }`
- `getMatchById` => `{ ok: true, match } | { ok: false, code: 'NOT_FOUND' }`
- `updateMatch` => owner-only, returns latest `updatedAt/version`
- `deleteMatch` => owner-only, idempotent response

- [ ] **Step 2: Implement getOpenId and createMatch**

- `getOpenId` returns `OPENID` from cloud context.
- `createMatch` reads caller openid from context, generates `matchId`, writes full match doc to cloud, sets:
  - `ownerOpenId = caller`
  - `updatedAt = serverTime`
  - `version = 1` (optional but recommended)

- [ ] **Step 3: Implement getMatchById**

- Query by `matchId`.
- Return complete match payload needed by detail page.
- Return `NOT_FOUND` for deleted/invalid ids.

- [ ] **Step 4: Implement updateMatch with strict owner check**

- Read existing doc by `matchId`.
- If caller openid != `ownerOpenId`, return `{ ok:false, code:'FORBIDDEN' }`.
- On success write updated content and bump:
  - `updatedAt = serverTime`
  - `version = previous + 1` (if using version)

- [ ] **Step 5: Implement deleteMatch with strict owner check**

- Check owner before delete.
- If not owner => `FORBIDDEN`.
- If owner and missing doc => idempotent success or `NOT_FOUND` (pick one and keep consistent).

- [ ] **Step 6: Deploy and smoke test cloud functions in DevTools**

Expected:
- owner can create/update/delete
- non-owner cannot update/delete
- get by id works for shared viewers

- [ ] **Step 7: Commit**

```bash
git add cloudfunctions
git commit -m "feat: add cloud CRUD functions with openid ownership checks"
```

### Task 3: Wire Match Creation To Cloud-Generated matchId

**Files:**
- Modify: `pages/create-match/create-match.js`

- [ ] **Step 1: Write failing behavior check (manual)**

Current expected failure before code change:
- newly created match has only local numeric `id`
- cannot be shared by cloud `matchId`

- [ ] **Step 2: Implement create flow cloud-first**

In `createMatch` flow:
- build match payload as before.
- call `wx.cloud.callFunction({ name: 'createMatch', data: payload })`.
- on success, persist returned `matchId/ownerOpenId/updatedAt/version` into local match object.
- keep local `id` for list compatibility if needed.

- [ ] **Step 3: Add create fallback policy**

If cloud create fails:
- show clear toast: creation failed due to cloud/network.
- do not create a "shareable" local record with fake `matchId`.
- optionally allow local-only creation only if product decides (default here: fail fast to keep semantics clear).

- [ ] **Step 4: Validate behavior**

Create a new match.
Expected:
- local object includes non-empty `matchId`
- `ownerOpenId` exists
- cloud doc exists with same `matchId`

- [ ] **Step 5: Commit**

```bash
git add pages/create-match/create-match.js
git commit -m "feat: create matches with cloud-generated matchId"
```

### Task 4: Add QR Share And Scan Import By matchId

**Files:**
- Modify: `pages/match-detail/match-detail.js`
- Modify: `pages/match-detail/match-detail.wxml`
- Modify: `app.json` or relevant routing config if share entry params need updates

- [ ] **Step 1: Add "Generate QR" button visible only for owner**

`isEditable === true` and `matchId` exists => show button.
Button action creates mini program code/path carrying `matchId`.

- [ ] **Step 2: Add scan/open-entry handler**

When opened via QR scene or query param:
- extract `matchId`
- call `getMatchById`
- persist pulled match into local `matches` (upsert by `matchId`)

- [ ] **Step 3: Handle invalid/deleted match id**

If `NOT_FOUND`:
- show error toast/modal
- do not insert empty local record

- [ ] **Step 4: Validate behavior**

Two accounts test:
- account A creates and generates QR
- account B scans and sees same match data with `isEditable=false`

- [ ] **Step 5: Commit**

```bash
git add pages/match-detail/match-detail.js pages/match-detail/match-detail.wxml app.json
git commit -m "feat: share and import matches by qr matchId"
```

### Task 5: Detail Page Cloud-First Fetch + Offline Fallback + Runtime isEditable

**Files:**
- Modify: `pages/match-detail/match-detail.js`
- Modify: `pages/match-detail/match-detail.wxml`

- [ ] **Step 1: Add on-show refresh pipeline**

On page show/open for records with `matchId`:
1. call `getOpenId`
2. call `getMatchById`
3. update local cache with cloud record
4. compute runtime `isEditable = currentOpenId === ownerOpenId`

- [ ] **Step 2: Add offline fallback branch**

If cloud fetch fails:
- load local cached match
- compute `isEditable` if openid available; otherwise force false
- show message: "当前离线，可能不是最新"

- [ ] **Step 3: Ensure update buttons obey `isEditable`**

All score update/complete/modify actions should be disabled or hidden when false.

- [ ] **Step 4: Validate behavior**

- owner online: latest cloud data shown and editable
- viewer online: latest cloud data shown, read-only
- offline: local data shown with warning

- [ ] **Step 5: Commit**

```bash
git add pages/match-detail/match-detail.js pages/match-detail/match-detail.wxml
git commit -m "feat: cloud-first detail sync with offline fallback and runtime edit guard"
```

### Task 6: Update Score Sync (Owner Only) With updatedAt/version

**Files:**
- Modify: `pages/match-detail/match-detail.js`

- [ ] **Step 1: Add owner-only cloud update call after local score change**

For owner actions (`toggleComplete`, score input confirm/save flow):
- write local state first
- call `updateMatch` with full match payload (Plan A simple mode)
- on success refresh local `updatedAt/version` from response

- [ ] **Step 2: Add failure handling for sync errors**

If cloud update fails:
- keep local state as user just edited
- show toast: "本地已更新，云端同步失败，请稍后重试"
- leave a `pendingSync` marker if desired (optional)

- [ ] **Step 3: Validate behavior**

- owner edits scores: cloud doc `updatedAt` changes, `version` increments
- viewer attempts edit: no action possible in UI; forced call should still be rejected by cloud

- [ ] **Step 4: Commit**

```bash
git add pages/match-detail/match-detail.js
git commit -m "feat: sync owner score updates to cloud with updatedAt and version"
```

### Task 7: Delete Flow Local-First And Conditional Cloud Delete

**Files:**
- Modify: `pages/match-list/match-list.js`
- Modify: `pages/match-detail/match-detail.js`

- [ ] **Step 1: Implement local-first delete**

When user confirms delete:
- remove local match immediately (by local id or `matchId` mapping)
- update list UI instantly

- [ ] **Step 2: Conditional cloud delete**

After local delete:
- if current user is owner and has `matchId`, call `deleteMatch`
- if viewer, skip cloud delete entirely

- [ ] **Step 3: Add cloud delete failure copy**

On owner cloud delete failure:
- keep UI as deleted locally
- show non-blocking message: "本地已删除，云端删除失败（可稍后重试）"

- [ ] **Step 4: Validate behavior**

- owner delete: local removed immediately, cloud eventually removed
- viewer delete: local removed only, cloud data still exists for others

- [ ] **Step 5: Commit**

```bash
git add pages/match-list/match-list.js pages/match-detail/match-detail.js
git commit -m "feat: local-first delete with owner-only cloud delete"
```

### Task 8: Regression Checks And Delivery Notes

**Files:**
- Modify: `docs/PROJECT_CONTEXT.md`
- Create: `docs/superpowers/specs/2026-06-14-cloud-match-sharing-design.md` (if missing finalized spec snapshot)

- [ ] **Step 1: Run existing algorithm smoke test**

Run: `node test/test-doubles-match.js`
Expected: exit code 0 and normal conflict/participation summary.

- [ ] **Step 2: Execute end-to-end manual checklist in DevTools**

Checklist:
- create owner match -> gets cloud `matchId`
- owner generates QR
- viewer scans and reads latest data
- owner edits score -> viewer reopen sees updated score
- offline open uses local cache + warning
- owner delete local-first + cloud delete attempt
- viewer delete local-only

- [ ] **Step 3: Update docs with operational caveats**

Document known caveat accepted by product:
- local deleted but cloud delete may fail and remain for later cleanup.

- [ ] **Step 4: Commit**

```bash
git add docs/PROJECT_CONTEXT.md docs/superpowers/specs/2026-06-14-cloud-match-sharing-design.md
git commit -m "docs: add cloud sharing flow, permissions, and deletion caveats"
```

## Self-Review Checklist (Plan Author)

- [ ] **Spec coverage:** All approved requirements mapped: cloud `matchId`, QR share/import, owner-only edit/delete, runtime `isEditable`, cloud guard, cloud-first detail fetch, offline fallback, local-first delete, `updatedAt`, optional `version`.
- [ ] **No placeholders:** No TBD/TODO or vague "handle errors" instructions remain.
- [ ] **Type consistency:** `matchId`, `ownerOpenId`, `updatedAt`, `version`, `isEditable` naming is consistent across tasks.

