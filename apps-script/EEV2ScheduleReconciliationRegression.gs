// EEV2-002D regression — safe to run manually in Apps Script TEST project.

function eev2RunScheduleReconciliationRegression() {
  const findings = [
    {
      statement: "Monthly actual is below monthly budget by INR 6,26,862.",
      financial_category: "BASELINE_BUDGET",
      amount_inr: 0,
      exposure_amount_inr: 0,
      eev2_semantic_classification: "COST_VARIANCE_FAVOURABLE",
      recoverability_guardrail: "NOT_APPLICABLE"
    },
    {
      statement: "Cumulative actual exceeds cumulative budget by INR 54,98,134.",
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 0,
      exposure_amount_inr: 5498134,
      eev2_semantic_classification: "COST_EXPOSURE",
      recoverability_guardrail: "NOT_ESTABLISHED"
    },
    {
      statement: "Revised FAC exceeds original budget by INR 82,47,202.",
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 0,
      exposure_amount_inr: 8247202,
      eev2_semantic_classification: "FORECAST_OVERRUN",
      recoverability_guardrail: "NOT_ESTABLISHED"
    }
  ];

  const progressEvidence = {
    planned_progress_pct: 66.7,
    actual_progress_pct: 64.3,
    source_variance_pct_points: -2.3,
    recalculated_variance_pct_points: -2.4,
    variance_consistency: "ROUNDING_DIFFERENCE_REVIEW",
    critical_path_relation: "NOT_ESTABLISHED",
    causal_explanation_status: "NOT_ESTABLISHED"
  };

  const delayEvidence = {
    total_observed_delay_event_days: 32,
    responsibility_summary: {
      contractor_non_excusable_days: 11,
      client_days: 7,
      neutral_external_days: 14,
      unclassified_days: 0
    },
    critical_path_impact: "NOT_ESTABLISHED",
    concurrency_status: "NOT_ESTABLISHED",
    float_impact_status: "NOT_ESTABLISHED",
    entitlement_status: "REQUIRES_CONTRACT_AND_SCHEDULE_REVIEW"
  };

  const eotEvidence = {
    entitlement_conclusion: "NOT_ESTABLISHED",
    critical_path_entitlement: "NOT_ESTABLISHED",
    compensability_conclusion: "NOT_ESTABLISHED",
    eot_items: [
      {
        eot_reference: "EOT-01/2026",
        basis: "Monsoon / Force Majeure",
        days_claimed: 6,
        days_approved: 7,
        status: "UNDER_REVIEW",
        consistency_flags: [
          "APPROVED_DAYS_EXCEED_CLAIMED_DAYS",
          "APPROVED_DAYS_PRESENT_WHILE_STATUS_UNDER_REVIEW"
        ]
      },
      {
        eot_reference: "EOT-02/2026",
        basis: "Client-caused delay",
        days_claimed: 7,
        days_approved: null,
        status: "SUBMITTED",
        consistency_flags: []
      }
    ]
  };

  const result = eev2BuildCrossDocumentReconciliation({
    findings,
    progress_evidence: progressEvidence,
    delay_evidence: delayEvidence,
    eot_evidence: eotEvidence
  });

  const rendered = eev2CrossDocumentExecutiveLines(result).join("\n");

  const checks = [
    ["cumulative_cost_exact", result.cost_position.cumulative_adverse_variance_inr === 5498134],
    ["fac_cost_exact", result.cost_position.fac_forecast_exposure_inr === 8247202],
    ["recoverable_leakage_zero", result.cost_position.confirmed_recoverable_leakage_inr === 0],
    ["planned_progress_exact", result.progress_position.planned_progress_pct === 66.7],
    ["actual_progress_exact", result.progress_position.actual_progress_pct === 64.3],
    ["source_variance_preserved", result.progress_position.source_variance_pct_points === -2.3],
    ["recalculated_variance_preserved", result.progress_position.recalculated_variance_pct_points === -2.4],
    ["delay_days_exact", result.delay_position.observed_delay_event_days === 32],
    ["contractor_days_exact", result.delay_position.contractor_non_excusable_days === 11],
    ["client_days_exact", result.delay_position.client_days === 7],
    ["neutral_external_days_exact", result.delay_position.neutral_external_days === 14],
    ["eot_count_exact", result.eot_position.eot_count === 2],
    ["eot_review_flag_present", result.eot_position.review_required_count === 1],
    ["causal_link_not_established", result.causal_link_status === "NOT_ESTABLISHED"],
    ["critical_path_not_established", result.critical_path_impact === "NOT_ESTABLISHED"],
    ["entitlement_not_established", result.contractual_entitlement === "NOT_ESTABLISHED"],
    ["compensability_not_established", result.compensability === "NOT_ESTABLISHED"],
    ["recoverability_not_established", result.recoverability === "NOT_ESTABLISHED"],
    ["coexistence_statement_safe", /coexist/i.test(result.relationship_statement) && /not established/i.test(result.relationship_statement)],
    ["no_delay_cost_causation", result.delay_to_cost_causation === "NOT_ESTABLISHED"],
    ["non_additive_warning_present", /do not sum/i.test(result.non_additive_cost_warning || "")],
    ["rendered_progress_present", /64\.3% actual vs 66\.7% planned/.test(rendered)],
    ["rendered_delay_present", /Observed delay-event days: 32/.test(rendered)],
    ["rendered_causation_guardrail", /Causal relationship: NOT_ESTABLISHED/.test(rendered)],
    ["does_not_claim_project_delayed_32", !/project delayed by 32 days/i.test(JSON.stringify(result) + rendered)],
    ["does_not_claim_delay_caused_cost", !/delay.{0,40}caused.{0,40}(54,98,134|82,47,202|5498134|8247202)/i.test(JSON.stringify(result) + rendered)]
  ];

  const output = {
    ticket: "EEV2-002D",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    reconciliation: result,
    rendered_text: rendered
  };

  console.log("EEV2-002D CROSS-DOCUMENT RECONCILIATION REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-002D reconciliation regression FAILED. See execution log.");
  console.log("EEV2-002D RECONCILIATION REGRESSION PASS: ok=true");
  return output;
}