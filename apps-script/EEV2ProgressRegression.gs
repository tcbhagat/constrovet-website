// EEV2-002C regression — safe to run manually in Apps Script TEST project.

function eev2RunProgressRegression() {
  const sample = [
    "ACTIVITY PROGRESS REPORT",
    "Project ID: PROJ-69266",
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
  ].join(" ");

  const evidence = eev2ExtractProgressEvidence("M08_ActivityProgress_NORMAL.pdf", "Workspace OCR", sample);
  const findings = eev2ProgressEvidenceToFindings(evidence);

  const checks = [
    ["classified_progress_report", evidence && evidence.document_type === "PROGRESS_REPORT"],
    ["project_id_exact", evidence && evidence.project_id === "PROJ-69266"],
    ["planned_progress_exact", evidence && evidence.planned_progress_pct === 66.7],
    ["actual_progress_exact", evidence && evidence.actual_progress_pct === 64.3],
    ["source_variance_preserved", evidence && evidence.source_variance_pct_points === -2.3],
    ["recalculated_variance_exact", evidence && evidence.recalculated_variance_pct_points === -2.4],
    ["rounding_difference_flag", evidence && evidence.variance_consistency === "ROUNDING_DIFFERENCE_REVIEW"],
    ["all_activity_rows_extracted", evidence && evidence.activity_progress.length === 6],
    ["internal_plastering_exact", evidence && evidence.activity_progress.some((x) => x.activity === "Internal Plastering" && x.planned_pct === 88.7 && x.actual_pct === 97.8 && x.variance_pct_points === 9.1)],
    ["flooring_lower_exact", evidence && evidence.activity_progress.some((x) => x.activity === "Flooring Lower" && x.planned_pct === 72 && x.actual_pct === 80.8 && x.variance_pct_points === 8.8)],
    ["doors_exact", evidence && evidence.activity_progress.some((x) => x.activity === "Doors" && x.planned_pct === 55.3 && x.actual_pct === 63.2 && x.variance_pct_points === 7.9)],
    ["overall_vs_activity_review_flag", evidence && /OVERALL_BEHIND_WHILE_LISTED_ACTIVITIES_ABOVE_PLAN/.test(evidence.portfolio_consistency_flag || "")],
    ["causation_not_established", evidence && evidence.causal_explanation_status === "NOT_ESTABLISHED"],
    ["critical_path_not_established", evidence && evidence.critical_path_relation === "NOT_ESTABLISHED"],
    ["finding_preserves_source_and_recalc", findings.some((f) => f.eev2_semantic_classification === "PROGRESS_VARIANCE" && f.variance_consistency === "ROUNDING_DIFFERENCE_REVIEW")],
    ["no_unsupported_delay_causation", !findings.some((f) => /caused by|due to the delay|delay caused/i.test(String(f.statement || "")))]
  ];

  const result = {
    ticket: "EEV2-002C",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    evidence,
    findings
  };

  console.log("EEV2-002C STRUCTURED PROGRESS REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2-002C regression FAILED. See execution log.");
  console.log("EEV2-002C PROGRESS REGRESSION PASS: ok=true");
  return result;
}