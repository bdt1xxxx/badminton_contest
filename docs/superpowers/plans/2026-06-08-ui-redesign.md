# Badminton Mini Program UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved sports-green UI redesign for the WeChat Mini Program while preserving scheduling, storage, import/export, and ranking behavior.

**Architecture:** Keep the current page structure and native Mini Program navigation. Make the redesign primarily through page-local WXML/WXSS updates, with small JS-only derived display summaries that are never persisted to local storage.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JavaScript, local `wx` storage, existing Node smoke test `test/test-doubles-match.js`.

---

## Spec

Implement the design from `docs/superpowers/specs/2026-06-08-ui-redesign-design.md`.

## File Structure

- Modify `app.json`: update tab selected color to the approved primary green if needed.
- Modify `app.wxss`: replace the scaffold global `.container` flex layout with neutral page defaults so page-level containers control their own layout.
- Modify `pages/create-match/create-match.js`: default to doubles, add tap handler for segmented match type, and keep shuffle state available in the confirmation dialog.
- Modify `pages/create-match/create-match.wxml`: rebuild the create page as task title, segmented match type, setup card, player rows, fixed bottom action, and refined confirmation dialog.
- Modify `pages/create-match/create-match.wxss`: implement the approved create page visual system.
- Modify `pages/match-list/match-list.js`: derive non-persistent list summary data.
- Modify `pages/match-list/match-list.wxml`: rebuild cards with summary, status pill, compact metadata, primary action, and secondary delete.
- Modify `pages/match-list/match-list.wxss`: implement list page styling.
- Modify `pages/match-detail/match-detail.js`: derive non-persistent detail summary data and keep it current after completion toggles.
- Modify `pages/match-detail/match-detail.wxml`: rebuild the detail tab and statistics tab presentation.
- Modify `pages/match-detail/match-detail.wxss`: implement live scoring and ranking styling.
- Modify `pages/profile/profile.js`: derive non-persistent local data summary.
- Modify `pages/profile/profile.wxml`: rebuild the profile page as profile card, data summary, and action rows.
- Modify `pages/profile/profile.wxss`: implement profile styling.

Do not modify the scheduling algorithm, stored match object shape, import/export JSON format, or ranking calculation logic.

## Task 1: Global Visual Foundation

**Files:**
- Modify: `app.json`
- Modify: `app.wxss`

- [ ] **Step 1: Inspect current baseline**

Run:

```bash
git status --short --branch
sed -n '1,120p' app.json
sed -n '1,120p' app.wxss
```

Expected:

- `git status` may show unrelated existing deletions or untracked docs. Do not revert or stage unrelated files.
- `app.json` contains `tabBar.selectedColor`.
- `app.wxss` contains the scaffold `.container` flex layout.

- [ ] **Step 2: Update tab selected color**

In `app.json`, set the tab selected color to the approved primary green:

```json
"selectedColor": "#16A34A"
```

Keep the tab bar page paths, icon paths, text labels, and native window navigation settings unchanged.

- [ ] **Step 3: Replace the global scaffold container style**

Replace the contents of `app.wxss` with:

```css
/**app.wxss**/
page {
  min-height: 100%;
  background: #f4f7f5;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.container {
  min-height: 100vh;
  box-sizing: border-box;
  background: #f4f7f5;
}

button {
  margin: 0;
  padding: 0;
  line-height: normal;
}

button::after {
  border: none;
}
```

- [ ] **Step 4: Verify scheduling smoke test still passes**

Run:

```bash
node test/test-doubles-match.js
```

Expected:

- Process exits with code `0`.
- Output includes `出场次数是否均等: ✅ 是`.

## Task 2: Create Match Page

**Files:**
- Modify: `pages/create-match/create-match.js`
- Modify: `pages/create-match/create-match.wxml`
- Modify: `pages/create-match/create-match.wxss`

- [ ] **Step 1: Default new matches to doubles**

In `pages/create-match/create-match.js`, change the initial data to:

```js
matchType: '双打',
matchTypes: ['单打', '双打'],
```

