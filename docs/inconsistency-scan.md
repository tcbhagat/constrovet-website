# inconsistency-scan

Stage 3 Platform Safety Crew. Read-only scan of the real
`ConstroVet-Validation-Errors` sheet across every logged job (not one job at
a time) for recurring anomaly patterns. Safe to run any time without founder
approval.

## When to invoke

Periodically, or any time you suspect a systemic (not one-off) issue —
e.g. the same figure repeatedly flagged, or one document type failing at an
unusually high rate.

## Usage

```
node scripts/inconsistency-scan.mjs
npm run inconsistency-scan
```

## What it outputs

Four finding categories, all built from warning/error codes the live
pipeline already emits (nothing invented):
- `recurring_multi_amount_citation` — an amount flagged `MULTI_AMOUNT_CITATION`
  across more than one distinct job.
- `recurring_unverified_or_count_amount` — an amount flagged
  `UNVERIFIED_AMOUNT`/`COUNT_READ_AS_AMOUNT` across more than one job.
- `possible_truncation_present` — any row whose warnings include
  `POSSIBLE_TRUNCATION`.
- `template_high_hold_rate` — a `source_document_template` whose
  `REVERTED_NOT_SENT` rate is at least double the sheet-wide rate (with a
  minimum sample of 2 held jobs, so one sample can't trigger it).

Exit code 0 = zero findings. Exit code 1 = one or more findings (not itself a
failure — read the detail). Exit code 2 = scan could not complete.

## Known limitation

Same `clasp run` / Execution API permission dependency as safety-gate-check
— see that doc. The underlying function, `eev2InconsistencyScan`
(`apps-script/EEV2InconsistencyScan.gs`), is written and syntax-checked but
not yet pushed live (pending a founder `clasp push`).

## Validation performed (Stage 3, 2026-09-15)

The live-run test correctly reported `FOUNDER_ACTION_REQUIRED` (function not
yet live). Separately, the scan logic itself was dry-run in plain Node
against a real 17-row subset of the actual validation-errors sheet (read
directly via Drive this session) to validate correctness before push. It
correctly surfaced the two real, previously-known recurring anomalies: INR
3,670.55 across 6 distinct jobs (the EEV2-009 label-bleed pattern) and INR
454.16 across 3 jobs — both matching incidents already documented in
`SESSION_LOG.md` independently of this tool, confirming the detection logic
works before it goes live.
