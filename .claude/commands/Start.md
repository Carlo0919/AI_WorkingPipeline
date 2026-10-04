---
name: Start
description: First-run project intake. Mandatory before anything else on a new project (the start-gate hook enforces it until Start.md is LOCKED). Asks the user to describe the project, records it verbatim in Start.md, asks for every missing detail (users, roles, domains, traffic tier, services, integrations, data, timeline…), confirms a summary, then writes Project.md + seeds the other docs and config. Re-run later only for a major new scope (appends an addendum).
argument-hint: [optional — the project description]
model: opus
---

# /Start — first-run intake

```
/Start (once) → Start.md (LOCKED) → Project.md + TechnicalSpec.md + DatabaseSchema.md + Codebase.md
             → /Commander <task>  (every request, forever — works from those docs)
```

## 0. Check where intake stands

Read `Start.md` → **Intake status**:

| Status | Do |
|--------|----|
| ⬜ NOT STARTED | Go to §1 |
| 🟨 IN PROGRESS | Resume: re-read §1, §2 and §4, and continue §3 with the rows still empty |
| ✅ LOCKED | Say "Intake is already done (locked on <date>)." Continue **only** if the user says this is a **major new scope** (a new product direction, a new user type, a new revenue stream). Then use **addendum mode** (§7). For an ordinary feature, point them to `/Commander`. |

## Rules
- ✅ **Record before you interpret.** The user's description goes into Start.md §1 **verbatim** before you analyse it.
- ✅ **Ask only what's missing.** Fill every checklist row the description already answers (source `original`) first.
- ✅ **Short rounds:** ≤ 4 questions per round. Use multiple-choice (`AskUserQuestion`) for closed questions: traffic tier, platforms, project type, stack preference. Use free text for open ones.
- ✅ **Press vague answers.** "Everyone" isn't a target user. "A lot of traffic" isn't a tier, so ask for concurrent users.
- ✅ An unknown is fine if the user **accepts** it as unknown → `❓ UNKNOWN (accepted by user)`. Never guess.
- ✅ Save progress to Start.md after **every** round (the status stays 🟨), so an interrupted intake resumes cleanly.
- ❌ No code, no plan, no tasks, and no `/Commander` until the status is ✅ LOCKED.
- ✅ **Always ask about the tech stack (K).** If the user names one, use it. If they can't answer,
  say "anything" or "you decide", or give a vague answer, **recommend one yourself** using
  `skills/stack-selection` and the answers so far. The recommendation goes into the §4 summary
  with its reasons, and the user's `yes` adopts it, with no separate approval round.

---

## 1. Ask for the description

If the user's message already describes the project, use it. Otherwise ask:

> **Before we build anything, describe the project you want to make: what it does, who it's for,
> and anything you already know (features, users, how many people will use it, services it
> connects to, deadline). As much or as little detail as you have; I'll ask about the rest.**

Write the answer **verbatim** into `Start.md` §1, and set **Intake status:** 🟨 IN PROGRESS.

## 2. Extract

Map the description onto checklist rows A–P (`Start.md` §2), with source `original`. List the
rows still empty.

## 3. Ask for what's missing (rounds)

Priority order, because the later answers depend on the earlier ones:
**A → C → D → F → G → E → H → I → J → B → M → K → L → N → O → P**

For **F (traffic)**: use `Start.md` §3. Ask for concurrent users on a normal day and on the
busiest day, then confirm the tier back to the user.
For **D (roles)**: for each role, what it can **do**, what it can **see**, and what it must **never** see. Ask: *"Which role does the most damage if its account is stolen?"*
For **E (domains)**: both the **web surfaces** (main site, admin subdomain, API, mobile app) and the **business domains** (user, order, payment…). Each business domain is a candidate module.
For **K (tech stack)**: ask it after A, C, F, G, H, I, J and N are known, because the recommendation depends on them:
> *"Do you have a tech stack in mind: language, backend framework, frontend, database? If not, or if you don't mind, I'll recommend one that fits what you've described."*

