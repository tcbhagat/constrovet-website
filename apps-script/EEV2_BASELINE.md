# EEV2 Development Baseline

## Selected baseline

Use `codex/constrovet-evidence-harness-v1` and PR #14 for further development.
Its Apps Script source comes from the newer `Constrovet Boardroom — EEV2 TEST`
export supplied on 29 August 2026.

The historical reference branch is `eev2-002-structured-schedule` at commit
`e6ce4bb4bc57cc6da1c9b76a2877a020af0f545a`.

## Selection evidence

- The TEST export contains newer live schedule attachment in initial submissions
  and correction reruns.
- Structured routing covers cost, delay and progress before legacy fallback.
- The verifier preserves unestablished cost exposure without converting it into
  recoverable leakage.
- The exported pipeline diagnostic is more defensive about missing modules,
  missing jobs and cross-file Apps Script constants.
- The historical branch supplied `EEV2RegressionRunner.gs`; it is retained here
  as an independent cost regression in addition to the routing regression.
- The resulting Evidence Harness executes ten deterministic suites with external
  Workspace and HTTP services blocked locally.

## Rejected carry-forwards

- The historical `.clasp.json` is not carried forward because it points to a
  different Apps Script project than the approved EEV2 TEST project. Deployment
  targeting must be configured locally and verified before any `clasp push`.
- The historical DEV integration note is superseded because it documents a
  cost-only hook, while the selected baseline uses structured cost, delay and
  progress routing plus live schedule attachment.

## Release boundary

This baseline is locally stable, not production-approved. Run
`eev2RunEvidenceHarnessV1()` in the approved Apps Script TEST project, then run
the GOOD/BAD/NORMAL PDF and email/audit smoke tests. Production deployment and
merging remain blocked until those results receive human approval.
