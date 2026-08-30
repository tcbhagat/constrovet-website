// EEV2 structured routing regression — safe to run manually in Apps Script TEST project.

function eev2RunStructuredRoutingRegression() {
  const costText = [
    "Monthly Budget Rs. 43,333,333 Monthly Actual Rs. 42,706,471",
    "Cumul. Budget Rs. 346,666,667 Cumul. Actual Rs. 352,164,801",
    "Revised FAC (Cost) Rs. 528,247,202 Original Budget Rs. 520,000,000"
  ].join("\n");

  const delayText = [
    "Delay Analysis ID: PROJ-69266",
    "Generated: 23-Feb-2026",
    "Cause of Delay Days Lost Responsibility Delay Type Mitigation Action",
    "Labour Shortage - Migration of workers post festival 7 Contractor Non-excusable",
    "Delayed approval of bar bending schedule by client PM 7 Client Excusable",
    "Heavy Rainfall 9 Neutral Excusable + Compensable",
    "MSEDCL power cuts 5 External Excusable",
    "Batching plant breakdown 4 Contractor Non-excusable",
    "TOTAL DELAY THIS MONTH 32",
    "EOT-01/2026 Monsoon / Force Majeure 6 7 Under Review",
    "EOT-02/2026 Client-caused delay 7 - Submitted"
  ].join("\n");

  const progressText = [
    "Activity Progress ID: PROJ-69266",
    "Generated: 23-Feb-2026",
    "Month: 8/12",
    "Planned Progress: 66.7%",
    "Actual Progress: 64.3%",
    "Variance: -2.3%",
    "Internal Plastering 88.7 97.8",
    "Flooring Lower 72.0 80.8",
    "Flooring Upper 38.7 41.4",
    "Doors 55.3 63.2",
    "MEP Final Fix 6.4 6.9",
    "Painting 0 0"
  ].join("\n");

  const cost = eev2RouteStructuredBoardroomFindings("M08_CostEstimate_NORMAL.pdf", "Workspace OCR", costText);
  const delay = eev2RouteStructuredBoardroomFindings("M08_DelayAnalysis_BAD.pdf", "Workspace OCR", delayText);
  const progress = eev2RouteStructuredBoardroomFindings("M08_ActivityProgress_GOOD.pdf", "Workspace OCR", progressText);
  const unknown = eev2RouteStructuredBoardroomFindings("notes.txt", "Workspace OCR", "General project note without structured evidence anchors.");

  const checks = [
    ["cost_handled", cost.handled === true && cost.document_type === "COST_ESTIMATE"],
    ["cost_three_findings", (cost.findings || []).length === 3],
    ["delay_handled", delay.handled === true && delay.document_type === "DELAY_ANALYSIS"],
    ["delay_observed_32", (delay.findings || []).some((x) => x.eev2_semantic_classification === "OBSERVED_DELAY_EVENT_DAYS" && Number(x.days) === 32)],
    ["delay_eot_two_entries", (delay.findings || []).filter((x) => x.eev2_semantic_classification === "EOT_STATUS").length === 2],
    ["delay_eot_review_flag", (delay.findings || []).some((x) => x.eev2_semantic_classification === "EOT_STATUS" && (x.consistency_flags || []).length > 0)],
    ["progress_handled", progress.handled === true && progress.document_type === "PROGRESS_REPORT"],
    ["progress_variance_present", (progress.findings || []).some((x) => x.eev2_semantic_classification === "PROGRESS_VARIANCE")],
    ["unknown_falls_back", unknown.handled === false && unknown.document_type === "UNKNOWN"],
    ["delay_no_legacy_duplication_contract", delay.handled === true],
    ["progress_no_legacy_duplication_contract", progress.handled === true]
  ];

  const result = {
    ticket: "EEV2-002F-ROUTING",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    cost,
    delay,
    progress,
    unknown
  };

  console.log("EEV2 STRUCTURED ROUTING REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2 structured routing regression FAILED. See execution log.");
  console.log("EEV2 STRUCTURED ROUTING REGRESSION PASS: ok=true");
  return result;
}
