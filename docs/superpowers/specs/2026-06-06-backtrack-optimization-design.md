# 回溯法（selectBalancedMatchesBackTrace）优化设计

> 日期：2026-06-06
> 文件：`pages/create-match/create-match.js`
> 涉及函数：`selectBalancedMatchesBackTrace` / `backtrack` / `canReachTarget` / `calculateSearchSpace`

## 1. 背景

当前版本中，回溯法在大多数实际输入下都会被「搜索空间过大」分支提前跳过，事实上**几乎不会真正运行**，最终都是退回到下游的随机暴力法（`selectBalancedMatches`）。本次输入即为典型例子：

```
输入：8 名选手、levelGap=0、n=16 场
generateValidMatches → 78 个合法对阵
calculateSearchSpace → 7.40e+23
阈值 1e6 → 直接 return null
```

因此本次优化目标是：**让回溯法在真实的小程序运行场景中能稳定、快速地求解，不再被无意义地跳过**，并保证不阻塞主线程。

## 2. 问题分析

### 2.1 「搜索空间过大」实际意味着什么

代码中：

```js
const searchSpace = this.calculateSearchSpace(...)
if (searchSpace > 1000000) return null;
```

这个阈值并不是数学上「无解」的判定，而是一个**经验性的运行时保护**：

- 小程序主线程被阻塞 — `backtrack` 是同步递归，且函数内大量使用 `sleep`（忙等）。深度搜索几秒就会让 UI 冻死、触发"页面无响应"。
- 栈深度 / GC 压力 — 每层都做 `[...selectedMatches, match]` 与 `{...playerCounts}` 的拷贝。
- 10s 超时兜底（`backtrack` 内 `timeout=10000`）— 即使硬跑也大概率超时返回 null。

所以阈值真正保护的是 **「我跑下去也是白跑 + UI 卡死」** 这两点，而不是真正的可解性。

### 2.2 估值公式被严重高估

```js
calculateSearchSpace = C(validMatches, n) * (maxPlayerCount+1)^playerCount
```

这把「枚举对阵的组合数」与「选手出场次数的状态空间」**相乘**，但二者其实是同一棵搜索树的两种描述（一个数叶子，一个数状态），不应相乘。在 `78 / 16 / 8` 这组输入下，实际剪枝后的搜索节点数远低于这个估值（通常 < 10⁵ 量级），但公式给出 7.4e23，因此回溯法在生产环境**几乎永远不会被触发**。

### 2.3 回溯本身不够高效

- 分支选择是「按对阵列表盲枚举」，分支因子 ≈ 78。
- `canReachTarget` 剪枝过弱（仅看 max-min 差），无法利用「每个选手剩余必须出场的次数」这种强约束。
- 每层都在拷贝整数 map，开销集中在分配上而非搜索本身。

## 3. 优化方案

### 3.1 启发式：MRV（Minimum Remaining Values）分支顺序

**核心改动：每一步先挑出当前出场次数最少的选手 P，只在「包含 P 的合法对阵」中枚举。**

为什么这样做有效：
- 「每人出场次数完全相等」是强约束。当某个 P 还差 k 场要打，但剩余对阵中包含 P 的只有 k 个时，必须把它们全都选上，否则一定无解 —— MRV 让这种「被强约束的变量」最先被解决。
- 8 人时，每人涉及的合法对阵 ≈ 78 × 4 / 8 ≈ 39，分支因子直接砍半；
- 同时配合 `targetCount - playerCounts[P]` 做"剩余需求"剪枝，几乎不会进入死路。

实现方式：
- 预计算 `matchesByPlayer: Map<player, validMatchIdx[]>`。
- 每一层：扫一遍 `playerCounts` 取 `argmin`（O(playerCount)，对 8~16 人完全可忽略），从该候选集合里枚举。
- 为避免重复选择同一对阵，使用一个 `chosen: Set<matchIdx>` 标记，而不是再依赖 `startIndex`。
- 比赛之间无序对称性消除：在对每个 P 的候选列表内部，按 `matchIdx` 升序枚举即可（仅枚举 idx > 上一次为该 P 选中的 idx 中较小者 —— 这一点可选）。

