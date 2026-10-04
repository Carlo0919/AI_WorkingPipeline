---
name: database-schema
description: ERD, every table's metadata (columns, types, constraints, indexes), relationships, purpose, PII classification and retention. Single source of truth for data shape; updated in the same commit as any data change.
---

# DatabaseSchema.md — {{PROJECT_NAME}}

**Database:** · **Schema managed by:** _(migration tool)_ · **Last verified against the live DB:**

## 0. Rules
| Rule | Meaning |
|------|---------|
| Docs first | A data-shape change is written here before or in the same commit as the change |
| Each module owns its tables | No cross-module FKs or ORM relations; reference by id |
| Every PII column | appears in §4 with a class and a retention period |
| Destructive changes | Drop, narrow, or rewrite data → the owner confirms first |
| Verify | After applying, inspect the live table and correct §2 |

## 1. ERD
```mermaid
erDiagram
    %% filled by /Start (DRAFT entities) and by each data-changing workflow
```
**Tables:** 0 · **Relationships:** 0

## 2. Tables
_(Template per table:)_
### 2.N `table_name`  — 🟡 DRAFT / ✅ LIVE
| Item | Value |
|------|-------|
| **Owner module** | |
| **Model / entity** | |
| **Purpose** | |
| **Written by** / **Read by** | |
| **Expected volume** | |
| **Retention** | |

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|

**Indexes:** · **Constraints:** · **Gaps:**

## 3. Relationships
| From | To | Kind | Enforced by | Note |
|------|----|------|-------------|------|

## 4. Data Classification
| Table.column | Class | Retention | Legal basis | Note |
|--------------|-------|-----------|-------------|------|

## 5. Non-Table Storage
| Store | Key / bucket pattern | Use | TTL |
|-------|----------------------|-----|-----|

## 6. Change Log
| Date | Commit | Change |
|------|--------|--------|
