# 场地数量可变重构设计

**日期：** 2026-06-06  
**文件：** `pages/create-match/create-match.js`

## 背景

`optimizeMatchSequence` 及其下游方法（`calculateTotalConflicts`、`reorderMatchesByConflict`、`showConflictSummary`）在检测同时进行的比赛冲突时，硬编码了 `if (courtCount === 2)` 的逻辑，导致场地数量实际上无法动态配置。需要重构为支持 1 或 2 个场地的通用逻辑，并在 UI 提供选择入口。

## 核心逻辑变更

将三个方法中的 `if (courtCount === 2) / else` 替换为通用批次逻辑：

- 将全部比赛按 `courtCount` 大小依次分成批次
- 批次 k：`matches[k*courtCount .. (k+1)*courtCount - 1]`
- 对每个批次，检查批次内所有配对（C(courtCount,2) 个）的冲突分数

**边界行为：**
- `courtCount=1`：每批 1 场，无配对，冲突恒为 0
- `courtCount=2`：每批 2 场，1 个配对，与现有逻辑完全一致

## UI 变更

在主表单新增场地数量 picker，与比赛名称、比赛类型平级：

- 选项：`['1块场地', '2块场地']`
- 绑定：`courtCount` data 字段（默认值保持 2）
- 新增 JS 处理器：`onCourtCountChange`

## 涉及改动

| 位置 | 类型 |
|------|------|
| `create-match.js` data | `courtCount` 默认值保持 2，无需变更 |
| `create-match.js` `calculateTotalConflicts` | 替换为批次通用逻辑 |
| `create-match.js` `reorderMatchesByConflict` | 替换为批次通用逻辑 |
| `create-match.js` `showConflictSummary` | 替换为批次通用逻辑 |
| `create-match.js` 新增 `onCourtCountChange` | 处理 picker 选择事件 |
| `create-match.wxml` | 新增场地数量 picker 组件 |
