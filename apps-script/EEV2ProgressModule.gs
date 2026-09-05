// Constrovet Evidence Engine v2 — EEV2-002C
// Deterministic structured progress extraction.
// Safety rule: preserve source-reported variance and show recalculated variance separately.

const EEV2_PROGRESS_ENGINE_VERSION = "2.0.0-dev.3";

function eev2ClassifyProgressDocument(file, text) {
  const source = String(text || "").replace(/\s+/g, " ").toLowerCase();
  const name = String(file || "").toLowerCase();
  const anchors = [
    /activity progress/,
    /activity[- ]wise progress report/,
    /overall project progress/,
    /planned\s*(?:progress)?\s*%?/,
    /actual\s*(?:progress)?\s*%?/,
    /variance/,
    /(?:project\s*)?id\s*:/,
    /generated\s*:/
  ];
  const score = anchors.reduce((sum, re) => sum + (re.test(source) ? 1 : 0), 0);
  const filenameHint = /progress|activity|schedule/.test(name);
  if (score >= 3 || (filenameHint && score >= 2)) {
    return {
      type: "PROGRESS_REPORT",
      confidence: score >= 5 ? "HIGH" : "MEDIUM",
      anchor_count: score
    };
  }
  return { type: "UNKNOWN", confidence: "LOW", anchor_count: score };
}

function eev2ProgressNormalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function eev2ProgressExtractProjectId(text) {
  const patterns = [
    /(?:Project\s*ID|Activity\s*Progress\s*ID)\s*[:\-]?\s*([A-Z0-9_-]+)/i,
    /\bID\s*[:\-]\s*([A-Z0-9_-]+)/i
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const m = patterns[i].exec(text);
    if (m) return m[1];
  }
  return "";
}

function eev2ProgressExtractReportDate(text) {
  const m = /Generated\s*:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i.exec(text);
  return m ? m[1] : "";
}

function eev2ProgressExtractMonth(text) {
  const patterns = [
    /Month\s*[:\-]?\s*(\d+)\s*\/\s*(\d+)/i,
    /Month\s*[:\-]?\s*(\d+)\s+of\s+(\d+)/i
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const m = patterns[i].exec(text);
    if (m) return { current: Number(m[1]), total: Number(m[2]) };
  }
  return null;
}

function eev2ProgressExtractOverall(text) {
  const source = eev2ProgressNormalizeText(text);
  const overallWindowMatch = /Overall\s+Project\s+Progress\s*:?\s*([\s\S]{0,220})/i.exec(source);
  const overallWindow = overallWindowMatch ? overallWindowMatch[0] : source;
  const separator = "[:=\\-]?";
  const plannedPatterns = [
    new RegExp(`Planned\\s*(?:Progress)?\\s*${separator}\\s*(-?\\d+(?:\\.\\d+)?)\\s*%`, "i"),
    /Planned\s*=\s*(-?\d+(?:\.\d+)?)\s*%/i
  ];
  const actualPatterns = [
    new RegExp(`Actual\\s*(?:Progress)?\\s*${separator}\\s*(-?\\d+(?:\\.\\d+)?)\\s*%`, "i"),
    /Actual\s*=\s*(-?\d+(?:\.\d+)?)\s*%/i
  ];
  const variancePatterns = [
    new RegExp(`(?:Source\\s*)?Variance\\s*${separator}\\s*(-?\\d+(?:\\.\\d+)?)\\s*%`, "i"),
    /Progress\s*Variance\s*=\s*(-?\d+(?:\.\d+)?)\s*%/i
  ];

  function firstMatch(patterns) {
    for (let i = 0; i < patterns.length; i += 1) {
      const m = patterns[i].exec(overallWindow);
      if (m) return Number(m[1]);
    }
    return null;
  }

  const planned = firstMatch(plannedPatterns);
  const actual = firstMatch(actualPatterns);
  const sourceVariance = firstMatch(variancePatterns);
  const recalculated = planned !== null && actual !== null
    ? Number((actual - planned).toFixed(1))
    : null;

  let consistency = "INSUFFICIENT_DATA";
  if (sourceVariance !== null && recalculated !== null) {
    consistency = Math.abs(sourceVariance - recalculated) <= 0.05
      ? "SOURCE_MATCHES_RECALCULATION"
      : "ROUNDING_DIFFERENCE_REVIEW";
  }

  return {
    planned_progress_pct: planned,
    actual_progress_pct: actual,
    source_variance_pct_points: sourceVariance,
    recalculated_variance_pct_points: recalculated,
    variance_consistency: consistency
  };
}

