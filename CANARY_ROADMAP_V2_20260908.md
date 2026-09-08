---
name: canary-roadmap-v2-20260908
description: Constrovet production canary roadmap, redefined 2026-09-08. Supersedes the original 7-week traffic-percentage roadmap (Phase 2 "shadow 10%", Phase 3 "ramp to 100%") — that framing assumed existing live client traffic to split, which does not exist (zero real clients on the platform as of this doc). Phases below are redefined around real test coverage and launch-gate discipline instead. Read this before referencing "Phase 2/3/4" in any future session.
---

# Constrovet — Canary Roadmap v2 (redefined 2026-09-08)

## Why this replaces the original roadmap
The original roadmap (Sep 8 → Oct 17, 7 weeks) used SRE-style phase names —
"shadow mode at 10% traffic," "ramp to 100%" — borrowed from deployments with
existing live traffic to gradually shift onto a new code path. Checked
directly against the repo on 2026-09-08: no traffic-split, feature-flag
percentage, sampling, or percentage-based routing mechanism exists anywhere
in `apps-script/`. Only plain on/off `PropertiesService` toggles
(`ENABLE_GEMINI_RELEVANCE_GATE`, `ENABLE_BOARDROOM_DEEP_ANALYSIS`,
`GATE_HEALTH_PROPERTY`) and non-routing `Math.random()` uses (retry jitter,
token generation) were found. More fundamentally: **there is no live client
traffic to take 10% of** — the platform has zero real clients as of this
doc (per `validation-layer-audit-20260902.md`, all prior submissions were
the founder's own test uploads). Building a traffic-split mechanism to
solve a population that doesn't exist yet would be solving the wrong
problem.

Founder decision (2026-09-08): redefine the remaining phases around real
test coverage and launch-gate discipline, not traffic percentage, until a
first real client exists.

## Phase 1 — Validation layer against synthetic fixtures (status: prior work, largely complete)
Validation layer verified against synthetic CSV test fixtures in
`/assets/test-data/boardroom-professional-actions-*.csv` (delay-only,
budget-actual-overrun, incomplete-evidence). Most recent regression: 14/14
suites passing per prior session record.

## Phase 2 (redefined) — Real-document coverage gaps
Work through the known, already-identified gaps in `production-status.md`,
in priority order, each against a real document — not synthetic data:

1. **A large/dense real document.** Evidence-matching caps at the first 40
   matching passages found; a real EOT document already hit 98 matches with
   only 40 surviving — untested at larger scale.
2. **A real scanned/image PDF.** Everything tested so far has had a clean
   text layer; OCR quality on an actual scanned document is unproven.
3. **A real document with a genuine large dollar cost overrun.** Every real
   document tested this cycle landed on ₹0 quantified leakage — the
   dollar-aggregation math is still unproven against real non-zero numbers.

**Not verified as of this doc:** whether real fixtures for gaps #1 and #2
already exist anywhere in the Drive test-data folders — next single test is
to check before assuming either needs to be sourced fresh.

## Phase 3 (redefined) — Volume, consistency, and the launch gate
- Deduplicating near-identical repeated findings from one document (noisy,
  not incorrect — lower priority).
- Batch volume, currency symbol variety, cross-document consistency,
  concurrent submissions (lowest priority).
- **The actual launch gate, already on record and not yet satisfied:** per
  `validation-layer-audit-20260902.md`, Test A (9-file Procurement_* set,
  MUST BLOCK) and Test B (`boardroom-professional-actions-delay-only.csv`,
  MUST PASS) must both run cleanly **several consecutive times**, not once
  — "once could be luck." This is the specific condition that unblocks
  parked PR #17 and the parked CHECK 5e/EEV2-004 open item (both now
  resolved as of 2026-09-08 — see memory update — but the consecutive-pass
  discipline itself still applies to any future change touching the
  validation gate).

## Phase 4 (mostly unchanged) — Graduation
- Once Phase 2–3 gaps are closed, or explicitly accepted as open-on-purpose
  with the founder's sign-off, onboard **one real pilot client**.
- Manual human review of the pilot's first few reports as a second safety
  net, even after the gate passes — already the validation audit's own
  recommendation.
- Cleanup: retire test artifacts; update `production-status.md` and any
  stale EEV2-00x docs to reflect what's actually live (EEV2-004 ownership
  fix and CHECK 5e were confirmed live via checksum on 2026-09-08 — the
  docs claiming otherwise were stale by that point).

## Next single test
Ask whether real fixtures for Phase 2 gap #1 (large/dense document, 40+
evidence matches) or gap #2 (scanned/image PDF) already exist in the Drive
test-data folders. Do not simulate either — if neither exists, say so
plainly and treat sourcing one as the actual next task.
