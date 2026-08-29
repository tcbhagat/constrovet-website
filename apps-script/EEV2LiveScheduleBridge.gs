// Constrovet Evidence Engine v2 — live schedule bridge
// Builds an executive schedule reconciliation from already-verified cited findings.
// Safety rule: no project-delay, critical-path, entitlement, compensability, or cost-causation inference.

const EEV2_LIVE_SCHEDULE_BRIDGE_VERSION = "2.0.0-dev.2";

function eev2FindingsToLiveScheduleReconciliation(findings) {
  const list = findings || [];
  const progressFinding = list.find((f) => String((f || {}).eev2_semantic_classification || "").toUpperCase() === "PROGRESS_VARIANCE") || null;
  const delayFinding = list.find((f) => String((f || {}).eev2_semantic_classification || "").toUpperCase() === "OBSERVED_DELAY_EVENT_DAYS") || null;
  const responsibilityFinding = list.find((f) => String((f || {}).eev2_semantic_classification || "").toUpperCase() === "DELAY_RESPONSIBILITY_PROFILE") || null;

  const progressCalc = progressFinding && progressFinding.calculation ? progressFinding.calculation : {};
  const sourceVariance = progressFinding && progressFinding.citations && progressFinding.citations.length
    ? eev2ParseSourceProgressVariance(progressFinding.citations[0].quoted_span)
    : null;
  const recalculatedVariance = progressFinding ? eev2RoundOneOrNull(progressCalc.difference) : null;
  const responsibility = eev2ParseDelayResponsibilityProfile(responsibilityFinding ? responsibilityFinding.statement : "");

  return {
    engine_version: EEV2_LIVE_SCHEDULE_BRIDGE_VERSION,
    reconciliation_status: (progressFinding || delayFinding) ? "MULTI_SIGNAL_RECONCILIATION_AVAILABLE" : "LIMITED_RECONCILIATION",
    progress_position: {
      planned_progress_pct: progressFinding ? eev2RoundOneOrNull(progressCalc.budget) : null,
      actual_progress_pct: progressFinding ? eev2RoundOneOrNull(progressCalc.actual) : null,
      source_variance_pct_points: sourceVariance,
      recalculated_variance_pct_points: recalculatedVariance,
      variance_consistency: progressFinding
        ? eev2ResolveProgressVarianceConsistency(progressFinding.variance_consistency, sourceVariance, recalculatedVariance)
        : "NOT_AVAILABLE",
      critical_path_relation: "NOT_ESTABLISHED",
      causal_explanation_status: "NOT_ESTABLISHED"
    },
    delay_position: {
      observed_delay_event_days: delayFinding ? Number(delayFinding.days || 0) : null,
      contractor_non_excusable_days: responsibility.contractor_non_excusable_days,
      client_days: responsibility.client_days,
      neutral_external_days: responsibility.neutral_external_days,
      unclassified_days: 0,
      critical_path_impact: "NOT_ESTABLISHED",
      concurrency_status: "NOT_ESTABLISHED",
      float_impact_status: "NOT_ESTABLISHED",
      entitlement_status: "REQUIRES_CONTRACT_AND_SCHEDULE_REVIEW"
    },
    eot_position: {
      eot_count: 0,
      review_required_count: 0,
      entitlement_conclusion: "NOT_ESTABLISHED",
      critical_path_entitlement: "NOT_ESTABLISHED",
      compensability_conclusion: "NOT_ESTABLISHED",
      items: []
    },
    relationship_statement: (progressFinding && delayFinding)
      ? "Progress slippage and observed delay events coexist in the cited reporting evidence. Their causal relationship is not established."
      : "Structured schedule evidence is available, but a causal relationship is not established.",
    causal_link_status: "NOT_ESTABLISHED",
    delay_to_cost_causation: "NOT_ESTABLISHED",
    progress_to_cost_causation: "NOT_ESTABLISHED",
    critical_path_impact: "NOT_ESTABLISHED",
    contractual_entitlement: "NOT_ESTABLISHED",
    compensability: "NOT_ESTABLISHED",
    recoverability: "NOT_ESTABLISHED",
    safety_statement: "Observed delay-event days are not equivalent to project critical-path delay. Cross-document coexistence does not establish cost causation, entitlement, compensability or recoverability."
  };
}

function eev2FiniteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function eev2RoundOneOrNull(value) {
  const n = eev2FiniteOrNull(value);
  return n === null ? null : Number(n.toFixed(1));
}

function eev2ResolveProgressVarianceConsistency(existing, sourceVariance, recalculatedVariance) {
  const current = String(existing || "").trim();
  if (current && current !== "NOT_AVAILABLE") return current;
  if (sourceVariance === null || recalculatedVariance === null) return "INSUFFICIENT_DATA";
  return Math.abs(sourceVariance - recalculatedVariance) <= 0.05
    ? "SOURCE_MATCHES_RECALCULATION"
    : "ROUNDING_DIFFERENCE_REVIEW";
}

function eev2ParseSourceProgressVariance(text) {
  const m = /Variance\s*=\s*(-?\d+(?:\.\d+)?)\s*%/i.exec(String(text || ""));
  return m ? Number(m[1]) : null;
}

function eev2ParseDelayResponsibilityProfile(statement) {
  const text = String(statement || "");
  function extract(re) {
    const m = re.exec(text);
    return m ? Number(m[1]) : 0;
  }
  return {
    contractor_non_excusable_days: extract(/contractor\s+non[- ]?excusable\s+(\d+(?:\.\d+)?)\s+days?/i),
    client_days: extract(/client\s+(\d+(?:\.\d+)?)\s+days?/i),
    neutral_external_days: extract(/neutral\/external\s+(\d+(?:\.\d+)?)\s+days?/i)
  };
}

function eev2AttachLiveSchedulePosition(browserReport) {
  const report = browserReport || {};
  const reconciliation = eev2FindingsToLiveScheduleReconciliation(report.findings || []);
  report.eev2_schedule_reconciliation = reconciliation;
  report.eev2_executive_schedule_summary = eev2BuildExecutiveScheduleSummary(reconciliation);
  report.eev2_executive_schedule_headline = eev2ExecutiveScheduleHeadline(reconciliation);
  report.eev2_executive_schedule_text = eev2ExecutiveScheduleTextLines(reconciliation);
  report.eev2_executive_schedule_html = eev2ExecutiveScheduleHtml(reconciliation);
  return report;
}