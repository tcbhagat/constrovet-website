// Constrovet Evidence Engine v2 — EEV2-002D
// Cross-document reconciliation for cost, delay, EOT and progress evidence.
// Safety rule: coexistence is not causation. Never infer cost causation, critical-path impact, entitlement or recoverability without source support.

const EEV2_SCHEDULE_RECONCILIATION_VERSION = "2.0.0-dev.1";

function eev2NumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function eev2FindSemanticFinding(findings, semantic) {
  const target = String(semantic || "").toUpperCase();
  return (findings || []).find((item) => String((item || {}).eev2_semantic_classification || "").toUpperCase() === target) || null;
}

function eev2ScheduleCostPosition(findings) {
  const cumulative = eev2FindSemanticFinding(findings, "COST_EXPOSURE");
  const fac = eev2FindSemanticFinding(findings, "FORECAST_OVERRUN");
  return {
    cumulative_adverse_variance_inr: cumulative ? Number(cumulative.exposure_amount_inr || 0) : 0,
    fac_forecast_exposure_inr: fac ? Number(fac.exposure_amount_inr || 0) : 0,
    confirmed_recoverable_leakage_inr: (findings || []).reduce((sum, item) => sum + Number((item || {}).amount_inr || 0), 0),
    recoverability_status: (cumulative || fac) ? "NOT_ESTABLISHED" : "NO_QUANTIFIED_COST_EXPOSURE"
  };
}

function eev2ScheduleProgressPosition(progressEvidence) {
  const p = progressEvidence || {};
  return {
    planned_progress_pct: eev2NumberOrNull(p.planned_progress_pct),
    actual_progress_pct: eev2NumberOrNull(p.actual_progress_pct),
    source_variance_pct_points: eev2NumberOrNull(p.source_variance_pct_points),
    recalculated_variance_pct_points: eev2NumberOrNull(p.recalculated_variance_pct_points),
    variance_consistency: p.variance_consistency || "NOT_AVAILABLE",
    critical_path_relation: p.critical_path_relation || "NOT_ESTABLISHED",
    causal_explanation_status: p.causal_explanation_status || "NOT_ESTABLISHED"
  };
}

function eev2ScheduleDelayPosition(delayEvidence) {
  const d = delayEvidence || {};
  const s = d.responsibility_summary || {};
  return {
    observed_delay_event_days: eev2NumberOrNull(d.total_observed_delay_event_days),
    contractor_non_excusable_days: Number(s.contractor_non_excusable_days || 0),
    client_days: Number(s.client_days || 0),
    neutral_external_days: Number(s.neutral_external_days || 0),
    unclassified_days: Number(s.unclassified_days || 0),
    critical_path_impact: d.critical_path_impact || "NOT_ESTABLISHED",
    concurrency_status: d.concurrency_status || "NOT_ESTABLISHED",
    float_impact_status: d.float_impact_status || "NOT_ESTABLISHED",
    entitlement_status: d.entitlement_status || "REQUIRES_CONTRACT_AND_SCHEDULE_REVIEW"
  };
}

function eev2ScheduleEotPosition(eotEvidence) {
  const e = eotEvidence || {};
  const items = e.eot_items || e.entries || [];
  return {
    eot_count: items.length,
    review_required_count: items.filter((item) => (item.consistency_flags || []).length > 0).length,
    entitlement_conclusion: e.entitlement_conclusion || "NOT_ESTABLISHED",
    critical_path_entitlement: e.critical_path_entitlement || "NOT_ESTABLISHED",
    compensability_conclusion: e.compensability_conclusion || "NOT_ESTABLISHED",
    items: items.map((item) => ({
      eot_reference: item.eot_reference || item.reference || "",
      basis: item.basis || "",
      days_claimed: eev2NumberOrNull(item.days_claimed),
      days_approved: eev2NumberOrNull(item.days_approved),
      status: item.status || "",
      consistency_flags: item.consistency_flags || []
    }))
  };
}

