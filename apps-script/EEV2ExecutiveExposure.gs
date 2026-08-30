// Constrovet Evidence Engine v2 — EEV2-001G
// Executive Exposure Reporting helpers.
// Keeps cost exposure separate from confirmed recoverable leakage.

function eev2ExecutiveExposureItems(findings) {
  return (findings || []).filter((item) => {
    const semantic = String((item || {}).eev2_semantic_classification || "").toUpperCase();
    const guard = String((item || {}).recoverability_guardrail || "").toUpperCase();
    return guard === "NOT_ESTABLISHED" &&
      ["COST_EXPOSURE", "FORECAST_OVERRUN", "COST_VARIANCE"].indexOf(semantic) >= 0 &&
      Number((item || {}).exposure_amount_inr || 0) > 0;
  });
}

function eev2BuildExecutiveExposureSummary(findings) {
  const items = eev2ExecutiveExposureItems(findings);
  const cumulative = items.find((item) => String(item.eev2_semantic_classification || "").toUpperCase() === "COST_EXPOSURE") || null;
  const fac = items.find((item) => String(item.eev2_semantic_classification || "").toUpperCase() === "FORECAST_OVERRUN") || null;
  const adverseVariance = items.filter((item) => String(item.eev2_semantic_classification || "").toUpperCase() === "COST_VARIANCE");

  return {
    status: items.length ? "QUANTIFIED_EXPOSURE_RECOVERABILITY_NOT_ESTABLISHED" : "NO_UNESTABLISHED_COST_EXPOSURE",
    confirmed_recoverable_leakage_inr: boardroomQuantifiedLeakageTotal(findings || []),
    cumulative_adverse_variance_inr: cumulative ? Number(cumulative.exposure_amount_inr || 0) : 0,
    fac_forecast_exposure_inr: fac ? Number(fac.exposure_amount_inr || 0) : 0,
    other_adverse_variance_inr: adverseVariance.reduce((sum, item) => sum + Number(item.exposure_amount_inr || 0), 0),
    exposure_item_count: items.length,
    recoverability: items.length ? "NOT_ESTABLISHED" : "NOT_APPLICABLE",
    non_additive_warning: items.length > 1
      ? "Do not sum cumulative variance and FAC forecast exposure; they represent different measurement bases/time horizons."
      : "",
    finding_indexes: items.map((item) => (findings || []).indexOf(item) + 1).filter((index) => index > 0),
    citations: items.reduce((all, item) => all.concat(item.citations || []), []).slice(0, 10)
  };
}

function eev2ExecutiveExposureHeadline(findings) {
  const summary = eev2BuildExecutiveExposureSummary(findings);
  if (!summary.exposure_item_count) return "";
  const parts = [];
  if (summary.cumulative_adverse_variance_inr > 0) {
    parts.push(`cumulative adverse cost variance INR ${formatInr(summary.cumulative_adverse_variance_inr)}`);
  }
  if (summary.fac_forecast_exposure_inr > 0) {
    parts.push(`FAC forecast exposure INR ${formatInr(summary.fac_forecast_exposure_inr)}`);
  }
  if (summary.other_adverse_variance_inr > 0) {
    parts.push(`other adverse cost variance INR ${formatInr(summary.other_adverse_variance_inr)}`);
  }
  return `Quantified cost exposure identified: ${parts.join("; ")}. Recoverability has not been established. Confirmed recoverable leakage: INR ${formatInr(summary.confirmed_recoverable_leakage_inr)}.`;
}

