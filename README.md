# AI_WorkingPipeline

**English** · [简体中文](README.zh-CN.md)

A project framework for **Claude Code** that automates the whole delivery path: intake, task
allocation, coding, review, testing, a final security check, and progress recording.

```
First run:   /Start  ──►  Start.md (locked)  ──►  Project.md · TechnicalSpec.md · DatabaseSchema.md · Codebase.md
Every task:  /Commander <task>  ──►  /AutomateWorkflow for each unit:
             plan ─► 🛑 you approve (chat or GitHub) ─► code ─► review ─► test ─► security ─► record progress ─► commit ─► 🛑 asks before pushing
```

---

## Contents

1. [Requirements](#1-requirements)
2. [Quick start](#2-quick-start)
3. [First run: `/Start` (mandatory)](#3-first-run-start-mandatory)
4. [Every task: `/Commander`](#4-every-task-commander)
5. [One unit of work: `/AutomateWorkflow`](#5-one-unit-of-work-automateworkflow)
6. [How progress recording is enforced](#6-how-progress-recording-is-enforced)
7. [The documents](#7-the-documents)
8. [Agents · Skills · Hooks](#8-agents--skills--hooks)
9. [Configuration](#9-configuration-claudepipelineconfigjson)
10. [FAQ](#10-faq)

---

## 1. Requirements

| Tool | Used for | Check |
|------|----------|-------|
| [Claude Code](https://claude.com/claude-code) | Runs the whole pipeline | `claude --version` |
| Git | Branches, worktrees, commits | `git --version` |
| Node.js 18 or newer | Hooks and `commander.mjs` | `node -v` |
| GitHub CLI, logged in | Opening issues, posting plans, reading your approval | `gh auth status` |
| Your project's own toolchain | e.g. `mvn`, `npm`, `ruff`; the quality gate detects it | — |

> Never put a token in any file. Once `gh` is logged in, its credentials live in the system keyring.

## 2. Quick start

### A new project (recommended)
```bash
gh repo create my-app --template Carlo0919/AI_WorkingPipeline --private --clone
cd my-app
claude
```
Type anything, and `/Start` begins.

> ⚠️ If you `git clone` this repo directly, `origin` still points at the template, so the start
> gate assumes it's inside the template and stays silent. Point `origin` at your own repo first:
> `git remote set-url origin <your-repo>`.

### An existing project
```bash
node /path/to/AI_WorkingPipeline/install.mjs /path/to/your-project --dry   # preview what will be copied
node /path/to/AI_WorkingPipeline/install.mjs /path/to/your-project         # copies only missing files, never overwrites
```
Files that already exist (for example your own `CLAUDE.md`) are skipped and listed, so you can merge them by hand.

---

## 3. First run: `/Start` (mandatory)

**Until `Start.md` says `Intake status: ✅ LOCKED`, the `start-gate` hook intercepts every message
and makes `/Start` the first thing that happens.** Once the intake is locked, it's never required again.

What `/Start` does:

1. **Asks you to describe the project.** Your words are recorded **verbatim** in `Start.md` §1, and that section is never edited after locking.
2. **Maps your description onto checklist rows A–P**, marking each answer it found with the source `original`.
3. **Asks only for what's missing**, at most 4 questions per round. Closed questions come as options to click; open ones as free text:

   | # | Topic | # | Topic |
   |---|-------|---|-------|
   | A | What it is, and what kind of project | I | Data stored, sensitivity, legal constraints |
   | B | Goal and success metric (a number) | J | Platforms: web, mobile, desktop, API only, offline |
   | C | Target users | K | **Tech stack** |
   | D | Roles: what each can do, see, and must never see | L | Hosting and budget |
   | E | Domains: web surfaces and business domains (modules) | M | Timeline |
   | F | **Traffic tier**: high, medium, or low, with numbers | N | Team |
   | G | Core features | O | Out of scope |
   | H | Integrations: payments, email, SMS, AI, maps… | P | Biggest risk |

   - **Traffic tier:** it asks how many people use the system at the same moment, on a normal day and on the busiest day, then applies the definitions in `Start.md` §3:
     - **Low:** under 50 concurrent users, or under 10k requests/day.
     - **Medium:** 50–1,000 concurrent users, or 10k–1M requests/day.
     - **High:** over 1,000 concurrent users, over 1M requests/day, or sharp traffic spikes.

     The tier sets the server sizing in `TechnicalSpec.md`, and decides whether a cache or queue is needed.
   - **The tech stack is always asked about.** If you can't answer, or say "anything" or "you decide", Claude uses `skills/stack-selection` to **recommend a complete stack** from your earlier answers (team experience, platforms, traffic, features, integrations, budget), with a one-line reason for each piece. If you fix only part of it (say, "I want React"), that part stays and Claude fills in the rest.
4. **Shows you a full summary.** Reply `yes` to lock it. If the stack was auto-recommended, your `yes` adopts it; there's no separate approval round.
5. **Writes all the docs:**
   - `Start.md`: marked LOCKED;
   - `Project.md`: definition, users, domains, the role matrix, mechanisms, timeline, open questions, and the first progress-log row;
   - `TechnicalSpec.md`: the stack, plus server sizing from the traffic tier;
   - `DatabaseSchema.md`: draft entities;
   - it also fills the `CLAUDE.md` placeholders and `pipeline.config.json`, and sets up the stack skill.
6. Opens a kickoff issue on GitHub, commits, and **asks** before pushing.

If the project later changes direction in a major way (a new user type, a new product direction),
run `/Start` again. It enters **addendum mode**: it asks only about what changed, appends the new
material to `Start.md` §6, and leaves the original description untouched.

---

## 4. Every task: `/Commander`

**Whenever you have a task, type `/Commander <your task>`.** Commander runs in the main session,
because a subagent can't launch other agents. Its rule is to **finish the job with the fewest
agents and worktrees**, which saves tokens and resources.

1. **Checks the current state.** `commander.mjs status` lists every task: its stage, the agent on it, its worktree, how far it is ahead of or behind the base branch, how many files it has changed, and any conflicts.
2. **Inspects the request**, using the cheapest method that's enough:
   - A tiny change: Commander reads one or two files and handles it itself.
   - A feature, or a bug with an unclear cause: the planner's TRIAGE mode, one call for the whole request.
   - "Check this code for me": the reviewer's inspection mode.
3. **Decides the allocation:**

   | Situation | Allocation |
   |-----------|------------|
   | 1 unit | Work directly in the main checkout, 0 worktrees |
   | Several small (S) units | Main checkout, one after another |
   | 2–3 **independent** M/L units in different modules, with non-overlapping paths | One worktree each, up to `maxWorktrees` |
   | Several units in the same module | One worktree, one after another |

   | Unit size | Agents |
   |-----------|--------|
   | S | coder → reviewer. Add tester if behaviour changes; add security if it touches an endpoint, input, config, dependency, or logging |
   | M / L | planner → coder → reviewer → tester → security-reviewer |
4. **Opens one GitHub issue per unit and posts its plan**, then shows you an allocation table so you can choose which units to approve.
5. **Dispatches and tracks.** Each worktree gets its own branch, database, and port. At every stage change, `commander.mjs check` compares the files each unit has **actually** changed:
   - `CLAIM`: two units' claimed paths overlap;
   - `SHARED`: two units claim the same shared file;
   - `UNCLAIMED`: a unit changed a shared file without claiming it;
   - `OUTSIDE`: a unit changed files outside its claims;
   - `ORPHAN`: a worktree exists that isn't on the board.
6. **Merges and records.** After you approve the push, Commander merges one unit at a time back into the base branch, runs the full test suite, and only then writes the progress record. That way, parallel worktrees never conflict over `Project.md`.

Run `/Commander status` at any time to see the board.

---

## 5. One unit of work: `/AutomateWorkflow`

| Step | What happens | Who |
|------|--------------|-----|
| 0 | Create a `{type}/{title}` branch, or enter the worktree Commander assigned | — |
| 1 | `gh issue create`, titled `[CATEGORY] -> Title -> Short description` | — |
| 2 | Write the plan and post it on the issue | planner |
| 3 | 🛑 **You approve**: reply `yes` in chat, or comment `/approve` on the issue, or add the `approved` label. Only accounts listed in `approvers` count. | **you** |
| 4 | Write the code. The orchestrator **reads the diff itself**; if the data shape changed, DatabaseSchema.md changes in the same diff | coder |
| 5 | Review; problems go back to step 4 | reviewer |
| 6 | Unit tests; a bug goes back to step 4 | tester |
| 7 | Security check, the last gate, against S1–S15 | security-reviewer |
| 8 | Benchmark before and after (only when performance could change) | — |
| 9 | **Record progress and update the docs**, then commit | hooks check it |
| 10 | 🛑 Asks whether to push and merge | **you** |

Small changes can skip the full plan, the tests, and the benchmark. But **anything touching an
endpoint, input, config, a dependency, or permissions always goes through the security check**.

---

## 6. How progress recording is enforced

| Mechanism | When it runs | What it does |
|-----------|--------------|--------------|
| `/AutomateWorkflow` Step 9 | Before each unit is committed | Writes the `Project.md` §8 progress row and the related doc updates first, then commits |
| `record-progress` hook | After every `git commit` or `git merge` | If the commit didn't touch `Project.md`, reminds Claude to add the row. A `Progress: skip — <reason>` trailer opts out explicitly. Commits inside worktrees aren't checked; Commander records those at merge. |
| `uncommitted-check` hook | Whenever Claude is about to end a turn | If there are uncommitted changes and no progress record, asks Claude to say which it is: to be recorded, still in progress, or not worth recording. It fires once per set of changes. |

---

## 7. The documents

| File | Contents | Written by |
|------|----------|------------|
| `Start.md` | The user's original description (verbatim), the checklist, the Q&A log, the confirmed summary. **Never edited after locking**; later changes are appended as addenda. | `/Start` |
| `Project.md` | Definition, goals, users, scope, traffic tier, how many domains and modules, roles (functionalities, uses, assets, access), mechanisms, timeline, decisions, open questions, and the **progress log** | `/Start` writes the first version; every workflow updates it |
| `TechnicalSpec.md` | High-level to low-level design: architecture, every component and version, npm and other packages, workers and pools, server sizing, caching, environments | `/Start` writes the first version; each mechanism extends it |
| `DatabaseSchema.md` | ERD (Mermaid), every table's metadata, relationships, purpose, PII classification, retention periods | The coder, in the same commit as any data change |
| `Codebase.md` | The **measured** state of the code: security measures (rate limiting, input validation, IP restriction…), code quality, retries, latency, audit logging, CPU and memory, caching | §1 by security; §2–§7 by review |
| `CLAUDE.md` | The working rules Claude reads automatically every session | `/Start` fills the placeholders |

---

## 8. Agents · Skills · Hooks

**Agents** (`.claude/agents/`)

| File | Agent | Model | What it does |
|------|-------|-------|--------------|
| `plan.md` | planner | opus | Read-only. TRIAGE mode splits a request into units, claims paths, and finds conflicts; PLAN mode does the full design |
| `code.md` | coder | sonnet | Writes code only: no git, no tests |
| `review.md` | reviewer | opus | Read-only; may run `git diff` and the tests. Also has an inspection mode |
| `test.md` | tester | sonnet | Writes tests only; reports bugs instead of fixing them |
| `security.md` | security-reviewer | opus | Read-only. The last gate, checked against S1–S15 |

**Commands** (`.claude/commands/`): `/Start` · `/Commander` · `/AutomateWorkflow`

**Skills** (`.claude/skills/`):
- `stack-selection`: recommends a tech stack;
- `system-design`: architecture, concurrency, scaling order, caching, queues;
- `data-modelling`: schema rules and the ERD routine;
- `api-security`: API security controls.

`examples/stack-skills/` holds stack-specific skill examples (currently Spring Boot). Once `/Start`
picks the stack, it copies the matching example into `.claude/skills/`, or creates a new one if none matches.

**Hooks** (`.claude/hooks/`, wired up in `.claude/settings.json`)

| Hook | Event | Purpose |
|------|-------|---------|
| `start-gate.mjs` | UserPromptSubmit | Forces `/Start` first while the intake isn't locked |
| `quality-gate.mjs` | After a file edit | Java: `mvn`/`gradle compile`; TS/JS: `tsc` and `eslint`; Python: `ruff`. Skipped if the tool isn't installed |
| `record-progress.mjs` | After a commit or merge | Checks that a progress row was written |
| `uncommitted-check.mjs` | Stop | Checks whether uncommitted work needs a record |

`settings.json` also **denies** `git push --force`, `git reset --hard`, `git clean`, and reading `.env`.

---

## 9. Configuration: `.claude/pipeline.config.json`

| Field | Meaning | Default |
|-------|---------|---------|
| `projectName` | The project's name | filled by `/Start` |
| `baseBranch` | The main branch | `main` |
| `approvers` | GitHub accounts whose `/approve` comment or `approved` label counts | filled by `/Start` with your `gh` login |
| `maxWorktrees` | The most worktrees open at once | `3` |
| `sharedFiles` | Shared files (only one unit may change each one at a time) | common manifests and lockfiles |
| `docs` | The docs the framework manages | the 6 Markdown files |
| `templateRepo` | The template repo itself; the start gate doesn't fire inside it | `Carlo0919/AI_WorkingPipeline` |

---

## 10. FAQ

**Why is Commander a command and not an agent?**
In Claude Code, a subagent can't launch other subagents. Commander has to dispatch work, so it can only run in the main session.

**Can I skip a step?**
The rules for small changes are in `/AutomateWorkflow` under "When to skip steps". The approval gate (Step 3) and the push gate (Step 10) are never skipped.

**Can I run `/Start` again?**
Yes, but once the intake is locked it enters addendum mode only, and the original description stays as it is. To truly start over, change the status in `Start.md` back to `⬜ NOT STARTED` by hand.

**Are worktrees and test databases deleted automatically?**
No. Deleting them is destructive, so Commander asks you first. Branches are never deleted.

**How do I keep token usage down?**
- No planner for small units;
- one triage call per request;
- agents get paths, never pasted file contents;
- after a fix, re-run only the gate that failed;
- if it can be done sequentially in the main checkout, don't open a worktree.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
