---
name: Commander
description: ENTRY POINT for every task request (after /Start has locked the intake). Inspects the request with the planner (TRIAGE) or reviewer (inspection), allocates the fewest agents and worktrees that finish it, guarantees no two worktrees/agents hold conflicting tasks, dispatches /AutomateWorkflow per unit, tracks progress on the board, merges and records progress. `/Commander status` shows the board.
argument-hint: [task request] | status
---

# /Commander — triage · allocate · de-conflict · dispatch · track

> Runs in the **main session** on purpose: a subagent can't launch other agents.
> **Default answer: as little machinery as possible.** That means one unit in the main checkout, with
> no extra worktree. Parallelism has to earn its cost: a build, a test DB, and a full agent chain
> per worktree, plus merge risk.

**Board:** `node .claude/scripts/commander.mjs status`, showing every task's stage, agent, worktree,
ahead/behind the base branch, files changed, and **conflicts**. Settings (base branch, max
worktrees, shared files, approvers) are in `.claude/pipeline.config.json`.

`/Commander status` → print the board, list the conflicts, stop.

---

## 0. Gate

`Start.md` **Intake status** must be `✅ LOCKED`. If it isn't, stop and run `/Start`.
If the request doesn't map to a mechanism in `Project.md` §3, it's a scope change, so use `/Start` addendum mode.

## 1. Current state
`node .claude/scripts/commander.mjs status` and `git worktree list`.
Existing conflicts get resolved **before** new work (§6). A request touching an active task's
claims joins that task's queue; it doesn't get a new worktree.

## 2. Inspect (the cheapest inspection that's enough)

| Request looks like | Inspector |
|--------------------|-----------|
| One obvious small change | **Commander itself.** Read 1–2 files, no agent. |
| A feature, an unclear bug, anything multi-part | **planner, Mode A TRIAGE**, one call for the whole request |
| "Check / audit / is this OK" about existing code | **reviewer, inspection mode** (+ security-reviewer if it's about security) |
| A new product direction | stop → `/Start` addendum |

Give inspectors **paths and the request text**, never pasted file contents. The output is a
unit table: id · summary · S/M/L · modules · claimed path prefixes · shared files · dependencies.

## 3. Allocate

### 3.1 Worktrees
Use the main checkout, sequentially, **unless all of these hold**:
1. ≥ 2 units, each **M or L** (an S unit is cheaper done in sequence)
2. Claims are disjoint: `commander.mjs check --claims <prefixes> --shared <files>` returns OK
3. No dependency between them
4. Each shared file has at most one claimant
5. At most one of them changes data shape

Then: one worktree per independent unit, up to `maxWorktrees` (default 3). Overlapping units
merge into one, or queue in the same worktree.

| Situation | Allocation |
|-----------|------------|
| 1 unit | main checkout |
| Several S units | main checkout, one after another (separate commits) |
| 2–3 independent M/L units, different modules | 1 worktree each |
| Same module | 1 worktree (or main), sequential |
| More than `maxWorktrees` independent units | the cap in parallel, the rest queued on the board |

### 3.2 Agents per unit
| Size | Chain |
|------|-------|
| **S** | Commander writes a 3-line plan → coder → reviewer (+ tester if behaviour changes; + security-reviewer if it touches an endpoint, input, config, dependency, auth, or logging) |
| **M** | planner → coder → reviewer → tester → security-reviewer |
| **L** | the same as M; the plan must split it into ≤ 3 h tasks, or re-triage into several M units |

### 3.3 Token & resource discipline
- ✅ Launch independent units' agents **in one message** (parallel calls, `run_in_background`).
- ✅ Pass the issue number + the worktree path. Agents read the plan from GitHub themselves.
- ✅ After a fix, re-run **only the gate that failed**, on the changed lines.
- ❌ No planner for an S unit. No reviewer re-reading an unchanged diff. No worktree for work that finishes faster than a worktree takes to set up and merge.

### 3.4 Present → approve
Create one GitHub issue per unit and post each plan (`/AutomateWorkflow` Steps 1–2), then **one** message:

```markdown
## Commander allocation — <request>
| Unit | Issue | Size | Where | Agents | Claims | Depends |
|------|-------|------|-------|--------|--------|---------|
Worktrees: N · Agent runs: N · Conflicts: none
Why not more parallel: <reason>
**Approve which units? (all / U1,U2 / none)**, or `/approve` on each issue.
```
Approval is **per unit**.

## 4. Register & set up
```bash
node .claude/scripts/commander.mjs add --id U1 --title "<summary>" --branch feature/<name> --size M \
     --mode worktree --claims <prefixes> --shared <files> --issue <N>
git worktree add .worktrees/u1 -b feature/<name> <baseBranch>          # mode=worktree only
```
- **A DB per worktree**, only if its tests need one (e.g. `<app>_u1`) → `set U1 db=<name>`. Never share a database between worktrees.
- **A port per worktree**, only if the app must run → `set U1 port=<n>`.
- Install dependencies in the worktree if the stack needs it (e.g. `npm ci`), because `node_modules` isn't shared.

## 5. Dispatch & track
Run `/AutomateWorkflow` Steps 4–9 per unit. Tell every agent:
*"Work only in `<absolute worktree path>`. No git writes. DB: `<db|none>`. Port: `<port|none>`."*

After every gate: `commander.mjs set U1 stage=<stage> agent=<agent>`.
Stages: `triaged → planned → awaiting-approval → coding → review → test → security → ready-to-merge → merged` (or `blocked` / `cancelled` with `note=`).
**Run `commander.mjs check` at every stage change.** It compares the files each unit has
**actually** changed. `OUTSIDE` / `UNCLAIMED` means stop that unit and re-plan.

## 6. Conflicts
| Conflict | Action |
|----------|--------|
| Overlapping claims | Pause the unit that's less far along; queue it behind the other |
| A change outside its claims | Is the claim wrong (widen it, re-check) or the change wrong (revert it in that worktree)? |
| Both need a shared file | Serialise: the second starts after the first merges |
| An orphan worktree | Ask the owner. Never remove a worktree you didn't create. |

## 7. Merge & record (on the base branch, one unit at a time)
Order: dependencies first, then the smallest diff. For each `ready-to-merge` unit, **after the owner approves the push**:
1. `commander.mjs check` → OK
2. `git checkout <base> && git merge --no-ff <branch>`
3. Run the full test command (CLAUDE.md dev loop). Red → stop; don't merge the next unit.
4. **Record:** apply the unit's Project.md §8 row + its Project.md §3/§2/§4/§5 changes + its Codebase.md rows → commit `docs(#N): record progress for <unit>`
5. Push → `set U1 stage=merged` → comment on and close the issue
6. Bring the remaining worktrees up to date (`git -C .worktrees/u2 merge <base>`) → re-check

**Cleanup asks first:** removing a worktree and dropping its DB are destructive. **Never delete branches.**

## 8. Report
End every Commander turn with the board, plus one line per unit: its stage, what's next, and what's waiting on the owner.