function eev2ProgressActivityRowRegex(labelPattern) {
  return new RegExp(
    `${labelPattern}\\s+(\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)\\s*%\\s+(\\d+(?:\\.\\d+)?)\\s*%`,
    "i"
  );
}

function eev2ProgressSimpleActivityRowRegex(labelPattern) {
  return new RegExp(
    `${labelPattern}\\s+(\\d+(?:\\.\\d+)?)\\s*%?\\s+(\\d+(?:\\.\\d+)?)\\s*%?`,
    "i"
  );
}

function eev2ProgressExtractActivities(text) {
  const source = eev2ProgressNormalizeText(text);
  const specs = [
    { activity: "Internal Plastering", label: "Internal\\s+Plastering" },
    { activity: "Flooring Lower", label: "Flooring\\s*-?\\s*Lower(?:\\s+Floors)?" },
    { activity: "Flooring Upper", label: "Flooring\\s*-?\\s*Upper(?:\\s+Floors)?" },
    { activity: "Doors", label: "Doors(?:,?\\s+Windows\\s*&\\s*Glazing)?" },
    { activity: "MEP Final Fix", label: "MEP\\s+Final\\s+Fix(?:\\s*&\\s*Testing)?" },
    { activity: "Painting", label: "Painting(?:\\s*-?\\s*Interior)?" }
  ];

  const rows = [];
  specs.forEach((spec) => {
    const detailed = eev2ProgressActivityRowRegex(spec.label).exec(source);
    if (detailed) {
      const planned = Number(detailed[3]);
      const actual = Number(detailed[4]);
      rows.push({
        activity: spec.activity,
        planned_start_week: Number(detailed[1]),
        planned_end_week: Number(detailed[2]),
        planned_pct: planned,
        actual_pct: actual,
        variance_pct_points: Number((actual - planned).toFixed(1)),
        quoted_evidence: detailed[0]
      });
      return;
    }

    const simple = eev2ProgressSimpleActivityRowRegex(spec.label).exec(source);
    if (!simple) return;
    const planned = Number(simple[1]);
    const actual = Number(simple[2]);
    rows.push({
      activity: spec.activity,
      planned_start_week: null,
      planned_end_week: null,
      planned_pct: planned,
      actual_pct: actual,
      variance_pct_points: Number((actual - planned).toFixed(1)),
      quoted_evidence: simple[0]
    });
  });
  return rows;
}

function eev2ExtractProgressEvidence(file, pageOrSheet, text) {
  const classification = eev2ClassifyProgressDocument(file, text);
  if (classification.type !== "PROGRESS_REPORT") return null;
  const source = eev2ProgressNormalizeText(text);
  const overall = eev2ProgressExtractOverall(source);
  const activities = eev2ProgressExtractActivities(source);

  const activityAbovePlanCount = activities.filter((row) => row.actual_pct > row.planned_pct).length;
  const overallBehindPlan = overall.actual_progress_pct !== null && overall.planned_progress_pct !== null
    ? overall.actual_progress_pct < overall.planned_progress_pct
    : false;

  return {
    engine_version: EEV2_PROGRESS_ENGINE_VERSION,
    document_type: "PROGRESS_REPORT",
    classification_confidence: classification.confidence,
    source_file: file,
    source_page_or_extraction_label: pageOrSheet,
    project_id: eev2ProgressExtractProjectId(source),
    report_date: eev2ProgressExtractReportDate(source),
    month: eev2ProgressExtractMonth(source),
    planned_progress_pct: overall.planned_progress_pct,
    actual_progress_pct: overall.actual_progress_pct,
    source_variance_pct_points: overall.source_variance_pct_points,
    recalculated_variance_pct_points: overall.recalculated_variance_pct_points,
    variance_consistency: overall.variance_consistency,
    activity_progress: activities,
    activity_above_plan_count: activityAbovePlanCount,
    portfolio_consistency_flag: overallBehindPlan && activityAbovePlanCount > 0
      ? "OVERALL_BEHIND_WHILE_LISTED_ACTIVITIES_ABOVE_PLAN_REVIEW_WEIGHTING_OR_OMITTED_SCOPE"
      : "NO_STRUCTURAL_INCONSISTENCY_DETECTED",
    causal_explanation_status: "NOT_ESTABLISHED",
    critical_path_relation: "NOT_ESTABLISHED",
    safety_statement: "Source-reported progress variance is preserved. Recalculated variance is shown separately; no cause or critical-path implication is inferred without schedule evidence."
  };
}

