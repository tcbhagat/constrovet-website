#!/usr/bin/env node
// scripts/xai-explain.mjs
//
// Constrovet Phase 2, Stage 3 (Platform Safety Crews): "xai-explain" as a
// real, runnable command. Wraps the real, live eev2XaiExplain(jobId,
// findingIndex) (apps-script/EEV2XaiExplain.gs) via `clasp run`, same
// pattern and known-limitation handling as safety-gate-check.mjs and
// inconsistency-scan.mjs -- see safety-gate-check.mjs's header for why
// `clasp run` and for the Execution API permission caveat.
//
// Produces a "why this figure" markdown explanation for one finding on one
// real job, grounded only in fields already present on that finding -- it
// is a rendering tool, not a second analysis pass.
//
// Usage:
//   node scripts/xai-explain.mjs <job_id> <finding_index>
//   npm run xai-explain -- <job_id> <finding_index>
//
// Options:
//   --clasp-config <path>   Path to a .clasp.json (or its containing dir).
//                           Defaults to apps-script/.clasp.json.
//   --out <path>            Also write the markdown to this file (in
//                           addition to printing it).
//
// Exit codes: 0 = explanation produced. 1 = the live function ran but
// returned an error field (job/finding not found, bad index, etc.) -- see
// printed detail. 2 = could not complete the call at all (clasp failure,
// malformed output, etc.).

import { existsSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message, code = 2) {
  console.error(`\nXAI-EXPLAIN: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { jobId: null, findingIndex: null, claspConfig: null, out: null };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--clasp-config") { args.claspConfig = argv[++i]; continue; }
    if (a === "--out") { args.out = argv[++i]; continue; }
    if (a.startsWith("-")) fail(`Unknown option: ${a}`);
    positional.push(a);
  }
  if (positional.length !== 2) {
    fail("Usage: node scripts/xai-explain.mjs <job_id> <finding_index> [--clasp-config <path>] [--out <path>]");
  }
  args.jobId = positional[0];
  args.findingIndex = Number(positional[1]);
  if (!Number.isInteger(args.findingIndex) || args.findingIndex < 0) {
    fail(`<finding_index> must be a non-negative integer, got "${positional[1]}".`);
  }
  return args;
}

function resolveClaspConfigDir(explicitPath, repoRoot) {
  const candidatePath = explicitPath ? resolve(explicitPath) : resolve(repoRoot, "apps-script");
  const dir = candidatePath.endsWith(".clasp.json") ? dirname(candidatePath) : candidatePath;
  const configFile = join(dir, ".clasp.json");
  if (!existsSync(configFile)) {
    fail(`No .clasp.json found at "${configFile}". Pass --clasp-config <path> to point at a different one.`);
  }
  return dir;
}

function isPermissionBlocked(text) {
  return /permission to run the script function/i.test(text) || /Unable to run script function/i.test(text);
}

function reportPermissionBlocked(combined) {
  console.log("=".repeat(78));
  console.log("FOUNDER_ACTION_REQUIRED");
  console.log("=".repeat(78));
  console.log(
    "\n`clasp run` does not have Execution API permission for this project " +
    "(same limitation documented in safety-gate-check.mjs and SESSION_LOG.md).\n" +
    "\nDo not attempt a workaround. Prof. Taran must either:\n" +
    "  (a) resolve the Execution API permission from an authenticated " +
    "session (Termux/laptop), or\n" +
    "  (b) open the Apps Script editor and run eev2XaiExplain(jobId, " +
    "findingIndex) by hand -- see EEV2XaiExplain.gs.\n"
  );
  console.log(`Raw clasp output:\n${combined.trim()}`);
  process.exit(2);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
  const claspConfigDir = resolveClaspConfigDir(args.claspConfig, repoRoot);

  console.log(`Explaining finding ${args.findingIndex} of job "${args.jobId}"`);
  console.log(`via: clasp run eev2XaiExplain -p '["${args.jobId}", ${args.findingIndex}]'  (cwd: ${claspConfigDir})\n`);

  const proc = spawnSync(
    "clasp",
    ["run", "eev2XaiExplain", "-p", JSON.stringify([args.jobId, args.findingIndex])],
    { encoding: "utf8", cwd: claspConfigDir }
  );
  if (proc.error) {
    fail(`Could not launch clasp: ${proc.error.message}`);
  }
  const stdoutText = proc.stdout || "";
  const stderrText = proc.stderr || "";
  const combined = `${stdoutText}\n${stderrText}`;

  if (isPermissionBlocked(combined)) reportPermissionBlocked(combined);
  if (proc.status !== 0) {
    fail(`clasp run exited ${proc.status} -- cannot complete the explanation.\n${combined}`);
  }

  const marker = "XAI-EXPLAIN";
  const markerIndex = stdoutText.indexOf(marker);
  if (markerIndex === -1) {
    fail(`clasp run succeeded but its output did not contain the expected "${marker}" marker -- cannot parse a result.\nRaw output:\n${stdoutText}`);
  }
  const jsonStart = stdoutText.indexOf("{", markerIndex);
  if (jsonStart === -1) {
    fail(`Found "${marker}" marker but no JSON object after it.\nRaw output:\n${stdoutText}`);
  }

  let depth = 0;
  let endIndex = -1;
  for (let i = jsonStart; i < stdoutText.length; i += 1) {
    if (stdoutText[i] === "{") depth += 1;
    else if (stdoutText[i] === "}") {
      depth -= 1;
      if (depth === 0) { endIndex = i + 1; break; }
    }
  }
  if (endIndex === -1) {
    fail(`Could not find a balanced JSON object in clasp output.\nRaw output:\n${stdoutText}`);
  }

  let result;
  try {
    result = JSON.parse(stdoutText.slice(jsonStart, endIndex));
  } catch (error) {
    fail(`Could not parse JSON result from clasp output: ${error.message}\nRaw output:\n${stdoutText}`);
  }

  if (result.error) {
    console.log(`XAI-EXPLAIN could not produce an explanation: ${result.error}`);
    process.exit(1);
  }

  console.log("=".repeat(78));
  console.log(result.markdown || "(no markdown field in result)");
  console.log("=".repeat(78));

  if (args.out) {
    writeFileSync(resolve(args.out), result.markdown || "");
    console.log(`\nWritten to ${resolve(args.out)}`);
  }

  process.exit(0);
}

main();
