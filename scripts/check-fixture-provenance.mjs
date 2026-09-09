#!/usr/bin/env node
// Fixture-provenance gate (fixture-provenance-pattern-20260909.md, "Smallest
// structural fix" section).
//
// Root cause this guards against: EEV2-008/009's regression fixture was built
// from Google Drive's read_file_content tool, which inserts "\n\n" between
// table rows. Real Gemini extraction -- what production actually runs on --
// produces one continuous string with no newlines at all. The fix passed
// 16/16 against a fixture that didn't represent reality, shipped, and failed
// identically to the original bug on the first real job
// (form-20260909-072421-33a43b52). This script can't prove a fixture DOES
// match real Gemini output, but it can catch the exact, specific mistake
// that caused this twice: a fixture string containing the Drive-extraction
// tell ("\n\n") with no comment explaining why that's deliberate.
//
// Rule: any apps-script/EEV2*Regression.gs fixture string containing a
// literal "\n\n" escape sequence must have a "// KNOWN-SYNTHETIC:" comment
// nearby (same line, or within the preceding few lines) justifying it. No
// justifying comment -> this script fails.
//
// Usage: node scripts/check-fixture-provenance.mjs
// Exits 1 and prints every violation if any fixture is unjustified.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGRESSION_DIR = join(root, "apps-script");
const DRIVE_TELL = "\\n\\n";
const JUSTIFICATION_MARKER = "KNOWN-SYNTHETIC:";
const JUSTIFICATION_LOOKBACK_LINES = 5;

export function findRegressionFiles(dir) {
  return readdirSync(dir)
    .filter((name) => /^EEV2.*Regression\.gs$/.test(name))
    .map((name) => join(dir, name));
}

// Scans one file's source text (not evaluated JS -- the raw file content, so
// "\n\n" here means the two literal characters backslash-n repeated, exactly
// as it appears written in a .gs string literal) and returns one violation
// per unjustified occurrence of the Drive-extraction tell.
export function checkFileContent(filePath, content) {
  const violations = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip full-line comments -- a line whose first non-whitespace
    // characters are "//" is prose describing the pattern (e.g. this
    // script's own file header, or a regression suite's explanatory
    // comments), not a fixture string literal. This does not skip a
    // trailing "// comment" after real code on the same line, since the
    // Drive-extraction tell can only appear inside a string literal earlier
    // on that line, which is still scanned.
    if (line.trim().startsWith("//")) continue;
    let searchFrom = 0;
    let idx;
    while ((idx = line.indexOf(DRIVE_TELL, searchFrom)) !== -1) {
      searchFrom = idx + DRIVE_TELL.length;
      const windowStart = Math.max(0, i - JUSTIFICATION_LOOKBACK_LINES);
      const windowText = lines.slice(windowStart, i + 1).join("\n");
      if (!windowText.includes(JUSTIFICATION_MARKER)) {
        violations.push({
          file: filePath,
          line: i + 1,
          excerpt: line.trim().slice(0, 120)
        });
      }
    }
  }

  return violations;
}

export function checkAllFixtures(dir) {
  const files = findRegressionFiles(dir);
  const allViolations = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    allViolations.push(...checkFileContent(file, content));
  }
  return { filesChecked: files.length, violations: allViolations };
}

function main() {
  const { filesChecked, violations } = checkAllFixtures(REGRESSION_DIR);

  if (violations.length > 0) {
    process.stderr.write(
      `FIXTURE PROVENANCE CHECK FAILED: ${violations.length} unjustified ` +
      `Drive-extraction-shaped fixture(s) found across ${filesChecked} file(s).\n\n`
    );
    for (const v of violations) {
      process.stderr.write(
        `  ${v.file}:${v.line}\n    ${v.excerpt}\n` +
        `    Fix: replace with real Gemini-shaped text (no "\\n\\n"), or add a ` +
        `"// KNOWN-SYNTHETIC:" comment within ${JUSTIFICATION_LOOKBACK_LINES} lines ` +
        `explaining why this fixture is deliberately synthetic.\n\n`
      );
    }
    process.stderr.write(
      "See fixture-provenance-pattern-20260909.md for the full root cause.\n"
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `OK: fixture provenance check passed. ${filesChecked} regression file(s) checked, no unjustified Drive-shaped fixtures found.\n`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
