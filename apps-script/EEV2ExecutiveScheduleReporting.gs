// Constrovet Evidence Engine v2 — EEV2-002E
// Executive Schedule Reporting helpers.
// Safety rule: surface schedule intelligence without converting observed event days into project delay or inferred cost causation.

const EEV2_EXECUTIVE_SCHEDULE_REPORTING_VERSION = "2.0.0-dev.1";

function eev2BuildExecutiveScheduleSummary(reconciliation) {
  const r = reconciliation || {};
  const progress = r.progress_position || {};
  const delay = r.delay_position || {};
  const eot = r.eot_position || {};

  const hasProgress = progress.planned_progress_pct !== null && progress.planned_progress_pct !== undefined &&
    progress.actual_progress_pct !== null && progress.actual_progress_pct !== undefined;
  const hasDelay = delay.observed_delay_event_days !== null && delay.observed_delay_event_days !== undefined;

  return {
    engine_version: EEV2_EXECUTIVE_SCHEDULE_REPORTING_VERSION,
    status: hasProgress || hasDelay ? "STRUCTURED_SCHEDULE_POSITION_AVAILABLE" : "NO_STRUCTURED_SCHEDULE_POSITION",
    planned_progress_pct: hasProgress ? Number(progress.planned_progress_pct) : null,
    actual_progress_pct: hasProgress ? Number(progress.actual_progress_pct) : null,
    source_variance_pct_points: progress.source_variance_pct_points !== null && progress.source_variance_pct_points !== undefined
      ? Number(progress.source_variance_pct_points)
      : null,
    recalculated_variance_pct_points: progress.recalculated_variance_pct_points !== null && progress.recalculated_variance_pct_points !== undefined
      ? Number(progress.recalculated_variance_pct_points)
      : null,
    variance_consistency: progress.variance_consistency || "NOT_AVAILABLE",
    observed_delay_event_days: hasDelay ? Number(delay.observed_delay_event_days) : null,
    contractor_non_excusable_days: Number(delay.contractor_non_excusable_days || 0),
    client_days: Number(delay.client_days || 0),
    neutral_external_days: Number(delay.neutral_external_days || 0),
    unclassified_days: Number(delay.unclassified_days || 0),
    critical_path_impact: delay.critical_path_impact || r.critical_path_impact || "NOT_ESTABLISHED",
    concurrency_status: delay.concurrency_status || "NOT_ESTABLISHED",
    float_impact_status: delay.float_impact_status || "NOT_ESTABLISHED",
    eot_count: Number(eot.eot_count || 0),
    eot_review_required_count: Number(eot.review_required_count || 0),
    contractual_entitlement: r.contractual_entitlement || eot.entitlement_conclusion || "NOT_ESTABLISHED",
    compensability: r.compensability || eot.compensability_conclusion || "NOT_ESTABLISHED",
    causal_link_status: r.causal_link_status || "NOT_ESTABLISHED",
    relationship_statement: r.relationship_statement || "",
    safety_statement: "Observed delay-event days are not equivalent to project critical-path delay. Cross-document coexistence does not establish cost causation, entitlement, compensability or recoverability."
  };
}

function eev2ExecutiveScheduleHeadline(reconciliation) {
  const s = eev2BuildExecutiveScheduleSummary(reconciliation);
  const parts = [];

  if (s.actual_progress_pct !== null && s.planned_progress_pct !== null) {
    parts.push(`progress ${s.actual_progress_pct}% actual vs ${s.planned_progress_pct}% planned`);
  }
  if (s.observed_delay_event_days !== null) {
    parts.push(`${s.observed_delay_event_days} observed delay-event days`);
  }
  if (!parts.length) return "No structured schedule position was extracted.";

  return `Schedule position: ${parts.join("; ")}. Critical-path impact: ${s.critical_path_impact}. Causal relationship to cost exposure: ${s.causal_link_status}.`;
}

function eev2ExecutiveScheduleTextLines(reconciliation) {
  const s = eev2BuildExecutiveScheduleSummary(reconciliation);
  if (s.status !== "STRUCTURED_SCHEDULE_POSITION_AVAILABLE") return [];

  const lines = ["Schedule Position"];
  if (s.planned_progress_pct !== null) lines.push(`Planned progress: ${s.planned_progress_pct}%`);
  if (s.actual_progress_pct !== null) lines.push(`Actual progress: ${s.actual_progress_pct}%`);
  if (s.source_variance_pct_points !== null) lines.push(`Reported source variance: ${s.source_variance_pct_points} percentage points`);
  if (s.recalculated_variance_pct_points !== null) lines.push(`Recalculated variance: ${s.recalculated_variance_pct_points} percentage points`);
  lines.push(`Variance consistency: ${s.variance_consistency}`);
  if (s.observed_delay_event_days !== null) lines.push(`Observed delay-event days: ${s.observed_delay_event_days}`);
  lines.push(`Contractor non-excusable: ${s.contractor_non_excusable_days} days`);
  lines.push(`Client-caused: ${s.client_days} days`);
  lines.push(`Neutral / external: ${s.neutral_external_days} days`);
  lines.push(`Critical-path impact: ${s.critical_path_impact}`);
  lines.push(`Concurrency: ${s.concurrency_status}`);
  lines.push(`Float impact: ${s.float_impact_status}`);
  lines.push(`EOT records: ${s.eot_count}; review flags: ${s.eot_review_required_count}`);
  lines.push(`Contractual entitlement: ${s.contractual_entitlement}`);
  lines.push(`Compensability: ${s.compensability}`);
  lines.push(`Causal relationship to cost exposure: ${s.causal_link_status}`);
  return lines;
}