Do not change `generateSinglesMatches` or `generateDoublesMatches`.

- [ ] **Step 2: Add a segmented-control tap handler**

Add this method near `onTypeChange`:

```js
onTypeTap: function (e) {
  const matchType = e.currentTarget.dataset.type;
  if (!matchType || matchType === this.data.matchType) {
    return;
  }

  this.setData({
    matchType: matchType
  });
},
```

Keep `onTypeChange` in place so picker-based fallback behavior remains available if the implementation retains any picker.

- [ ] **Step 3: Replace the main create page WXML structure**

In `pages/create-match/create-match.wxml`, keep the existing progress overlay and modal binding names, but replace the main visible form with this structure:

```xml
<view class="container create-page">
  <view class="page-content">
    <view class="hero-section">
      <text class="hero-title">创建一场新比赛</text>
      <text class="hero-subtitle">先确认赛制，再录入选手和等级</text>
    </view>

    <view class="section-card setup-card">
      <view class="section-header">
        <text class="section-title">赛制设置</text>
        <text class="section-meta">{{matchType}}优先</text>
      </view>

      <view class="type-segment">
        <view class="segment-item {{matchType === '双打' ? 'active' : ''}}" bindtap="onTypeTap" data-type="双打">
          <text>双打</text>
        </view>
        <view class="segment-item {{matchType === '单打' ? 'active' : ''}}" bindtap="onTypeTap" data-type="单打">
          <text>单打</text>
        </view>
      </view>

      <view class="form-item">
        <text class="label">比赛名称 *</text>
        <input class="input" placeholder="例如：周一训练局" value="{{matchName}}" bindinput="onMatchNameInput" />
      </view>

      <view class="form-grid">
        <view class="form-item">
          <text class="label">参赛人数</text>
          <picker mode="selector" range="{{[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]}}" value="{{maxPlayers-1}}" bindchange="onMaxPlayersChange">
            <view class="picker">{{maxPlayers}}人</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">场地数量</text>
          <picker mode="selector" range="{{['1块场地', '2块场地']}}" value="{{courtCount - 1}}" bindchange="onCourtCountChange">
            <view class="picker">{{courtCount}}块</view>
          </picker>
        </view>
      </view>
    </view>

    <view class="section-card players-card">
      <view class="section-header">
        <text class="section-title">参赛选手</text>
        <text class="section-meta">{{players.length}}/{{maxPlayers}}</text>
      </view>

      <view class="player-row" wx:for="{{maxPlayers}}" wx:key="index">
        <view class="player-index">{{index + 1}}</view>
        <input class="player-input"
               placeholder="输入选手姓名"
               value="{{index < players.length ? players[index].name : ''}}"
               bindinput="onPlayerInput"
               data-index="{{index}}" />
        <picker class="level-picker"
                mode="selector"
                range="{{[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10]}}"
                value="{{index < players.length ? [1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10].indexOf(players[index].score || 1) : 0}}"
                bindchange="onScoreChange"
                data-index="{{index}}">
          <view class="level-pill">Lv {{index < players.length ? (players[index].score || 1) : 1}}</view>
        </picker>
      </view>
    </view>
  </view>

  <view class="submit-section">
    <button class="submit-btn" bindtap="showConfirmDialog">生成对阵</button>
  </view>

  <!-- keep and restyle existing confirm-dialog and progress-overlay blocks below -->
</view>
```

Move the existing `shuffle-row` checkbox into the confirmation dialog body as a dialog item:

```xml
<view class="dialog-item">
  <text class="dialog-label">排阵策略</text>
  <checkbox-group bindchange="onShouldShufflePlayersChange">
    <label class="shuffle-label">
      <checkbox value="1" checked="{{shouldShufflePlayers}}" color="#16A34A" />
      <text class="shuffle-text">生成前打乱选手顺序</text>
    </label>
  </checkbox-group>
</view>
```

- [ ] **Step 4: Confirm shuffle handler exists**

Run:

```bash
rg -n "onShouldShufflePlayersChange" pages/create-match/create-match.js
```

