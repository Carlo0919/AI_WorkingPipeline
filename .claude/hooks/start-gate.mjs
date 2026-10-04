#!/usr/bin/env node
/**
 * UserPromptSubmit hook — the first-run gate.
 *
 * Until Start.md says the intake is complete (`**Intake status:** ✅ LOCKED`), every prompt
 * except `/Start` gets an instruction injected: run the /Start intake first. Once Start.md is
 * locked this hook is silent forever — /Start is mandatory only for the first session.
 *
 * Silent when: the repo is the pipeline template itself (pipeline.config.json `templateRepo`
 * matches the origin remote), Start.md is missing (the pipeline isn't installed here), or the
 * prompt already is /Start.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const startFile = join(ROOT, "Start.md");
if (!existsSync(startFile)) process.exit(0);
if (/\*\*Intake status:\*\*\s*✅\s*LOCKED/.test(readFileSync(startFile, "utf8"))) process.exit(0);

let config = {};
try {
  config = JSON.parse(readFileSync(join(ROOT, ".claude", "pipeline.config.json"), "utf8"));
} catch {}
if (config.templateRepo) {
  try {
    const origin = execFileSync("git", ["remote", "get-url", "origin"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (origin.toLowerCase().includes(config.templateRepo.toLowerCase())) process.exit(0);
  } catch {}
}

const prompt = String(readHookInput()?.prompt ?? "").trim();
if (/^\/start\b/i.test(prompt)) process.exit(0);

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext:
      "PIPELINE GATE: this project has not been through intake yet (Start.md → Intake status is not LOCKED). " +
      "Before doing ANY other work — no code, no plan, no /Commander — run the /Start intake " +
      "(.claude/commands/Start.md): ask the user to describe the project, record their description verbatim " +
      "in Start.md, ask for every missing detail on the Start.md checklist (target users, traffic tier " +
      "high/medium/low, services/integrations, roles, data sensitivity, timeline…), confirm the summary, then " +
      "write Project.md and lock Start.md. If the user's message already contains a project description, " +
      "treat it as the start of the intake. Tell the user briefly why you are doing this first.",
  },
}));
process.exit(0);
