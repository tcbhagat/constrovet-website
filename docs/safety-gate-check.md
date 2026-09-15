# safety-gate-check

Stage 3 Platform Safety Crew. Runs Contract 1's real, live 4-artifact audit
(`eev2AuditJob`, `apps-script/EEV2AuditJob.gs`) against a specific job_id, from
the terminal.

## When to invoke

After any real Test A/B submission, or any time a job's outcome (held vs.
sent) needs independent confirmation — per Contract 3's standing regression
habit ("confirmed by hand, not inferred from one green test run").

## Usage

```
node scripts/safety-gate-check.mjs <job_id>
npm run safety-gate-check -- <job_id>
```

## What it outputs

The real `eev2AuditJob` result: whether each of the 4 artifacts (no client
email sent, `[VALIDATION FAILED]` alert sent, `VALIDATION_FAILED.json`
exists, both sheet rows written) was confirmed for that job_id, plus the
overall verdict. Exit code 0 = all four confirmed (GATE_HELD); exit code 1 =
at least one not confirmed (which is the CORRECT, expected result for a
should-pass job — read the verdict text, not just the exit code); exit code
2 = the check itself could not complete.

## Known limitation

Runs via `clasp run`, which requires Execution API permission on the deployed
project. That permission has been observed broken since 2026-09-11
(`SESSION_LOG.md`) and was reconfirmed broken on 2026-09-15 while building
this tool. When blocked, the script prints `FOUNDER_ACTION_REQUIRED` with the
exact fallback (run `eev2AuditJob`/`eev2AuditJobDiagnosticRun` by hand in the
Apps Script editor) rather than a bare error.

## Real test run (Stage 3, 2026-09-15)

`node scripts/safety-gate-check.mjs form-20260905-053908-609f4190` — correctly
detected the Execution API permission block and reported
`FOUNDER_ACTION_REQUIRED` with real, actionable next steps (exit code 2).