function eev2BuildExposureValidationAction(findings) {
  const summary = eev2BuildExecutiveExposureSummary(findings);
  if (!summary.exposure_item_count) return null;
  const amounts = [];
  if (summary.cumulative_adverse_variance_inr > 0) amounts.push(`INR ${formatInr(summary.cumulative_adverse_variance_inr)} cumulative adverse variance`);
  if (summary.fac_forecast_exposure_inr > 0) amounts.push(`INR ${formatInr(summary.fac_forecast_exposure_inr)} FAC forecast exposure`);
  if (summary.other_adverse_variance_inr > 0) amounts.push(`INR ${formatInr(summary.other_adverse_variance_inr)} other adverse variance`);
  return {
    title: "Validate quantified cost exposure",
    recommendation: `Review ${amounts.join(" and ")} against cost-head, change-order, invoice, commitment and forecast records. Do not classify these amounts as recoverable leakage until causation and contractual recoverability are established.`,
    source_finding_indexes: summary.finding_indexes,
    owner_role: "Finance / Cost Control",
    due_horizon: "7_days",
    evidence_status: "QUANTIFIED_EXPOSURE_RECOVERABILITY_NOT_ESTABLISHED",
    citations: summary.citations,
    blocked_by_missing_evidence: true,
    actionability: ACTION_EVIDENCE_FOLLOWUP,
    confidence: "HIGH"
  };
}

function eev2BuildExposureDecisionAction(findings) {
  const summary = eev2BuildExecutiveExposureSummary(findings);
  if (!summary.exposure_item_count) return null;
  return {
    title: "Establish cause and recoverability",
    recommendation: "Reconcile quantified exposure to approved scope, commitments, changes, invoices, responsibility and contract entitlement. Maintain recoverable leakage at INR 0 unless the evidence establishes recoverability.",
    source_finding_indexes: summary.finding_indexes,
    owner_role: "Contracts / Commercial",
    due_horizon: "30_days",
    evidence_status: "RECOVERABILITY_NOT_ESTABLISHED",
    citations: summary.citations,
    blocked_by_missing_evidence: true,
    actionability: ACTION_EVIDENCE_FOLLOWUP,
    confidence: "MEDIUM"
  };
}

function eev2ExposureTextLines(findings) {
  const summary = eev2BuildExecutiveExposureSummary(findings);
  if (!summary.exposure_item_count) return [];
  const lines = [
    `Confirmed recoverable leakage: INR ${formatInr(summary.confirmed_recoverable_leakage_inr)}`,
    "Quantified cost exposure (recoverability not established):"
  ];
  if (summary.cumulative_adverse_variance_inr > 0) lines.push(`- Cumulative adverse cost variance: INR ${formatInr(summary.cumulative_adverse_variance_inr)}`);
  if (summary.fac_forecast_exposure_inr > 0) lines.push(`- FAC forecast exposure: INR ${formatInr(summary.fac_forecast_exposure_inr)}`);
  if (summary.other_adverse_variance_inr > 0) lines.push(`- Other adverse cost variance: INR ${formatInr(summary.other_adverse_variance_inr)}`);
  lines.push("Recoverability: NOT ESTABLISHED");
  if (summary.non_additive_warning) lines.push(`Important: ${summary.non_additive_warning}`);
  return lines;
}

function eev2ExposureHtml(findings) {
  const summary = eev2BuildExecutiveExposureSummary(findings);
  if (!summary.exposure_item_count) return "";
  const rows = [];
  if (summary.cumulative_adverse_variance_inr > 0) rows.push(`<li><strong>Cumulative adverse cost variance:</strong> INR ${formatInr(summary.cumulative_adverse_variance_inr)}</li>`);
  if (summary.fac_forecast_exposure_inr > 0) rows.push(`<li><strong>FAC forecast exposure:</strong> INR ${formatInr(summary.fac_forecast_exposure_inr)}</li>`);
  if (summary.other_adverse_variance_inr > 0) rows.push(`<li><strong>Other adverse cost variance:</strong> INR ${formatInr(summary.other_adverse_variance_inr)}</li>`);
  return `<div style="border:1px solid #d9ded8;border-radius:6px;padding:12px;margin:14px 0"><strong>Cost Exposure — Recoverability Not Established</strong><ul style="margin:8px 0 0;padding-left:20px">${rows.join("")}<li><strong>Confirmed recoverable leakage:</strong> INR ${formatInr(summary.confirmed_recoverable_leakage_inr)}</li></ul><p style="margin:8px 0 0;color:#66737d">${escapeHtml(summary.non_additive_warning || "Do not treat quantified exposure as recoverable leakage without causation and entitlement evidence.")}</p></div>`;
}