#!/usr/bin/env node
/**
 * Commander board — the task/worktree/agent register behind /Commander (AI_WorkingPipeline).
 *
 * The board lives in the MAIN checkout at .claude/state/board.json (gitignored), and is found
 * from any worktree via `git rev-parse --git-common-dir`, so every worktree sees one register.
 *
 *   node .claude/scripts/commander.mjs status            table of tasks + live git state + conflicts
 *   node .claude/scripts/commander.mjs check  [--claims a,b] [--shared x,y]
 *                                                        exit 1 if active tasks conflict (or a proposed claim would)
 *   node .claude/scripts/commander.mjs add --id U1 --title "..." --branch feature/x --size M
 *        [--mode worktree|main] [--claims a,b] [--shared package.json] [--issue 12] [--db app_u1] [--port 3001]
 *   node .claude/scripts/commander.mjs set <id> key=value [key=value ...]   (stage=, agent=, issue=, note=, ...)
 *   node .claude/scripts/commander.mjs remove <id>
 *
 * Claims are PATH PREFIXES relative to the repo root (e.g. src/modules/orders).
 * Two claims conflict when one is a prefix of the other. "Shared" files (pipeline.config.json sharedFiles + docs)
 * may have at most one active claimant.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const STAGES = ["triaged", "planned", "awaiting-approval", "coding", "review", "test", "security",
  "ready-to-merge", "merged", "blocked", "cancelled"];
const INACTIVE = new Set(["merged", "cancelled"]);

function git(args, cwd, { raw = false } = {}) {
  try {
    const out = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return raw ? out : out.trim(); // porcelain status needs its leading spaces
  } catch {
    return null;
  }
}

const commonDir = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], process.cwd());
if (!commonDir) {
  console.error("commander: not inside a git repository");
  process.exit(2);
}
const ROOT = dirname(resolve(commonDir));
const BOARD = join(ROOT, ".claude", "state", "board.json");

// Project settings live in .claude/pipeline.config.json (committed). Defaults keep the script usable without it.
const CONFIG = (() => {
  const f = join(ROOT, ".claude", "pipeline.config.json");
  try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; }
})();
const BASE = CONFIG.baseBranch ?? "main";
const ALWAYS_SHARED = (CONFIG.sharedFiles ?? []).concat(CONFIG.docs ?? []).map((p) => p.split("\\").join("/"));

function load() {
  if (!existsSync(BOARD)) return { tasks: [] };
  return JSON.parse(readFileSync(BOARD, "utf8"));
}
function save(board) {
  mkdirSync(dirname(BOARD), { recursive: true });
  writeFileSync(BOARD, JSON.stringify(board, null, 2) + "\n");
}
const norm = (p) => p.replace(/\\/g, "/").replace(/\/\*\*$/, "").replace(/\/+$/, "").replace(/^\.\//, "");
const list = (s) => (s ? String(s).split(",").map((x) => norm(x.trim())).filter(Boolean) : []);
const overlaps = (a, b) => a === b || a.startsWith(b + "/") || b.startsWith(a + "/");

function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
  }
  return out;
}

/** Live git state of every worktree, keyed by branch. */
function worktrees() {
  const raw = git(["worktree", "list", "--porcelain"], ROOT) ?? "";
  const items = [];
  let cur = null;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) items.push((cur = { path: norm(line.slice(9)) }));
    else if (line.startsWith("branch ") && cur) cur.branch = line.slice(7).replace("refs/heads/", "");
  }
  return items;
}

/** Files a task has actually changed: committed on its branch vs main, plus uncommitted in its worktree. */
function changedFiles(task, wtByBranch) {
  const files = new Set();
  const wt = wtByBranch.get(task.branch);
  const cwd = wt ? wt.path : ROOT;
  const committed = git(["diff", "--name-only", `${BASE}...${task.branch}`], ROOT);
  committed?.split(/\r?\n/).filter(Boolean).forEach((f) => files.add(norm(f)));
  if (wt && norm(wt.path) !== norm(ROOT)) {
    const dirty = git(["status", "--porcelain"], cwd, { raw: true });
    dirty?.split(/\r?\n/).filter(Boolean).forEach((l) => files.add(norm(l.slice(3).split(" -> ").pop())));
  }
  return [...files];
}

function aheadBehind(branch) {
  const r = git(["rev-list", "--left-right", "--count", `${BASE}...${branch}`], ROOT);
  if (!r) return "—";
  const [behind, ahead] = r.split(/\s+/);
  return `+${ahead}/-${behind}`;
}

