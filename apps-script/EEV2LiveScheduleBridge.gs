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
  const eotEntries = list
    .filter((item) => String((item || {}).eev2_semantic_classification || "").toUpperCase() === "EOT_STATUS")
    .map((item) => eev2EotFindingToLiveEntry(item));

  // Aggregate variation order schedule days into client-caused delay.
  // VO findings have days and category BASELINE_BUDGET, marking them as client-instructed/approved costs.
  const voAggregation = eev2AggregateAndListVoScheduleDays(list);
  const voScheduleDays = voAggregation.days;
  const voEntries = voAggregation.entries;

  const reconciliation = eev2BuildCrossDocumentReconciliation({
    findings: list,
    progress_evidence: {
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
    delay_evidence: {
      total_observed_delay_event_days: delayFinding ? Number(delayFinding.days || 0) : null,
      responsibility_summary: {
        contractor_non_excusable_days: responsibility.contractor_non_excusable_days,
        client_days: responsibility.client_days + voScheduleDays,
        neutral_external_days: responsibility.neutral_external_days,
        unclassified_days: 0
      },
      critical_path_impact: "NOT_ESTABLISHED",
      concurrency_status: "NOT_ESTABLISHED",
      float_impact_status: "NOT_ESTABLISHED",
      entitlement_status: "REQUIRES_CONTRACT_AND_SCHEDULE_REVIEW"
    },
    variation_order_evidence: {
      entries: voEntries,
      total_approved_schedule_impact_days: voScheduleDays
    },
    eot_evidence: {
      entries: eotEntries,
      entitlement_conclusion: "NOT_ESTABLISHED",
      critical_path_entitlement: "NOT_ESTABLISHED",
      compensability_conclusion: "NOT_ESTABLISHED"
    }
  });

  reconciliation.engine_version = EEV2_LIVE_SCHEDULE_BRIDGE_VERSION;
  return reconciliation;
}

function eev2EotFindingToLiveEntry(finding) {
  const item = finding || {};
  const statement = String(item.statement || "");
  const reference = (/\b(EOT-[A-Z0-9/-]+)/i.exec(statement) || [])[1] || "";
  const basis = (/\bbasis\s+(.+?);\s*claimed\b/i.exec(statement) || [])[1] || "";
  const claimed = (/\bclaimed\s+(\d+(?:\.\d+)?)\s+day/i.exec(statement) || [])[1];
  const approved = (/\bapproved\s+(\d+(?:\.\d+)?)/i.exec(statement) || [])[1];
  const status = (/\bstatus\s+([A-Z_]+)/i.exec(statement) || [])[1] || "";
  return {
    eot_reference: reference,
    basis,
    days_claimed: claimed === undefined ? null : Number(claimed),
    days_approved: approved === undefined ? null : Number(approved),
    status,
    consistency_flags: item.consistency_flags || []
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

function eev2AggregateAndListVoScheduleDays(findings) {
  // Aggregate and list all variation order findings.
  // VO findings are categorized as BASELINE_BUDGET and include days where approved/client-instructed.
  // Returns: { days: sum of positive-days VOs, entries: all VOs with and without days for visibility }
  // Zero-day VOs appear in entries for completeness but do not contribute to the sum.
  const voFindings = (findings || []).filter((f) =>
    String((f || {}).financial_category || "").toUpperCase() === "BASELINE_BUDGET"
  );

  const entries = voFindings.map((finding) => {
    const statement = String((finding || {}).statement || "");
    const voRef = (/\b(VO[-\s]?\d+(?:\/\d+)?)/i.exec(statement) || [])[1] || "";
    const amount = Number((finding || {}).amount_inr || 0);
    const days = Number((finding || {}).days || 0);
    return {
      vo_reference: voRef,
      amount_inr: amount,
      schedule_impact_days: days,
      statement: statement,
      has_schedule_impact: days > 0
    };
  });

  const daysSum = voFindings.reduce((sum, finding) => {
    const days = Number((finding || {}).days || 0);
    return days > 0 ? sum + days : sum;
  }, 0);

  return {
    days: daysSum,
    entries: entries
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
