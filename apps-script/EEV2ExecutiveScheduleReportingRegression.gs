// EEV2-002E regression — safe to run manually in Apps Script TEST project.

function eev2RunExecutiveScheduleReportingRegression() {
  const reconciliation = {
    reconciliation_status: "MULTI_SIGNAL_RECONCILIATION_AVAILABLE",
    progress_position: {
      planned_progress_pct: 66.7,
      actual_progress_pct: 64.3,
      source_variance_pct_points: -2.3,
      recalculated_variance_pct_points: -2.4,
      variance_consistency: "ROUNDING_DIFFERENCE_REVIEW",
      critical_path_relation: "NOT_ESTABLISHED",
      causal_explanation_status: "NOT_ESTABLISHED"
    },
    delay_position: {
      observed_delay_event_days: 32,
      contractor_non_excusable_days: 11,
      client_days: 7,
      neutral_external_days: 14,
      unclassified_days: 0,
      critical_path_impact: "NOT_ESTABLISHED",
      concurrency_status: "NOT_ESTABLISHED",
      float_impact_status: "NOT_ESTABLISHED",
      entitlement_status: "REQUIRES_CONTRACT_AND_SCHEDULE_REVIEW"
    },
    eot_position: {
      eot_count: 2,
      review_required_count: 1,
      entitlement_conclusion: "NOT_ESTABLISHED",
      critical_path_entitlement: "NOT_ESTABLISHED",
      compensability_conclusion: "NOT_ESTABLISHED"
    },
    relationship_statement: "Quantified cost exposure, progress slippage and observed delay events coexist in the reporting evidence. Their causal relationship is not established.",
    causal_link_status: "NOT_ESTABLISHED",
    critical_path_impact: "NOT_ESTABLISHED",
    contractual_entitlement: "NOT_ESTABLISHED",
    compensability: "NOT_ESTABLISHED"
  };

  const summary = eev2BuildExecutiveScheduleSummary(reconciliation);
  const headline = eev2ExecutiveScheduleHeadline(reconciliation);
  const lines = eev2ExecutiveScheduleTextLines(reconciliation);
  const html = eev2ExecutiveScheduleHtml(reconciliation);
  const validateAction = eev2BuildScheduleValidationAction(reconciliation);
  const commercialAction = eev2BuildScheduleCommercialAction(reconciliation);
  const rendered = lines.join("\n");

  const prohibited = `${headline}\n${rendered}\n${validateAction ? validateAction.recommendation : ""}\n${commercialAction ? commercialAction.recommendation : ""}`;

  const checks = [
    ["status_available", summary.status === "STRUCTURED_SCHEDULE_POSITION_AVAILABLE"],
    ["planned_exact", summary.planned_progress_pct === 66.7],
    ["actual_exact", summary.actual_progress_pct === 64.3],
    ["source_variance_exact", summary.source_variance_pct_points === -2.3],
    ["recalculated_variance_exact", summary.recalculated_variance_pct_points === -2.4],
    ["rounding_review_preserved", summary.variance_consistency === "ROUNDING_DIFFERENCE_REVIEW"],
    ["observed_days_exact", summary.observed_delay_event_days === 32],
    ["contractor_days_exact", summary.contractor_non_excusable_days === 11],
    ["client_days_exact", summary.client_days === 7],
    ["neutral_external_days_exact", summary.neutral_external_days === 14],
    ["critical_path_not_established", summary.critical_path_impact === "NOT_ESTABLISHED"],
    ["causal_link_not_established", summary.causal_link_status === "NOT_ESTABLISHED"],
    ["eot_counts_exact", summary.eot_count === 2 && summary.eot_review_required_count === 1],
    ["headline_uses_observed_days", /32 observed delay-event days/i.test(headline)],
    ["headline_does_not_claim_project_delay", !/project delayed by 32 days/i.test(prohibited)],
    ["does_not_infer_cost_causation", !/(delay|delays).{0,40}(caused|causes).{0,40}(cost|exposure|overrun)/i.test(prohibited)],
    ["validation_action_present", validateAction && validateAction.title === "Validate schedule impact"],
    ["validation_action_owner", validateAction && validateAction.owner_role === "Planning / Project Controls"],
    ["commercial_action_present", commercialAction && commercialAction.title === "Resolve responsibility and EOT position"],
    ["commercial_action_owner", commercialAction && commercialAction.owner_role === "Contracts / Planning"],
    ["html_schedule_section_present", /Schedule Position/.test(html)],
    ["text_preserves_both_variances", /Reported source variance: -2.3/.test(rendered) && /Recalculated variance: -2.4/.test(rendered)]
  ];

  const result = {
    ticket: "EEV2-002E",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    summary,
    headline,
    validate_action: validateAction,
    commercial_action: commercialAction,
    rendered_text: rendered
  };

  console.log("EEV2-002E EXECUTIVE SCHEDULE REPORTING REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2-002E regression FAILED. See execution log.");
  console.log("EEV2-002E EXECUTIVE SCHEDULE REPORTING REGRESSION PASS: ok=true");
  return result;
}
