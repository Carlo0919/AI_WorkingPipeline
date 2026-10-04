# {{PROJECT_NAME}} — Claude Working Agreement

{{ONE_LINE}}

**Owner:** {{OWNER}} · **Repo:** {{REPO_URL}}

> Built on **AI_WorkingPipeline**. The `{{…}}` placeholders are filled by `/Start` at intake.

---

## First session: `/Start` is mandatory

While [Start.md](Start.md) says **Intake status: ⬜ / 🟨** (not ✅ LOCKED), the `start-gate` hook
makes `/Start` the first thing that happens. It asks for the project description, records it
verbatim, asks for every missing detail (including the **tech stack**, which it recommends if
you have no preference), and writes the docs below. After the intake is locked, it's never
required again.

## Read before you act

| Question | File |
|---|---|
| What did the owner originally ask for? | [Start.md](Start.md): the verbatim description + intake answers (locked) |
| What are we building, for whom, by when? Is this in scope? | [Project.md](Project.md): scope, domains, roles, mechanisms, timeline, **progress log** |
| How is it built, with what resources? | [TechnicalSpec.md](TechnicalSpec.md) |
| What shape is the data? | [DatabaseSchema.md](DatabaseSchema.md): ERD, table metadata, relationships |
| How good is the code right now? | [Codebase.md](Codebase.md): measured security, quality, latency, audit, resources, caching |
| **I have a task** | **`/Commander <task>`**. `/Commander status` shows the board. |
| One unit of work, end to end | `/AutomateWorkflow` |

**A request that doesn't map to a mechanism in `Project.md` §3 is a scope change** → `/Start` (addendum mode).

## Tech stack
{{STACK_SUMMARY}}

## Dev loop
{{DEV_LOOP}}

## Working rules
- **Change only the lines the task needs.** No reformatting, no formatter runs on existing files.
- **Destructive actions stop for confirmation:** dropping or resetting data, force-push, history rewrite, removing worktrees, dropping databases.
- **Pushing is outward-facing: ask first.** Work on `{type}/{title}` branches off the base branch (`.claude/pipeline.config.json`).
- **Progress is recorded after every workflow:** a `Project.md` §8 row. The `record-progress` (commit) and `uncommitted-check` (stop) hooks enforce it.
- The `quality-gate` hook compiles, typechecks, or lints what you edit. A red gate blocks review.
- Secrets come from the environment. Never put a token in a file, command, or commit.

## Commander & agents
`/Commander` (main session) triages with `planner` / `reviewer` and allocates the **fewest**
agents and worktrees (max `maxWorktrees`, only for independent M/L units with disjoint claims).
Conflicts are tracked by [commander.mjs](.claude/scripts/commander.mjs).
Per unit: `planner` → 🛑 owner approval (chat, or `/approve` on GitHub) → `coder` → `reviewer` → `tester` → `security-reviewer`.
Skills are in [.claude/skills/](.claude/skills/).
