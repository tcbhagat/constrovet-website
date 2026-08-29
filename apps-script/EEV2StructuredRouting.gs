// Constrovet Evidence Engine v2 — TEST-only structured routing helper.
// Safe integration target for extractBoardroomFindings().
// Routing order: cost -> delay -> progress -> legacy fallback.

function eev2RouteStructuredBoardroomFindings(file, pageOrSheet, text) {
  const cost = eev2ExtractStructuredFindings(file, pageOrSheet, text);
  if (cost && cost.document_type === "COST_ESTIMATE") {
    return {
      handled: true,
      document_type: "COST_ESTIMATE",
      findings: cost.findings || []
    };
  }

  const delay = eev2ExtractStructuredDelayFindings(file, pageOrSheet, text);
  if (delay && delay.document_type === "DELAY_ANALYSIS") {
    return {
      handled: true,
      document_type: "DELAY_ANALYSIS",
      findings: delay.findings || [],
      delay_evidence: delay.delay_evidence || null
    };
  }

  const progress = eev2ExtractStructuredProgressFindings(file, pageOrSheet, text);
  if (progress && progress.document_type === "PROGRESS_REPORT") {
    return {
      handled: true,
      document_type: "PROGRESS_REPORT",
      findings: progress.findings || [],
      progress_evidence: progress.progress_evidence || null
    };
  }

  return {
    handled: false,
    document_type: "UNKNOWN",
    findings: []
  };
}
