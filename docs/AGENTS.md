# AGENTS.md

## Stage 3 — Platform Safety Crews (built 2026-09-15)

Four tools, invoked on demand — not autonomous, not scheduled, per GOALS.md's
S3 boundary.

| Tool | Type | Doc | Status |
|---|---|---|---|
| `safety-gate-check` | `npm run safety-gate-check -- <job_id>` | [safety-gate-check.md](safety-gate-check.md) | Wraps live `eev2AuditJob`; blocked on `clasp run` Execution API permission (founder action) |
| `inconsistency-scan` | `npm run inconsistency-scan` | [inconsistency-scan.md](inconsistency-scan.md) | Wraps `eev2InconsistencyScan` (`apps-script/EEV2InconsistencyScan.gs`); function written, not yet pushed live |
| `xai-explain` | `npm run xai-explain -- <job_id> <finding_index>` | [xai-explain.md](xai-explain.md) | Wraps `eev2XaiExplain` (`apps-script/EEV2XaiExplain.gs`); function written, not yet pushed live |
| `bug-scout` | Ask Claude Code: "run bug-scout on \<anomaly\>" | [bug-scout.md](bug-scout.md) | Structured investigation procedure, not a script — root-causing is a reasoning task |

Not yet built: `data-analytics-weekly`, `synthetic-fixture-gen`,
`public-dataset-scout`, `research-brief` (Stage 7), `budget-snapshot`,
`dod-audit` (Stage 8), `phase2-daily-check` (Stage 6), `compliance-hunter`
(Track B, P1).