Expected:

- The handler exists. If it does not exist, add:

```js
onShouldShufflePlayersChange: function (e) {
  const shouldShufflePlayers = e.detail.value.includes('1');
  this.setData({
    shouldShufflePlayers: shouldShufflePlayers
  });
},
```

- [ ] **Step 5: Replace create page WXSS**

Replace `pages/create-match/create-match.wxss` with CSS that defines these classes:

```css
.create-page {
  min-height: 100vh;
  background: #f4f7f5;
  padding-bottom: 132rpx;
}

.page-content {
  padding: 28rpx 28rpx 0;
}

.hero-section {
  padding: 12rpx 4rpx 24rpx;
}

.hero-title,
.hero-subtitle {
  display: block;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #102318;
  line-height: 1.15;
}

.hero-subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #64748b;
}

.section-card {
  background: #ffffff;
  border: 1rpx solid #e5efe8;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #0f172a;
}

.section-meta {
  font-size: 24rpx;
  font-weight: 700;
  color: #16a34a;
}

.type-segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 6rpx;
  margin-bottom: 24rpx;
  border-radius: 999rpx;
  background: #e8f2eb;
}

.segment-item {
  height: 68rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
  color: #64748b;
}

.segment-item.active {
  background: #ffffff;
  color: #166534;
  box-shadow: 0 4rpx 12rpx rgba(22, 101, 52, 0.12);
}

.form-item {
  margin-bottom: 22rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #64748b;
}

.input,
.picker {
  height: 84rpx;
  box-sizing: border-box;
  border: 1rpx solid #dce8df;
  border-radius: 20rpx;
  background: #f8fafc;
  padding: 0 22rpx;
  font-size: 28rpx;
  color: #0f172a;
}

.picker {
  line-height: 84rpx;
}

.player-row {
  display: grid;
  grid-template-columns: 52rpx 1fr 142rpx;
  gap: 16rpx;
  align-items: center;
  min-height: 82rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #eef4f0;
}

.player-row:last-child {
  border-bottom: none;
}

.player-index {
  width: 52rpx;
  height: 52rpx;
  border-radius: 18rpx;
  background: #f1f5f9;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 800;
}

.player-input {
  height: 72rpx;
  font-size: 28rpx;
  color: #0f172a;
}

.level-pill {
  min-height: 58rpx;
  border-radius: 999rpx;
  background: #dcfce7;
  color: #166534;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 800;
}

.submit-section {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(244, 247, 245, 0.94);
  border-top: 1rpx solid #e5efe8;
  box-sizing: border-box;
}

.submit-btn {
  height: 92rpx;
  border-radius: 24rpx;
  background: #16a34a;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 24rpx rgba(22, 163, 74, 0.22);
}
```

Retain the existing modal and progress overlay selectors, but update their colors to use `#16A34A`, `#17212F`, `#64748B`, and `#F4F7F5`.

- [ ] **Step 6: Verify create page manually**

Open the Mini Program in WeChat Developer Tools and verify:

- Default match type is `双打`.
- Tapping `单打` and `双打` switches the selected segmented control.
- Player rows fit at 375px width.
- The fixed `生成对阵` button does not cover the last player row.
- The confirmation dialog still opens and includes level gap, round count, and shuffle option.

## Task 3: Match List And Profile Pages

**Files:**
- Modify: `pages/match-list/match-list.js`
- Modify: `pages/match-list/match-list.wxml`
- Modify: `pages/match-list/match-list.wxss`
- Modify: `pages/profile/profile.js`
- Modify: `pages/profile/profile.wxml`
- Modify: `pages/profile/profile.wxss`

- [ ] **Step 1: Add derived list summary**

In `pages/match-list/match-list.js`, update `data`:

```js
data: {
  matches: [],
  summary: {
    total: 0,
    active: 0,
    generatedMatches: 0
  }
},
```

Add this method before `loadMatches`:

