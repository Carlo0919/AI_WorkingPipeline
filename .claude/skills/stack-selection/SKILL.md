---
name: stack-selection
description: How to recommend a complete tech stack (backend, frontend, database, cache/queue, architecture, hosting) from a project's intake answers when the user has no preference, can't answer, or only fixes part of it. Used by /Start (checklist row K) and by the planner when a new capability needs a technology choice. Produces a recommendation with one-line reasons per piece and a rejected alternative.
---

# Stack Selection

**The goal is the most boring stack that meets the requirements and that this team can run.**
A stack the team already knows beats a better stack it doesn't, nearly every time, for a small team.

## 1. Inputs (from Start.md §2)

| Row | Why it matters for the stack |
|-----|------------------------------|
| **N Team** | **The heaviest weight.** Known language/framework > everything else |
| **J Platforms** | Web only / mobile / desktop / API only / offline |
| **F Traffic tier** | Whether a cache, queue, and several instances are needed from day one |
| **G Features** | Realtime? Heavy CRUD/admin? AI/ML? File processing? Search? |
| **H Integrations** | SDK availability (payment gateways, AI providers) per language |
| **I Data** | Relational data → PostgreSQL. Sensitive or regulated data → a framework with mature auth/audit libraries |
| **L Hosting & budget** | PaaS vs a VPS vs a cloud provider; data residency → the region |
| **M Timeline** | Short timeline → fewer moving parts, more batteries included |

## 2. Decision order

1. **Fix what the user fixed.** A partial preference ("I want React") is a constraint, not a suggestion.
2. **Backend language = what the team knows**, unless a requirement rules it out (e.g. heavy ML → Python).
3. **No team experience stated, or a beginner** → pick by project shape (§3).
4. **Database: PostgreSQL** unless there's a specific reason not to. It covers relational data, JSON, full-text search, and vectors (pgvector).
5. **Architecture: modular monolith** for Low and Medium tiers, and for High too until a module proves a different scaling need. Never microservices on day one.
6. **Add infrastructure only where the tier demands it** (§4).
7. **Hosting by budget and tier** (§5).

## 3. Default by project shape (when the team has no preference)

| Project shape | Backend | Frontend | Why |
|---------------|---------|----------|-----|
| Web app with UI, CRUD, dashboards (most projects) | **TypeScript: NestJS** (modular by design) | **Next.js (React + TS)** | One language end to end; huge ecosystem; NestJS modules map 1:1 onto a modular monolith |
| Business / enterprise backend, long-lived, strict typing, the team leans Java | **Java: Spring Boot + Spring Modulith** | Next.js, or none | Mature transactions, security, and batch tooling; module verification built in |
| AI / ML / data-processing heavy (RAG, embeddings, analytics) | **Python: FastAPI** (+ a worker: Celery / RQ / Dramatiq) | Next.js | Best ML/LLM library ecosystem |
| Realtime (chat, live dashboards, games, presence) | **TypeScript: NestJS + WebSockets** (or **Go** at High tier) | Next.js | Event-loop concurrency; first-class WS support |
| API only / integrations hub | NestJS, or FastAPI | none | Smallest surface |
| Content site / marketing / blog | **Next.js alone** (static + route handlers) | — | No separate backend needed |
| Mobile app | backend from the rows above + **React Native (Expo)**, or a **PWA** if offline / low-end Android / no app store needed | — | Shares TS with the web; a PWA avoids two native codebases |
| Desktop app | backend from the rows above + **Tauri** (or Electron if web-heavy) | — | Small binaries |

Supporting defaults:

| Need | Default |
|------|---------|
| ORM / data access | Prisma or Drizzle (TS) · Spring Data JPA (Java) · SQLAlchemy 2 + Alembic (Python) |
| Migrations | the ORM's migration tool, or Flyway (Java). Never "auto-update schema" past the learning stage. |
| Auth | the framework's mature option (Spring Security · Passport/Auth.js · FastAPI + a proven JWT lib), or a managed IdP (Keycloak self-hosted; Clerk/Auth0/Supabase Auth hosted) when social login and MFA are needed fast |
| File storage | S3-compatible object storage (S3, R2, MinIO) |
| Search | PostgreSQL full-text first; Meilisearch / OpenSearch only on evidence |
| Vectors (RAG) | pgvector in the same PostgreSQL |
| Testing | the framework's standard (JUnit 5 · Vitest/Jest + Supertest · pytest) + Playwright for E2E |
| CI | GitHub Actions |

## 4. Infrastructure by traffic tier (Start.md §3)

| Tier | Cache | Queue / jobs | Instances | Extras |
|------|-------|--------------|-----------|--------|
| **Low** | in-process only (or none) | only if work is slow (DB-backed jobs are fine) | 1 | — |
| **Medium** | **Redis** (cache, sessions, rate limits) | Redis-backed (BullMQ / Celery / Spring + Redis) | 2+ behind a load balancer | CDN for static assets, pooled DB connections |
| **High** | Redis cluster | a dedicated broker (RabbitMQ / SQS / Kafka only if event streaming is truly needed) | autoscaling | DB read replicas, CDN, load tests before launch, observability and alerting |

## 5. Hosting by budget

| Budget / tier | Hosting |
|---------------|---------|
| Learning / ~$0–10/mo, Low | One VPS with Docker Compose (app + Postgres), or a PaaS free/cheap tier (Render, Railway, Fly.io) |
| Small product, Low–Medium | PaaS or a VPS for the app + a **managed PostgreSQL** (backups handled) |
| Medium–High, or compliance | A cloud provider (AWS / GCP / Azure / Alibaba) in the **required region**, containers (ECS / Cloud Run / Kubernetes only if the team can run it), Terraform |

**Data residency** (row I) overrides cost: everything, including backups, sits in the required region.

## 6. Output (paste into the /Start summary and TechnicalSpec.md)

```markdown
### Tech stack — auto-recommended (or user-required / partly user-required)
| Layer | Choice | Why it fits this project |
|-------|--------|--------------------------|
| Architecture | Modular monolith | <tier + team size reason> |
| Backend | <lang + framework> | <team / feature reason> |
| Frontend | <framework or none> | <platform reason> |
| Database | PostgreSQL | <data reason> |
| Cache / queue | <none / Redis / …> | <tier reason> |
| Auth | <choice> | <roles / sensitivity reason> |
| Hosting | <choice> | <budget / residency reason> |
| Testing / CI | <choice> | standard for the stack |

**Rejected:** <alternative> — <why it lost, one line>
**Versions:** current stable/LTS, pinned when the project is scaffolded (check at scaffold time; never from memory).
```

## Rules
- ✅ Every choice has a one-line reason tied to an intake answer. "It's popular" isn't a reason.
- ✅ Verify current stable versions when scaffolding. Don't quote versions from memory in the recommendation.
- ❌ No microservices, Kubernetes, Kafka, or NoSQL by default. Each needs a stated requirement that demands it.
- ❌ Never two backend languages on day one, unless one is an isolated AI/ML service with a clear reason.
