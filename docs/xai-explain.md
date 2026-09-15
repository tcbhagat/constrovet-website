# xai-explain

Stage 3 Platform Safety Crew. Given a job_id and a finding index, produces a
"why this figure" markdown explanation of that one finding — grounded only
in fields already present on it (statement, citation, calculation,
confidence). It is a rendering tool, not a second analysis pass: it never
adds or infers anything beyond what the report already contains.

## When to invoke

When a specific finding in a specific job needs a human-readable explanation
of its evidence — e.g. for manual review before a report is trusted, or to
answer "why does this say what it says."

## Usage

```
node scripts/xai-explain.mjs <job_id> <finding_index>
npm run xai-explain -- <job_id> <finding_index>
# optionally: --out <path> to also save the markdown to a file
```

## What it outputs

Markdown covering: statement, financial category, amount, days, confidence,
calculation (if present), citation file/location, and the quoted span
(display-truncated the same way the real report renders it, via
`boardroomDisplaySpan`). Exit code 0 = explanation produced; exit code 1 =
the live function ran but the job/finding wasn't found (bad job_id, index
out of range, etc.); exit code 2 = the call itself could not complete.

## Known limitation

Same `clasp run` / Execution API permission dependency as safety-gate-check.
The underlying function, `eev2XaiExplain` (`apps-script/EEV2XaiExplain.gs`),
is written and syntax-checked but not yet pushed live.

## Real test run (Stage 3, 2026-09-15)

`node scripts/xai-explain.mjs form-20260902-135120-81f4fd27 0` — correctly
detected the Execution API permission block and reported
`FOUNDER_ACTION_REQUIRED` (exit code 2), same as the other two live-function
wrappers.
