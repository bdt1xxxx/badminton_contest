# Match Sharing (CloudBase + Invite Bind) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable match creator to share a match, and allow only bound participants to manually refresh and view scores.

**Architecture:** Keep Mini Program UI page architecture, add Cloud Functions as permission gate, and store canonical match data in Cloud Database. Participant access is granted by invite-code verification + OpenID binding. Read path uses manual refresh APIs only (no realtime listener).

**Tech Stack:** WeChat Mini Program (native), WeChat CloudBase (Cloud Functions + Cloud Database), local cache via `wx.setStorageSync`.

---

## File Structure / Responsibility

- Create: `cloudfunctions/createMatch/index.js` - create match + members + invite.
- Create: `cloudfunctions/joinMatch/index.js` - invite verification and identity binding.
- Create: `cloudfunctions/listMyMatches/index.js` - list authorized matches for current OpenID.
- Create: `cloudfunctions/getMatchDetail/index.js` - return match detail only after permission check.
- Create: `cloudfunctions/updateScore/index.js` - creator-only score update.
- Create: `utils/cloud-api.js` - centralized wrappers for cloud function calls.
- Create: `pages/join-match/join-match.js|json|wxml|wxss` - invite binding page.
- Modify: `app.json` - register new page path.
- Modify: `pages/create-match/create-match.js` - write new matches to cloud (plus invite code result).
- Modify: `pages/match-list/match-list.js` - replace local-only listing with authorized cloud list and manual refresh.
- Modify: `pages/match-detail/match-detail.js` - read/update via cloud API with permission-aware handling.
- Modify: `pages/profile/profile.js` - optional debug hook for cloud env check (minimal).
- Test: `test/cloud-contract.test.js` - API-level contract checks for payload shaping and local fallbacks.

### Task 1: Add Cloud API Layer and Register Join Page

**Files:**
- Create: `utils/cloud-api.js`
- Modify: `app.json`
- Test: `test/cloud-contract.test.js`

- [ ] **Step 1: Write the failing test for cloud API wrapper behavior**

```js
// test/cloud-contract.test.js
const assert = require('assert');
const { buildCallPayload } = require('../utils/cloud-api');

function testBuildCallPayload() {
  const payload = buildCallPayload('getMatchDetail', { matchId: 'm1' });
  assert.deepStrictEqual(payload, {
    name: 'getMatchDetail',
    data: { matchId: 'm1' }
  });
}

testBuildCallPayload();
console.log('cloud-contract ok');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/cloud-contract.test.js`  
Expected: FAIL with module/function not found.

- [ ] **Step 3: Write minimal cloud API wrapper**

```js
// utils/cloud-api.js
function buildCallPayload(name, data = {}) {
  return { name, data };
}

function callCloud(name, data = {}) {
  return wx.cloud.callFunction(buildCallPayload(name, data));
}

module.exports = {
  buildCallPayload,
  callCloud
};
```

- [ ] **Step 4: Register join page in app config**

```json
{
  "pages": [
    "pages/index/index",
    "pages/create-match/create-match",
    "pages/match-list/match-list",
    "pages/match-detail/match-detail",
    "pages/join-match/join-match",
    "pages/profile/profile",
    "pages/logs/logs"
  ]
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test/cloud-contract.test.js`  
Expected: PASS with `cloud-contract ok`.

- [ ] **Step 6: Commit**

```bash
git add utils/cloud-api.js app.json test/cloud-contract.test.js
git commit -m "feat: add cloud api wrapper and join page route"
```

### Task 2: Implement Cloud Functions (Permission Gate)

**Files:**
- Create: `cloudfunctions/createMatch/index.js`
- Create: `cloudfunctions/joinMatch/index.js`
- Create: `cloudfunctions/listMyMatches/index.js`
- Create: `cloudfunctions/getMatchDetail/index.js`
- Create: `cloudfunctions/updateScore/index.js`
- Test: `test/cloud-functions-smoke.js`

- [ ] **Step 1: Write failing smoke test for function exports**

```js
// test/cloud-functions-smoke.js
const assert = require('assert');

function hasMain(fn) {
  return typeof fn.main === 'function';
}

const createMatch = require('../cloudfunctions/createMatch/index');
const joinMatch = require('../cloudfunctions/joinMatch/index');

assert.ok(hasMain(createMatch));
assert.ok(hasMain(joinMatch));
console.log('cloud-functions-smoke ok');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/cloud-functions-smoke.js`  
Expected: FAIL with missing files.

- [ ] **Step 3: Add minimal create/join/list/detail/update cloud functions**

```js
// cloudfunctions/joinMatch/index.js (core shape)
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { matchId, inviteCode, participantId } = event;
  // 1) verify invite hash/status/expiry
  // 2) verify participant slot not occupied
  // 3) bind OPENID to participant
  return { ok: true, matchId, participantId, openid: OPENID };
};
```

- [ ] **Step 4: Run test to verify function entrypoints pass**

