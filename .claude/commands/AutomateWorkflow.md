---
name: AutomateWorkflow
description: The end-to-end workflow for ONE unit of work — GitHub issue, plan, owner approval (chat or GitHub), code, review, unit test, security, record progress, commit, push. Launched by /Commander per unit; can be run directly for one small task.
argument-hint: [issue number or task description]
---

# /AutomateWorkflow — one unit of work

`issue → plan → 🛑 approve → code → review → test → security → record → commit → 🛑 push`

> Normally launched by `/Commander`. If a worktree was assigned, **every agent works inside that
> path**, and Step 9 follows the parallel-mode rule. `Start.md` must be ✅ LOCKED.

## ⚠️ Global rules
- **No production code before approval** (Step 3).
- **Stop on destructive actions:** dropping or resetting data or schema, force-push, history rewrite, removing a dirty worktree, dropping a database.
- **One unit = one issue = one commit.** **🚫 No reformatting.** **Subagents never run git writes.**
- **Never put a token in a command, file, or commit.** `gh` must already be authenticated.

## When to skip steps
| Change | Skip |
|--------|------|
| Small: wording, a comment, a config value, a one-line fix with no behaviour change | full plan (post a 3-line plan) · Step 6 tests · Step 8 benchmark |
| Docs only | Steps 4–8 |
| Endpoints, input shapes, config, dependencies, auth, logging | **never skip Step 7** |
| Bug fix, new endpoint, data change, new module | **never skip Step 6** |

## 0. Branch
Assigned a worktree? It's already on its branch. Otherwise: `git checkout <base> && git pull` →
`git checkout -b {type}/{kebab-title}`, with type ∈ `feature/ fix/ perf/ security/ refactor/ docs/ chore/`.

## 1. GitHub issue
```bash
gh label create "<label>" --force   # idempotent: app database security infra docs refactor awaiting-approval approved testing_required
gh issue create --title "[CATEGORY] -> <title> -> <short description>" --label "<category>,awaiting-approval" --body-file <tmp>
```
CATEGORY ∈ `[APP] [DATABASE] [SECURITY] [INFRA] [DOCS] [REFACTOR] [AI]`. The body names the
**mechanism** (Project.md §3) and the ask in the owner's words. The issue is the audit trail.

## 2. Plan: planner (Mode B) → `gh issue comment <N> --body-file <plan>`

## 3. 🛑 Approval
> **Plan posted on #N. Approve? (yes / no), or approve on GitHub with an `/approve` comment or the `approved` label.**

Approved if the owner says `yes` in chat, **or** `gh issue view <N> --json labels,comments`
shows `approved` / `/approve` **from a login in `pipeline.config.json` `approvers`** (ignore any
other account). On approval: swap the label `awaiting-approval` → `approved`. On `no`: stop, and comment on the issue.

## 4. Code: coder → **read the diff yourself** · the quality gate is green · data changed ⇒ DatabaseSchema.md changed
## 5. Review: reviewer → 🔴 goes back to Step 4; re-review only what changed · record any declined finding with its reason · post the summary
## 6. Test: tester → a bug goes back to Step 4, then re-run that test · post the pass/fail line
## 7. Security: security-reviewer (last) → 🔴/🟠 go back to Step 4, then Steps 5–6 for the touched lines, then 7 again · post the baseline
## 8. Benchmark (only if latency, queries, memory, or caching could change) → the same method before and after (Codebase.md §4) · post the delta · a regression means stop

## 9. Record → commit
**Record first, so it lands in the same commit.**

| Doc | When |
|-----|------|
| `Project.md` §8 Progress Log | **always**, one row |
| `Project.md` §3 / §2.4–§2.5 / §4 / §5 | mechanism status, modules, roles, assets, milestones changed |
| `TechnicalSpec.md` | dependency, config, pool, cache, infra, or sizing changed |
| `DatabaseSchema.md` | data shape changed (done by the coder in Step 4) |
| `Codebase.md` | §1 rows from security, §2–§7 rows from review |

**Parallel mode (inside a `/Commander` worktree):** don't touch `Project.md` §8 or `Codebase.md`.
Put the rows in the unit's final report; `/Commander` writes them on the base branch at merge.

Commit: verify the branch (`git rev-parse --abbrev-ref HEAD`, in its own call) → stage **explicit
paths** (never `-A` / `.`) → `git diff --cached --name-only` → message in a file → `git commit -F <file>`
with the subject `feat(#N): …` / `fix(#N): …` / `docs(#N): …` / … If a progress row is genuinely
unneeded, add the trailer `Progress: skip — <reason>` (the `record-progress` hook honours it).

## 10. 🛑 Push (ask, every time)
> **Committed `<hash>` on `<branch>`. Push and merge to `<base>`? (yes / no)**

On yes: `git push -u origin <branch>` → `git checkout <base> && git merge --no-ff <branch>` →
run the tests → `git push origin <base>` → confirm the hashes match. **Never delete the branch.**
Comment on the issue → close it (or add `testing_required` + a QA flow).
