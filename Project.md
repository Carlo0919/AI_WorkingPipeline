---
name: project
description: Living specification — definition, goals, target users, scope, domains, roles with their functionalities/uses/assets/access, every mechanism with its status, timeline, decisions, open questions, and the progress log updated after every workflow. Single source of truth for WHAT is being built. Derived from Start.md at intake.
---

# Project.md — {{PROJECT_NAME}}

> **Status:** ⬜ **EMPTY — filled by `/Start` from [Start.md](Start.md).** Don't build against this file until it's filled.

**Owner:** · **Repo:** · **Created:** · **Last updated:**
**Kickoff issue:** _(created by `/Start`)_

Legend: ✅ verified · ❓ unresolved (do not build against it)

---

## 1. Definition, Goals & Target Users
### 1.1 Definition
_(What it is, the problem it solves, and its type: learning, portfolio, product, or internal.)_
### 1.2 Goals
| # | Goal | Measure (baseline → target) | Status |
|---|------|-----------------------------|--------|
### 1.3 Target users
| Segment | Who | Device / channel | Language | Trigger to use | Churn risk |
|---------|-----|------------------|----------|----------------|------------|

## 2. Scope
### 2.1 In scope (v1)
### 2.2 Out of scope
### 2.3 Traffic tier
**Tier:** Low / Medium / High (Start.md §3) · normal concurrent: · peak concurrent: · requests/day: · peak pattern:
### 2.4 Web domains / surfaces
| Surface | Host | Who | Pages / endpoints | Auth | Status |
|---------|------|-----|-------------------|------|--------|
**Count:** N surfaces.
### 2.5 Business domains (modules)
| Module | Path | Responsibility | Public interface | Status |
|--------|------|----------------|------------------|--------|
**Count:** N modules.

## 3. Mechanism Inventory
Status: ⬜ Not started · 🟨 In progress · 🟦 In review · ✅ Live · ⏸️ Deferred.
**A mechanism can't leave ⬜ while its block still has a ❓.**

### M1 — _name_
- **Status:** ⬜
- **Purpose:**
- **Scope:**
- **Module(s):** · **Roles:**
- **Depends on:** · **Blocks:**
- **Data touched:** (DatabaseSchema.md §)
- **Integrations:**
- **Testing:**
- **Est.:**
- **Open:** ❓

## 4. Roles: Functionalities, Uses, Assets & Access
### 4.1 Role matrix
| Role | Belongs to | Functionalities (can do) | Uses (why) | Assets touched | Access level | Must never see | Auth |
|------|-----------|--------------------------|------------|----------------|--------------|----------------|------|
**Highest-blast-radius role:** _(which, and what stops it)_
### 4.2 Asset register
| Asset | Where | Sensitivity | Owner module | Who can read | Who can write |
|-------|-------|-------------|--------------|--------------|---------------|

## 5. Timeline
| Date | Milestone | Status |
|------|-----------|--------|
**Deadline:** · **Driven by:**

## 6. Decisions
| ID | Date | Decision | Why | Reversible? |
|----|------|----------|-----|-------------|

## 7. Open Questions
| # | Question | Blocks | Status |
|---|----------|--------|--------|

## 8. Progress Log
**One row per workflow** (normally one commit). Newest first. Checked by the `record-progress`
(after a commit) and `uncommitted-check` (end of turn) hooks. A workflow without a commit still
gets a row if it changed behaviour, data, or a decision; if not, the reason is given in chat.

| Date | Commit | Issue | Mechanism | What changed | Docs touched |
|------|--------|-------|-----------|--------------|--------------|

## 9. Maintaining This File
- §1–§7 change only after an approved scope change (`/Start` addendum or an approved plan).
- Status moves with the work: Step 1 ⬜→🟨 · review 🟦 · merged ✅.
- **§8 gets a row after every workflow.**
- Closing a §7 question names where the answer lives (an issue or a doc).
- Data-shape changes go in DatabaseSchema.md first.
