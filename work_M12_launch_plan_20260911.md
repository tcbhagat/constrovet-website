---
name: m12-launch-plan-20260911
description: Pre-onboarding technical checklist and open decisions for M12 (first real pilot client), now that M10/M13/M15 are all closed. Business/outreach work (who the client is, contract terms) is explicitly out of scope here -- that is the founder's own work, not something this document plans.
status: proposal
scope: M12 pre-onboarding technical readiness
---

# M12 — pre-onboarding checklist

## What's already true (verified, not assumed)

- **M10 DONE** — 3 of 3 consecutive real clean Test A/B cycles, 2026-09-11.
- **M13 DONE** — real production endpoint cap confirmed refusing correctly, real
  deployment staleness (2 months, predating EEV2-012–017) found and fixed.
- **M15 DONE** — send-gate choke point live and exercised for real.
- **M8/M9 accepted-open** — no fixture exists for large/dense docs or scanned/image
  PDFs; founder decision 2026-09-10 already accepts this as disclosed risk, not a
  blocker. Scanned/image PDFs declared out of scope for v1.

This is the first time all of M10/M13/M15 have been simultaneously true. Contract 4's
literal gate (3 clean cycles, live endpoint verified) is satisfied.

## Open technical items before a real client should be invited

1. **`GLOBAL_DAILY_JOB_LIMIT`** — **DONE, set to `10`** (founder action, confirmed via
   Script Properties screenshot, 2026-09-11). Reasoning: below the code's own built-in
   default (`25`), generous enough for one real client to genuinely exercise the tool
   multiple times a day without feeling throttled, bounded enough to keep worst-case
   cost/abuse exposure on the anonymous endpoint small and easy to sanity-check against
   the founder's own ~2 hrs/week review cadence. Note: today's real counter
   (`global_jobs:20260911`) was already at `9` from testing at the time the cap was
   raised, so only 1 more submission was possible that same day — resets fresh on the
   next UTC day, not a lasting issue.
2. **`GEMINI_VERIFIER_DAILY_LIMIT`** (separate cap, paid `gemini-2.5-pro` calls
   specifically) — **not set**, confirmed absent from Script Properties, so it falls
   back to the code's default of `25`. Currently harmless: `ENABLE_BOARDROOM_DEEP_ANALYSIS`
   is `false`, so this path isn't reachable. If Deep Analysis mode is enabled for the
   pilot, set this explicitly to `10` first, matching the job cap. Not yet set —
   founder action, only needed if/when Deep Analysis is enabled.
3. **Contract 5's weekly canary has no automation.** It is a fully manual practice
   today (resubmit the known-bad Procurement_* set weekly, pinned to an internal
   address). Worth deciding now, before go-live, not after a gap is discovered the
   hard way: either (a) accept it as a manual weekly founder task and set a real
   recurring reminder outside this codebase, or (b) build a scheduled trigger that
   runs it automatically (still gated to an internal address, per Contract 5's
   mandatory mitigation — the canary itself must never be able to deliver to a real
   client). Not decided — founder call.
4. **CONTRACTS.md's Contract 4 text is now stale**, still reading "0 of 3" and "web
   app deployment is archived" — both are false as of 2026-09-11 (3/3 achieved,
   deployment live and verified). This is the same class of wording-change CONTRACTS.md
   has required separate founder approval for all session. Proposed correction below,
   not applied.
5. **The other deployment accidentally bumped to `@14`** during M13's troubleshooting
   (unnamed, not referenced by the real website) was left as-is — harmless but unused.
   Not a blocker; noted for completeness.
6. **`EEV2_ENVIRONMENT: TEST`** (visible in Script Properties) — checked directly: only
   read by `eev2RunControlledTestReleaseGate()` (`EEV2ControlledTestReleaseGate.gs`),
   a separate diagnostic function whose own header comment says it "never sends
   email." No effect on `doPost`, `handleBoardroomFormSubmit`, or any real
   client-facing path. **Confirmed not a blocker** — no action needed.

## Proposed CONTRACTS.md correction (not applied — needs founder approval)

**Current (Contract 4 section):**
> **Founder decision 2026-09-10 — "multiple consecutive" is fixed at 3.** This contract is
> held exactly as written; it was explicitly not relaxed for a friendly or trusted first
> client. Two real Test A attempts have failed to date, so the count stands at **0 of 3**
> and restarts under the currently deployed code.
>
> ...
>
> **Also required before the gate can even begin:** the web app deployment is archived as
> of 2026-09-10 pending EEV2-014 verification (see M13). Test A cannot run against an
> un-published endpoint, so republication and a confirmed cap-refusal precede the first of
> the 3 runs.

**Proposed:**
> **Founder decision 2026-09-10 — "multiple consecutive" is fixed at 3.** This contract is
> held exactly as written; it was explicitly not relaxed for a friendly or trusted first
> client. **Satisfied 2026-09-11 — 3 of 3 consecutive clean real cycles achieved, all
> independently verified against Drive artifacts.** See `PROJECT_MILESTONES.md` M10 for
> the full evidence trail (two earlier real attempts in 2026-09-09 had each failed for a
> reason since fixed, and do not count toward the 3).
>
> ...
>
> **Also required before the gate could begin — met 2026-09-11:** the web app deployment
> was archived pending EEV2-014 verification (see M13); republished, and a real POST past
> the cap observed refusing correctly with no Drive folder created. See M13 for the full
> evidence, including a real 2-month-stale-deployment finding surfaced and fixed in the
> same pass.

## What this document deliberately does not plan

Identifying, pitching, or contracting with a real first client is founder work, not
something this checklist attempts to script. This document only covers the technical
readiness gaps that should be closed *before* that client is invited in, so the first
real submission isn't also the first time these open items get discovered.
