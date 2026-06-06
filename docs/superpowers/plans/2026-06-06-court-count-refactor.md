# 场地数量可变重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将冲突检测逻辑从硬编码 2 个场地改为通用批次逻辑，支持 1 或 2 个场地，并在主表单新增场地数量选择器。

**Architecture:** 三个冲突检测方法（calculateTotalConflicts、reorderMatchesByConflict、showConflictSummary）统一替换为通用批次逻辑：将比赛按 courtCount 分批，检测每批内所有配对的冲突。UI 层在主表单新增 picker，绑定已有的 courtCount data 字段。

**Tech Stack:** 微信小程序（WXML + JS），无测试框架，手动验证。

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| `pages/create-match/create-match.wxml` | 修改：新增场地数量 picker |
| `pages/create-match/create-match.js` | 修改：新增 onCourtCountChange；重构三个冲突检测方法 |

---

### Task 1：WXML 新增场地数量 picker

**Files:**
- Modify: `pages/create-match/create-match.wxml:20-25`

- [ ] **Step 1：在参赛人数 form-item 后面插入场地数量 picker**

在 `create-match.wxml` 第 25 行（`</view>` 闭合 `参赛人数` form-item 之后、`</view>` 闭合 `form-section` 之前），插入以下代码：

```xml
      <view class="form-item">
        <text class="label">场地数量</text>
        <picker mode="selector" range="{{['1块场地', '2块场地']}}" value="{{courtCount - 1}}" bindchange="onCourtCountChange">
          <view class="picker">{{courtCount}}块场地</view>
        </picker>
      </view>
```

插入位置：第 25 行 `</view>` 之后，第 26 行 `</view>` 之前，即：

```xml
      <!-- 参赛人数（原有） -->
      <view class="form-item">
        <text class="label">参赛人数</text>
        <picker mode="selector" range="{{[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]}}" value="{{maxPlayers-1}}" bindchange="onMaxPlayersChange">
          <view class="picker">{{maxPlayers}}人</view>
        </picker>
      </view>

      <!-- 新增：场地数量 -->
      <view class="form-item">
        <text class="label">场地数量</text>
        <picker mode="selector" range="{{['1块场地', '2块场地']}}" value="{{courtCount - 1}}" bindchange="onCourtCountChange">
          <view class="picker">{{courtCount}}块场地</view>
        </picker>
      </view>
    </view>
```

- [ ] **Step 2：提交**

```bash
git add pages/create-match/create-match.wxml
git commit -m "feat: add court count picker to create match form"
```

---

### Task 2：JS 新增 onCourtCountChange 处理器

**Files:**
- Modify: `pages/create-match/create-match.js`（在 onMaxPlayersChange 方法之后插入）

- [ ] **Step 1：在 onMaxPlayersChange 方法（约第 46-52 行）之后添加**

```javascript
  // 选择场地数量
  onCourtCountChange: function (e) {
    const courtCount = parseInt(e.detail.value) + 1;
    console.log('选择场地数量:', courtCount);
    this.setData({
      courtCount: courtCount
    });
  },
```

- [ ] **Step 2：提交**

```bash
git add pages/create-match/create-match.js
git commit -m "feat: add onCourtCountChange handler"
```

---

### Task 3：重构 calculateTotalConflicts

**Files:**
- Modify: `pages/create-match/create-match.js`（约第 1200-1226 行）

- [ ] **Step 1：将方法体整体替换**

找到 `calculateTotalConflicts` 方法，将其完整替换为：

```javascript
  // 计算整个序列的总冲突数
  calculateTotalConflicts: function (matches) {
    let totalConflicts = 0;
    const courtCount = this.data.courtCount;

    for (let i = 0; i < matches.length; i += courtCount) {
      const batch = matches.slice(i, i + courtCount);
      for (let a = 0; a < batch.length; a++) {
        for (let b = a + 1; b < batch.length; b++) {
          totalConflicts += this.calculateConflictScore(batch[a], batch[b]);
        }
      }
    }

    return totalConflicts;
  },
```

- [ ] **Step 2：提交**

```bash
git add pages/create-match/create-match.js
git commit -m "refactor: calculateTotalConflicts to generic batch logic"
```

---

### Task 4：重构 reorderMatchesByConflict

**Files:**
- Modify: `pages/create-match/create-match.js`（约第 979-1070 行）

- [ ] **Step 1：将方法体整体替换**

找到 `reorderMatchesByConflict` 方法，将其完整替换为：

