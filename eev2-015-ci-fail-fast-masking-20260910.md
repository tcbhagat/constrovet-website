---
name: eev2-015-ci-fail-fast-masking-20260910
description: EEV2-015 — eev2-harness-ci.yml is a single fail-fast job with check:fixtures as its first step, so one unrelated fixture violation silently skips the harness and both test suites. Confirmed against four consecutive red runs on main (580e779 → 0b2a8ff) where test:harness never executed. This is a CI observability defect, not a product bug: no wrong figure reached a client, but the gate that exists to catch wrong figures was not running and nobody could tell. Fix is `if: always()` on the independent steps.
---

# EEV2-015 — The evidence gate was masking its own regression suites — 2026-09-10

## One sentence
`eev2-harness-ci.yml` runs four independent checks as sequential steps in one
fail-fast job, so when `check:fixtures` (step 1) failed on a single known
fixture violation, the harness and both test suites were **skipped entirely**
for four consecutive commits on `main` — and the red X gave no indication that
the regression coverage had stopped running at all.

## How it was found
While opening PR #38 (EEV2-014, the endpoint spend cap), CI came back red.
Checking whether that red was caused by the PR or inherited turned up something
worse than either: the job had been red since `580e779` and the steps after the
failing one had never run.

## The evidence

```
success  ff07d3b  Merge PR #39 (fixture cleanup — first green since #34)
failure  0b2a8ff  Merge PR #38 (EEV2-014 spend cap)
failure  9c868df  Add MUST-BLOCK gate regression for EEV2-013
failure  c755c5f  Merge PR #36 (EEV2-012 OCR column-join veto)
failure  580e779  Merge PR #34 (introduced the fixture-provenance gate)
success  d051cca  Merge PR #32
```

Four commits — `580e779`, `c755c5f`, `9c868df`, `0b2a8ff` — during which
`npm run test:harness`, `tests/eev2-evidence-harness.test.mjs` and
`tests/check-fixture-provenance.test.mjs` did not execute in CI.

Note what shipped inside that window: **EEV2-012** (the OCR column-join veto,
`c755c5f`) and **EEV2-013** (the MUST-BLOCK gate, `9c868df`) — two changes to
the validation layer, both merged without CI ever running the regression
suites that cover them. Both were verified locally and are believed correct;
the point is that CI contributed nothing to that confidence and would not have
objected if they had been wrong.

## Root cause

```yaml
jobs:
  deterministic-evidence-gate:
    steps:
      - run: npm run check:fixtures      # fails here...
      - run: npm run test:harness        # ...and these three
      - run: node --test tests/eev2-evidence-harness.test.mjs
      - run: node --test tests/check-fixture-provenance.test.mjs
```

GitHub Actions steps are fail-fast by default. The four checks are mutually
independent — none consumes another's output — so nothing about the design
required this coupling. It was incidental, not intentional.

The failing violation was the deliberately-red Drive-shaped fixture at
`EEV2CitationTruncationRegression.gs:65`, left flagged on purpose (per
`fixture-provenance-pattern-20260909.md`) rather than silenced with a false
`KNOWN-SYNTHETIC` marker. That decision was right. The unintended consequence
was that a *known, accepted, unrelated* red disabled all other coverage.

## Severity

**Not a product defect.** No fabricated figure reached a client because of
this, and the local gate (`npm test`, `run-eev2-harness.mjs`) kept passing
throughout — the founder's own pre-merge runs were the thing actually holding
the line.

**A real trust defect.** The project's stated governance rule is that a
milestone moves to DONE only on independently verified evidence. CI is one of
the cheapest independent verifiers available, and for four commits it was
reporting on one narrow check while appearing to report on the whole gate.
That is the same failure shape as EEV2-009's false pass: a green (or in this
case, a merely-red) signal that did not mean what it appeared to mean.

## The fix (smallest that loses nothing)

Add `if: always()` to each independent step. Every check runs and reports on
every trigger; the job still fails if any of them fail.

Two alternatives were considered and rejected:

- **Split `check:fixtures` into its own non-blocking job.** Rejected: it
  weakens a gate that exists precisely because bad fixtures shipped
  EEV2-005/008/009/010 to production. The fixture gate must stay blocking.
- **Reorder so the harness runs first.** Rejected: it only relocates the
  problem. Whichever step ends up last is still masked by an earlier failure.

`if: always()` keeps every gate blocking, adds no jobs, and changes no
semantics other than "one failure no longer hides the others."

## Verification

Reproduced the masking locally by injecting a Drive-shaped fixture to force
`check:fixtures` to fail, then running both behaviours:

```
--- OLD fail-fast (set -e, sequential) ---
fixtures failed -> later steps SKIPPED (harness never ran)

--- NEW if:always() ---
check:fixtures  exit=1     <- still fails, job still fails
test:harness    exit=0     <- now actually runs and reports
harness test    exit=0
provenance test exit=0
```

The probe fixture was removed and `check:fixtures` confirmed clean afterwards.

## Follow-up worth considering (not done here)

The four checks currently overlap: `npm test` already runs both test files, and
`test:harness` and `eev2-evidence-harness.test.mjs` both exercise the harness.
Consolidating them is a separate, optional tidy-up — deliberately out of scope,
since this ticket is about masking, not redundancy.

Longer term, a required-status-check rule on `main` would have surfaced this on
day one by refusing the merge instead of letting four red commits through. That
is a founder decision about branch protection, not a code change.
