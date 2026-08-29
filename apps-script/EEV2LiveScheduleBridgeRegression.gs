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
    }
  ];

  const browserReport = { findings: findings };
  eev2AttachLiveSchedulePosition(browserReport);
  const s = browserReport.eev2_executive_schedule_summary || {};
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
    ["client_exact", s.client_days === 7],
    ["neutral_external_exact", s.neutral_external_days === 14],
    ["critical_path_not_established", s.critical_path_impact === "NOT_ESTABLISHED"],
    ["causal_link_not_established", s.causal_link_status === "NOT_ESTABLISHED"],
    ["schedule_html_present", /Schedule Position/.test(html)],
    ["no_project_delayed_32_claim", !/project delayed by 32 days/i.test(prohibited)],
    ["no_cost_causation_claim", !/(delay|delays).{0,40}(caused|causes).{0,40}(cost|exposure|overrun)/i.test(prohibited)]
  ];

  const result = {
    ticket: "EEV2-002E-LIVE-BRIDGE",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    summary: s,
    headline: browserReport.eev2_executive_schedule_headline,
    text: text
  };

  console.log("EEV2 LIVE SCHEDULE BRIDGE REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2 live schedule bridge regression FAILED. See execution log.");
  console.log("EEV2 LIVE SCHEDULE BRIDGE REGRESSION PASS: ok=true");
  return result;
}