function eev2BuildCrossDocumentReconciliation(input) {
  const source = input || {};
  const findings = source.findings || [];
  const cost = eev2ScheduleCostPosition(findings);
  const progress = eev2ScheduleProgressPosition(source.progress_evidence);
  const delay = eev2ScheduleDelayPosition(source.delay_evidence);
  const eot = eev2ScheduleEotPosition(source.eot_evidence);

  const hasCostExposure = cost.cumulative_adverse_variance_inr > 0 || cost.fac_forecast_exposure_inr > 0;
  const hasProgressSlippage = progress.planned_progress_pct !== null && progress.actual_progress_pct !== null && progress.actual_progress_pct < progress.planned_progress_pct;
  const hasDelayEvents = Number(delay.observed_delay_event_days || 0) > 0;

  const coexistenceSignals = [];
  if (hasCostExposure) coexistenceSignals.push("QUANTIFIED_COST_EXPOSURE");
  if (hasProgressSlippage) coexistenceSignals.push("PROGRESS_BELOW_PLAN");
  if (hasDelayEvents) coexistenceSignals.push("OBSERVED_DELAY_EVENTS");
  if (eot.eot_count > 0) coexistenceSignals.push("EOT_REGISTER_PRESENT");

  let relationshipStatement = "Insufficient cross-document evidence for a combined project-control statement.";
  if (hasCostExposure && hasProgressSlippage && hasDelayEvents) {
    relationshipStatement = "Quantified cost exposure, progress slippage and observed delay events coexist in the reporting evidence. Their causal relationship is not established.";
  } else if ((hasProgressSlippage && hasDelayEvents) || (hasCostExposure && hasDelayEvents) || (hasCostExposure && hasProgressSlippage)) {
    relationshipStatement = "Multiple project-control signals coexist in the reporting evidence. Their causal relationship is not established.";
  }

  return {
    engine_version: EEV2_SCHEDULE_RECONCILIATION_VERSION,
    reconciliation_status: coexistenceSignals.length >= 2 ? "MULTI_SIGNAL_RECONCILIATION_AVAILABLE" : "LIMITED_RECONCILIATION",
    cost_position: cost,
    progress_position: progress,
    delay_position: delay,
    eot_position: eot,
    coexistence_signals: coexistenceSignals,
    relationship_statement: relationshipStatement,
    causal_link_status: "NOT_ESTABLISHED",
    delay_to_cost_causation: "NOT_ESTABLISHED",
    progress_to_cost_causation: "NOT_ESTABLISHED",
    critical_path_impact: "NOT_ESTABLISHED",
    contractual_entitlement: "NOT_ESTABLISHED",
    compensability: "NOT_ESTABLISHED",
    recoverability: hasCostExposure ? "NOT_ESTABLISHED" : "NO_QUANTIFIED_COST_EXPOSURE",
    non_additive_cost_warning: "Do not sum cumulative adverse variance and FAC forecast exposure; they represent different measurement bases/time horizons.",
    safety_statement: "Cross-document coexistence does not establish causation, critical-path delay, compensability, contractual entitlement or recoverability."
  };
}

function eev2CrossDocumentExecutiveLines(reconciliation) {
  const r = reconciliation || {};
  const cost = r.cost_position || {};
  const progress = r.progress_position || {};
  const delay = r.delay_position || {};
  const lines = [];

  if (cost.cumulative_adverse_variance_inr > 0) lines.push(`Cumulative adverse cost variance: INR ${formatInr(cost.cumulative_adverse_variance_inr)}`);
  if (cost.fac_forecast_exposure_inr > 0) lines.push(`FAC forecast exposure: INR ${formatInr(cost.fac_forecast_exposure_inr)}`);
  if (progress.planned_progress_pct !== null && progress.actual_progress_pct !== null) {
    lines.push(`Progress: ${progress.actual_progress_pct}% actual vs ${progress.planned_progress_pct}% planned`);
  }
  if (delay.observed_delay_event_days !== null && delay.observed_delay_event_days !== undefined) {
    lines.push(`Observed delay-event days: ${delay.observed_delay_event_days}`);
  }
  lines.push(`Causal relationship: ${r.causal_link_status || "NOT_ESTABLISHED"}`);
  lines.push(`Critical-path impact: ${r.critical_path_impact || "NOT_ESTABLISHED"}`);
  return lines;
}