// A missing variance must not render as the literal word "null" in a client
// report. It also must not masquerade as a verbatim quotation -- this span is
// assembled from the document's values, so it is flagged derived.
// Used in the finding STATEMENT. The citation helper below covers the quoted
// span; this one covers the sentence the client actually reads first.
function eev2StatedVariancePhrase_(value) {
  const formatted = eev2FormatStatedVariance_(value);
  return formatted === "not stated in the document" ? "was not stated in the document" : `is ${formatted} points`;
}

function eev2FormatStatedVariance_(value) {
  if (value === null || value === undefined || value === "") return "not stated in the document";
  if (typeof value === "number" && !isFinite(value)) return "not stated in the document";
  if (String(value).toLowerCase() === "null" || String(value).toLowerCase() === "nan") return "not stated in the document";
  return `${value}%`;
}

function eev2ProgressEvidenceToFindings(evidence) {
  if (!evidence || evidence.document_type !== "PROGRESS_REPORT") return [];
  const findings = [];
  const file = evidence.source_file || "";
  const page = evidence.source_page_or_extraction_label || "Workspace OCR";

  if (evidence.planned_progress_pct !== null && evidence.actual_progress_pct !== null) {
    findings.push({
      statement: `Overall progress is ${evidence.actual_progress_pct}% actual versus ${evidence.planned_progress_pct}% planned. Source variance ${eev2StatedVariancePhrase_(evidence.source_variance_pct_points)}; recalculated from displayed rounded values ${evidence.recalculated_variance_pct_points}% points.`,
      financial_category: "BASELINE_BUDGET",
      amount_inr: 0,
      exposure_amount_inr: 0,
      days: 0,
      citations: [{
        file,
        page_or_sheet: page,
        derived: true,
        quoted_span: `Overall Project Progress: Planned = ${evidence.planned_progress_pct}% | Actual = ${evidence.actual_progress_pct}% | Variance = ${eev2FormatStatedVariance_(evidence.source_variance_pct_points)}`
      }],
      calculation: {
        budget: evidence.planned_progress_pct,
        actual: evidence.actual_progress_pct,
        difference: evidence.recalculated_variance_pct_points,
        formula: "Actual progress % - Planned progress %"
      },
      confidence: evidence.classification_confidence || "MEDIUM",
      eev2_semantic_classification: "PROGRESS_VARIANCE",
      recoverability_guardrail: "NOT_APPLICABLE",
      variance_consistency: evidence.variance_consistency,
      causal_explanation_status: "NOT_ESTABLISHED"
    });
  }

  if (evidence.portfolio_consistency_flag !== "NO_STRUCTURAL_INCONSISTENCY_DETECTED") {
    findings.push({
      statement: "Overall project progress is behind plan while several listed activities are individually above plan; review activity weighting, omitted scope, or baseline logic before attributing cause.",
      financial_category: "BASELINE_BUDGET",
      amount_inr: 0,
      exposure_amount_inr: 0,
      days: 0,
      citations: (evidence.activity_progress || []).slice(0, 6).map((row) => ({
        file,
        page_or_sheet: page,
        quoted_span: row.quoted_evidence || row.activity
      })),
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Compare overall progress status with listed activity-level variances" },
      confidence: evidence.classification_confidence || "MEDIUM",
      eev2_semantic_classification: "PROGRESS_WEIGHTING_REVIEW",
      recoverability_guardrail: "NOT_APPLICABLE",
      causal_explanation_status: "NOT_ESTABLISHED"
    });
  }

  return findings;
}

function eev2ExtractStructuredProgressFindings(file, pageOrSheet, text) {
  const evidence = eev2ExtractProgressEvidence(file, pageOrSheet, text);
  return {
    document_type: evidence ? "PROGRESS_REPORT" : "UNKNOWN",
    progress_evidence: evidence,
    findings: eev2ProgressEvidenceToFindings(evidence)
  };
}