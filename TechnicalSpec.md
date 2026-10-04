---
name: technical-spec
description: Every resource the system needs, from high-level architecture down to package versions, worker counts, server sizing, caching and environments. Seeded by /Start (stack + traffic tier), grown per mechanism by /AutomateWorkflow.
---

# TechnicalSpec.md — {{PROJECT_NAME}}

> Legend: ✅ in use / decided · 📐 proposed, not built · ❓ undecided
> **Grows per mechanism:** a plan that adds or changes a resource updates the matching section **in the same commit**.

**Last updated:**

## 1. High-Level Design
### 1.1 Architecture style
_(Default: a modular monolith. Diagram of the runtime: clients → edge → app modules → data stores → external services.)_
### 1.2 Module rules
| Rule | Enforced by |
|------|-------------|
### 1.3 Request lifecycle
_(How a request flows through the layers.)_

## 2. Cross-Cutting Decisions
| Concern | Decision | Status |
|---------|----------|--------|
| Auth | | |
| Validation | | |
| Error format | | |
| Schema migrations | | |
| Caching | | |
| Async / queues | | |
| Observability | | |
| Config & secrets | | |
| Integrations (Start.md H) | | |

## 3. Stack — Low-Level
**Decided by:** user-required / auto-recommended at intake (Start.md row K) — reasons below.
### 3.1 Backend
| Component | Version | Role | Why |
|-----------|---------|------|-----|
### 3.2 Frontend
| Component | Version | Role | Why |
|-----------|---------|------|-----|
**Packages (npm / etc.):** | Package | Version | Why |
**Bundle / payload budget:**
### 3.3 Database & storage
| Store | Engine / version | Use |
|-------|------------------|-----|
### 3.4 Testing & CI
| Tool | Use |
|------|-----|

## 4. Workers, Threads & Pools
| Pool | Setting | Why |
|------|---------|-----|

## 5. Server Sizing (from the traffic tier, Start.md §3)
**Tier:** · **Normal / peak concurrent:** · **Requests/day:**
| Environment | Instances | Size (CPU / RAM) | DB | Cache / queue | Notes |
|-------------|-----------|------------------|----|---------------|-------|
**Measured footprint:** _(filled after the first build: RSS, startup time, heap.)_
**Scale-out triggers:** _(which metric, at which value, triggers the next step in `skills/system-design` §4.)_

## 6. Caching
| Layer | Current | Proposal | TTL / invalidation |
|-------|---------|----------|--------------------|

## 7. Environments & Dev Loop
| Env | Where | Status |
|-----|-------|--------|
**Commands:** build · test · run · lint

## 8. Mechanism Notes
_(One subsection per mechanism, appended when it's built.)_
