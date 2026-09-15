#!/usr/bin/env node
// scripts/inconsistency-scan.mjs
//
// Constrovet Phase 2, Stage 3 (Platform Safety Crews): "inconsistency-scan"
// as a real, runnable command. Wraps the real, live eev2InconsistencyScan()
// (apps-script/EEV2InconsistencyScan.gs) via `clasp run`, same pattern and
// same known-limitation handling as scripts/safety-gate-check.mjs -- see
// that file's header for why `clasp run` (not a direct Node-side Sheets API
// call) and for the Execution API permission caveat.
//
// Read-only against the real validation-errors sheet: scans across every
// logged job (not just one job_id) for recurring anomaly patterns. Safe to
// run at any time without founder approval.
//
// Usage:
//   node scripts/inconsistency-scan.mjs
//   npm run inconsistency-scan
//
// Options:
//   --clasp-config <path>   Path to a .clasp.json (or its containing dir).
//                           Defaults to apps-script/.clasp.json.
//
// Exit codes: 0 = scan completed, zero findings. 1 = scan completed, one or
// more findings (not itself a failure -- see printed findings for detail).
// 2 = could not complete the scan (clasp failure, malformed output, etc.).

import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message, code = 2) {
  console.error(`\nINCONSISTENCY-SCAN: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { claspConfig: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--clasp-config") { args.claspConfig = argv[++i]; continue; }
    fail(`Unknown option: ${a}`);
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
    "(same limitation documented in safety-gate-check.mjs and SESSION_LOG.md, " +
    "observed 2026-09-11 and again 2026-09-15).\n" +
    "\nDo not attempt a workaround. Prof. Taran must either:\n" +
    "  (a) resolve the Execution API permission from an authenticated " +
    "session (Termux/laptop), or\n" +
    "  (b) open the Apps Script editor and run eev2InconsistencyScan() by " +
    "hand (no arguments needed) -- see EEV2InconsistencyScan.gs.\n"
  );
  console.log(`Raw clasp output:\n${combined.trim()}`);
  process.exit(2);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
  const claspConfigDir = resolveClaspConfigDir(args.claspConfig, repoRoot);

  console.log("Running the real, live cross-job inconsistency scan");
  console.log(`via: clasp run eev2InconsistencyScan  (cwd: ${claspConfigDir})\n`);

  const proc = spawnSync("clasp", ["run", "eev2InconsistencyScan"], { encoding: "utf8", cwd: claspConfigDir });
  if (proc.error) {
    fail(`Could not launch clasp: ${proc.error.message}`);
  }
  const stdoutText = proc.stdout || "";
  const stderrText = proc.stderr || "";
  const combined = `${stdoutText}\n${stderrText}`;

  if (isPermissionBlocked(combined)) reportPermissionBlocked(combined);
  if (proc.status !== 0) {
    fail(`clasp run exited ${proc.status} -- cannot complete the scan.\n${combined}`);
  }

  const marker = "INCONSISTENCY-SCAN";
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

  console.log("=".repeat(78));
  console.log("INCONSISTENCY SCAN RESULT (real, live, via eev2InconsistencyScan)");
  console.log("=".repeat(78));
  console.log(JSON.stringify(result, null, 2));

  process.exit(result.findings_count > 0 ? 1 : 0);
}

main();
