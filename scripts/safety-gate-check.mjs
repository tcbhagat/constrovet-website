#!/usr/bin/env node
// scripts/safety-gate-check.mjs
//
// Constrovet Phase 2, Stage 3 (Platform Safety Crews): "safety-gate-check" as
// a real, runnable command. This does not reimplement Contract 1's 4-artifact
// audit -- that logic already exists, tested, live, as eev2AuditJob(jobId) in
// apps-script/EEV2AuditJob.gs. This script is a thin CLI wrapper that invokes
// the real live function via `clasp run` and prints its verdict, so the audit
// can be triggered from a terminal/npm script instead of the Apps Script
// editor.
//
// Why `clasp run` and not a direct Sheets/Drive API call from Node: there is
// no Node-side Google API credential anywhere in this repo (checked before
// building this -- only `clasp`, which is Apps Script-side, and an agent's
// own Drive MCP connector access, which is session-only and not something a
// plain `npm run` invocation can rely on). Standing up new Node-side
// credentials is a real new capability with real access-scope and cost
// decisions -- out of scope for turning an existing, tested function into a
// runnable command. `clasp run` reuses eev2AuditJob as-is, so this script's
// output is only ever as trustworthy as that function already is.
//
// KNOWN LIMITATION (2026-09-11, SESSION_LOG.md): `clasp run`'s Execution API
// permission has been observed broken ("Unable to run script function...").
// This script does not hide that -- it detects the specific clasp failure
// and reports FOUNDER_ACTION_REQUIRED with the exact fix path, rather than
// printing a bare stack trace or a false PASS/FAIL.
//
// Usage:
//   node scripts/safety-gate-check.mjs <job_id>
//   npm run safety-gate-check -- <job_id>
//
// Options:
//   --clasp-config <path>   Path to a .clasp.json (or its containing dir).
//                           Defaults to apps-script/.clasp.json.
//
// Exit codes: 0 = all four Contract 1 artifacts confirmed for this job_id
// (GATE_HELD). 1 = at least one artifact not confirmed (NOT_CONFIRMED) --
// see eev2AuditJob's own caveat: this is the expected, correct outcome for a
// should-pass job (Contract 2), not necessarily a gate failure. 2 = could not
// complete the check (clasp failure, bad arguments, malformed output) -- an
// inconclusive check is not a passed check.

