# Project Context Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `docs/PROJECT_CONTEXT.md` 更新为中文主文档，准确描述当前 App 的功能特征、代码逻辑、核心痛点与维护建议。

**Architecture:** 基于现有代码与最近提交进行“文档重构”，不改业务代码，只更新上下文文档结构与内容。重点覆盖创建流程、双打算法、详情页计分、云端共享、已知风险和验证路径。

**Tech Stack:** WeChat Mini Program（原生）、Cloud Functions、Markdown 文档。

---

### Task 1: 收集上下文并形成分析框架

**Files:**
- Read: `README.md`
- Read: `pages/create-match/create-match.js`
- Read: `pages/match-detail/match-detail.js`
- Read: `pages/match-list/match-list.js`
- Read: `pages/profile/profile.js`
- Read: `utils/cloud-match.js`
- Read: `cloudfunctions/createMatch/index.js`
- Read: `cloudfunctions/updateMatch/index.js`
- Read: `docs/PROJECT_CONTEXT.md`

- [ ] **Step 1: 梳理模块职责与主流程**
- [ ] **Step 2: 提炼“特征”与“痛点”并按优先级分层**
- [ ] **Step 3: 对齐当前文档中仍有效与已过时的描述**

### Task 2: 重写中文上下文文档

**Files:**
- Modify: `docs/PROJECT_CONTEXT.md`

- [ ] **Step 1: 输出中文结构化章节（项目定位、流程、模块、算法、云端、痛点、建议）**
- [ ] **Step 2: 保留关键事实并修正文档与代码不一致处**
- [ ] **Step 3: 明确验证命令与后续维护约束**

### Task 3: 自检

**Files:**
- Verify: `docs/PROJECT_CONTEXT.md`

- [ ] **Step 1: 检查是否中文为主、信息完整、无占位符**
- [ ] **Step 2: 检查痛点是否可追溯到具体代码位置与行为**
- [ ] **Step 3: 确认本次只变更文档文件**
