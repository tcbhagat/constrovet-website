# EEV2-001 DEV Integration

Status: DEV ONLY — DO NOT DEPLOY TO PRODUCTION.

This branch adds `EEV2CostModule.gs` beside the existing `Code.gs`. Apps Script treats all `.gs` files in a project as one script project, so the module can be added as a second source file without replacing the working production source.

## Required DEV-only hook

In the copied DEV Apps Script project, add a new script file named `EEV2CostModule` and paste the contents of `EEV2CostModule.gs`.

Then, in the DEV copy of `Code.gs`, inside `extractBoardroomFindings(file, pageOrSheet, text, page)`, immediately after:

```javascript
const findings = [];
```

insert:

```javascript
const eev2 = eev2ExtractStructuredFindings(file, pageOrSheet, text);
if (eev2 && eev2.document_type === "COST_ESTIMATE") {
  findings.push(...(eev2.findings || []));
}
```

Do not delete the existing legacy extraction logic. This preserves delay/progress/ESG behavior while adding structured cost extraction in DEV.

## DEV regression first

Before submitting the Google Form, run `eev2SyntheticCostRegression()` manually in Apps Script. It must return `ok: true` and the following exact values:

- monthly budget: 43,333,333
- monthly actual: 42,706,471
- monthly variance: -626,862
- cumulative budget: 346,666,667
- cumulative actual: 352,164,801
- cumulative variance: +5,498,134
- original budget: 520,000,000
- revised FAC: 528,247,202
- FAC variance: +8,247,202

Then submit the same three synthetic PDFs through the copied TEST Form.

## Guardrails

- `ENABLE_BOARDROOM_DEEP_ANALYSIS=false`
- No Gemini required.
- No new paid services.
- Do not change the production Form or production Apps Script.
- Do not merge this branch until three-PDF regression and email/audit smoke tests pass.
- Cost variance/exposure is not confirmed recoverable leakage.
- Keep `Workspace OCR` as the citation label unless a reliable physical page number is available; never fabricate page numbers.
