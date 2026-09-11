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
3. **Contract 5's weekly canary — DONE, built and verified live 2026-09-11.** Founder
   chose (b): a scheduled trigger. `eev2RunWeeklyCanary()` (`Code.gs`, EEV2-018)
   resubmits the real 9-file Procurement_* set (copied to a dedicated, stable Drive
   folder, `EEV2-Canary-Fixtures`) through the actual pipeline every Monday 6am,
   consuming one `GLOBAL_DAILY_JOB_LIMIT` slot like a real submission, per the
   founder's own decision. Structurally cannot deliver to a real client: never calls
   `sendReportEmail`, only ever sends one internal alert to `admin@constrovet.com`
   via `MailApp.sendEmail` directly. **Real smoke test, 2026-09-11:** job
   `canary-20260911-162138` ran end-to-end, correctly found `isValid: false`
   (`NO_VERIFIED_EVIDENCE`, all 9 findings narrative-only), and the real `[Canary
   OK]` alert email was received exactly as designed. The weekly trigger itself is
   installed (`eev2InstallWeeklyCanaryTrigger()` run once by the founder).
4. **CONTRACTS.md's Contract 4 text — DONE, approved and applied 2026-09-11.** Both
   stale lines ("0 of 3," "web app deployment is archived") corrected to reflect the
   real, verified state.
5. **The other deployment accidentally bumped to `@14`** during M13's troubleshooting
   (unnamed, not referenced by the real website) was left as-is — harmless but unused.
   Not a blocker; noted for completeness.
6. **`EEV2_ENVIRONMENT: TEST`** (visible in Script Properties) — checked directly: only
   read by `eev2RunControlledTestReleaseGate()` (`EEV2ControlledTestReleaseGate.gs`),
   a separate diagnostic function whose own header comment says it "never sends
   email." No effect on `doPost`, `handleBoardroomFormSubmit`, or any real
   client-facing path. **Confirmed not a blocker** — no action needed.

## What this document deliberately does not plan

Identifying, pitching, or contracting with a real first client is founder work, not
something this checklist attempts to script. This document only covers the technical
readiness gaps that should be closed *before* that client is invited in, so the first
real submission isn't also the first time these open items get discovered.