```js
buildSummary: function(matches) {
  return {
    total: matches.length,
    active: matches.filter(match => match.status !== '已结束').length,
    generatedMatches: matches.reduce((total, match) => {
      return total + ((match.matches && match.matches.length) || 0);
    }, 0)
  };
},
```

Inside `loadMatches`, change the final `setData` call to:

```js
this.setData({
  matches: matches,
  summary: this.buildSummary(matches)
});
```

Inside successful `deleteMatch`, change the `setData` call to:

```js
this.setData({
  matches: matches,
  summary: this.buildSummary(matches)
});
```

- [ ] **Step 2: Replace match list WXML**

Use this structure in `pages/match-list/match-list.wxml`:

```xml
<view class="container list-page">
  <view class="page-content">
    <view class="summary-card">
      <view>
        <text class="summary-title">比赛总览</text>
        <text class="summary-subtitle">{{summary.total}} 场比赛 · {{summary.generatedMatches}} 条对阵</text>
      </view>
      <view class="summary-pill">{{summary.active}} 进行中</view>
    </view>

    <block wx:if="{{matches.length > 0}}">
      <view class="match-card" wx:for="{{matches}}" wx:key="id">
        <view class="match-card-header">
          <view>
            <text class="match-name">{{item.name}}</text>
            <text class="match-time">{{formatDate(item.date)}} {{item.time}}</text>
          </view>
          <text class="status-pill">{{item.status}}</text>
        </view>

        <view class="meta-grid">
          <view class="meta-item">
            <text class="meta-label">类型</text>
            <text class="meta-value">{{item.type}}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">人数</text>
            <text class="meta-value">{{item.players.length}}/{{item.maxPlayers}}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">场次</text>
            <text class="meta-value">{{item.matches && item.matches.length ? item.matches.length : item.rounds}}</text>
          </view>
        </view>

        <view class="match-actions">
          <button class="primary-btn" bindtap="viewMatch" data-id="{{item.id}}">查看详情</button>
          <button class="danger-btn" bindtap="deleteMatch" data-id="{{item.id}}">删</button>
        </view>
      </view>
    </block>

    <view class="empty-state" wx:else>
      <text class="empty-title">暂无比赛</text>
      <text class="empty-desc">从下方“创建比赛”开始组织一场新对阵</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: Replace match list WXSS**

Replace `pages/match-list/match-list.wxss` with styles using these selectors:

```css
.list-page {
  min-height: 100vh;
  background: #f4f7f5;
}

.page-content {
  padding: 28rpx;
}

.summary-card,
.match-card {
  background: #ffffff;
  border: 1rpx solid #e5efe8;
  border-radius: 28rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  margin-bottom: 24rpx;
  background: #ecfdf5;
}

.summary-title,
.summary-subtitle,
.match-name,
.match-time,
.meta-label,
.meta-value {
  display: block;
}

.summary-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #14532d;
}

.summary-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
}

.summary-pill,
.status-pill {
  border-radius: 999rpx;
  background: #dcfce7;
  color: #166534;
  padding: 10rpx 18rpx;
  font-size: 22rpx;
  font-weight: 800;
  white-space: nowrap;
}

.match-card {
  padding: 24rpx;
  margin-bottom: 22rpx;
}

.match-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 22rpx;
}

.match-name {
  font-size: 30rpx;
  font-weight: 800;
  color: #0f172a;
}

.match-time {
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #64748b;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.meta-item {
  border-radius: 20rpx;
  background: #f8fafc;
  padding: 16rpx;
}

.meta-label {
  font-size: 22rpx;
  color: #64748b;
}

.meta-value {
  margin-top: 8rpx;
  font-size: 26rpx;
  font-weight: 800;
  color: #0f172a;
}

.match-actions {
  display: grid;
  grid-template-columns: 1fr 92rpx;
  gap: 16rpx;
  margin-top: 22rpx;
}

.primary-btn,
.danger-btn {
  height: 76rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 800;
}

.primary-btn {
  background: #16a34a;
  color: #ffffff;
}

.danger-btn {
  background: #fee2e2;
  color: #b91c1c;
}

