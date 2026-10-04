---
name: data-modelling
description: Schema design rules — table ownership per module, naming, types, keys, constraints, indexes, migrations, PII classification and retention, and how to keep DatabaseSchema.md (ERD + table metadata) in sync. Stack-agnostic (relational-first). Use before adding or changing any table, column, index, relationship or migration.
---

# Data Modelling

The source of truth is `DatabaseSchema.md`. Update it **in the same commit** as any data-shape change.

## 1. Ownership
- **Each table belongs to one module.** Only that module reads or writes it.
- **Cross-module references are ids**, with no FK and no ORM relation. Check existence through the other module's public interface.
- Inside a module, use real FKs and relations.

## 2. Naming & types
| Thing | Convention |
|-------|------------|
| Tables / columns | `snake_case`; plural tables; avoid reserved words (`user`, `order` → `users`, `orders`) |
| PK | `id BIGINT GENERATED … AS IDENTITY` (or UUIDv7 when ids are generated client-side or must be unguessable) |
| Public reference in URLs | a random `public_id` (UUID), so internal sequential ids aren't enumerable |
| Money | `BIGINT amount_minor` + `CHAR(3) currency`. **Never float.** |
| Time | `TIMESTAMPTZ`, stored in UTC |
| Enums | `VARCHAR` + `CHECK` (or a native enum); store names, never ordinals |
| Text | `VARCHAR(n)` with a stated `n`, matched by input validation |
| Booleans / timestamps | `is_` / `has_` · `_at` |

## 3. Constraints are design
`NOT NULL` by default · **business uniqueness in the DB** (`UNIQUE (lower(email))`) · `CHECK` for ranges and enums ·
a `version` column for rows edited concurrently · `created_at` / `updated_at` everywhere · financial and audit tables are **append-only** (corrections are new rows).

## 4. Indexes
Every FK within a module · every column in a frequent `WHERE` / `ORDER BY` (composite, in filter
order) · **the tenant key first** on tenant-scoped tables · verify with `EXPLAIN ANALYZE` and record the result on the issue.

## 5. Migrations
A versioned migration tool (Flyway, Liquibase, Prisma Migrate, Drizzle Kit, Alembic, …). Auto-DDL only during throwaway learning.
**Expand → migrate → contract:** never rename or drop in the same release as the code change.
Dropping, narrowing, or rewriting data is **destructive**: confirm with the owner.

## 6. PII & retention
Every personal-data column gets a row in `DatabaseSchema.md` §4: class + **retention period** +
legal basis if required (`Start.md` row I). No retention period means it's not approved to store.
Consent is a record (purpose, version, timestamp, withdrawal), never a boolean.

## 7. The DatabaseSchema.md ritual (same commit)
1. The ERD (Mermaid `erDiagram`): solid relations within a module; "by id" notes across modules
2. The table block: owner module · model/entity · purpose · written by / read by · volume · retention · columns · indexes · constraints · gaps
3. Relationships · classification · a change-log row
4. After applying: inspect the live table (e.g. `\d <table>`) and correct the block to match reality
