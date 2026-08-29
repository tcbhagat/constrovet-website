// EEV2-001G regression — safe to run manually in Apps Script TEST project.

function eev2RunExecutiveExposureRegression() {
  const findings = [
    {
      statement: "Monthly actual is below monthly budget by INR 6,26,862.",
      financial_category: "BASELINE_BUDGET",
      amount_inr: 0,
      exposure_amount_inr: 0,
      days: 0,
      citations: [{ file: "M08_CostEstimate_NORMAL.pdf", page_or_sheet: "Workspace OCR", quoted_span: "Monthly Budget Rs. 43,333,333 Monthly Actual Rs. 42,706,471" }],
      calculation: { budget: 43333333, actual: 42706471, difference: -626862, formula: "Actual - Budget" },
      confidence: "HIGH",
      eev2_semantic_classification: "COST_VARIANCE_FAVOURABLE",
      recoverability_guardrail: "NOT_APPLICABLE"
    },
    {
      statement: "Cumulative actual exceeds cumulative budget by INR 54,98,134. This is cost exposure, not confirmed recoverable leakage.",
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 0,
      exposure_amount_inr: 5498134,
      days: 0,
      citations: [{ file: "M08_CostEstimate_NORMAL.pdf", page_or_sheet: "Workspace OCR", quoted_span: "Cumul. Budget Rs. 346,666,667 Cumul. Actual Rs. 352,164,801" }],
      calculation: { budget: 346666667, actual: 352164801, difference: 5498134, formula: "Actual - Budget" },
      confidence: "HIGH",
      eev2_semantic_classification: "COST_EXPOSURE",
      recoverability_guardrail: "NOT_ESTABLISHED",
      actionability: ACTION_EVIDENCE_FOLLOWUP,
      recoverability: "UNKNOWN"
    },
    {
      statement: "Revised forecast at completion exceeds original budget by INR 82,47,202. This is forecast exposure, not confirmed recoverable leakage.",
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 0,
      exposure_amount_inr: 8247202,
      days: 0,
      citations: [{ file: "M08_CostEstimate_NORMAL.pdf", page_or_sheet: "Workspace OCR", quoted_span: "Revised FAC (Cost) Rs. 528,247,202 Original Budget Rs. 520,000,000" }],
      calculation: { budget: 520000000, actual: 528247202, difference: 8247202, formula: "Actual - Budget" },
      confidence: "HIGH",
      eev2_semantic_classification: "FORECAST_OVERRUN",
      recoverability_guardrail: "NOT_ESTABLISHED",
      actionability: ACTION_EVIDENCE_FOLLOWUP,
      recoverability: "UNKNOWN"
    }
  ];

  const summary = eev2BuildExecutiveExposureSummary(findings);
  const headline = eev2ExecutiveExposureHeadline(findings);
  const action = eev2BuildExposureValidationAction(findings);
  const text = eev2ExposureTextLines(findings).join("\n");

  const checks = [
    ["confirmed_recoverable_leakage_zero", summary.confirmed_recoverable_leakage_inr === 0],
    ["cumulative_exposure_exact", summary.cumulative_adverse_variance_inr === 5498134],
    ["fac_exposure_exact", summary.fac_forecast_exposure_inr === 8247202],
    ["recoverability_not_established", summary.recoverability === "NOT_ESTABLISHED"],
    ["non_additive_warning_present", /do not sum/i.test(summary.non_additive_warning || "")],
    ["headline_mentions_cumulative", /54,98,134/.test(headline)],
    ["headline_mentions_fac", /82,47,202/.test(headline)],
    ["headline_keeps_recoverable_zero", /recoverable leakage: INR 0/i.test(headline)],
    ["validation_action_present", action && action.title === "Validate quantified cost exposure"],
    ["validation_action_followup_only", action && action.actionability === ACTION_EVIDENCE_FOLLOWUP],
    ["text_keeps_exposures_separate", /Cumulative adverse cost variance/.test(text) && /FAC forecast exposure/.test(text)]
  ];

  const result = {
    ticket: "EEV2-001G",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    summary,
    headline,
    action,
    rendered_text: text
  };

  console.log("EEV2-001G EXECUTIVE EXPOSURE REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2-001G regression FAILED. See execution log.");
  console.log("EEV2-001G REGRESSION PASS: ok=true");
  return result;
}
