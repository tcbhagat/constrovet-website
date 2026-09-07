#!/usr/bin/env node
// Reads one GitHub Issue (ISSUE_NUMBER env var) and asks Claude (API) to:
//   1. Read the real, current apps-script/ source relevant to the issue.
//   2. Quote the real current line(s) before proposing any change --
//      this project's standing guardrail (AGENTS.md guardrail 3).
//   3. Determine whether a code change is needed at all. If the described
//      defect is already fixed in current HEAD, say so explicitly and
//      make NO code change -- do not invent a change to justify a PR.
//   4. If a real change is needed: write the fix + a regression test using
//      real production data as the fixture where real data exists, then
//      write the diff to disk (does not commit or push -- that happens in
//      open-fix-pr.mjs after the regression suite step confirms zero
//      regressions).
//
// This script performs a single non-streaming Messages API call. It does
// not use tool-calling / agentic loops -- the issue text plus the relevant
// source file(s) are sent as context in one request, and the model's text
// response is parsed for a structured verdict. This is deliberately simple
// for a first version; a more capable agentic pipeline (multi-turn, actual
// file tool use) is a natural next iteration, not built here.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;

if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Cannot invoke Claude.");
  process.exit(1);
}
if (!ISSUE_NUMBER) {
  console.error("ISSUE_NUMBER is not set.");
  process.exit(1);
}

function ghJson(args) {
  const out = execFileSync("gh", args, { encoding: "utf8" });
  return JSON.parse(out);
}

const issue = ghJson(["issue", "view", ISSUE_NUMBER, "--json", "title,body,number"]);

// The relevant source file. For this first version this is hardcoded to
// apps-script/Code.gs, since that is where every EEV2-series defect this
// project has hit so far has lived. A future version should let the model
// request additional files rather than assuming one.
const sourcePath = "apps-script/Code.gs";
const source = readFileSync(sourcePath, "utf8");

const systemPrompt = `You are reviewing a GitHub Issue against the REAL, CURRENT source code of a construction-industry validation pipeline. This code prevents fabricated financial figures from reaching client board packs -- the prime directive of this project is "no fabricated figures reach client board packs."

Rules, non-negotiable:
1. No assumption. If a fact isn't in the provided source, say so -- do not invent line numbers, function names, or behavior.
2. Quote the real current line(s) verbatim from the provided source before proposing any change.
3. If the described defect is ALREADY FIXED in the current source, say so explicitly, quote the fix, and make NO code change. Do not invent a change to justify a PR.
4. If a real change is needed: propose the smallest fix that addresses the root cause, plus a regression test.
5. End with a structured verdict block, exactly this format:

VERDICT: ALREADY_FIXED | NEEDS_FIX
ROOT_CAUSE: <one paragraph>
EVIDENCE: <quoted real line(s) with line numbers>
FIX_NEEDED: <yes/no, and if yes, a description -- do not write a diff here>`;

const userPrompt = `Issue #${issue.number}: ${issue.title}

${issue.body}

--- Real current source: ${sourcePath} ---

${source}`;

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }]
  })
});

if (!response.ok) {
  const text = await response.text();
  console.error(`Anthropic API error ${response.status}: ${text}`);
  process.exit(1);
}

const result = await response.json();
const text = result.content.map((block) => block.text || "").join("\n");

console.log(text);
writeFileSync("autofix-output.txt", text, "utf8");

const verdictMatch = text.match(/VERDICT:\s*(ALREADY_FIXED|NEEDS_FIX)/);
const verdict = verdictMatch ? verdictMatch[1] : "UNKNOWN";
console.log(`\n=== VERDICT: ${verdict} ===`);

if (verdict === "ALREADY_FIXED") {
  writeFileSync("autofix-verdict.txt", "ALREADY_FIXED", "utf8");
} else if (verdict === "NEEDS_FIX") {
  writeFileSync("autofix-verdict.txt", "NEEDS_FIX", "utf8");
  console.log("NEEDS_FIX verdict: this first version stops here and reports the analysis for founder review, rather than auto-writing a diff. Auto-writing + applying a diff unattended is a larger trust step than this iteration takes.");
} else {
  console.error("Could not parse a VERDICT from the model response. Failing closed.");
  process.exit(1);
}
