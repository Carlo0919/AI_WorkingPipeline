#!/usr/bin/env node
/**
 * PostToolUse (Bash) hook — after every successful `git commit` / `git merge`, make sure the
 * workflow was recorded in Project.md §8 Progress Log.
 *
 * Passes silently when:
 *   - the command wasn't a commit/merge, or it failed
 *   - the new commit touches Project.md
 *   - the commit message carries a `Progress: skip — <reason>` trailer
 *   - the commit was made inside a linked worktree (.worktrees/*): in parallel mode /Commander
 *     records progress on main at merge time, so worker commits must NOT touch Project.md
 * Otherwise exits 2, which feeds the reminder back to Claude.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}
function git(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

const input = readHookInput();
const command = input?.tool_input?.command ?? "";
if (!/\bgit\b[^|;&]*\b(commit|merge)\b/.test(command)) process.exit(0);
if (/--abort|--dry-run|--continue\b/.test(command) && !/commit/.test(command)) process.exit(0);

// Resolve the directory the commit ran in: a leading `cd X &&` or `git -C X`.
let cwd = input?.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const cd = command.match(/^\s*cd\s+("([^"]+)"|'([^']+)'|(\S+))\s*&&/);
if (cd) cwd = cd[2] ?? cd[3] ?? cd[4];
const dashC = command.match(/\bgit\s+-C\s+("([^"]+)"|'([^']+)'|(\S+))/);
if (dashC) cwd = dashC[2] ?? dashC[3] ?? dashC[4];

const gitDir = git(["rev-parse", "--path-format=absolute", "--git-dir"], cwd);
const commonDir = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd);
if (!gitDir || !commonDir) process.exit(0);
if (gitDir !== commonDir) process.exit(0); // linked worktree → Commander records at merge

// Did the commit actually happen just now? (a failed commit leaves HEAD older than ~2 minutes)
const ts = Number(git(["log", "-1", "--format=%ct"], cwd) ?? 0);
if (!ts || Date.now() / 1000 - ts > 120) process.exit(0);

const message = git(["log", "-1", "--format=%B"], cwd) ?? "";
if (/^Progress:\s*skip\b/im.test(message)) process.exit(0);

const files = (git(["show", "--name-only", "--format=", "-m", "--first-parent", "HEAD"], cwd) ?? "")
  .split(/\r?\n/).filter(Boolean);
if (files.some((f) => f === "Project.md")) process.exit(0);

const subject = git(["log", "-1", "--format=%h %s"], cwd);
console.error(
  `Progress not recorded for commit ${subject}.\n` +
    `Project.md §8 Progress Log needs a row for every workflow (date · commit · issue · mechanism · what changed · docs touched).\n` +
    `Also check whether TechnicalSpec.md / DatabaseSchema.md / Codebase.md / Project.md §3 need updating.\n` +
    `→ Add the row and commit it (docs(#N): record progress), OR, if a row is genuinely not needed, ` +
    `say why to the owner and use a \`Progress: skip — <reason>\` trailer next time.`
);
process.exit(2);
