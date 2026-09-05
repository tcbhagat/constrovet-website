#!/usr/bin/env node
// scripts/pre-push-check.mjs
//
// The one gate standing between a future recovery attempt and a repeat of
// the 2026-09-04 incident. That incident happened because `clasp push`
// syncs the ENTIRE local `apps-script/` directory against live in one shot,
// and a "recovery" built from a single-file (Code.js-only) pull of Version 11
// was pushed while a companion file that existed live
// (`EEV2ScheduleStatusModule.js`) had never been captured locally. `clasp
// push` does not warn about this — it just deletes whatever isn't present
// locally. This script is a manual, standalone check that must be run BEFORE
// every future push, per AGENTS.md's Delegation Boundaries and
// CONTINUATION_CONTRACT.md Phase 3. It is NOT wired into any git hook,
// npm lifecycle hook, or CI job — the founder runs it on demand, by hand.
//
// What it does:
//   1. Pulls the REAL, CURRENT live Apps Script project fresh via
//      `clasp pull` into a throwaway temp directory (never `apps-script/`,
//      never any tracked path — a read only, per AGENTS.md's autonomous-ops
//      list).
//   2. Diffs the live pull's FULL FILE LIST against the candidate directory
//      about to be pushed.
//   3. Diffs, for every file both sides have, the FULL FUNCTION LIST
//      (top-level `function name(...)` declarations and `const/let/var name =
//      function|=>` assignments) — not just file presence. This is the exact
//      check that would have caught 2026-09-04: file-existence checks alone
//      passed that day, because Code.js *was* present in both; what was
//      missing was an entire companion FILE, and separately (discovered
//      2026-09-05, Phase 1) a function whose NAME was unchanged but whose
//      BODY had regressed.
//   4. FAILS LOUDLY (nonzero exit, clearly formatted report) on:
//        - any file present live and absent from the candidate,
//        - any function present live and absent from the candidate,
//          in any file (whether the file itself is missing entirely, or the
//          file exists in the candidate but is missing just that function).
//      A file present in the candidate and absent live, or a function added
//      in the candidate that live does not have, is NOT a failure — that is
//      exactly what a real fix or restoration is expected to look like. This
//      script guards against regression (live has it, candidate would delete
//      it), not against addition.
//   5. Never touches `clasp push`. Never modifies the candidate, live, or
//      any tracked file. Read-only against live; the temp pull directory is
//      deleted at the end of the run (kept only on request, e.g. --keep-temp,
//      for post-mortem inspection).
//
// Usage:
//   node scripts/pre-push-check.mjs <path-to-candidate-directory>
//   node scripts/pre-push-check.mjs recovery-v11/candidate-full
//   node scripts/pre-push-check.mjs apps-script          # dry-run against the tracked repo itself
//
// Options:
//   --clasp-config <path>   Path to a .clasp.json (or its containing dir) to
//                           read the scriptId from. Defaults to
//                           apps-script/.clasp.json (read-only; this script
//                           never writes there).
//   --keep-temp             Do not delete the throwaway pull directory on exit;
//                           print its path so it can be inspected by hand.
//   --version <n>           Pull a specific version number instead of the
//                           live HEAD (script-bound trigger executes HEAD, per
//                           AGENTS.md's intake-path fact, so the default with
//                           no --version is the one that matters for real
//                           traffic — --version exists for deliberate
//                           comparison against a past point only).
//   --local-live-dir <dir>  Skip `clasp pull` entirely and treat <dir> as the
//                           live tree. For diagnosing this script itself, or
//                           for re-checking against an already-pulled snapshot
//                           when clasp credentials are unavailable. NEVER use
//                           this before a real push — it does not confirm
//                           anything about CURRENT live state, only about
//                           whatever is in <dir>. The tool loudly labels its
//                           output as using a supplied directory, not a fresh
//                           pull, whenever this flag is used.
//
// Exit codes: 0 = safe to push (no live-only file or function found missing
// from the candidate). 1 = UNSAFE — do not push; see the report. 2 = could
// not complete the check (clasp failure, bad arguments, etc.) — also do not
// push; an inconclusive check is not a passed check.

