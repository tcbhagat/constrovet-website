---
name: auto-push-trust-plan-20260908
description: Deliberate, founder-approved plan to eventually automate `clasp push` after a 5-cycle trust-building track record. Supersedes nothing — the existing permanent rule ("no change reaches production without an explicit founder approve step") stays in force throughout Phase A and is only relaxed, consciously, at the start of Phase B. Read this before proposing, building, or enabling any auto-deploy mechanism.
---

# Auto-push trust plan — 2026-09-08

## One sentence
The founder's permanent manual-push rule stays fully in force until a real, logged
5-cycle track record proves the automated audit chain's predictions match reality —
only then does the founder make one conscious decision to enable auto-push, with a
circuit breaker that reverts to manual on the first bad signal, permanently available,
not a one-time safety net.

## Why this exists
The manual `clasp push` step was established after a real production incident — a
broken validation layer once shipped silently. Removing that step by default would
recreate the exact failure mode it was built to prevent. This plan is the founder's own
chosen middle ground: relieve the PM-style busywork (chasing CI, reading logs by hand)
without silently eroding the actual safety gate.

## Phase A — Trust-building (manual push continues, unchanged)
For every merge to `main`:
1. Claude Code runs the real regression gate via `clasp run eev2RunFullRegressionGate`
   (real Apps Script V8, not the Node sandbox) and the `eev2AuditJob(jobId)`
   four-artifact check (Contract 1: alert email, `VALIDATION_FAILED.json`, validation-
   errors sheet row, audit sheet `email_status`) against a real recent job.
2. Reports exactly one verdict: **SAFE TO PUSH** or **DO NOT PUSH**, with the raw check
   output attached, not a summary.
3. Founder pushes personally, as always — this phase changes nothing about who pushes,
   only who does the pre-push legwork.
4. After push, the actual outcome (clean or not) gets logged against the verdict that
   preceded it, in `AUTO_PUSH_TRUST_LOG.md` (new file, one row per cycle):
   `date | PR | verdict | actual outcome | match?`

**A cycle only counts toward the streak if the verdict and the actual outcome match.**
A false "SAFE TO PUSH" that later turns out wrong resets the count to zero — that's the
one signal this whole plan exists to catch before it's ever allowed to run unsupervised.

## Phase B — Activation (one deliberate decision, not a default)
Triggers only after **5 consecutive matching cycles**, logged in
`AUTO_PUSH_TRUST_LOG.md`, visible and reviewable before flipping anything.

Mechanics:
1. Founder stores the `clasp` OAuth credential (`.clasprc.json`) as a **GitHub Secret**
   himself, directly in GitHub's own vault — never pasted into any chat or session.
2. A GitHub Action is added: on merge to `main`, run the same two checks from Phase A;
   if both pass, run `clasp push` automatically.
3. Founder explicitly confirms activation — this is a conscious rule change he makes,
   not something enabled quietly on his behalf once the count hits 5.

## Permanent circuit breaker (applies forever after activation, not just once)
Any of the following immediately disables auto-push, reverts to manual `clasp push`,
and resets the trust count to zero — a fresh 5-cycle streak is required before
re-activating:
- Any red CI run.
- Any `DO NOT PUSH` audit verdict.
- Any post-push incident, however small, discovered after the fact.

## Not yet built / not verified
- `eev2AuditJob(jobId)` itself does not exist yet — this whole plan depends on it being
  written and proven first (separate, already-issued prompt).
- Whether the script is deployed as an API executable (required for `clasp run`) is
  unconfirmed as of this doc.
- `AUTO_PUSH_TRUST_LOG.md` does not exist yet — created at the start of Phase A's first
  real cycle, not before.

## Next single step
Do not start counting cycles yet. First: confirm `eev2AuditJob` works end-to-end
against one real job ID (already the standing next prompt). Phase A's cycle count
starts only once that foundation is proven, not before.
