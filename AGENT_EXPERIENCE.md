---
name: agent-experience
description: Compact, governed experiential memory for reusable engineering lessons proven by real Constrovet incidents. Retrieve by trigger/mechanism; do not use this file as current-state authority.
status: canonical-memory
scope: Constrovet engineering
state_authority: false
---

# Agent experience — reusable verified lessons

This is **not a session diary**. `SESSION_LOG.md` preserves chronology. This file preserves only compact mechanisms that should change future agent behavior.

A card is eligible only when the underlying event is supported by a real artifact, real execution, git history, or another independently checked source. Hypotheses stay in the active work document until verified.

## Retrieval rule

Search this file by **trigger** before solving a recurring class of problem. Do not load the whole file by default once it grows. If a card conflicts with current source or `PROJECT_MILESTONES.md`, re-verify; the card records a lesson, not current state.

---

## EX-001 — Repo/live parity is a precondition, not an assumption

**Trigger:** work involving Apps Script live behavior, recovery, deployment, or a claim about what code is executing.

**Verified evidence:** the 2026-09-04 recovery incident showed that a candidate assembled from an incomplete live snapshot could remove companion functions when `clasp push` synchronized the full local Apps Script directory. Later work added explicit repo/live comparison and session-start checks.

**Mechanism:** the agent reasoned about a partial representation of the deploy unit while the deployment tool operated on the full representation.

**Rule:** before a live-bound Apps Script change, compare the complete deploy surface against a fresh live read. File existence alone is insufficient when function reachability matters. Any unexpected mismatch is a stop-and-report condition.

**Verification hook:** fresh `clasp pull`/equivalent read, complete file inventory, target function/call-path checks, and post-push checksum verification.

**Scope:** Apps Script deployment/recovery. Does not imply every web/static change needs a live Apps Script pull.

**Status:** ACTIVE.

---

## EX-002 — Production-shaped fixtures outrank convenient representations

**Trigger:** a regression test depends on OCR/extraction text shape, row/column boundaries, whitespace, encoding, or tool-produced formatting.

**Verified evidence:** the EEV2-009 row-boundary regression used a Drive-shaped fixture containing newline separators. Real Gemini extraction for the same document contained no newlines, so the newline guard passed the suite but was a no-op on the real Test A path. The fixture was later replaced with the literal real Gemini `quoted_span` from the failing job.

**Mechanism:** a transformed representation preserved semantic content but changed the structural signal the algorithm relied on.

**Rule:** when behavior depends on representation shape, the fixture must come from the same production path or be explicitly labelled synthetic with a justification that proves the transformed shape is irrelevant to the assertion.

**Verification hook:** fixture provenance check + comparison to a real extraction/job artifact.

**Scope:** extraction/OCR/citation tests and any parser sensitive to formatting.

**Status:** ACTIVE.

---

## EX-003 — A green or red CI job is not enough; independent checks must remain observable

**Trigger:** CI workflow changes, release-gate claims, or interpreting a failed workflow as evidence about all checks.

**Verified evidence:** before EEV2-015, `check:fixtures` ran first in a fail-fast job. When it failed, the harness and later test steps never ran, including during a window when validation-layer changes merged. The workflow was changed so independent checks run and report independently while the overall job still fails when any required check fails.

**Mechanism:** control-flow coupling converted “first check failed” into “later checks were never observed,” while the job-level signal obscured that distinction.

**Rule:** independent safety checks must be independently observable. One failure may block release, but it must not erase evidence about unrelated gates unless there is a deliberate dependency.

**Verification hook:** inject/reproduce one known failing check and confirm the other independent checks still execute and report.

**Scope:** CI/release gates and multi-check verification scripts.

**Status:** ACTIVE.

---

## EX-004 — Deployment proof and correctness proof are different evidence classes

**Trigger:** a fix has been merged/deployed and someone proposes marking the underlying milestone DONE.

**Verified evidence:** M3 was previously marked DONE after checksum verification, then reopened when a real Test A submission showed the deployed code did not close the actual defect. The checksum was correct; the inference from checksum to behavior was not.

**Mechanism:** evidence valid for one state transition (`MERGED`/`DEPLOYED`) was incorrectly reused to assert a stronger transition (`VERIFIED`/`DONE`).

**Rule:** every milestone transition must use evidence appropriate to that transition. Checksums prove byte identity, not behavioral correctness. Tests prove only the behavior and representation they actually exercise. Real acceptance artifacts remain mandatory where the contract names them.

**Verification hook:** use the explicit lifecycle in `SYSTEM_INDEX.md` and the acceptance criteria in `PROJECT_MILESTONES.md`.

**Scope:** all milestones and release decisions.

**Status:** ACTIVE.

---

## EX-005 — Product/surface selection precedes search

**Trigger:** a repository search returns files from Claim Companion, retired demos, recovery copies, or legacy infrastructure while the task concerns Constrovet.

**Verified evidence:** the repository contains multiple products plus historical recovery copies and legacy GCP files; `REPO_MAP.md` was added because overlapping names and workflows repeatedly caused wrong-surface reasoning.

**Mechanism:** repository-wide lexical search has no understanding of product ownership or authority.

**Rule:** select product and active source surface from `REPO_MAP.md` before using search hits as evidence. A matching function name in `recovery-v11/` or another product is not evidence about the active Constrovet path.

**Verification hook:** confirm the file path belongs to the selected product and active deploy surface before citing it in a diagnosis.

**Scope:** repository navigation and code search.

**Status:** ACTIVE.

---

## Experience-card template

```markdown
## EX-NNN — Short mechanism name

**Trigger:** when should an agent retrieve this card?
**Verified evidence:** exact real artifact/event proving the lesson.
**Mechanism:** one generalized causal sentence.
**Rule:** the smallest reusable behavior change.
**Verification hook:** deterministic or real-world check that enforces the rule.
**Scope:** where the rule applies and where it does not.
**Supersedes:** card/rule if any.
**Status:** ACTIVE | SUPERSEDED | RETIRED.
```

## Promotion and retirement

Promote a card into an executable test when possible. Promote into `AGENTS.md` only if it is a broad, repeatedly relevant operating rule. Promote into `CONTRACTS.md` only if it becomes a formal safety/launch invariant and the founder separately approves the wording. Mark a card `SUPERSEDED` when a structural control makes the old lesson obsolete; keep the card for auditability rather than deleting history.