import { mkdtempSync, rmSync, readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, basename, extname, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

function fail(message, code = 2) {
  console.error(`\nPRE-PUSH CHECK: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { candidate: null, claspConfig: null, keepTemp: false, version: null, localLiveDir: null };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--keep-temp") { args.keepTemp = true; continue; }
    if (a === "--clasp-config") { args.claspConfig = argv[++i]; continue; }
    if (a === "--version") { args.version = argv[++i]; continue; }
    if (a === "--local-live-dir") { args.localLiveDir = argv[++i]; continue; }
    if (a.startsWith("-")) fail(`Unknown option: ${a}`);
    positional.push(a);
  }
  if (positional.length !== 1) {
    fail(
      "Usage: node scripts/pre-push-check.mjs <path-to-candidate-directory> " +
      "[--clasp-config <path>] [--keep-temp] [--version <n>]"
    );
  }
  args.candidate = positional[0];
  return args;
}

// --- function/global extraction, same approach validated this session in
// recovery-v11/tools/function-inventory-diff.mjs against the real Phase-1
// gap set (it correctly found all 4 known-missing functions plus the 5th,
// undocumented one) -- reused rather than re-derived. ---
const CODE_EXTENSIONS = new Set([".js", ".gs"]);

function loadSourceTree(dir) {
  const out = new Map(); // basename-without-ext -> { file, text, bytes }
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    fail(`Could not read directory "${dir}": ${error.message}`);
  }
  for (const name of entries) {
    const ext = extname(name);
    if (!CODE_EXTENSIONS.has(ext)) continue;
    if (name === ".clasp.json") continue;
    const full = join(dir, name);
    if (!statSync(full).isFile()) continue;
    const key = basename(name, ext);
    out.set(key, { file: name, text: readFileSync(full, "utf8"), bytes: statSync(full).size });
  }
  return out;
}

function extractFunctionNames(text) {
  const names = new Set();
  const decl = /^[ \t]*(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/gm;
  const expr = /^[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/gm;
  let m;
  while ((m = decl.exec(text))) names.add(m[1]);
  while ((m = expr.exec(text))) names.add(m[1]);
  return names;
}

// --- clasp pull, read-only, into a throwaway temp dir. Never apps-script/. ---
function resolveClaspConfigDir(explicitPath, repoRoot) {
  const candidatePath = explicitPath ? resolve(explicitPath) : resolve(repoRoot, "apps-script", ".clasp.json");
  const dir = candidatePath.endsWith(".clasp.json") ? dirname(candidatePath) : candidatePath;
  const configFile = join(dir, ".clasp.json");
  if (!existsSync(configFile)) {
    fail(
      `No .clasp.json found at "${configFile}". This script reads the scriptId from an ` +
      `existing .clasp.json (default: apps-script/.clasp.json) — it never writes one. ` +
      `Pass --clasp-config <path> to point at a different one.`
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(configFile, "utf8"));
  } catch (error) {
    fail(`Could not parse ${configFile} as JSON: ${error.message}`);
  }
  if (!parsed.scriptId) fail(`${configFile} has no "scriptId" field.`);
  return parsed.scriptId;
}

function pullLiveIntoTempDir(scriptId, versionNumber) {
  const tempDir = mkdtempSync(join(tmpdir(), "constrovet-pre-push-live-"));
  writeFileSync(join(tempDir, ".clasp.json"), JSON.stringify({ scriptId, rootDir: "." }));
  const claspArgs = ["-P", join(tempDir, ".clasp.json"), "pull"];
  if (versionNumber) claspArgs.push("--versionNumber", String(versionNumber));
  console.log(`Pulling live Apps Script project (scriptId ${scriptId}${versionNumber ? `, version ${versionNumber}` : ", current HEAD"}) into throwaway dir:\n  ${tempDir}\n`);
  try {
    const output = execFileSync("clasp", claspArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    console.log(output.trim());
  } catch (error) {
    const stderrText = error.stderr ? error.stderr.toString() : "";
    const stdoutText = error.stdout ? error.stdout.toString() : "";
    rmSync(tempDir, { recursive: true, force: true });
    fail(
      `clasp pull failed — cannot verify live state, so this check CANNOT confirm it is safe to push. ` +
      `Do not push based on an inconclusive check.\n${stdoutText}\n${stderrText}`
    );
  }
  return tempDir;
}

function formatBytes(n) {
  return `${n.toLocaleString("en-US")} B`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
  const candidateDir = resolve(args.candidate);

  if (!existsSync(candidateDir) || !statSync(candidateDir).isDirectory()) {
    fail(`Candidate directory does not exist or is not a directory: ${candidateDir}`);
  }

  let tempLiveDir;
  let usedSuppliedDir = false;
  if (args.localLiveDir) {
    usedSuppliedDir = true;
    tempLiveDir = resolve(args.localLiveDir);
    if (!existsSync(tempLiveDir) || !statSync(tempLiveDir).isDirectory()) {
      fail(`--local-live-dir does not exist or is not a directory: ${tempLiveDir}`);
    }
    console.log(`\n${"!".repeat(78)}`);
    console.log("! --local-live-dir supplied: SKIPPING clasp pull. This run does NOT confirm");
    console.log("! current live state. Never use this flag as the real check before a push.");
    console.log(`! Live tree used: ${tempLiveDir}`);
    console.log("!".repeat(78));
  } else {
    const scriptId = resolveClaspConfigDir(args.claspConfig, repoRoot);
    tempLiveDir = pullLiveIntoTempDir(scriptId, args.version);
  }

  let exitCode = 0;
  try {
    const live = loadSourceTree(tempLiveDir);
    const candidate = loadSourceTree(candidateDir);

    console.log(`\nLive pull:  ${live.size} code files (${tempLiveDir})`);
    console.log(`Candidate:  ${candidate.size} code files (${candidateDir})\n`);

    // --- 1. FULL FILE LIST diff ---
    const liveKeys = new Set(live.keys());
    const candidateKeys = new Set(candidate.keys());
    const missingFiles = [...liveKeys].filter((k) => !candidateKeys.has(k)).sort();
    const addedFiles = [...candidateKeys].filter((k) => !liveKeys.has(k)).sort();

    console.log("=".repeat(78));
    console.log("FILE LIST");
    console.log("=".repeat(78));
    if (missingFiles.length) {
      exitCode = 1;
      console.log(`\n*** ${missingFiles.length} file(s) exist LIVE and are ABSENT from the candidate: ***`);
      missingFiles.forEach((k) => {
        const info = live.get(k);
        console.log(`  MISSING  ${info.file}  (${formatBytes(info.bytes)}, live-only)`);
      });
    } else {
      console.log("\nNo live file is missing from the candidate.");
    }
    if (addedFiles.length) {
      console.log(`\n${addedFiles.length} file(s) exist in the candidate and not live (additions — not a failure):`);
      addedFiles.forEach((k) => console.log(`  NEW      ${candidate.get(k).file}`));
    }

    // --- 2. PER-FILE FUNCTION LIST diff, for every file both sides have ---
    console.log(`\n${"=".repeat(78)}`);
    console.log("FUNCTION LIST (per shared file)");
    console.log("=".repeat(78));
    let totalMissingFunctions = 0;
    const sharedKeys = [...liveKeys].filter((k) => candidateKeys.has(k)).sort();
    for (const key of sharedKeys) {
      const liveInfo = live.get(key);
      const candidateInfo = candidate.get(key);
      const liveFns = extractFunctionNames(liveInfo.text);
      const candidateFns = extractFunctionNames(candidateInfo.text);
      const missingFns = [...liveFns].filter((f) => !candidateFns.has(f)).sort();
      const addedFns = [...candidateFns].filter((f) => !liveFns.has(f)).sort();
      if (!missingFns.length && !addedFns.length && liveInfo.text === candidateInfo.text) continue; // identical, nothing to report
      console.log(`\n--- ${liveInfo.file} (live) vs ${candidateInfo.file} (candidate) ---`);
      if (missingFns.length) {
        exitCode = 1;
        totalMissingFunctions += missingFns.length;
        console.log(`  *** ${missingFns.length} function(s) present LIVE, ABSENT from candidate: ***`);
        missingFns.forEach((f) => console.log(`    MISSING  ${f}()`));
      }
      if (addedFns.length) {
        console.log(`  ${addedFns.length} function(s) in candidate not live (additions — not a failure):`);
        addedFns.forEach((f) => console.log(`    NEW      ${f}()`));
      }
      if (!missingFns.length && !addedFns.length) {
        console.log(`  Same function names, different body — same function-list check cannot see this. ` +
          `Review the diff by hand (this is how the 2026-09-05 5th gap, eev2RouteStructuredBoardroomFindings, was found).`);
      }
    }

    // For every live-only FILE, also report its function count as missing —
    // an entire missing file is N missing functions, not a separate category.
    missingFiles.forEach((key) => {
      const info = live.get(key);
      const fns = extractFunctionNames(info.text);
      totalMissingFunctions += fns.size;
    });

    console.log(`\n${"=".repeat(78)}`);
    console.log("VERDICT");
    console.log("=".repeat(78));
    if (exitCode === 0) {
      console.log(`\nSAFE TO PUSH (by this check): every file and function present live is also present in the candidate.`);
      console.log(`This does not confirm the candidate is otherwise correct — only that pushing it will not DELETE anything live currently has.`);
    } else {
      console.log(`\nUNSAFE TO PUSH: ${missingFiles.length} file(s) and ${totalMissingFunctions} total function(s) ` +
        `(including those inside missing files) exist live and would be DELETED by pushing this candidate as-is.`);
      console.log(`Restore the missing files/functions into the candidate before pushing. Per AGENTS.md, only the founder runs clasp push.`);
    }
  } finally {
    if (usedSuppliedDir) {
      // Never delete a directory we did not create ourselves.
    } else if (args.keepTemp) {
      console.log(`\n--keep-temp: live pull left at ${tempLiveDir} for inspection.`);
    } else {
      rmSync(tempLiveDir, { recursive: true, force: true });
    }
  }

  process.exit(exitCode);
}

main();