```javascript
  // 重新排序比赛，将冲突比赛排在后面
  reorderMatchesByConflict: function (matches) {
    console.log('\n=== 重新排序比赛（冲突比赛排在后面）===');
    console.log(`输入的比赛数量: ${matches.length}`);

    const courtCount = this.data.courtCount;
    const nonConflictMatches = [];
    const conflictMatches = [];

    for (let i = 0; i < matches.length; i += courtCount) {
      const batch = matches.slice(i, i + courtCount);

      // 检查批次内是否有冲突
      let batchHasConflict = false;
      for (let a = 0; a < batch.length && !batchHasConflict; a++) {
        for (let b = a + 1; b < batch.length && !batchHasConflict; b++) {
          if (this.calculateConflictScore(batch[a], batch[b]) > 0) {
            batchHasConflict = true;
          }
        }
      }

      if (batchHasConflict) {
        // 标记批次内所有比赛为冲突
        for (let a = 0; a < batch.length; a++) {
          for (let b = a + 1; b < batch.length; b++) {
            const score = this.calculateConflictScore(batch[a], batch[b]);
            if (score > 0) {
              batch[a].hasConflict = true;
              batch[a].conflictWith = batch[b].id;
              batch[a].conflictScore = score;
              batch[b].hasConflict = true;
              batch[b].conflictWith = batch[a].id;
              batch[b].conflictScore = score;
            }
          }
          conflictMatches.push(batch[a]);
        }
      } else {
        for (const m of batch) nonConflictMatches.push(m);
      }
    }

    const reorderedMatches = [...nonConflictMatches, ...conflictMatches];

    console.log(`无冲突比赛: ${nonConflictMatches.length}场`);
    console.log(`冲突比赛: ${conflictMatches.length}场`);
    console.log(`重新排序后的总比赛数: ${reorderedMatches.length}场`);

    return reorderedMatches;
  },
```

- [ ] **Step 2：提交**

```bash
git add pages/create-match/create-match.js
git commit -m "refactor: reorderMatchesByConflict to generic batch logic"
```

---

### Task 5：重构 showConflictSummary

**Files:**
- Modify: `pages/create-match/create-match.js`（约第 1073-1163 行）

- [ ] **Step 1：将方法体整体替换**

找到 `showConflictSummary` 方法，将其完整替换为：

```javascript
  // 显示冲突总结
  showConflictSummary: function (matches) {
    console.log('\n=== 比赛冲突总结 ===');

    const courtCount = this.data.courtCount;
    let totalConflicts = 0;
    const conflictDetails = [];

    for (let i = 0; i < matches.length; i += courtCount) {
      const batch = matches.slice(i, i + courtCount);
      for (let a = 0; a < batch.length; a++) {
        for (let b = a + 1; b < batch.length; b++) {
          const conflictScore = this.calculateConflictScore(batch[a], batch[b]);
          if (conflictScore > 0) {
            totalConflicts += conflictScore;
            const conflictingPlayers = this.getConflictingPlayers(batch[a], batch[b]);
            conflictDetails.push({
              match1: batch[a].id,
              match2: batch[b].id,
              conflictScore: conflictScore,
              players: conflictingPlayers
            });
          }
        }
      }
    }

    // 显示每场比赛的选手
    matches.forEach((match) => {
      const players = [
        match.team1.player1.name,
        match.team1.player2.name,
        match.team2.player1.name,
        match.team2.player2.name
      ];
      const conflictMark = match.hasConflict ? ' ⚠️' : '';
      console.log(`第${match.id}场: ${players.join(', ')}${conflictMark}`);
    });

    if (conflictDetails.length > 0) {
      console.log(`\n⚠️ 发现 ${conflictDetails.length} 处冲突:`);
      conflictDetails.forEach((conflict, index) => {
        console.log(`  ${index + 1}. 第${conflict.match1}场与第${conflict.match2}场有${conflict.conflictScore}个重复选手: ${conflict.players.join(', ')}`);
      });
      console.log(`\n总冲突数: ${totalConflicts}`);
      console.log('💡 提示：冲突的比赛已排在序列末尾，建议安排休息时间');
    } else {
      console.log('\n🎉 完美！所有同时进行的比赛都无重复选手');
    }

    const nonConflictCount = matches.filter(m => !m.hasConflict).length;
    const conflictCount = matches.filter(m => m.hasConflict).length;

    console.log(`\n📊 统计信息:`);
    console.log(`  无冲突比赛: ${nonConflictCount}场`);
    console.log(`  冲突比赛: ${conflictCount}场`);
    console.log(`  总比赛数: ${matches.length}场`);

    if (conflictCount > 0) {
      console.log(`\n🔧 建议:`);
      console.log(`  1. 前${nonConflictCount}场比赛可以连续进行`);
      console.log(`  2. 第${nonConflictCount + 1}场开始有冲突，建议安排休息时间`);
    }
  },
```

- [ ] **Step 2：提交**

```bash
git add pages/create-match/create-match.js
git commit -m "refactor: showConflictSummary to generic batch logic"
```

---

### Task 6：手动验证

- [ ] **Step 1：在微信开发者工具中启动项目**

打开微信开发者工具，导入项目目录 `/Users/elioming.yan/code/badminton_contest`，确认编译无报错。

- [ ] **Step 2：验证场地数量 picker 显示**

进入"创建比赛"页面，确认"场地数量"选项显示在"参赛人数"下方，默认显示"2块场地"，点击可切换为"1块场地"。

- [ ] **Step 3：验证 courtCount=2 时行为不变**

保持 2 块场地，填入 8 名选手，创建比赛，查看控制台 log：
- `calculateTotalConflicts` 应按批次（每批 2 场）检测冲突
- 生成的对阵与改动前行为一致

- [ ] **Step 4：验证 courtCount=1 时无冲突**

切换为 1 块场地，同样 8 名选手创建比赛，查看控制台 log：
- 总冲突数应为 0（每批只有 1 场，无配对）
- 所有比赛标记为无冲突

- [ ] **Step 5：最终提交**

```bash
git add .
git commit -m "chore: verify court count refactor complete"
```
