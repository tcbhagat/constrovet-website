// EEV2 live schedule bridge regression — safe manual TEST runner.

function eev2RunLiveScheduleBridgeRegression() {
  const findings = [
    {
      statement: "Overall progress is 64.3% actual versus 66.7% planned. Source variance -2.3% points; recalculated from displayed rounded values -2.4% points.",
      days: 0,
      calculation: { budget: 66.7, actual: 64.3, difference: -2.4 },
      citations: [{ quoted_span: "Overall Project Progress: Planned = 66.7% | Actual = 64.3% | Variance = -2.3%" }],
      variance_consistency: "ROUNDING_DIFFERENCE_REVIEW",
      eev2_semantic_classification: "PROGRESS_VARIANCE"
    },
    {
      statement: "32 observed monthly delay-event days were recorded. Critical-path impact is not established.",
      days: 32,
      eev2_semantic_classification: "OBSERVED_DELAY_EVENT_DAYS"
    },
    {
      statement: "Delay responsibility profile: contractor non-excusable 11 days; client 7 days; neutral/external 14 days.",
      days: 0,
      eev2_semantic_classification: "DELAY_RESPONSIBILITY_PROFILE"
    },
    {
      statement: "Approved variation/change order VO-11/01 with cited cost impact of INR 10,50,000 and 5 day(s) stated schedule impact. Approved change against baseline -- monitor; not contractor-recoverable leakage.",
      amount_inr: 1050000,
      exposure_amount_inr: 0,
      days: 5,
      financial_category: "BASELINE_BUDGET",
      eev2_semantic_classification: "BASELINE_BUDGET",
      recoverability_guardrail: "NOT_ESTABLISHED"
    },
    {
      statement: "Approved variation/change order VO-12/02 with cited cost impact of INR 2,50,000 and 0 day(s) stated schedule impact. Approved change against baseline -- monitor; not contractor-recoverable leakage.",
      amount_inr: 250000,
      exposure_amount_inr: 0,
      days: 0,
      financial_category: "BASELINE_BUDGET",
      eev2_semantic_classification: "BASELINE_BUDGET",
      recoverability_guardrail: "NOT_ESTABLISHED"
    },
    {
      statement: "Cumulative adverse cost variance of INR 54,98,134 is a quantified cost exposure. Recoverability is not established.",
      amount_inr: 0,
      exposure_amount_inr: 5498134,
      eev2_semantic_classification: "COST_EXPOSURE",
      recoverability_guardrail: "NOT_ESTABLISHED"
    },
    {
      statement: "EOT-01/2026: basis Monsoon / Force Majeure; claimed 6 day(s); approved 7; status UNDER_REVIEW. Entitlement is not established.",
      days: 0,
      eev2_semantic_classification: "EOT_STATUS",
      consistency_flags: ["APPROVED_DAYS_EXCEED_CLAIMED_DAYS"]
    }
  ];

  const browserReport = { findings: findings };
  eev2AttachLiveSchedulePosition(browserReport);
  const s = browserReport.eev2_executive_schedule_summary || {};
  const reconciliation = browserReport.eev2_schedule_reconciliation || {};
  const voEvidence = reconciliation.variation_order_evidence || {};
  const voEntries = voEvidence.entries || [];
  const text = (browserReport.eev2_executive_schedule_text || []).join("\n");
  const html = browserReport.eev2_executive_schedule_html || "";
  const prohibited = `${browserReport.eev2_executive_schedule_headline || ""}\n${text}\n${html}`;

  const checks = [
    ["planned_exact", s.planned_progress_pct === 66.7],
    ["actual_exact", s.actual_progress_pct === 64.3],
    ["source_variance_exact", s.source_variance_pct_points === -2.3],
    ["recalc_exact", s.recalculated_variance_pct_points === -2.4],
    ["observed_days_exact", s.observed_delay_event_days === 32],
    ["contractor_exact", s.contractor_non_excusable_days === 11],
    ["client_exact", s.client_days === 12],
    ["client_days_includes_vo_5", s.client_days === 7 + 5],
    ["neutral_external_exact", s.neutral_external_days === 14],
    ["cost_exposure_exact", Number((reconciliation.cost_position || {}).cumulative_adverse_variance_inr) === 5498134],
    ["eot_count_exact", s.eot_count === 1],
    ["eot_review_flag_exact", s.eot_review_required_count === 1],
    ["critical_path_not_established", s.critical_path_impact === "NOT_ESTABLISHED"],
    ["causal_link_not_established", s.causal_link_status === "NOT_ESTABLISHED"],
    ["schedule_html_present", /Schedule Position/.test(html)],
    ["client_days_12_in_text", /Client-caused:\s+12\s+days/.test(text)],
    ["vo_entries_count_2", voEntries.length === 2],
    ["vo_with_schedule_impact", voEntries.some((e) => e.schedule_impact_days === 5 && e.has_schedule_impact)],
    ["vo_zero_days_present", voEntries.some((e) => e.schedule_impact_days === 0 && !e.has_schedule_impact)],
    ["vo_total_approved_impact_5", voEvidence.total_approved_schedule_impact_days === 5],
    ["no_project_delayed_32_claim", !/project delayed by 32 days/i.test(prohibited)],
    ["no_cost_causation_claim", !/(delay|delays).{0,40}(caused|causes).{0,40}(cost|exposure|overrun)/i.test(prohibited)]
  ];

  const result = {
    ticket: "EEV2-002E-LIVE-BRIDGE-VO-SCHEDULE-AGGREGATION",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    summary: s,
    vo_evidence: voEvidence,
    headline: browserReport.eev2_executive_schedule_headline,
    text: text
  };

  console.log("EEV2 LIVE SCHEDULE BRIDGE REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2 live schedule bridge regression FAILED. See execution log.");
  console.log("EEV2 LIVE SCHEDULE BRIDGE REGRESSION PASS: ok=true");
  return result;
}
