// EEV2-002A regression — safe to run manually in Apps Script TEST project.

function eev2RunDelayRegression() {
  const text = [
    "Delay Analysis ID: PROJ-69266",
    "Generated: 23-Feb-2026",
    "BAD DELAY ANALYSIS & MITIGATION REPORT",
    "Cause of Delay Days Lost Responsibility Delay Type Mitigation Action",
    "Labour Shortage - Migration of workers post festival 7 Contractor Non-excusable Hire through labour contractors",
    "Delayed approval of bar bending schedule by client PM 7 Client Excusable Escalate to project director",
    "Heavy Rainfall 9 Neutral Excusable + Compensable",
    "MSEDCL power cuts 5 External Excusable",
    "Batching plant breakdown 4 Contractor Non-excusable Keep standby mixer available",
    "TOTAL DELAY THIS MONTH 32",
    "Extension of Time (EOT) Status EOT Ref Basis Days Claimed Days Approved Status",
    "EOT-01/2026 Monsoon / Force Majeure 6 7 Under Review",
    "EOT-02/2026 Client-caused delay 7 - Submitted"
  ].join("\n");

  const result = eev2ExtractStructuredDelayFindings(
    "M08_DelayAnalysis_BAD.pdf",
    "Workspace OCR",
    text
  );

  const e = result.delay_evidence || {};
  const s = e.responsibility_summary || {};
  const findings = result.findings || [];

  const rendered = JSON.stringify(result);

  const checks = [
    ["document_type", result.document_type === "DELAY_ANALYSIS"],
    ["project_id", e.project_id === "PROJ-69266"],
    ["report_date", e.report_date === "23-Feb-2026"],
    ["total_observed_delay_event_days", Number(e.total_observed_delay_event_days) === 32],
    ["contractor_non_excusable_days", Number(s.contractor_non_excusable_days) === 11],
    ["client_days", Number(s.client_days) === 7],
    ["neutral_external_days", Number(s.neutral_external_days) === 14],
    ["event_sum_matches_total", e.consistency === "EVENT_SUM_MATCHES_TOTAL"],
    ["critical_path_not_established", e.critical_path_impact === "NOT_ESTABLISHED"],
    ["concurrency_not_established", e.concurrency_status === "NOT_ESTABLISHED"],
    ["float_not_established", e.float_impact_status === "NOT_ESTABLISHED"],
    ["observed_days_finding_present", findings.some((x) => x.eev2_semantic_classification === "OBSERVED_DELAY_EVENT_DAYS" && Number(x.days) === 32)],
    ["responsibility_profile_present", findings.some((x) => x.eev2_semantic_classification === "DELAY_RESPONSIBILITY_PROFILE")],
    ["no_project_delayed_32_claim", !/project delayed by 32 days/i.test(rendered)],
    ["no_critical_path_claim", !/critical-path delay(?:\s+is|\s*=|\s+of)?\s*32/i.test(rendered)],
    ["recoverability_not_established", findings.every((x) => x.recoverability_guardrail === "NOT_ESTABLISHED")]
  ];

  const output = {
    ticket: "EEV2-002A",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    evidence: e,
    findings
  };

  console.log("EEV2-002A DELAY REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-002A delay regression FAILED. See execution log.");
  console.log("EEV2-002A DELAY REGRESSION PASS: ok=true");
  return output;
}
