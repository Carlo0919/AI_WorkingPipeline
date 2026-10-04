#!/usr/bin/env node
/**
 * Install AI_WorkingPipeline into an existing project.
 *
 *   node install.mjs <target-project-dir>          copy everything that doesn't exist yet (never overwrites)
 *   node install.mjs <target-project-dir> --dry    show what would be copied
 *
 * For a brand-new project you don't need this: create the repo from this template on GitHub
 * ("Use this template") or clone it, then open it in Claude Code — /Start runs first.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, appendFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));
const [target, flag] = process.argv.slice(2);
if (!target) {
  console.error("usage: node install.mjs <target-project-dir> [--dry]");
  process.exit(2);
}
const DST = resolve(target);
const dry = flag === "--dry";
if (!existsSync(DST)) {
  console.error(`target does not exist: ${DST}`);
  process.exit(2);
}

const ROOT_FILES = ["CLAUDE.md", "Start.md", "Project.md", "TechnicalSpec.md", "DatabaseSchema.md", "Codebase.md"];
const DIRS = [".claude", "examples"];
const SKIP = new Set([join(".claude", "state"), join(".claude", "settings.local.json")]);

const copied = [], skipped = [];
function copyFile(rel) {
  const from = join(SRC, rel), to = join(DST, rel);
  if (existsSync(to)) return skipped.push(rel);
  copied.push(rel);
  if (!dry) {
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to);
  }
}
function walk(rel) {
  if (SKIP.has(rel)) return;
  const abs = join(SRC, rel);
  if (statSync(abs).isDirectory()) for (const e of readdirSync(abs)) walk(join(rel, e));
  else copyFile(rel);
}

ROOT_FILES.forEach(copyFile);
DIRS.forEach(walk);

// .gitignore: append the pipeline's entries if missing
const IGNORE = [".worktrees/", ".claude/state/", ".claude/settings.local.json"];
const gi = join(DST, ".gitignore");
const current = existsSync(gi) ? readFileSync(gi, "utf8") : "";
const missing = IGNORE.filter((l) => !current.split(/\r?\n/).includes(l));
if (missing.length && !dry) appendFileSync(gi, `${current && !current.endsWith("\n") ? "\n" : ""}\n# AI_WorkingPipeline\n${missing.join("\n")}\n`);

console.log(`${dry ? "[dry run] would copy" : "copied"} ${copied.length} file(s) into ${DST}`);
copied.forEach((f) => console.log(`  + ${f}`));
if (skipped.length) {
  console.log(`\nskipped ${skipped.length} existing file(s) — merge by hand if you want the pipeline version:`);
  skipped.forEach((f) => console.log(`  = ${f}`));
}
if (missing.length) console.log(`\n.gitignore ${dry ? "would get" : "got"}: ${missing.join(", ")}`);
console.log(`\nNext: open ${relative(process.cwd(), DST) || "."} in Claude Code — the first prompt triggers /Start.`);
