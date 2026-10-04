# System Design — Reference

## 1. Latency orders of magnitude
| Operation | Typical |
|-----------|---------|
| In-process cache hit | ~100 ns–1 µs |
| Redis GET (same DC) | ~0.2–0.5 ms |
| Postgres indexed point read | ~0.5–2 ms |
| Postgres sequential scan, 1M rows | ~200 ms–1 s |
| Same-region HTTP call | ~5–50 ms |
| Cross-region round trip (e.g. SEA ↔ US) | ~180–250 ms |
| LLM first token / full response | ~0.3–1 s / 3–10 s |

A synchronous chain of three external calls is over budget before your code runs. Parallelise, cache, or queue.

## 2. Latency budgets (P95, adjust per project in TechnicalSpec.md)
| Path | Target |
|------|--------|
| Simple read API | < 100 ms |
| Write API | < 300 ms |
| Page load (cached shell) | < 1 s |
| Dashboard / report | < 2 s (precomputed rollups, not live aggregation) |
| Anything over ~2 s | stream it or make it async |

## 3. Capacity worked example
100 concurrent users × 1 request / 5 s = **20 req/s**. At ~5 ms of DB time per request that's
0.1 connection-seconds per second, so a pool of 10 has ~100× headroom. The first real limit is
usually an unbounded query, not throughput.

## 4. Pool sizing rules of thumb
| Pool | Rule |
|------|------|
| DB connections per instance | ~10–20 for a small app; more isn't faster past the DB's capacity; total = instances × pool ≤ the DB's max connections |
| Connection acquire timeout | 3–5 s for an API (fail fast) |
| Worker concurrency | bound by the slowest downstream (DB, API rate limit), not by CPU |

## 5. Pre-deployment checklist
- [ ] Migrations, not auto-DDL · [ ] secrets from the environment · [ ] auth, validation, rate limits (`skills/api-security`)
- [ ] Health + metrics + error alerts · [ ] memory limits set · [ ] backups + a tested restore · [ ] rollback path tested once
- [ ] Sized for the traffic tier (TechnicalSpec.md §5); load-tested at High tier
