#!/usr/bin/env node
// Picks which open GitHub Issue the daily fix pipeline works on next.
//
// PICKING RULE (explicit, not implicit):
//   1. Only issues labeled "bug" are eligible. "enhancement", "question",
//      "documentation", etc. are out of scope for an autonomous code-fix
//      pipeline -- those need a human decision about whether to do the
//      work at all, not just how.
//   2. Among eligible issues, pick the OLDEST by creation date (FIFO).
//      Rationale: this project's own guardrails favor small, well-scoped,
//      one-bug-at-a-time changes (AGENTS.md "smallest change that fixes
//      the real, proven bug") over a priority score that could be gamed
//      or misjudged by an automated picker. Oldest-first is the simplest
//      rule that can't silently starve an issue.
//   3. An issue with a "blocked" or "needs-founder-input" label (if either
//      is ever added to this repo) is skipped even if it is oldest -- not
//      implemented yet since neither label exists in this repo as of
//      2026-09-07, but reserved here so a future session doesn't have to
//      re-derive this decision.
//
// Outputs (GitHub Actions step output format): issue_number, issue_title

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

function ghJson(args) {
  const out = execFileSync("gh", args, { encoding: "utf8" });
  return JSON.parse(out);
}

function main() {
  const issues = ghJson([
    "issue", "list",
    "--state", "open",
    "--label", "bug",
    "--json", "number,title,createdAt,labels",
    "--limit", "100"
  ]);

  const SKIP_LABELS = new Set(["blocked", "needs-founder-input"]);
  const eligible = issues.filter((issue) =>
    !issue.labels.some((label) => SKIP_LABELS.has(label.name))
  );

  if (eligible.length === 0) {
    console.log("No eligible open bug issues found. Nothing to do.");
    if (process.env.GITHUB_OUTPUT) {
      // Deliberately do not write issue_number -- downstream steps key off
      // its absence via `if: steps.pick.outputs.issue_number != ''`.
    }
    return;
  }

  eligible.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const picked = eligible[0];

  console.log(`Picked issue #${picked.number}: ${picked.title}`);
  console.log(`(${eligible.length} eligible issue(s) total, oldest-first FIFO rule)`);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `issue_number=${picked.number}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `issue_title=${picked.title}\n`);
  }
}

main();
