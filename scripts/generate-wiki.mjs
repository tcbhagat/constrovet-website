#!/usr/bin/env node

/**
 * Generate wiki content from constrovet-website repo source documents.
 *
 * This script reads governance docs (REPO_MAP.md, CONTRACTS.md, etc.) and
 * generates the corresponding wiki files in the llm-wiki repo.
 *
 * Usage:
 *   node scripts/generate-wiki.mjs [--wiki-path /path/to/wiki] [--dry-run]
 *
 * Environment:
 *   WIKI_REPO_PATH - path to tcbhagat/-llm-wiki-constrovet (default: ../llm-wiki relative to this script)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

// Parse CLI args
let wikiPath = process.env.WIKI_REPO_PATH;
let dryRun = false;

process.argv.slice(2).forEach((arg) => {
  if (arg === "--dry-run") dryRun = true;
  if (arg.startsWith("--wiki-path=")) wikiPath = arg.split("=")[1];
  if (arg.startsWith("--wiki-path")) {
    const idx = process.argv.indexOf(arg);
    wikiPath = process.argv[idx + 1];
  }
});

// Default: assume wiki is a sibling directory
if (!wikiPath) {
  wikiPath = join(repoRoot, "..", "llm-wiki");
  if (!existsSync(wikiPath)) {
    wikiPath = join(repoRoot, "..", "-llm-wiki-constrovet");
  }
}

const read = (path) => readFileSync(join(repoRoot, path), "utf8");
const readWiki = (path) => {
  const fullPath = join(wikiPath, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : null;
};

const write = (path, content) => {
  const fullPath = join(wikiPath, path);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  console.log(`${dryRun ? "[DRY RUN] Would write" : "Wrote"}: ${path}`);
};

console.log(`\n📚 Generating wiki from ${repoRoot}`);
console.log(`📁 Wiki output: ${wikiPath}\n`);

// === REPO MAP ===
console.log("→ Generating 00-repo-map.md");
const repoMapSource = read("REPO_MAP.md");
const repoMapContent = `---
name: repo-map
description: Constrovet construction evidence product. Hosted via GitHub Pages, backed by Apps Script.
---

# Repo Map — Constrovet

${repoMapSource
  .split("\n")
  .slice(6) // Skip frontmatter
  .join("\n")
  .replace(
    /^# Repo map — .*$/m,
    ""
  )
  .trim()}

---

**Last synced:** ${new Date().toISOString().split("T")[0]}
Source: constrovet-website/REPO_MAP.md
`;

if (!dryRun) write("00-repo-map.md", repoMapContent);

// === OPERATING RULES ===
console.log("→ Generating 01-operating-rules.md");
const agentsSource = read("AGENTS.md");
const operatingRulesContent = `---
name: operating-rules
description: Prime directive, guardrails, delegation boundaries, founder-only actions, founder-terminal-handoff protocol.
---

# Operating Rules

**Source:** constrovet-website/AGENTS.md

${agentsSource
  .split("\n")
  .slice(1)
  .join("\n")
  .trim()}

---

**Last synced:** ${new Date().toISOString().split("T")[0]}
`;

if (!dryRun) write("01-operating-rules.md", operatingRulesContent);

// === CONTRACTS ===
console.log("→ Generating 02-contracts.md");
const contractsSource = read("CONTRACTS.md");
const contractsContent = `---
name: contracts
description: Five formal contracts that define what "the validation gate works" actually means, current status, known gaps.
---

# Contracts — Gate Correctness Definition

**Source:** constrovet-website/CONTRACTS.md

${contractsSource
  .split("\n")
  .slice(1)
  .join("\n")
  .trim()}

---

**Last synced:** ${new Date().toISOString().split("T")[0]}
`;

if (!dryRun) write("02-contracts.md", contractsContent);

// === MILESTONES ===
console.log("→ Generating 03-milestones.md");
const milestonesSource = read("PROJECT_MILESTONES.md");
const milestonesContent = `---
name: milestones
description: Current project state (M1–M15+), deployed vs. main checksum, drift flags.
---

# Project Milestones

**Source:** constrovet-website/PROJECT_MILESTONES.md (established 2026-09-08 as the single source of truth)

This page is a pointer to the live source document. For detailed information on each milestone, see the source file.

${milestonesSource
  .split("\n")
  .slice(1, 100) // First ~100 lines of context
  .join("\n")
  .trim()}

[Read full milestone details in constrovet-website/PROJECT_MILESTONES.md](https://github.com/tcbhagat/constrovet-website/blob/main/PROJECT_MILESTONES.md)

---

**Last synced:** ${new Date().toISOString().split("T")[0]}
`;

if (!dryRun) write("03-milestones.md", milestonesContent);

// === GLOSSARY ===
console.log("→ Generating glossary.md (from existing wiki, preserving)");
const existingGlossary = readWiki("glossary.md");
if (existingGlossary && !dryRun) {
  write("glossary.md", existingGlossary);
}

// === STALE DOCS ===
console.log("→ Generating STALE.md (from existing wiki, preserving)");
const existingStale = readWiki("STALE.md");
if (existingStale && !dryRun) {
  write("STALE.md", existingStale);
}

// === INDEX ===
console.log("→ Generating INDEX.md");
const indexContent = `# Index — Constrovet LLM Wiki

**New session?** Read these in order. Stop after #1 if you're only touching website code. Stop after #3 if you're only touching validation logic. Read #4 if you're diagnosing a production issue or auditing what's actually live.

## Core Governance (Read Every Time)

1. **[Repo Map](00-repo-map.md)** — *Constrovet: single product, hosted via GitHub Pages, backed by Apps Script*
   - Single product structure (no more Claim Companion or ssm-core-demo)
   - Deploy paths: push to \`main\` for site, founder-only \`clasp push\` for backend
   - CI workflows and governance
   - 2-min read

2. **[Operating Rules](01-operating-rules.md)** — *Prime directive, guardrails, delegation boundaries*
   - Why "no fabricated figures reach the client" is the hard stop
   - What you can do autonomously vs. what needs founder approval
   - What only the founder can ever do
   - Founder-terminal-handoff protocol (when blocked, give copy-paste bash commands)
   - 3-min read

3. **[Contracts](02-contracts.md)** — *The 5 formal gate-correctness contracts + current status*
   - What "the validation gate works" actually means
   - Which contracts are met, which are unmet
   - Known gaps in the gate's design
   - 5-min read

4. **[Milestones](03-milestones.md)** — *Current project state + deployed vs. main*
   - Which milestones are DONE, in-progress, or blocked
   - Live/repo checksum match (proof of deployment, not proof of correctness)
   - Drift flags and their resolution
   - 5-min read

## If You Hit an Issue — Find the Incident

Browse the \`incidents/\` folder by date or topic. Each file is self-contained but links back to the full write-up in constrovet-website.

Examples:
- **[2026-09-02: Value Leakage Incident](incidents/2026-09-02-value-leakage-incident.md)** — The ₹12 rupee that wasn't caught
- **[2026-09-04: Version 12 Gate Wipe](incidents/2026-09-04-version12-gate-wipe.md)** — Entire validation layer vanished
- **[2026-09-13: Product Deletion](incidents/2026-09-13-claim-companion-ssm-core-demo-deletion.md)** — Claim Companion and ssm-core-demo removed
- **[EEV2-010: Currency Symbol Encoding](incidents/eev2-010-currency-symbol-encoding.md)** — Why "Rs. 123" became a parsing bug
- **[EEV2-011: Row Boundary Proposal](incidents/eev2-011-row-boundary-proposal.md)** — Merging table rows into fabricated findings
- **[EEV2-013: Missing Must-Block Gate](incidents/eev2-013-missing-must-block-gate.md)** — No whole-submission hold existed
- **[EEV2-015: CI Fail-Fast Masking](incidents/eev2-015-ci-fail-fast-masking.md)** — Tests passing locally but failing in CI, silently

## Reference

- **[Glossary](glossary.md)** — Recurring terms: boardroom form, Validation-Errors sheet, CHECK 5a/5b/5c, etc.
- **[Stale Docs](STALE.md)** — Which source docs in constrovet-website are outdated

## For New Sessions

Bookmark this page and the Repo Map. Those two are enough to understand the lay of the land. Everything else is either reference (Glossary) or incident-specific (the incidents/ folder).

---

**Disclaimer:** This wiki does not verify live state. To confirm something is actually running in production, you need to either (a) run the test that proves it, or (b) check constrovet-website/PROJECT_MILESTONES.md's "Deployed vs. main" block for the most recent verification date. See [Contracts](02-contracts.md) for what verification actually means in this project.

---

**Last synced:** ${new Date().toISOString().split("T")[0]}
`;

if (!dryRun) write("INDEX.md", indexContent);

console.log("\n✅ Wiki generation complete.\n");

if (dryRun) {
  console.log("(Dry run: no files were actually written. Remove --dry-run to commit changes.)\n");
}

// Summary
console.log("Generated files:");
console.log("  - 00-repo-map.md (from REPO_MAP.md)");
console.log("  - 01-operating-rules.md (from AGENTS.md)");
console.log("  - 02-contracts.md (from CONTRACTS.md)");
console.log("  - 03-milestones.md (from PROJECT_MILESTONES.md)");
console.log("  - INDEX.md (new, links all the above)\n");

console.log("Next steps:");
console.log("  1. cd /path/to/llm-wiki");
console.log("  2. git add -A && git commit -m 'Regenerate wiki from constrovet-website source'");
console.log("  3. git push origin main\n");