Run: `node test/cloud-functions-smoke.js`  
Expected: PASS with `cloud-functions-smoke ok`.

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions test/cloud-functions-smoke.js
git commit -m "feat: add cloud functions for match sharing auth flow"
```

### Task 3: Build Join Flow UI and Match List Manual Refresh

**Files:**
- Create: `pages/join-match/join-match.js`
- Create: `pages/join-match/join-match.json`
- Create: `pages/join-match/join-match.wxml`
- Create: `pages/join-match/join-match.wxss`
- Modify: `pages/match-list/match-list.js`
- Modify: `pages/match-list/match-list.wxml`
- Test: `test/join-match-page.test.js`

- [ ] **Step 1: Write failing unit-style test for join payload normalization**

```js
// test/join-match-page.test.js
const assert = require('assert');
const { normalizeJoinPayload } = require('../pages/join-match/join-match');

const data = normalizeJoinPayload('m1', ' 123456 ', 'p2');
assert.deepStrictEqual(data, { matchId: 'm1', inviteCode: '123456', participantId: 'p2' });
console.log('join-match-page ok');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/join-match-page.test.js`  
Expected: FAIL with missing page/module.

- [ ] **Step 3: Implement join page and manual refresh trigger in list**

```js
// pages/join-match/join-match.js (core shape)
const { callCloud } = require('../../utils/cloud-api');

function normalizeJoinPayload(matchId, inviteCode, participantId) {
  return { matchId, inviteCode: String(inviteCode || '').trim(), participantId };
}

Page({
  data: { matchId: '', inviteCode: '', participantId: '' },
  async onSubmit() {
    const payload = normalizeJoinPayload(this.data.matchId, this.data.inviteCode, this.data.participantId);
    await callCloud('joinMatch', payload);
    wx.showToast({ title: '绑定成功' });
    wx.navigateBack();
  }
});

module.exports = { normalizeJoinPayload };
```

- [ ] **Step 4: Add list page manual refresh call**

```js
// pages/match-list/match-list.js (refresh core)
const { callCloud } = require('../../utils/cloud-api');

async function fetchMyMatches() {
  const res = await callCloud('listMyMatches');
  return (res.result && res.result.matches) || [];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test/join-match-page.test.js`  
Expected: PASS with `join-match-page ok`.

- [ ] **Step 6: Commit**

```bash
git add pages/join-match pages/match-list test/join-match-page.test.js
git commit -m "feat: add participant join flow and manual refresh list"
```

### Task 4: Integrate Create/Detail/Score Update with Cloud Permissions

**Files:**
- Modify: `pages/create-match/create-match.js`
- Modify: `pages/match-detail/match-detail.js`
- Test: `test/match-detail-cloud.test.js`

- [ ] **Step 1: Write failing test for score-update payload shape**

```js
// test/match-detail-cloud.test.js
const assert = require('assert');
const { buildUpdateScorePayload } = require('../pages/match-detail/match-detail');

const payload = buildUpdateScorePayload('m1', 0, 1, { team1: 21, team2: 18 });
assert.deepStrictEqual(payload, {
  matchId: 'm1',
  roundIndex: 0,
  matchIndex: 1,
  score: { team1: 21, team2: 18 }
});
console.log('match-detail-cloud ok');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/match-detail-cloud.test.js`  
Expected: FAIL with missing export.

- [ ] **Step 3: Wire create flow to cloud createMatch and show invite code**

```js
// pages/create-match/create-match.js (core shape)
const { callCloud } = require('../../utils/cloud-api');

async function persistMatchToCloud(matchPayload) {
  const res = await callCloud('createMatch', matchPayload);
  return res.result;
}
```

- [ ] **Step 4: Wire detail read/update through getMatchDetail and updateScore**

```js
// pages/match-detail/match-detail.js (core shape)
const { callCloud } = require('../../utils/cloud-api');

function buildUpdateScorePayload(matchId, roundIndex, matchIndex, score) {
  return { matchId, roundIndex, matchIndex, score };
}

async function submitScore(matchId, roundIndex, matchIndex, score) {
  const payload = buildUpdateScorePayload(matchId, roundIndex, matchIndex, score);
  return callCloud('updateScore', payload);
}

module.exports = { buildUpdateScorePayload };
```

- [ ] **Step 5: Run tests and existing smoke check**

Run: `node test/match-detail-cloud.test.js`  
Expected: PASS with `match-detail-cloud ok`.

Run: `node test/test-doubles-match.js`  
Expected: PASS (no regression to doubles scheduling).

- [ ] **Step 6: Commit**

```bash
git add pages/create-match/create-match.js pages/match-detail/match-detail.js test/match-detail-cloud.test.js
git commit -m "feat: protect match detail and score updates with cloud auth"
```

## Final Verification Checklist

- [ ] `node test/cloud-contract.test.js`
- [ ] `node test/cloud-functions-smoke.js`
- [ ] `node test/join-match-page.test.js`
- [ ] `node test/match-detail-cloud.test.js`
- [ ] `node test/test-doubles-match.js`
- [ ] Manual mini program check:
  - [ ] Creator creates match and gets invite code
  - [ ] Participant binds with invite code and participant identity
  - [ ] Unauthorized account cannot open match detail
  - [ ] Creator updates score, participant sees update after manual refresh