.empty-state {
  padding: 120rpx 32rpx;
  text-align: center;
}

.empty-title,
.empty-desc {
  display: block;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #0f172a;
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #64748b;
}
```

- [ ] **Step 4: Add profile data summary**

In `pages/profile/profile.js`, update `data`:

```js
data: {
  userInfo: {
    nickname: '匿名',
    avatar: '/images/profile.png'
  },
  hasUserInfo: false,
  dataSummary: {
    matchCount: 0,
    generatedMatches: 0,
    playerCount: 0
  }
},
```

Add this method before `onLoad`:

```js
loadDataSummary: function() {
  const matches = wx.getStorageSync('matches') || [];
  const playerNames = {};

  matches.forEach(match => {
    (match.players || []).forEach(player => {
      if (player && player.name) {
        playerNames[player.name] = true;
      }
    });
  });

  this.setData({
    dataSummary: {
      matchCount: matches.length,
      generatedMatches: matches.reduce((total, match) => {
        return total + ((match.matches && match.matches.length) || 0);
      }, 0),
      playerCount: Object.keys(playerNames).length
    }
  });
},
```

Call it in both lifecycle methods:

```js
onLoad: function() {
  this.getUserProfile();
  this.loadDataSummary();
},

onShow: function() {
  this.getUserProfile();
  this.loadDataSummary();
},
```

After successful `clearData`, call:

```js
this.loadDataSummary();
```

- [ ] **Step 5: Replace profile WXML**

Use this structure in `pages/profile/profile.wxml`:

```xml
<view class="container profile-page">
  <view class="page-content">
    <view class="profile-card">
      <image class="avatar" src="{{userInfo.avatar}}" mode="aspectFill"></image>
      <view class="profile-info">
        <text class="nickname">{{userInfo.nickname}}</text>
        <button wx:if="{{!hasUserInfo}}" class="get-userinfo-btn" bindtap="getUserProfile">
          获取微信头像和昵称
        </button>
        <text wx:else class="profile-subtitle">本地比赛数据管理</text>
      </view>
    </view>

    <view class="summary-card">
      <text class="summary-title">本机数据</text>
      <text class="summary-subtitle">{{dataSummary.matchCount}} 场比赛 · {{dataSummary.generatedMatches}} 条对阵 · {{dataSummary.playerCount}} 名选手</text>
    </view>

    <view class="tool-list">
      <button class="tool-row" bindtap="exportData">
        <text>导出数据</text>
        <text class="tool-arrow">›</text>
      </button>
      <button class="tool-row" bindtap="importData">
        <text>导入数据</text>
        <text class="tool-arrow">›</text>
      </button>
      <button class="tool-row danger" bindtap="clearData">
        <text>清除数据</text>
        <text class="tool-arrow">›</text>
      </button>
    </view>
  </view>
</view>
```

- [ ] **Step 6: Replace profile WXSS**

Replace `pages/profile/profile.wxss` with:

```css
.profile-page {
  min-height: 100vh;
  background: #f4f7f5;
}

.page-content {
  padding: 32rpx 28rpx;
}

.profile-card,
.summary-card,
.tool-row {
  background: #ffffff;
  border: 1rpx solid #e5efe8;
  border-radius: 28rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 52rpx;
  border: 4rpx solid #dcfce7;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.nickname,
.profile-subtitle,
.summary-title,
.summary-subtitle {
  display: block;
}

.nickname {
  font-size: 32rpx;
  font-weight: 800;
  color: #0f172a;
}

.profile-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
}

.get-userinfo-btn {
  margin-top: 14rpx;
  height: 60rpx;
  border-radius: 18rpx;
  background: #16a34a;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 22rpx;
}

.summary-card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  background: #ecfdf5;
}

.summary-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #14532d;
}

.summary-subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #64748b;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.tool-row {
  height: 88rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 28rpx;
  font-weight: 800;
  color: #0f172a;
}

.tool-row.danger {
  color: #dc2626;
  background: #fff7f7;
  border-color: #fee2e2;
}

