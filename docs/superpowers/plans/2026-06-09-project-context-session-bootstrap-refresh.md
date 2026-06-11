# Project Context Session Bootstrap Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `docs/PROJECT_CONTEXT.md` into a high-signal session bootstrap document so a new Claude/Codex chat can load core project context in 1-2 minutes.

**Architecture:** Keep this as a docs-only change. Replace the current long-form narrative with a compact bootstrap template: quick summary, key files, key data model, workflow commands, risks, and a copy-ready startup prompt block for future sessions.

**Tech Stack:** Markdown documentation in a WeChat Mini Program repository.

---

### Task 1: Rewrite Session Bootstrap Document

**Files:**
- Modify: `docs/PROJECT_CONTEXT.md`

- [ ] **Step 1: Rewrite structure for quick loading**

Replace existing content with concise sections focused on new-session onboarding:

```markdown
# Project Context
## How To Use This File
## Project Snapshot
## Core Product Flows
## Key Code Map
## Data Contract (Storage)
## Scheduling System Notes
## Verification Commands
## Known Gaps / Risks
## Session Startup Prompt (Copy/Paste)
## Update Rules
```

- [ ] **Step 2: Keep only high-value, stable details**

Ensure each section prioritizes:
- what to read first
- where core logic lives
- what can break easily
- how to verify quickly

Remove deep historical details that are better discovered on-demand in code.

- [ ] **Step 3: Quick quality check**

Run: `sed -n '1,260p' docs/PROJECT_CONTEXT.md`
Expected: structure is compact, readable, and includes a ready-to-use startup prompt block.

- [ ] **Step 4: Sanity verification for referenced project paths**

Run: `rg --files docs pages test utils app.json project.config.json`
Expected: referenced directories/files exist.