| User's answer | Do |
|---------------|----|
| Names a full stack | Record it as `user-required` (source `Q&A n`) |
| Names part of it ("I want React") | Keep that part fixed; recommend the rest with `skills/stack-selection` |
| "Don't know" / "anything" / "you decide" / vague | **Recommend the whole stack** with `skills/stack-selection`. Record it as `auto-recommended` |

A recommendation always states: backend language + framework · frontend (or "none") · database ·
cache/queue (only if the traffic tier needs one) · architecture style (modular monolith by
default) · hosting · **one line on why each piece fits this project** · one rejected alternative
and why it lost.

Log every round in `Start.md` §4, and save after each round.

## 4. Confirm

Post one **summary**: definition and type · goal metric · users · roles (a matrix: role ·
can do · can see · never sees · auth) · domains (surfaces + modules) · **traffic tier with its
numbers** · core features · integrations · data sensitivity · platforms · **tech stack** (labelled
`user-required` or `auto-recommended`, with the reasons if recommended) · hosting/budget · timeline · team · out of scope · top risk · **mechanism inventory** (a flat list
of everything to build, M1…Mn) · open questions.

Ask exactly: **"Is this correct? Reply `yes` to lock it in, or tell me what to change."**
Anything other than `yes` → revise, log it as a Q&A round, and ask again.

## 5. On `yes`: write everything

1. **Start.md**: copy the summary into §5; set `**Intake status:** ✅ LOCKED`, `**Locked on:** <YYYY-MM-DD>`, `**Confirmed by:** <user>`.
2. **Project.md**: fill §1–§7 from the summary. One §3 block per mechanism, all ⬜. Roles in §4 (functionalities, uses, assets, access). Domains in §2.4/§2.5. Timeline in §5. Every ❓ goes in §7. Add the first §8 Progress Log row.
3. **TechnicalSpec.md**: §5 sizing from the **traffic tier** (`Start.md` §3). §1.1 architecture and §3 stack from K, marked ✅ decided either way (the user's `yes` adopted an auto-recommended stack too), with a "Decided by: user / auto-recommended at intake" note and the reasons. Integrations from H go in §2/§3. Then scaffold nothing: the first `/Commander` task creates the project skeleton.
4. **DatabaseSchema.md**: one 🟡 DRAFT entity per business domain/noun, with PII flagged from I.
5. **Codebase.md**: leave the baseline as "no code yet", with the audit date set.
6. **CLAUDE.md**: replace `{{PROJECT_NAME}}`, `{{ONE_LINE}}`, `{{OWNER}}`, `{{REPO_URL}}`, `{{STACK_SUMMARY}}`, `{{DEV_LOOP}}`.
7. **.claude/pipeline.config.json**: `projectName`; `approvers` = [`gh api user --jq .login`]; `baseBranch`; add the stack's manifest files to `sharedFiles`.
8. **Stack skill**: if `examples/stack-skills/<stack>` matches the chosen stack, copy it into `.claude/skills/`. Otherwise create `.claude/skills/<stack>/SKILL.md` with the conventions that are known so far (the planner extends it).

## 6. Kickoff issue + commit

- If `gh repo view` works: open `[DOCS] -> Project Kickoff -> <name> intake locked`, with the summary as the body and labels `kickoff,docs`, and **keep it open** for the life of the project. Comment the mechanism inventory as a task list.
- Commit the docs via `/AutomateWorkflow` Step 9 (docs-only), then **ask** before pushing.

Report:
```
✅ Intake locked (Start.md) · N checklist rows answered · M accepted unknowns
✅ Project.md: N mechanisms · roles · domains · timeline
✅ TechnicalSpec.md sized for the <tier> traffic tier
✅ Kickoff issue #N
Next: /Commander <your first task>
```

## 7. Addendum mode (status already LOCKED, major new scope)

Interview **only** the checklist rows that change. Append a dated entry to `Start.md` §6 with
the user's words, keeping §1 untouched. Update the affected Project.md sections, append the new
mechanisms as ⬜, add a §8 row, and open a `[DOCS]` issue linked to the kickoff issue.