.tool-arrow {
  color: #94a3b8;
  font-size: 34rpx;
}
```

- [ ] **Step 7: Verify list and profile pages manually**

Open in WeChat Developer Tools and verify:

- List summary counts match stored matches.
- Match cards fit without text overlap at 375px width.
- Delete still opens the existing confirmation modal.
- Profile summary updates after importing or clearing data.
- Export/import/clear buttons call the existing handlers.

## Task 4: Match Detail And Statistics Pages

**Files:**
- Modify: `pages/match-detail/match-detail.js`
- Modify: `pages/match-detail/match-detail.wxml`
- Modify: `pages/match-detail/match-detail.wxss`

- [ ] **Step 1: Add derived match summary data**

In `pages/match-detail/match-detail.js`, update `data`:

```js
data: {
  match: null,
  matches: [],
  playerCounts: {},
  byeCounts: {},
  activeTab: 'details',
  playerStats: {},
  sortedPlayerStats: [],
  matchSummary: {
    total: 0,
    completed: 0,
    incomplete: 0
  }
},
```

Add this method before `loadMatchDetail`:

```js
buildMatchSummary: function(matches) {
  const completed = matches.filter(match => match.completed).length;
  return {
    total: matches.length,
    completed: completed,
    incomplete: matches.length - completed
  };
},
```

In `loadMatchDetail`, include `matchSummary` in the `setData` call:

```js
this.setData({
  match: match,
  matches: sortedMatches,
  playerCounts: match.playerCounts || {},
  byeCounts: match.byeCounts || {},
  playerStats: playerStats,
  matchSummary: this.buildMatchSummary(sortedMatches)
});
```

In `toggleComplete`, include `matchSummary` in the first `setData` call:

```js
this.setData({
  matches: sortedMatches,
  matchSummary: this.buildMatchSummary(sortedMatches)
}, () => {
  console.log('页面数据更新完成，当前matches:', this.data.matches);
  this.forceUpdateMatches();
});
```

- [ ] **Step 2: Replace match detail WXML**

Use this structure in `pages/match-detail/match-detail.wxml`:

```xml
<view class="container detail-page" wx:if="{{match}}">
  <view class="page-content">
    <view class="match-summary">
      <text class="summary-name">{{match.name}}</text>
      <text class="summary-meta">{{match.players.length}}/{{match.maxPlayers}}人 · {{match.type}} · {{matchSummary.total}}场 · 未完成{{matchSummary.incomplete}}</text>
    </view>

    <view class="tab-container">
      <view class="tab {{activeTab === 'details' ? 'active' : ''}}" bindtap="switchTab" data-tab="details">
        <text>对阵</text>
      </view>
      <view class="tab {{activeTab === 'statistics' ? 'active' : ''}}" bindtap="switchTab" data-tab="statistics">
        <text>统计</text>
      </view>
    </view>

    <view class="matches-section" wx:if="{{matches.length > 0 && activeTab === 'details'}}">
      <view class="match-card {{item.completed ? 'completed' : ''}}" wx:for="{{matches}}" wx:key="id">
        <view class="match-card-header">
          <text class="round-info">第{{item.id}}场</text>
          <text class="level-pill">等级差 {{item.levelDiff}}</text>
        </view>

        <view class="teams-row">
          <view class="team">
            <text class="player-name">{{item.team1.player1.name}}</text>
            <text class="player-name">{{item.team1.player2.name}}</text>
          </view>
          <text class="vs-text">VS</text>
          <view class="team">
            <text class="player-name">{{item.team2.player1.name}}</text>
            <text class="player-name">{{item.team2.player2.name}}</text>
          </view>
        </view>

        <view class="score-row">
          <input class="score-input" placeholder="分数" value="{{item.team1.score}}" disabled="{{item.completed}}" data-match-id="{{item.id}}" data-team="team1" bindinput="onScoreInput" />
          <text class="score-separator">:</text>
          <input class="score-input" placeholder="分数" value="{{item.team2.score}}" disabled="{{item.completed}}" data-match-id="{{item.id}}" data-team="team2" bindinput="onScoreInput" />
          <button class="complete-btn {{item.completed ? 'modify' : ''}}" bindtap="toggleComplete" data-match-id="{{item.id}}">
            {{item.completed ? '修改' : '完成'}}
          </button>
        </view>
      </view>
    </view>

    <view class="statistics-section" wx:if="{{activeTab === 'statistics'}}">
      <view class="stats-summary">
        <text class="stats-title">排行榜</text>
        <text class="stats-subtitle">按胜场排序，同胜场比分差优先</text>
      </view>

      <view class="stats-list" wx:if="{{sortedPlayerStats && sortedPlayerStats.length > 0}}">
        <view class="stats-row" wx:for="{{sortedPlayerStats}}" wx:key="name">
          <text class="stats-rank">{{index + 1}}</text>
          <text class="stats-name">{{item.name}}</text>
          <text class="stats-wins">{{item.wins}}胜</text>
          <text class="stats-score {{item.scoreDiff >= 0 ? 'positive' : 'negative'}}">
            {{item.scoreDiff >= 0 ? '+' : ''}}{{item.scoreDiff}}
          </text>
        </view>
      </view>

      <view class="empty-state" wx:else>
        <text class="empty-title">暂无统计数据</text>
        <text class="empty-desc">完成带比分的比赛后会生成排行</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 3: Replace match detail WXSS**