### 3.2 强可行性剪枝

替换 `canReachTarget`：

```
对每个选手 p:
  need[p]   = targetCount - playerCounts[p]
  supply[p] = 剩余 validMatches 中包含 p 的数量
  if need[p] > supply[p]: 剪枝（不可能再让 p 凑齐场次）
  if playerCounts[p] > targetCount: 剪枝（已超额）
```

`supply[p]` 不必每次重算：维护一个 `remainingByPlayer[p]`，在标记某个 match "已尝试/排除" 时同步 -1，回溯时还原。

### 3.3 修正搜索空间估值与放宽阈值

- `calculateSearchSpace` 改为只返回 `C(validMatches, n)`（去掉 stateSpace 因子）。
- 阈值由 `1e6` 提升至 `1e9` 量级（保留为"绝对超大规模才放弃"的安全阀）。真正的运行时保护交给已有的 10s 超时 + 步数计数器。
- 同时**新增"探索步数上限"**（例如 200000 步），与时间超时并存，先到先终止。这能给主线程提供更确定的最坏耗时上界。

### 3.4 实现层面的小优化（次要）

- 用 **数组** 替代对象做 `playerCounts`：把 player id 在算法入口处映射成 0..N-1 的下标，全程用 `Int32Array` / 普通数组，省去 hash + 字符串 key 的开销。
- 不再每层 `{...playerCounts}` 拷贝 —— 改为「进入时 +1，回溯时 -1」的 in-place 更新。`selectedMatches` 同理改为 push/pop。
- 对 `validMatches` 中每条记录预先把 `[p1a, p1b, p2a, p2b]` 存为 4 个数字下标，避免循环里再做 spread。

### 3.5 不动的部分

- 与上层 `selectMatchesByStrategy` 的接口（参数、返回值、null 表示失败）保持不变。
- `formatMatches` 不动。
- `selectBalancedMatches`（暴力法）作为兜底保留，不在本次范围内修改。

## 4. 复杂度直觉

对于 8 人 / 16 场 / 78 对阵这一规模：

| 维度 | 旧版 | 新版（预期） |
|---|---|---|
| 是否真的执行回溯 | 否（被阈值挡） | 是 |
| 分支因子 | ~78 | ~39（MRV 后通常更小） |
| 可行性剪枝 | 弱 | 强（need vs supply） |
| 最坏耗时控制 | 仅 10s 时间超时 | 10s + 步数上限 |
| 主线程影响 | 已被规避（直接跳过） | 通过步数上限 + 早退保证 |

预期 8~12 人量级在 100ms 内出解；最坏情况下被步数上限 / 时间上限截断，回退到暴力法。

## 5. 风险与回退

- **风险 1：MRV 在某些病态输入下反而更慢**。
  缓解：步数上限（200k）+ 时间上限（10s）双重看门狗，一旦截断即返回 null，原有暴力法兜底链路保留。
- **风险 2：in-place 更新引入状态泄露 bug**。
  缓解：在递归出口处对所有可变状态做断言（dev 阶段加 `console.assert`，发布前可移除）。
- **回退**：完整改动集中在 4 个相邻函数内，git 单 commit 即可回滚。

## 6. 不在本次范围

- 不引入流网络 / ILP / 局部搜索等新算法范式。
- 不修改 `selectBalancedMatches` 的随机搜索逻辑。
- 不改 UI / toast / 进度提示。
- 不改 `generateValidMatches` 的对阵生成与 levelGap 语义。

## 7. 验收标准

1. 用 log.txt 中相同输入（8 选手、levelGap=0、n=16）执行：
   - 控制台不再出现 `搜索空间过大，跳过回溯法`；
   - 回溯法在 200ms 内返回结果；
   - 所有选手出场次数相等（每人 8 场）。
2. 上层 `selectMatchesByStrategy` 行为不变：成功时直接返回回溯法结果，失败时仍能落到暴力法。
3. 退化测试：人为构造一个不可解输入（例如 levelGap 极小、n 不被人数整除），回溯法应在时间/步数上限内返回 null，不抛异常、不卡死。
