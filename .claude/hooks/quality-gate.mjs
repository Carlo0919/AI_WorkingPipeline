#!/usr/bin/env node
/**
 * PostToolUse quality gate — stack-agnostic.
 *
 * After Claude edits a source file, run the cheapest check the project's own toolchain offers,
 * from the nearest directory that owns that toolchain (so it also works inside .worktrees/<id>/):
 *
 *   .java / pom.xml        → mvn -q -B [-o] compile          (nearest pom.xml)
 *   .java / .kt (Gradle)   → gradlew -q compileJava           (nearest gradlew)
 *   .ts .tsx .mts .cts     → tsc --noEmit + eslint             (nearest tsconfig.json / eslint config)
 *   .js .jsx .mjs .cjs     → eslint                            (nearest eslint config)
 *   .py                    → ruff check
 *
 * Failures go to stderr with exit 2, which feeds them back to Claude to fix before moving on.
 * Dormant by design: a missing tool, config, or node_modules → exit 0 silently.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const TS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const JS = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const ESLINT = ["eslint.config.mjs", "eslint.config.js", "eslint.config.cjs", "eslint.config.ts", ".eslintrc.json", ".eslintrc.js"];

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function findUp(from, names) {
  let dir = from;
  for (;;) {
    if (names.some((n) => existsSync(join(dir, n)))) return dir;
    if (resolve(dir) === resolve(ROOT)) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function missing(err, out) {
  return err.code === "ENOENT" || err.code === "ETIMEDOUT" || err.status === 9009 || err.status === 127 ||
    /not recognized as an internal or external command|command not found|is not recognized/i.test(out);
}

function run(cmd, args, cwd) {
  // shell:true resolves .cmd shims on Windows, but then argv is joined unquoted — quote paths with spaces.
  const shell = process.platform === "win32";
  const finalArgs = shell ? args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)) : args;
  try {
    execFileSync(cmd, finalArgs, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 140_000, shell });
    return null;
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
    return missing(e, out) ? null : out || `${cmd} exited with ${e.status}`;
  }
}

const file = readHookInput()?.tool_input?.file_path;
if (!file) process.exit(0);
const abs = resolve(ROOT, file);
const rel = relative(ROOT, abs);
if (rel.startsWith("..") || isAbsolute(rel)) process.exit(0);

const ext = extname(abs).toLowerCase();
const dir = dirname(abs);
const problems = [];

if (ext === ".java" || ext === ".kt" || basename(abs) === "pom.xml") {
  const mvnDir = findUp(dir, ["pom.xml"]);
  const gradleDir = mvnDir ? null : findUp(dir, ["gradlew", "gradlew.bat"]);
  if (mvnDir) {
    const isPom = basename(abs) === "pom.xml";
    let out = run("mvn", isPom ? ["-q", "-B", "compile"] : ["-q", "-B", "-o", "compile"], mvnDir);
    if (out && !isPom && /offline|Cannot access|could not be resolved/i.test(out)) out = run("mvn", ["-q", "-B", "compile"], mvnDir);
    if (out) problems.push(`COMPILE (mvn in ${relative(ROOT, mvnDir) || "."})\n` +
      (out.split(/\r?\n/).filter((l) => l.includes("ERROR") && !/Help 1|re-run Maven|-X switch|following articles/.test(l)).slice(0, 30).join("\n") || out.slice(0, 4000)));
  } else if (gradleDir) {
    const out = run(process.platform === "win32" ? "gradlew.bat" : "./gradlew", ["-q", "compileJava"], gradleDir);
    if (out) problems.push(`COMPILE (gradle in ${relative(ROOT, gradleDir) || "."})\n${out.slice(0, 4000)}`);
  }
} else if (TS.has(ext) || JS.has(ext)) {
  const nm = findUp(dir, ["node_modules"]);
  if (nm) {
    const tsDir = TS.has(ext) ? findUp(dir, ["tsconfig.json"]) : null;
    if (tsDir) {
      const out = run("npx", ["--no-install", "tsc", "--noEmit", "--pretty", "false"], tsDir);
      if (out) problems.push(`TYPECHECK (tsc in ${relative(ROOT, tsDir) || "."})\n${out.slice(0, 4000)}`);
    }
    const lintDir = findUp(dir, ESLINT);
    if (lintDir) {
      const out = run("npx", ["--no-install", "eslint", abs], lintDir);
      if (out) problems.push(`LINT (eslint in ${relative(ROOT, lintDir) || "."})\n${out.slice(0, 4000)}`);
    }
  }
} else if (ext === ".py") {
  const out = run("ruff", ["check", abs], ROOT);
  if (out) problems.push(`LINT (ruff)\n${out.slice(0, 4000)}`);
}

if (!problems.length) process.exit(0);
console.error(`Quality gate failed after editing ${rel}. Fix before continuing (never hand a red build to review):\n\n${problems.join("\n\n")}`);
process.exit(2);
