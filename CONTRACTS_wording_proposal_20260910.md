---
name: contracts-wording-proposal-20260910
description: Proposed CONTRACTS.md wording correction for the stale 808-lines-ahead ground-truth warning. NOT applied to CONTRACTS.md — awaiting founder approval per AGENTS.md (D4). Delete this file once a decision is made and, if approved, folded into CONTRACTS.md directly.
status: proposal
scope: CONTRACTS.md wording only
---

# Proposed correction to CONTRACTS.md

Two places in `CONTRACTS.md` state the repo is 808 lines / 21 functions behind
live, dated 2026-09-03. That gap was closed when the validation layer merged
via PR #32 (2026-09-09), and confirmed matching again after today's EEV2-016
merge (`d8f55c4`, `main`'s `Code.gs` md5 `282d2e972aa29d20e63b939e1e2bb081` =
live, verified by fresh `clasp pull`, 2026-09-10). Leaving the warning as-is
tells every future agent to distrust git-based reasoning about this pipeline
for a gap that no longer exists.

Per this repo's own governance rule (`PROJECT_MILESTONES.md`'s "Deployed vs.
main" block, and `AGENT_SYSTEM_ARCHITECTURE.md`'s L1/L3 layers on the docs
branch): a checksum match proves deployment, not correctness. So this
proposal replaces a stale *deployment* claim with a corrected, dated
*deployment* claim — it does not claim the gate is behaviorally verified
beyond what `PROJECT_MILESTONES.md` already records.

## Change 1 — top-of-file ground-truth warning (lines 5-7)

**Current:**

> ## Ground-truth warning (read before trusting anything below)
>
> As of 2026-09-03, the **live** Apps Script project (Code.js, 5,876 lines) is
> 808 lines ahead of the **repo's** apps-script/Code.gs (5,068 lines) — 21
> functions, including the entire validation layer (`validateReportOutput`,
> `logValidationError`, `initValidationErrorLog`,
> `heldForValidationFailureDelivery_`, and 17 others) exist ONLY live and are
> invisible to anyone reading the repo. Any agent reasoning from the repo alone
> will reach wrong conclusions about whether a gate exists. Until the repo is
> synced (see Open Item 6), verify against a fresh clasp pull, not against git.

**Proposed:**

> ## Ground-truth warning (read before trusting anything below)
>
> **Historical note, resolved 2026-09-10.** As of 2026-09-03 the live Apps
> Script project was 808 lines / 21 functions ahead of the repo, including the
> entire validation layer. That gap closed when the validation layer merged
> via PR #32 (2026-09-09), and repo/live parity has been reconfirmed by fresh
> `clasp pull` checksum multiple times since, most recently 2026-09-10 after
> the EEV2-016 merge (`d8f55c4`) — see `PROJECT_MILESTONES.md`'s "Deployed vs.
> main" block for the current hash and verification date. **A checksum match
> proves deployment, not correctness** — do not read a MATCH as proof the gate
> behaves correctly on real jobs; that requires the real-artifact evidence this
> file's contracts below actually specify. If you find repo/live diverging
> again, treat that as the stop-and-report condition in `AGENTS.md`
> ("Immediately escalate"), not as a return to this historical gap.

## Change 2 — Open Item 6 (line 103)

**Current:**

> 6. **New — repo sync.** The repo is 808 lines / 21 functions behind the live
>    project (full inventory in SESSION_LOG.md, Addendum 2). Until reconciled,
>    treat git-based reasoning about this pipeline as unreliable. This blocks
>    AGENTS.md guardrail #4 (file disambiguation) from being satisfiable by
>    default — a fresh clasp pull is required before any code-reading session,
>    not a repo checkout.

**Proposed:**

> 6. **RESOLVED 2026-09-09/10 — repo sync.** The 808-line/21-function gap
>    (full inventory in SESSION_LOG.md, Addendum 2) closed when the validation
>    layer merged via PR #32, and repo/live parity has been independently
>    reconfirmed since, most recently after the EEV2-016 merge (`d8f55c4`,
>    2026-09-10). AGENTS.md guardrail #4 no longer needs a mandatory `clasp
>    pull` before every code-reading session as a blanket rule — but any
>    session making a live-behavior claim should still confirm current parity
>    against `PROJECT_MILESTONES.md`'s "Deployed vs. main" block first, since
>    that block is the single source of truth for whether this holds *right
>    now*, not a permanent guarantee.

## What this proposal deliberately does not change

- No other line in `CONTRACTS.md` — Contracts 1-5, the other diagnostic items,
  "Known gaps," and the reporting standard are untouched.
- Does not mark any milestone `DONE`, `VERIFIED`, or otherwise stronger than
  `PROJECT_MILESTONES.md` already records.
- Does not remove the historical record of the 2026-09-02/03 incident — both
  changes keep the original numbers and dates, only adding a resolution note.

## Verification

- `main`'s `apps-script/Code.gs` md5 = live md5 = `282d2e972aa29d20e63b939e1e2bb081`,
  confirmed by fresh `clasp pull` into a throwaway folder, 2026-09-10 (this
  session).
- PR #32 merge commit and date confirmed via `git log`.

## Founder decision needed

This file makes no change to `CONTRACTS.md` itself. If approved, the two
blocks above replace the corresponding text in `CONTRACTS.md` verbatim, this
proposal file is deleted, and the commit is added to the "autonomous, no
check-in needed" tier per `AGENTS.md` (docs-only, no `apps-script/` touched).
