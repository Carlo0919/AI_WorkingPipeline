---
name: start-record
description: The first-run intake record — the user's original project description (verbatim), the intake checklist with every answer and its source, the Q&A log, and the confirmed summary. Written by /Start once; locked afterwards. Project.md is derived from it.
---

# Start.md — Project Intake Record

**Intake status:** ⬜ NOT STARTED
<!-- Lifecycle: ⬜ NOT STARTED → 🟨 IN PROGRESS → ✅ LOCKED.
     While this line is not "✅ LOCKED", the start-gate hook makes /Start the first thing Claude does.
     Only /Start changes this line. -->

**Locked on:** — · **Confirmed by:** —

> This file is written **once**, by `/Start`, on the first session of a project. After it's
> locked, `/Start` is no longer required, and `/Commander` works from `Project.md` and the other
> docs. §1 is **never edited** after locking. A later major change of direction goes in §6
> (Addenda) as a new entry.

---

## 1. Original description (verbatim)

> _(The user's first description of the project, pasted exactly as given. No paraphrasing.)_

---

## 2. Intake checklist

Every row needs an answer or an explicit `❓ UNKNOWN (accepted by user)`. **Source** says where
the answer came from: `original` (it was in §1) or `Q&A n` (the round in §4).

| # | Topic | What a good answer looks like | Answer | Source |
|---|-------|-------------------------------|--------|--------|
| A | **What is it** | One sentence: what it lets someone do that they can't today. Plus its type: learning, portfolio, product, or internal tool. | | |
| B | **Goal & success metric** | A number with a baseline and a target, e.g. "500 weekly active users by March" | | |
| C | **Target users** | Each segment: who, device, language, location, what makes them open it | | |
| D | **User roles** | Each role: what it can do, what it can see, what it must never see | | |
| E | **Domains** | Web surfaces (sites, subdomains, apps), plus business domains (the nouns the system manages) | | |
| F | **Traffic tier** | Low / Medium / High (§3), plus numbers: concurrent users, requests/day, peak pattern | | |
| G | **Core services / features** | The 3–10 things the system must do in v1 | | |
| H | **Integrations** | Payments, email, SMS, auth providers, AI/LLM, maps, storage, analytics… | | |
| I | **Data & sensitivity** | What's stored; personal, payment, or health data; legal or residency constraints | | |
| J | **Platforms** | Web / mobile / desktop / API-only; offline needed? | | |
| K | **Tech stack** | The user's required stack, or — if they can't say or don't mind — the stack Claude recommends (`skills/stack-selection`). Labelled `user-required` or `auto-recommended`. | | |
| L | **Hosting & budget** | Where it runs; monthly budget envelope | | |
| M | **Timeline** | Deadline and milestones, and what drives them | | |
| N | **Team** | Who builds it, how many, their experience | | |
| O | **Out of scope** | What people will ask for that v1 says no to (an empty list isn't an answer) | | |
| P | **Biggest risk** | The single most likely reason it fails | | |

---

## 3. Traffic tiers (used for F and drives TechnicalSpec.md §5)

| Tier | Rough numbers | Default architecture implication |
|------|---------------|----------------------------------|
| **Low** | < 50 concurrent users · < 10k requests/day · no sharp peaks | One app instance, one DB, in-process cache only, no queue unless the work is slow |
| **Medium** | 50–1,000 concurrent · 10k–1M requests/day · predictable peaks | 2+ stateless instances behind a load balancer, Redis (cache, sessions, rate limits), a background job queue, a CDN for static assets, pooled DB connections |
| **High** | > 1,000 concurrent · > 1M requests/day · or sharp spikes (launches, exams, sales) | Autoscaling, a Redis cluster, queues for every slow path, DB read replicas, a CDN, load testing before launch, and mandatory observability and alerting |

If the user doesn't know, ask: *"How many people at the same moment, on a normal day and on
the busiest day?"* and pick the tier from the answer.

---

## 4. Q&A log

| Round | Asked | Answered | Checklist rows filled |
|-------|-------|----------|-----------------------|
| | | | |

---

## 5. Confirmed summary

_(The summary the user confirmed with `yes`, copied here at lock time. Project.md §1–§7 is derived from it.)_

---

## 6. Addenda (major scope changes after lock)

_(Each entry: date · what changed · the user's words · which Project.md sections were updated. §1 stays untouched.)_
