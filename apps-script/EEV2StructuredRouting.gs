// Constrovet Evidence Engine v2 — TEST-only structured routing helper.
// Safe integration target for extractBoardroomFindings().
// Routing order: cost -> delay -> progress -> legacy fallback.
//
// A branch only short-circuits (handled: true) once it has actually produced at
// least one finding. Recognizing a document's TYPE (its classifier anchors matched)
// is not the same as having extracted anything from it -- each structured module's
// row/field extractor is narrow and tuned to a specific table format, and a document
// can legitimately be "obviously a delay/EOT/cost/progress document" while using
// prose or a table shape none of those extractors recognize. Confirmed 1 Sept 2026 on
// a real production EOT claim (job form-20260901-065442-a02da09c): a genuine 24-page
// Extension-of-Time claim, containing "27 calendar days delay" and "47 calendar days
// delay" in plain language, was correctly classified DELAY_ANALYSIS by the classifier
// (it matched "delay analysis", "extension of time", "responsibility", etc.), but the
// delay module's row extractor only recognizes five hardcoded event patterns (Labour
// Shortage, Delayed client approval, Rainfall, MSEDCL/utility, Batching plant
// breakdown) and its "TOTAL DELAY THIS MONTH: N" total line -- none of which this
// narrative claim document uses. That extractor correctly found zero rows, but the
// old code still returned handled: true with an empty findings array, which stopped
// extractBoardroomFindings() from ever falling through to the generic keyword/window
// scan below -- the one that WOULD have cited "27 calendar days delay" as evidence.
// The client's real evidence was silently and completely dropped, and the client saw
// "no construction cost, schedule, leakage, commercial-control, or ESG keywords were
// found" for a document that plainly discussed schedule delay throughout.
//
// Falling through to the next module (and ultimately to the legacy fallback) when a
// branch found nothing is strictly additive: it can only ADD findings that the
// generic scanner independently matches and can cite -- it never removes or weakens
// anything a structured module DID successfully extract.

function eev2RouteStructuredBoardroomFindings(file, pageOrSheet, text) {
  const cost = eev2ExtractStructuredFindings(file, pageOrSheet, text);
  if (cost && cost.document_type === "COST_ESTIMATE" && (cost.findings || []).length) {
    return {
      handled: true,
      document_type: "COST_ESTIMATE",
      findings: cost.findings || []
    };
  }

  const delay = eev2ExtractStructuredDelayFindings(file, pageOrSheet, text);
  if (delay && delay.document_type === "DELAY_ANALYSIS") {
    const eot = eev2ExtractStructuredEotFindings(file, pageOrSheet, text);
    const delayFindings = (delay.findings || []).concat(
      eot && eot.document_type === "EOT_REGISTER" ? (eot.findings || []) : []
    );
    if (delayFindings.length) {
      return {
        handled: true,
        document_type: "DELAY_ANALYSIS",
        findings: delayFindings,
        delay_evidence: delay.delay_evidence || null,
        eot_evidence: eot && eot.document_type === "EOT_REGISTER" ? eot.eot_evidence : null
      };
    }
  }

  const progress = eev2ExtractStructuredProgressFindings(file, pageOrSheet, text);
  if (progress && progress.document_type === "PROGRESS_REPORT" && (progress.findings || []).length) {
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
