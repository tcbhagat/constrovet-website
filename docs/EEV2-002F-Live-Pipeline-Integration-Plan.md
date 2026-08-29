# EEV2-002F — Full Regression Gate and TEST-Only Live-Pipeline Integration Plan

## Objective
Integrate structured delay, EOT, progress, reconciliation and executive schedule reporting into the existing Constrovet Boardroom pipeline without regressing EEV2-001 cost extraction or EEV2-001G exposure reporting.

## Current protected behavior
The current `extractBoardroomFindings()` routes EEV2 structured COST_ESTIMATE results before the legacy keyword extractor. This behavior must remain unchanged for cost documents.

## Preconditions — mandatory stop/go gate
Run `eev2RunFullRegressionGate()` in the Apps Script TEST project.

Proceed only if the final log line is:

`EEV2-002F FULL REGRESSION GATE PASS: ok=true`

Any missing suite, exception, or failed check is a STOP condition. Do not modify `Code.gs`, submit the Form, deploy, or merge while the gate is failing.

## Integration strategy
Use additive document routing at the beginning of `extractBoardroomFindings()`.

Order:
1. Existing structured cost extractor.
2. Structured delay extractor.
3. Structured progress extractor.
4. Legacy extractor fallback.

EOT evidence should be derived from recognized delay-analysis text and retained as structured metadata for reconciliation/reporting. It must not independently create cost or entitlement findings.

## Target routing behavior
Conceptual target only; apply after the full regression gate passes:

```javascript
function extractBoardroomFindings(file, pageOrSheet, text, page) {
  const findings = [];

  const cost = eev2ExtractStructuredFindings(file, pageOrSheet, text);
  if (cost && cost.document_type === "COST_ESTIMATE") {
    findings.push(...(cost.findings || []));
    return findings;
  }

  const delay = eev2ExtractStructuredDelayFindings(file, pageOrSheet, text);
  if (delay && delay.document_type === "DELAY_ANALYSIS") {
    findings.push(...(delay.findings || []));
    return findings;
  }

  const progress = eev2ExtractStructuredProgressFindings(file, pageOrSheet, text);
  if (progress && progress.document_type === "PROGRESS_REPORT") {
    findings.push(...(progress.findings || []));
    return findings;
  }

  // Existing legacy fallback continues unchanged below.
```

Do not replace the remainder of the working function.

## Structured metadata preservation
Findings alone are insufficient for the executive schedule layer. During TEST integration, preserve these document-level objects where the report assembly can access them:

- `delay_evidence`
- `eot_evidence`
- `progress_evidence`
- `cross_document_reconciliation`
- `executive_schedule_summary`

Do not infer them back from prose findings if the structured object is available.

## Required schedule semantics
- `32` means observed monthly delay-event days, not project critical-path delay.
- Contractor non-excusable = 11 days.
- Client = 7 days.
- Neutral/external = 14 days.
- Critical-path impact = `NOT_ESTABLISHED`.
- Concurrency = `NOT_ESTABLISHED`.
- Float impact = `NOT_ESTABLISHED`.
- EOT entitlement = `NOT_ESTABLISHED` pending contract/schedule review.
- Progress planned = 66.7%.
- Progress actual = 64.3%.
- Source variance = -2.3 percentage points.
- Recalculated variance = -2.4 percentage points.
- Preserve the source/recalculated rounding difference.

## Required cost semantics — must not regress
- Monthly favorable variance remains non-recoverable context.
- Cumulative adverse variance remains exposure INR 54,98,134 with `amount_inr = 0` and recoverability `NOT_ESTABLISHED`.
- FAC forecast exposure remains INR 82,47,202 with `amount_inr = 0` and recoverability `NOT_ESTABLISHED`.
- Confirmed recoverable leakage remains INR 0 unless separate evidence establishes recoverability.
- Never sum cumulative adverse variance and FAC forecast exposure.

## Cross-document guardrails
Allowed conclusion:

> Quantified cost exposure, progress slippage and observed delay events coexist in the reporting evidence. Their causal relationship is not established.

Prohibited conclusions include:
- “Project delayed by 32 days.”
- “The 32 delay days caused the FAC exposure.”
- “Client delay is compensable” without contract/schedule evidence.
- “The cost exposure is recoverable leakage” without causation and contractual evidence.

## TEST integration stages
### Stage 1 — routing only
Patch only the top of `extractBoardroomFindings()` with delay/progress routing. Re-run the full regression gate before any Form submission.

### Stage 2 — real OCR diagnostic
Use the known three PDFs in TEST. Confirm:
- cost: 3 raw / 3 verified findings remain intact;
- delay: structured observed-days finding stores `days = 32`;
- progress: structured progress finding preserves 66.7 / 64.3 / -2.3 / -2.4;
- no duplicate legacy delay/progress findings from the same recognized documents.

### Stage 3 — reconciliation assembly
Build `eev2BuildCrossDocumentReconciliation()` from the structured cost findings plus delay/progress/EOT evidence. Confirm all causal and entitlement statuses remain `NOT_ESTABLISHED`.

### Stage 4 — executive report rendering
Insert `eev2BuildExecutiveScheduleSummary`, text, and HTML rendering into the TEST report/email. Keep cost exposure and schedule position as separate blocks.

### Stage 5 — three-PDF acceptance
Submit one controlled TEST Form job with the three known PDFs. Review browser report, final report, email, audit output and trigger count.

## Acceptance gate before merge/deploy
All must be true:
- Full regression gate PASS.
- Cost 3/3 verifier behavior preserved.
- Delay shows 32 cited days as observed event days.
- Responsibility split is 11 / 7 / 14.
- Progress shows both -2.3 source and -2.4 recalculated variance.
- EOT inconsistency is flagged, not silently corrected.
- Critical-path impact remains NOT_ESTABLISHED.
- Cross-document causation remains NOT_ESTABLISHED.
- Confirmed recoverable leakage remains INR 0.
- Cumulative and FAC exposures remain separate and are not summed.
- One Form submission produces one expected email/report path.
- No duplicate trigger is introduced.

## Deployment boundary
This ticket authorizes TEST integration only after the full regression gate passes. It does not authorize production deployment, PR merge, trigger changes, Gemini enablement, or paid services.
