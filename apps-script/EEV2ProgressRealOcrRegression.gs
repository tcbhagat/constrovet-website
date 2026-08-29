// EEV2-002F1 real-OCR regression for the known Month-8 progress PDF.
// Safe to run manually in Apps Script TEST project.

function eev2RunProgressRealOcrRegression() {
  const text = [
    "TOWER OF PROSPERITY Month 8 of 12 | Activity Progress",
    "ID: PROJ-69266 | Generated: 23-Feb-2026 GOOD",
    "ACTIVITY-WISE PROGRESS REPORT",
    "Phase / Activity Planned Start (Wk) Planned End (Wk) Planned % Actual % Status Bar Chart",
    "Internal Plastering 24 36 88.7% 97.8% On Track",
    "Flooring - Lower Floors 26 38 72.0% 80.8% On Track",
    "Flooring - Upper Floors 30 42 38.7% 41.4% On Track",
    "Doors, Windows & Glazing 28 40 55.3% 63.2% On Track",
    "MEP Final Fix & Testing 34 44 6.4% 6.9% On Track",
    "Painting - Interior 36 46 0.0% 0.0% Not Started",
    "Overall Project Progress: Planned = 66.7% | Actual = 64.3% | Variance = -2.3%"
  ].join("\n");

  const result = eev2ExtractStructuredProgressFindings(
    "M08_ActivityProgress_GOOD---Taran-Bhagat.pdf",
    "Workspace OCR",
    text
  );

  const e = result.progress_evidence || {};
  const findings = result.findings || [];
  const rendered = JSON.stringify(result);

  const checks = [
    ["document_type", result.document_type === "PROGRESS_REPORT"],
    ["project_id", e.project_id === "PROJ-69266"],
    ["report_date", e.report_date === "23-Feb-2026"],
    ["month", e.month && e.month.current === 8 && e.month.total === 12],
    ["planned_exact", Number(e.planned_progress_pct) === 66.7],
    ["actual_exact", Number(e.actual_progress_pct) === 64.3],
    ["source_variance_exact", Number(e.source_variance_pct_points) === -2.3],
    ["recalculated_variance_exact", Number(e.recalculated_variance_pct_points) === -2.4],
    ["rounding_review", e.variance_consistency === "ROUNDING_DIFFERENCE_REVIEW"],
    ["six_activity_rows", (e.activity_progress || []).length === 6],
    ["internal_plastering", (e.activity_progress || []).some((x) => x.activity === "Internal Plastering" && x.planned_pct === 88.7 && x.actual_pct === 97.8)],
    ["flooring_lower", (e.activity_progress || []).some((x) => x.activity === "Flooring Lower" && x.planned_pct === 72 && x.actual_pct === 80.8)],
    ["flooring_upper", (e.activity_progress || []).some((x) => x.activity === "Flooring Upper" && x.planned_pct === 38.7 && x.actual_pct === 41.4)],
    ["doors", (e.activity_progress || []).some((x) => x.activity === "Doors" && x.planned_pct === 55.3 && x.actual_pct === 63.2)],
    ["mep_final_fix", (e.activity_progress || []).some((x) => x.activity === "MEP Final Fix" && x.planned_pct === 6.4 && x.actual_pct === 6.9)],
    ["painting", (e.activity_progress || []).some((x) => x.activity === "Painting" && x.planned_pct === 0 && x.actual_pct === 0)],
    ["progress_finding_present", findings.some((x) => x.eev2_semantic_classification === "PROGRESS_VARIANCE")],
    ["no_cause_inferred", !/(caused by|cause is|due to)/i.test(rendered)],
    ["critical_path_not_established", e.critical_path_relation === "NOT_ESTABLISHED"]
  ];

  const output = {
    ticket: "EEV2-002F1",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    evidence: e,
    findings
  };

  console.log("EEV2-002F1 REAL OCR PROGRESS REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-002F1 real OCR progress regression FAILED. See execution log.");
  console.log("EEV2-002F1 REAL OCR PROGRESS REGRESSION PASS: ok=true");
  return output;
}