import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message, code = 2) {
  console.error(`\nSAFETY-GATE-CHECK: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { jobId: null, claspConfig: null };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--clasp-config") { args.claspConfig = argv[++i]; continue; }
    if (a.startsWith("-")) fail(`Unknown option: ${a}`);
    positional.push(a);
  }
  if (positional.length !== 1) {
    fail("Usage: node scripts/safety-gate-check.mjs <job_id> [--clasp-config <path>]");
  }
  args.jobId = positional[0];
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

function reportPermissionBlocked(jobId, combined) {
  console.log("=".repeat(78));
  console.log("FOUNDER_ACTION_REQUIRED");
  console.log("=".repeat(78));
  console.log(
    "\n`clasp run` does not have Execution API permission for this project " +
    "(observed broken as of 2026-09-11, SESSION_LOG.md -- OAuth consent-screen " +
    "test users and API-executable deployment access level were both already " +
    "ruled out as the cause on that date).\n" +
    "\nDo not attempt a workaround. Prof. Taran must either:\n" +
    "  (a) resolve the Execution API permission from an authenticated " +
    "session (Termux/laptop), or\n" +
    "  (b) open the Apps Script editor and run eev2AuditJobDiagnosticRun() " +
    "by hand (no-argument wrapper, audits job form-20260905-053908-609f4190 " +
    "only -- see EEV2AuditJob.gs), or\n" +
    "  (c) open the editor, paste the target job_id into a call to " +
    "eev2AuditJob(\"" + jobId + "\"), and run it manually.\n"
  );
  console.log(`Raw clasp output:\n${combined.trim()}`);
  process.exit(2);
}

function isPermissionBlocked(text) {
  return /permission to run the script function/i.test(text) || /Unable to run script function/i.test(text);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
  const claspConfigDir = resolveClaspConfigDir(args.claspConfig, repoRoot);

  console.log(`Running Contract 1's real, live 4-artifact audit for job_id "${args.jobId}"`);
  console.log(`via: clasp run eev2AuditJob -p '["${args.jobId}"]'  (cwd: ${claspConfigDir})`);
  console.log(
    "(clasp's own path-traversal guard requires running with cwd = the " +
    "directory containing .clasp.json when rootDir is \"\" -- see apps-script/.clasp.json)\n"
  );

  // spawnSync (not execFileSync) because clasp run has been observed to exit
  // 0 while printing its permission failure to STDERR only (2026-09-15) --
  // execFileSync only returns stdout on success and discards stderr in that
  // case, which silently swallowed the exact failure this script exists to
  // detect. spawnSync always returns both streams regardless of exit code.
  const proc = spawnSync(
    "clasp",
    ["run", "eev2AuditJob", "-p", JSON.stringify([args.jobId])],
    { encoding: "utf8", cwd: claspConfigDir }
  );
  if (proc.error) {
    fail(`Could not launch clasp: ${proc.error.message}`);
  }
  const stdoutText = proc.stdout || "";
  const stderrText = proc.stderr || "";
  const combined = `${stdoutText}\n${stderrText}`;

  if (isPermissionBlocked(combined)) reportPermissionBlocked(args.jobId, combined);
  if (proc.status !== 0) {
    fail(`clasp run exited ${proc.status} -- cannot complete the check.\n${combined}`);
  }

  const rawOutput = stdoutText;

  // clasp run's stdout wraps the function's own console.log output plus its
  // own status lines. eev2AuditJob() logs "CONTRACT-1-AUDIT <id>" immediately
  // before the JSON block -- anchor on that rather than assuming stdout is
  // pure JSON.
  const marker = "CONTRACT-1-AUDIT";
  const markerIndex = rawOutput.indexOf(marker);
  if (markerIndex === -1) {
    fail(`clasp run succeeded but its output did not contain the expected "${marker}" marker -- cannot parse a result.\nRaw output:\n${rawOutput}`);
  }
  const jsonStart = rawOutput.indexOf("{", markerIndex);
  if (jsonStart === -1) {
    fail(`Found "${marker}" marker but no JSON object after it.\nRaw output:\n${rawOutput}`);
  }

  let result;
  try {
    // eev2AuditJob prints one JSON.stringify(result, null, 2) block; take
    // everything from the first "{" to the end and let JSON.parse fail
    // loudly if clasp appended trailing status text that broke the object.
    result = JSON.parse(rawOutput.slice(jsonStart));
  } catch {
    // clasp sometimes appends its own trailing lines after the JSON body --
    // retry by trimming to the last top-level "}" via bracket counting.
    let depth = 0;
    let endIndex = -1;
    for (let i = jsonStart; i < rawOutput.length; i += 1) {
      if (rawOutput[i] === "{") depth += 1;
      else if (rawOutput[i] === "}") {
        depth -= 1;
        if (depth === 0) { endIndex = i + 1; break; }
      }
    }
    if (endIndex === -1) {
      fail(`Could not parse JSON result from clasp output.\nRaw output:\n${rawOutput}`);
    }
    try {
      result = JSON.parse(rawOutput.slice(jsonStart, endIndex));
    } catch (error2) {
      fail(`Could not parse JSON result from clasp output even after bracket-matching: ${error2.message}\nRaw output:\n${rawOutput}`);
    }
  }

  console.log("=".repeat(78));
  console.log("CONTRACT 1 AUDIT RESULT (real, live, via eev2AuditJob)");
  console.log("=".repeat(78));
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n${"=".repeat(78)}`);
  console.log("VERDICT");
  console.log("=".repeat(78));
  console.log(`\n${result.contract_1_verdict || "(no verdict field in result)"}`);

  process.exit(result.all_four_artifacts_confirmed ? 0 : 1);
}

main();