function conflicts(board, proposed) {
  const active = board.tasks.filter((t) => !INACTIVE.has(t.stage));
  const wtByBranch = new Map(worktrees().map((w) => [w.branch, w]));
  const found = [];
  const entries = active.map((t) => ({
    id: t.id,
    claims: t.claims ?? [],
    shared: t.shared ?? [],
    actual: changedFiles(t, wtByBranch),
  }));
  if (proposed) entries.push({ id: "PROPOSED", claims: proposed.claims, shared: proposed.shared, actual: [] });

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      for (const x of a.claims) for (const y of b.claims)
        if (overlaps(x, y)) found.push(`CLAIM   ${a.id} ↔ ${b.id}: ${x}  vs  ${y}`);
      for (const s of a.shared) if (b.shared.includes(s)) found.push(`SHARED  ${a.id} ↔ ${b.id}: both claim ${s}`);
      const actualB = new Set(b.actual);
      for (const f of a.actual) if (actualB.has(f)) found.push(`ACTUAL  ${a.id} ↔ ${b.id}: both changed ${f}`);
    }
    // a task touching a shared file it never claimed is a silent conflict source
    const e = entries[i];
    for (const f of e.actual)
      if (ALWAYS_SHARED.includes(f) && !e.shared.includes(f) && e.id !== "PROPOSED")
        found.push(`UNCLAIMED ${e.id}: changed shared file ${f} without claiming it`);
    // and a change outside its claims means its claims are wrong
    if (e.claims.length)
      for (const f of e.actual)
        if (!ALWAYS_SHARED.includes(f) && !e.claims.some((c) => overlaps(f, c)))
          found.push(`OUTSIDE ${e.id}: changed ${f}, outside its claims`);
  }

  const known = new Set(board.tasks.map((t) => t.branch));
  for (const w of worktrees())
    if (norm(w.path) !== norm(ROOT) && !known.has(w.branch))
      found.push(`ORPHAN  worktree ${w.path} (${w.branch}) is not on the board`);
  for (const t of active)
    if (t.mode === "worktree" && !wtByBranch.has(t.branch))
      found.push(`MISSING ${t.id}: mode=worktree but no worktree exists for ${t.branch}`);
  return found;
}

function pad(s, n) {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n);
}

const [cmd, ...rest] = process.argv.slice(2);
const board = load();

switch (cmd) {
  case "status": {
    const wtByBranch = new Map(worktrees().map((w) => [w.branch, w]));
    const active = board.tasks.filter((t) => !INACTIVE.has(t.stage));
    const done = board.tasks.length - active.length;
    console.log(`Board: ${BOARD}`);
    console.log(`Active tasks: ${active.length} · finished: ${done} · worktrees: ${wtByBranch.size - 1} (excluding main checkout) · base: ${BASE} · max parallel: ${CONFIG.maxWorktrees ?? 3}\n`);
    if (board.tasks.length) {
      console.log([pad("ID", 5), pad("STAGE", 18), pad("SIZE", 4), pad("MODE", 8), pad("AGENT", 18), pad("ISSUE", 6),
        pad("BRANCH", 30), pad("±MAIN", 8), pad("FILES", 5), "TITLE"].join(" "));
      for (const t of board.tasks) {
        const files = INACTIVE.has(t.stage) ? "—" : changedFiles(t, wtByBranch).length;
        console.log([pad(t.id, 5), pad(t.stage, 18), pad(t.size, 4), pad(t.mode, 8), pad(t.agent ?? "—", 18),
          pad(t.issue ? `#${t.issue}` : "—", 6), pad(t.branch, 30), pad(aheadBehind(t.branch), 8), pad(files, 5),
          t.title].join(" "));
      }
    } else console.log("(no tasks)");
    const c = conflicts(board);
    console.log(`\nConflicts: ${c.length ? "\n  " + c.join("\n  ") : "none"}`);
    break;
  }
  case "check": {
    const f = parseFlags(rest);
    const proposed = f.claims || f.shared ? { claims: list(f.claims), shared: list(f.shared) } : null;
    const c = conflicts(board, proposed);
    console.log(c.length ? c.join("\n") : "OK — no conflicts");
    process.exit(c.length ? 1 : 0);
  }
  case "add": {
    const f = parseFlags(rest);
    for (const k of ["id", "title", "branch", "size"]) if (!f[k]) { console.error(`add: --${k} is required`); process.exit(2); }
    if (board.tasks.some((t) => t.id === f.id)) { console.error(`add: ${f.id} already exists`); process.exit(2); }
    const task = {
      id: f.id, title: f.title, branch: f.branch, size: f.size, mode: f.mode ?? "main",
      stage: "triaged", agent: null, issue: f.issue ? Number(f.issue) : null,
      claims: list(f.claims), shared: list(f.shared),
      path: f.mode === "worktree" ? `.worktrees/${f.id.toLowerCase()}` : ".",
      db: f.db ?? null, port: f.port ? Number(f.port) : null,
      created: new Date().toISOString(), updated: new Date().toISOString(), history: [],
    };
    board.tasks.push(task);
    save(board);
    const c = conflicts(board).filter((line) => line.includes(task.id));
    console.log(`added ${task.id}${c.length ? ` — ⚠️ conflicts:\n${c.join("\n")}` : ""}`);
    break;
  }
  case "set": {
    const [id, ...pairs] = rest;
    const t = board.tasks.find((x) => x.id === id);
    if (!t) { console.error(`set: no task ${id}`); process.exit(2); }
    for (const p of pairs) {
      const i = p.indexOf("=");
      const k = p.slice(0, i), v = p.slice(i + 1);
      if (k === "stage" && !STAGES.includes(v)) { console.error(`set: stage must be one of ${STAGES.join(", ")}`); process.exit(2); }
      if (k === "claims" || k === "shared") t[k] = list(v);
      else if (k === "issue" || k === "port") t[k] = Number(v);
      else t[k] = v === "null" ? null : v;
      if (k === "stage") t.history.push({ stage: v, at: new Date().toISOString() });
    }
    t.updated = new Date().toISOString();
    save(board);
    console.log(`${id}: ${pairs.join(" ")}`);
    break;
  }
  case "remove": {
    const before = board.tasks.length;
    board.tasks = board.tasks.filter((t) => t.id !== rest[0]);
    save(board);
    console.log(board.tasks.length < before ? `removed ${rest[0]}` : `no task ${rest[0]}`);
    break;
  }
  default:
    console.log("usage: commander.mjs status | check [--claims a,b] [--shared x] | add ... | set <id> k=v ... | remove <id>");
    process.exit(cmd ? 2 : 0);
}
