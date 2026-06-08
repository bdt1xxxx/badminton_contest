# Project Context Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a single high-signal project context document that future sessions can read to understand this repository quickly.

**Architecture:** This is a documentation-only change. The new document lives at `docs/PROJECT_CONTEXT.md` and summarizes the current WeChat Mini Program structure, data model, core match-generation flow, verification commands, and known risks.

**Tech Stack:** WeChat Mini Program native files (`.js`, `.wxml`, `.wxss`, `.json`), local `wx` storage, Node.js verification script.

---

### Task 1: Create Project Context Document

**Files:**
- Create: `docs/PROJECT_CONTEXT.md`

- [x] **Step 1: Write the document**

Create `docs/PROJECT_CONTEXT.md` with these sections:

```markdown
# Project Context

## Session Bootstrap
## What This Project Is
## Repository Map
## Runtime And Tooling
## Main User Flows
## Data Model
## Doubles Match Generation
## Scoring And Statistics
## Import, Export, And Local Data
## Verification
## Known Risks And Sharp Edges
## Working Guidelines For Future Sessions
```

- [x] **Step 2: Verify referenced paths exist**

Run: `rg --files docs pages test utils chore app.json project.config.json README.md`

Expected: output includes the referenced files and exits successfully.

- [x] **Step 3: Run the existing algorithm smoke test**

Run: `node test/test-doubles-match.js`

Expected: exits with code 0 and prints both equal participation and conflict summary lines.

- [x] **Step 4: Review the document**

Check that the document contains no placeholder markers or vague unfinished sections, and that it clearly states `utils/badminton-planning.js` is not the active implementation path.