function eev2ExecutiveScheduleHtml(reconciliation) {
  const s = eev2BuildExecutiveScheduleSummary(reconciliation);
  if (s.status !== "STRUCTURED_SCHEDULE_POSITION_AVAILABLE") return "";

  const esc = (value) => String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

  const rows = [];
  if (s.planned_progress_pct !== null) rows.push(["Planned progress", `${s.planned_progress_pct}%`]);
  if (s.actual_progress_pct !== null) rows.push(["Actual progress", `${s.actual_progress_pct}%`]);
  if (s.source_variance_pct_points !== null) rows.push(["Reported variance", `${s.source_variance_pct_points} pp`]);
  if (s.recalculated_variance_pct_points !== null) rows.push(["Recalculated variance", `${s.recalculated_variance_pct_points} pp`]);
  if (s.observed_delay_event_days !== null) rows.push(["Observed delay-event days", s.observed_delay_event_days]);
  rows.push(["Contractor non-excusable", `${s.contractor_non_excusable_days} days`]);
  rows.push(["Client-caused", `${s.client_days} days`]);
  rows.push(["Neutral / external", `${s.neutral_external_days} days`]);
  rows.push(["Critical-path impact", s.critical_path_impact]);
  rows.push(["EOT review flags", `${s.eot_review_required_count} of ${s.eot_count}`]);
  rows.push(["Contractual entitlement", s.contractual_entitlement]);
  rows.push(["Causal link to cost exposure", s.causal_link_status]);

  const body = rows.map(([label, value]) => `<tr><td style="border:1px solid #d9ded8;padding:8px"><strong>${esc(label)}</strong></td><td style="border:1px solid #d9ded8;padding:8px">${esc(value)}</td></tr>`).join("");
  return `<h2 style="font-size:18px;margin:18px 0 8px">Schedule Position</h2><table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:8px 0 14px;width:100%;max-width:680px">${body}</table><p style="margin:0 0 12px;color:#66737d">${esc(s.safety_statement)}</p>`;
}

function eev2BuildScheduleValidationAction(reconciliation) {
  const s = eev2BuildExecutiveScheduleSummary(reconciliation);
  if (s.status !== "STRUCTURED_SCHEDULE_POSITION_AVAILABLE") return null;
  if (s.observed_delay_event_days === null && s.actual_progress_pct === null) return null;

  const scheduleParts = [];
  if (s.observed_delay_event_days !== null) scheduleParts.push(`${s.observed_delay_event_days} observed delay-event days`);
  if (s.actual_progress_pct !== null && s.planned_progress_pct !== null) scheduleParts.push(`${s.actual_progress_pct}% actual vs ${s.planned_progress_pct}% planned progress`);

  return {
    title: "Validate schedule impact",
    recommendation: `Reconcile ${scheduleParts.join(" and ")} against the current approved programme, activity float, critical path, concurrency and contemporaneous notices before attributing project delay or cost impact.`,
    owner_role: "Planning / Project Controls",
    due_horizon: "7 days",
    evidence_status: "STRUCTURED_SCHEDULE_EVIDENCE_CRITICAL_PATH_NOT_ESTABLISHED",
    blocked_by_missing_evidence: true,
    actionability: typeof ACTION_EVIDENCE_FOLLOWUP !== "undefined" ? ACTION_EVIDENCE_FOLLOWUP : "EVIDENCE_FOLLOWUP",
    critical_path_impact: "NOT_ESTABLISHED",
    causal_link_status: "NOT_ESTABLISHED"
  };
}

function eev2BuildScheduleCommercialAction(reconciliation) {
  const s = eev2BuildExecutiveScheduleSummary(reconciliation);
  if (!s.eot_count && s.observed_delay_event_days === null) return null;

  return {
    title: "Resolve responsibility and EOT position",
    recommendation: "Review contractor-controlled, client-caused and neutral/external delay events against contract clauses, notices, EOT records and the contemporaneous programme. Do not infer entitlement or compensability from the delay register alone.",
    owner_role: "Contracts / Planning",
    due_horizon: "30 days",
    evidence_status: "ENTITLEMENT_AND_COMPENSABILITY_NOT_ESTABLISHED",
    blocked_by_missing_evidence: true,
    actionability: typeof ACTION_EVIDENCE_FOLLOWUP !== "undefined" ? ACTION_EVIDENCE_FOLLOWUP : "EVIDENCE_FOLLOWUP",
    contractual_entitlement: "NOT_ESTABLISHED",
    compensability: "NOT_ESTABLISHED"
  };
}
