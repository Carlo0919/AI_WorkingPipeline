#!/usr/bin/env node
/**
 * Stop hook — a workflow that ends WITHOUT a commit still needs a decision about recording.
 *
 * When Claude is about to finish a turn and the main checkout has uncommitted changes outside
 * the docs, and Project.md is not among them, block the stop ONCE per distinct change-set and
 * ask Claude to decide: record it in Project.md §8, commit it via /AutomateWorkflow, or state
 * why no record is needed. The same change-set never triggers twice (a fingerprint is kept in
 * .claude/state/), and `stop_hook_active` prevents loops.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

const input = readHookInput();
if (input?.stop_hook_active) process.exit(0);

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
let status;
try {
  status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  process.exit(0);
}

const DOCS = /^(Start|Project|TechnicalSpec|DatabaseSchema|Codebase|CLAUDE|README(\.[\w-]+)?)\.md$/;
const paths = status.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).split(" -> ").pop().replace(/^"|"$/g, ""));
const work = paths.filter((p) => !DOCS.test(p) && !p.startsWith(".worktrees/") && !p.startsWith(".claude/state/"));
if (work.length === 0) process.exit(0);
if (paths.includes("Project.md")) process.exit(0); // the record is already being written

// fingerprint the work itself (paths + their diff), not our own state files
let diff = "";
try {
  diff = execFileSync("git", ["diff", "--", ...work], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {}
const fingerprint = createHash("sha256").update(work.join("\n") + diff).digest("hex");
const stateDir = join(ROOT, ".claude", "state");
const stamp = join(stateDir, "uncommitted-check.last");
if (existsSync(stamp) && readFileSync(stamp, "utf8").trim() === fingerprint) process.exit(0);
mkdirSync(stateDir, { recursive: true });
writeFileSync(stamp, fingerprint);

const shown = work.slice(0, 15).join(", ") + (work.length > 15 ? `, … (+${work.length - 15})` : "");
process.stdout.write(JSON.stringify({
  decision: "block",
  reason:
    `Uncommitted work is about to be left behind without a progress record: ${shown}.\n` +
    `Decide now, and tell the owner which: (a) it's a finished workflow → add a Project.md §8 row and ` +
    `commit via /AutomateWorkflow Step 9; (b) it's mid-workflow (e.g. waiting for approval) → say so; ` +
    `(c) it's throwaway/experimental → say why no record is needed. This check fires once per change-set.`,
}));
process.exit(0);