Replace `pages/match-detail/match-detail.wxss` with styles using these selectors:

```css
.detail-page {
  min-height: 100vh;
  background: #f4f7f5;
}

.page-content {
  padding: 24rpx 28rpx 40rpx;
}

.match-summary {
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 22rpx;
  background: #17212f;
  color: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(23, 33, 47, 0.16);
}

.summary-name,
.summary-meta {
  display: block;
}

.summary-name {
  font-size: 34rpx;
  font-weight: 850;
}

.summary-meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.78);
}

.tab-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 6rpx;
  margin-bottom: 22rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid #e5efe8;
}

.tab {
  height: 68rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
  color: #64748b;
}

.tab.active {
  background: #16a34a;
  color: #ffffff;
}

.match-card,
.stats-summary,
.stats-row {
  background: #ffffff;
  border: 1rpx solid #e5efe8;
  border-radius: 28rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.04);
}

.match-card {
  overflow: hidden;
  margin-bottom: 20rpx;
}

.match-card.completed {
  opacity: 0.72;
}

.match-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 22rpx;
  background: #ecfdf5;
}

.round-info {
  font-size: 28rpx;
  font-weight: 850;
  color: #14532d;
}

.level-pill {
  border-radius: 999rpx;
  padding: 8rpx 16rpx;
  background: #dcfce7;
  color: #166534;
  font-size: 22rpx;
  font-weight: 800;
}

.teams-row {
  display: grid;
  grid-template-columns: 1fr 72rpx 1fr;
  align-items: center;
  padding: 30rpx 22rpx;
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.player-name {
  font-size: 28rpx;
  font-weight: 750;
  color: #0f172a;
}

.vs-text {
  text-align: center;
  font-size: 24rpx;
  font-weight: 900;
  color: #94a3b8;
}

.score-row {
  display: grid;
  grid-template-columns: 1fr 24rpx 1fr 160rpx;
  gap: 14rpx;
  align-items: center;
  padding: 0 22rpx 22rpx;
}

.score-input {
  height: 68rpx;
  border-radius: 18rpx;
  border: 1rpx solid #dce8df;
  background: #f8fafc;
  text-align: center;
  font-size: 28rpx;
  color: #0f172a;
}

.score-input:disabled {
  color: #94a3b8;
  background: #f1f5f9;
}

.score-separator {
  text-align: center;
  font-size: 30rpx;
  font-weight: 900;
  color: #64748b;
}

.complete-btn {
  height: 68rpx;
  border-radius: 999rpx;
  background: #16a34a;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 850;
  display: flex;
  align-items: center;
  justify-content: center;
}

.complete-btn.modify {
  background: #f1f5f9;
  color: #334155;
}

.stats-summary {
  padding: 24rpx;
  margin-bottom: 18rpx;
  background: #ecfdf5;
}

.stats-title,
.stats-subtitle {
  display: block;
}

.stats-title {
  font-size: 32rpx;
  font-weight: 850;
  color: #14532d;
}

.stats-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
}

.stats-row {
  display: grid;
  grid-template-columns: 64rpx 1fr 110rpx 110rpx;
  align-items: center;
  gap: 10rpx;
  padding: 22rpx;
  margin-bottom: 14rpx;
  font-size: 28rpx;
}

.stats-rank {
  font-size: 32rpx;
  font-weight: 900;
  color: #16a34a;
}

.stats-name {
  font-weight: 800;
  color: #0f172a;
}

.stats-wins {
  color: #334155;
  font-weight: 750;
}

.stats-score {
  text-align: right;
  font-weight: 900;
}

.stats-score.positive {
  color: #16a34a;
}

.stats-score.negative {
  color: #dc2626;
}

.empty-state {
  padding: 100rpx 28rpx;
  text-align: center;
}

.empty-title,
.empty-desc {
  display: block;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 850;
  color: #0f172a;
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #64748b;
}
```

