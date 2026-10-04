---
name: codebase
description: Measured state of the code — security measures (auth, rate limiting, input/JSON validation, IP restriction, headers, secrets), code quality, retry/resilience, latency, audit logging, CPU/memory, caching. Every claim backed by a probe, a measurement or a file:line. security.md owns §1; review.md owns §2–§7.
---

# Codebase.md — {{PROJECT_NAME}}

**Last audited:** — against commit — · **Method:**
> Every row cites evidence (a probe, a number, a `file:line`). A row without evidence is a guess, so delete it.
> Legend: ✅ in place · ⚠️ partial · ❌ absent · 📐 recommended fix

**Baseline:** _no code yet_, so the first audit runs after the first code workflow.

## Scorecard
| Area | Status | One-line verdict |
|------|--------|------------------|
| Authentication / authorisation | | |
| Rate limiting | | |
| Input / JSON validation | | |
| IP restriction / exposure | | |
| Headers / CORS / cookies | | |
| Secrets | | |
| Error handling / leakage | | |
| Retry / resilience | | |
| Latency | | |
| Audit log | | |
| CPU / memory control | | |
| Caching | | |
| Module boundaries | | |
| Tests | | |

## 1. Security Measures  _(owned by security.md)_
### 1.1 Authentication & authorisation
### 1.2 Rate limiting
### 1.3 Input & JSON-injection protection
| Probe | Result | Verdict |
|-------|--------|---------|
### 1.4 IP restriction & exposure
### 1.5 Transport, headers, CORS
### 1.6 Secrets
### 1.7 Information leakage

## 2. Code Quality  _(owned by review.md from here down)_
| Check | Status | Evidence |
|-------|--------|----------|

## 3. Retry & Resilience
| Layer | Status | Detail |
|-------|--------|--------|

## 4. Latency
**Method:** _(tool, sample size, warm-up, data size, environment)_. Re-run the same method in `/AutomateWorkflow` Step 8.
| Endpoint | P50 | P95 | P99 | Max |
|----------|-----|-----|-----|-----|

## 5. Audit Log
_(What is recorded, and how far an action can be traced: who, when, what changed, from where.)_

## 6. CPU & Memory Resource Control
| Control | Status |
|---------|--------|

## 7. Caching
| Layer | Status | Hit pattern / TTL |
|-------|--------|-------------------|

## 8. Change Log
| Date | Commit | Area | Change |
|------|--------|------|--------|
