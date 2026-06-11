# 微信小程序比赛成绩共享与权限控制设计（方案 B）

## 1. 背景与目标

当前小程序仅使用本地 `wx.getStorageSync('matches')`，属于单机数据。
结果是：
- 创建者能看成绩
- 其他参赛者无法独立打开小程序查看最新成绩

本次设计目标：
1. 支持创建者将比赛分享给参赛者查看
2. 限制为“仅参赛者可读”
3. 数据同步采用“手动刷新”（降低调用成本）
4. 在现有小程序架构下可渐进接入

非目标（V1 不做）：
- 实时推送/实时监听
- 单打排程改造
- 复杂多角色后台管理

## 2. 选型结论

已确认采用：`邀请码 + OpenID 绑定（方案 B）`。

理由：
- 相对纯口令方案更安全（绑定后以 OpenID 权限为准）
- 相对纯 OpenID 白名单方案更可落地（无需提前收集所有 OpenID）
- 与手动刷新策略兼容，能有效控制云访问成本

## 3. 总体架构

### 3.1 组件

- 小程序前端页面
  - `pages/create-match`：创建比赛并触发云端创建
  - `pages/match-list`：展示“我可访问”的比赛并支持手动刷新
  - `pages/match-detail`：查看成绩（授权用户）与更新成绩（创建者）
  - 新增 `pages/join-match`：参赛者输入邀请码并绑定身份
- 云开发数据库（Cloud Database）
  - `matches`
  - `match_members`
  - `match_invites`
- 云函数（Cloud Functions）
  - `createMatch`
  - `joinMatch`
  - `listMyMatches`
  - `getMatchDetail`
  - `updateScore`

### 3.2 核心流程

1. 创建者创建比赛 -> 调用 `createMatch`，写入云端并生成邀请码。
2. 参赛者通过分享进入 `join-match` -> 输入邀请码 -> 选择自己的参赛身份 -> 调 `joinMatch` 绑定 `openid`。
3. 参赛者进入列表页点击手动刷新 -> `listMyMatches` 返回其有权限的比赛。
4. 进入详情页时调用 `getMatchDetail`，云端二次校验权限。
5. 创建者更新比分调用 `updateScore`，写入后更新 `updatedAt`。

## 4. 数据模型设计

### 4.1 `matches`

用途：比赛主记录。

关键字段：
- `_id`（云数据库主键）
- `name`（比赛名称）
- `type`（`double`/`single`，V1 主要支持 `double`）
- `players`（参赛人员快照）
- `rounds`（赛程）
- `status`（`ongoing`/`finished`）
- `creatorOpenId`（创建者）
- `createdAt`
- `updatedAt`

### 4.2 `match_members`

用途：参赛者身份与读权限关系。

关键字段：
- `_id`
- `matchId`
- `participantId`（比赛内参赛者唯一 ID，来自 `players`）
- `participantName`
- `boundOpenId`（首次绑定后写入）
- `role`（`creator` / `player`）
- `bindAt`

约束：同一 `matchId` 下，一个 `boundOpenId` 只能绑定一个 `participantId`。

### 4.3 `match_invites`

用途：邀请码控制。

关键字段：
- `_id`
- `matchId`
- `codeHash`（邀请码哈希，不存明文）
- `status`（`active`/`disabled`/`expired`）
- `expireAt`
- `maxUses`
- `usedCount`
- `createdAt`

## 5. 权限模型

### 5.1 读权限

只有满足下列条件才可读取比赛：
- 当前用户 `openid` 在 `match_members.boundOpenId` 中，且 `matchId` 匹配。

### 5.2 写权限

V1 规则：
- 仅 `creatorOpenId` 可调用 `updateScore`。
- 参赛者仅可读。

### 5.3 绑定规则

- 首次绑定要求：邀请码有效 + 选择的 `participantId` 未被他人绑定。
- 若该 `openid` 已在本比赛绑定其他 `participantId`，拒绝并提示联系创建者处理。

## 6. API/云函数契约（V1）

### 6.1 `createMatch`

入参：`name`, `type`, `players`, `rounds`。  
出参：`matchId`, `inviteCode`（仅返回一次给创建者）。

行为：
- 写 `matches`
- 批量写 `match_members`
- 写 `match_invites`

### 6.2 `joinMatch`

入参：`matchId`, `inviteCode`, `participantId`。  
出参：`ok`, `memberInfo`。

行为：
- 校验邀请码（哈希比对、有效期、状态、次数）
- 校验 `participantId` 可绑定
- 写入 `boundOpenId`

### 6.3 `listMyMatches`

入参：无。  
出参：当前 `openid` 可访问的比赛摘要列表。

行为：
- 通过 `match_members` 反查用户可读 `matchId`
- 聚合返回比赛基础信息

### 6.4 `getMatchDetail`

入参：`matchId`。  
出参：比赛详情（`rounds`、当前排名等）。

行为：
- 服务端先校验读权限再返回数据

### 6.5 `updateScore`

入参：`matchId`, `roundIndex`, `matchIndex`, `score`。  
出参：`ok`, `updatedAt`。

行为：
- 校验调用者为创建者
- 更新对应比分
- 更新 `updatedAt`

## 7. 成本控制策略

1. 不使用数据库实时监听，统一采用用户触发“手动刷新”。
2. 列表页与详情页都支持本地缓存，首屏先显示缓存，再由用户决定刷新。
3. 简单防抖：短时间连续点击刷新直接复用上次结果（如 5-10 秒窗口）。
4. 只返回必要字段（列表接口不返回完整 `rounds`）。

## 8. 异常与恢复

- 邀请码错误/过期：明确错误文案并允许重试。
- 参赛者已被绑定：提示该身份已被占用。
- 当前用户已绑定其他身份：提示联系创建者解绑。
- 无权限访问详情：返回统一权限错误码，前端跳转到引导页。

## 9. 迁移策略（本地到云）

V1 采用渐进迁移：
1. 新创建的比赛默认写云端；保留本地结构作为缓存。
2. 老比赛可继续本地浏览，不强制迁移。
3. 后续可在 `profile` 增加“上传本地比赛到云端”工具（非本次范围）。

## 10. 验收标准（V1）

1. 参赛者可通过“分享 + 邀请码 + 身份绑定”查看比赛成绩。
2. 非参赛者无法读取比赛详情。
3. 创建者更新比分后，参赛者手动刷新可看到最新数据。
4. 主要异常路径均有可理解提示。
5. 在不启用实时监听条件下完成核心闭环。