- [ ] **Step 4: Verify detail behavior manually**

Open an existing match in WeChat Developer Tools and verify:

- Summary card shows total and incomplete match count.
- Switching `对阵` and `统计` still works.
- Score inputs still update values.
- Tapping `完成` moves the match below incomplete matches and updates the incomplete count.
- Tapping `修改` re-enables the row and updates the incomplete count.
- Statistics sort remains wins descending, then score difference descending.

## Task 5: Final Verification And Cleanup

**Files:**
- Check all modified files.

- [ ] **Step 1: Search for legacy colors that should not dominate**

Run:

```bash
rg -n "#3cc51f|#007aff|#ff3b30|#f5f5f5" app.wxss app.json pages/create-match pages/match-list pages/match-detail pages/profile
```

Expected:

- No old dominant UI colors remain in redesigned page styles, except inside comments or untouched logic where the color is not rendered by the new WXML.

- [ ] **Step 2: Run scheduling smoke test**

Run:

```bash
node test/test-doubles-match.js
```

Expected:

- Process exits with code `0`.
- Output includes `出场次数是否均等: ✅ 是`.

- [ ] **Step 3: Manual Mini Program viewport QA**

In WeChat Developer Tools, check at an iPhone-width viewport:

- Create page: no overlap between fixed bottom button and last player row.
- Create page: confirm dialog fits vertically and all controls remain tappable.
- Match list: long match names wrap without covering the status pill.
- Match detail: score row stays on one line at 375px width.
- Statistics: player names and score differences do not overlap.
- Profile: action rows remain within the screen width.

- [ ] **Step 4: Review diff for scope**

Run:

```bash
git diff -- app.json app.wxss pages/create-match pages/match-list pages/match-detail pages/profile
```

Expected:

- Diff only contains UI markup/style changes and non-persistent derived display fields.
- No scheduling algorithm changes.
- No local storage schema changes.
- No import/export JSON format changes.

- [ ] **Step 5: Commit UI implementation**

Stage only the files modified by this UI redesign:

```bash
git add app.json app.wxss pages/create-match/create-match.js pages/create-match/create-match.wxml pages/create-match/create-match.wxss pages/match-list/match-list.js pages/match-list/match-list.wxml pages/match-list/match-list.wxss pages/match-detail/match-detail.js pages/match-detail/match-detail.wxml pages/match-detail/match-detail.wxss pages/profile/profile.js pages/profile/profile.wxml pages/profile/profile.wxss docs/superpowers/specs/2026-06-08-ui-redesign-design.md docs/superpowers/plans/2026-06-08-ui-redesign.md
git commit -m "feat: redesign badminton mini program ui"
```

Expected:

- Commit succeeds.
- Unrelated pre-existing deleted or untracked files remain unstaged.
