#!/usr/bin/env node
// Golden-sample governance check (ROADMAP.md, "Golden-sample governance",
// added 2026-09-04, six-lens audit).
//
// recovery-v11/Code.v11.js is this project's preserved known-good artifact --
// the same role a physical reference sample plays in semiconductor fab
// validation. It exists specifically because the session's own scratchpad was
// wiped twice on 2026-09-04 while this recovery was in progress; if it can
// silently change too, there is no floor left under this project's recovery
// evidence.
//
// This script fails loudly if the file's content no longer matches the hash
// recorded in ROADMAP.md. It does NOT run automatically as part of `npm test`
// -- wiring a new check into the release gate needs explicit approval per
// AGENTS.md's Delegation Boundaries. Run it manually, or ask the founder to
// wire it into CI once ROADMAP.md Milestone 6's CI check is approved and built.
//
// Usage: node scripts/check-golden-sample.mjs

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GOLDEN_FILE = join(root, "recovery-v11", "Code.v11.js");
const ROADMAP_FILE = join(root, "ROADMAP.md");

// Extracted from ROADMAP.md's "Golden-sample governance" section at the time
// this script was written (2026-09-04). If ROADMAP.md's recorded hash is ever
// deliberately updated via a logged "this is now golden" decision, this
// constant must be updated in the SAME commit -- a mismatch between the two
// is itself a finding this script should report, not silently resolve.
const RECORDED_HASH =
  "c049a91156fcb749713a6376caef014b906d15f3aded8c35f37598c7840f1b5a";

function fail(message) {
  process.stderr.write(`GOLDEN SAMPLE CHECK FAILED: ${message}\n`);
  process.exitCode = 1;
}

if (!existsSync(GOLDEN_FILE)) {
  fail(`${GOLDEN_FILE} does not exist. The golden sample must not be deleted.`);
  process.exit();
}

const content = readFileSync(GOLDEN_FILE);
const actualHash = createHash("sha256").update(content).digest("hex");

if (actualHash !== RECORDED_HASH) {
  fail(
    `recovery-v11/Code.v11.js has changed since it was certified golden.\n` +
    `  Recorded (ROADMAP.md + this script): ${RECORDED_HASH}\n` +
    `  Actual (just computed):              ${actualHash}\n\n` +
    `Per ROADMAP.md's golden-sample governance: this file "may only be replaced\n` +
    `by a deliberate, logged 'this is now golden' decision -- never overwritten\n` +
    `as a side effect of another change." If this change was deliberate, update\n` +
    `BOTH the RECORDED_HASH constant in this script AND ROADMAP.md's Milestone 2\n` +
    `section in the same commit, with a commit message stating the re-golding\n` +
    `decision explicitly. If this change was NOT deliberate, investigate before\n` +
    `doing anything else -- this is exactly the kind of silent-overwrite failure\n` +
    `that caused the 2026-09-04 incident this file exists to help recover from.`
  );
  process.exit();
}

// Cross-check: ROADMAP.md's own prose should still contain this hash. If it
// doesn't, ROADMAP.md and this script have drifted apart from each other --
// the exact duplicate-document risk named in this session's contradiction-
// hunting pass (AGENTS.md/CONTRACTS.md's Hard Stops list, same failure shape).
if (existsSync(ROADMAP_FILE)) {
  const roadmapText = readFileSync(ROADMAP_FILE, "utf8");
  if (!roadmapText.includes(RECORDED_HASH)) {
    fail(
      `ROADMAP.md no longer contains the hash this script expects ` +
      `(${RECORDED_HASH}). ROADMAP.md and scripts/check-golden-sample.mjs have ` +
      `drifted apart -- update both together, not just one.`
    );
    process.exit();
  }
}

process.stdout.write(
  `OK: recovery-v11/Code.v11.js matches its recorded golden-sample hash.\n`
);
