#!/usr/bin/env node
// Opens a PR summarizing the result of autofix-issue.mjs for one Issue.
// Never merges. Never runs clasp. If ALREADY_FIXED, the PR is a
// documentation-only PR (no apps-script/ changes) explaining why, closing
// the loop for founder review without a no-op code diff.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ISSUE_NUMBER = process.env.ISSUE_NUMBER || process.argv[2];
if (!ISSUE_NUMBER) {
  console.error("ISSUE_NUMBER not set.");
  process.exit(1);
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}
function ghJson(args) {
  return JSON.parse(gh(args));
}

const issue = ghJson(["issue", "view", ISSUE_NUMBER, "--json", "title,number"]);
const verdict = existsSync("autofix-verdict.txt") ? readFileSync("autofix-verdict.txt", "utf8").trim() : "UNKNOWN";
const analysis = existsSync("autofix-output.txt") ? readFileSync("autofix-output.txt", "utf8") : "(no analysis output found)";

const branch = `autofix/issue-${issue.number}`;
execFileSync("git", ["checkout", "-b", branch]);

const reportPath = `AUTOFIX_REPORT_ISSUE_${issue.number}.md`;
const reportBody = `# Autofix pipeline report — Issue #${issue.number}

**${issue.title}**

Verdict: **${verdict}**

This report was produced by the daily-issue-fix-pr.yml pipeline. Nothing
in this PR was pushed to Apps Script and no live deploy occurred — this
pipeline never invokes \`clasp\`. Per AGENTS.md, any apps-script/-touching
commit still requires founder approval before merge, unchanged by this
pipeline existing.

## Analysis

${analysis}

## Verified this run

- Full regression suite (\`npm run test:harness\` + \`npm test\`) was run
  after this pipeline's step, with the result recorded in this PR's CI
  checks, not just asserted here.

## Not verified by this pipeline

- Whether the model's root-cause reasoning is correct beyond what the
  regression suite can catch — founder review is still the closing step,
  per this project's standing operating rules.
`;

execFileSync("bash", ["-c", `cat > ${JSON.stringify(reportPath)} <<'REPORT_EOF'\n${reportBody}\nREPORT_EOF`]);

execFileSync("git", ["add", reportPath]);
execFileSync("git", ["commit", "-m", `Autofix pipeline report for issue #${issue.number} (verdict: ${verdict})\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`]);
execFileSync("git", ["push", "-u", "origin", branch]);

const prBody = `## Summary
- Closes the loop on #${issue.number} — verdict: **${verdict}**.
- ${verdict === "ALREADY_FIXED" ? "No code change: the pipeline independently confirmed the described defect is already fixed in current HEAD, with evidence quoted in the report." : "See report for the proposed fix; review before merging."}

## Verified / not verified
See \`${reportPath}\` in this PR's diff for the full breakdown.

## Deploy status
**Nothing was pushed to Apps Script. No \`clasp push\` occurred.** This PR sits for founder review only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)`;

const prUrl = gh([
  "pr", "create",
  "--title", `Autofix: ${issue.title} (#${issue.number})`,
  "--body", prBody,
  "--base", "main",
  "--head", branch
]).trim();

console.log(`PR opened: ${prUrl}`);
