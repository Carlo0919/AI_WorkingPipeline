---
name: system-design
description: Architecture, module boundaries, concurrency, scaling order, caching, queues/events, failure modes, sizing and observability — stack-agnostic rules for a modular-monolith-first project. Use when planning or reviewing how the system is structured, how a new module fits, how it holds up under the traffic tier, or whether a cache/queue/new service is justified.
---

# System Design

**Governing bias:** the boring, single-deployable, easily debugged option, until a **measurement**
forces otherwise. Lookup tables are in `REFERENCE.md`. Traffic tiers are in `Start.md` §3; sizing is in `TechnicalSpec.md` §5.

## 1. Modular monolith rules
| Rule | Why |
|------|-----|
| One module per business domain (Project.md §2.5), one top-level folder/package each | A boundary you can see and test |
| A module exposes a **public interface** (service interface + DTOs + events); everything else is internal | Internals stay free to change |
| Modules talk by **calls** (need an answer now) or **events** (announce a fact) | One-directional dependencies |
| **No shared tables, no cross-module FKs or ORM relations**: reference by id | A module can move to its own schema or service later |
| No cycles | Use an automated boundary check where the stack has one (Spring Modulith, dependency-cruiser, import-linter, ArchUnit, Nx) |

**Extract a module into a service only** for a genuinely different scaling curve, failure-isolation need, runtime, or team. Never because it "feels cleaner".

## 2. Reversibility filter
| Expensive to undo | Cheap to undo |
|-------------------|---------------|
| Module boundaries, public API shape, primary datastore, identity/auth model, public id format, data residency | Cache choice, pool sizes, queue driver, CDN, index choices |

Argue the left column. Decide the right column fast.

## 3. Concurrency
**If two requests can touch the same row, the guard goes in the `WHERE` clause (or uses optimistic locking), and you check rows affected.** A read → check → write sequence is a race in every stack.

| Need | Pattern |
|------|---------|
| Claim a slot / decrement under a floor | `UPDATE … SET n = n - 1 WHERE id = ? AND n > 0` → branch on rows |
| No lost updates | a version column (optimistic lock) → 409 on mismatch |
| Unique business key | DB unique index; catch the violation → 409 |
| Idempotent webhook / POST / job | unique key on `(source, event_id)` or `Idempotency-Key`; insert first |
| Gap-free sequence | seed row → `SELECT … FOR UPDATE` → increment, in one transaction |
| Cross-process mutex | Redis lock **with a TTL** |

**Transactions:** nothing that leaves the process (HTTP, mail, files, payments, LLM) goes inside a DB transaction.

## 4. Scaling order (each step only on evidence)
1. Fix the query (an index, pagination, no N+1) · 2. Tune the connection pool / hold connections less ·
3. Cache the read-heavy, stable data · 4. Move slow work to a queue · 5. Read replica · 6. More stateless instances (needs a shared session/cache store) · 7. Partition the big tables · 8. Extract a service, last.

**What breaks first is rarely CPU.** It's the DB connection pool, unbounded queries, or a slow external dependency.

## 5. Caching
Measure first · every entry has a **TTL** + an explicit evict on write · **the key includes every scope** (tenant, user, role), or the cache leaks across tenants · cache DTOs, not ORM objects · in-process cache with one instance; Redis with 2+ · version static asset URLs instead of purging.

## 6. Queues & events
Every job is **idempotent** · bounded retries with backoff → a dead-letter queue · no `sleep` in workers · separate queues by failure domain (payments ≠ emails ≠ reports) · alert on **queue depth and oldest-message age**, not just worker liveness.

## 7. Failure modes
For every dependency, ask: *if this is down, can the core user flow still work?*
| Failure | Response |
|---------|----------|
| DB down / pool exhausted | Fail fast (short acquire timeout) → 503; shorter transactions |
| Slow external API | Timeout + bounded retry with backoff + circuit breaker; never inside a transaction |
| Duplicate delivery | Idempotency key |
| Traffic spike | Rate limits, queueing, autoscaling (High tier) |

## 8. Minimum observability before any deployment
Health (liveness ≠ readiness) · P50/P95/P99 latency per endpoint · error tracking with alerts · pool and queue metrics · cost alerts for metered services (LLM, SMS).
