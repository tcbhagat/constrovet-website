// Constrovet Evidence Engine v2 — EEV2-002A
// Deterministic structured delay extraction.
// Safety rule: observed delay-event days are not equivalent to critical-path project delay.

const EEV2_DELAY_ENGINE_VERSION = "2.0.0-dev.1";

function eev2ClassifyDelayDocument(file, text) {
  const source = String(text || "").replace(/\s+/g, " ").toLowerCase();
  const name = String(file || "").toLowerCase();
  const anchors = [
    /delay analysis/,
    /cause of delay/,
    /days lost/,
    /responsibility/,
    /delay type/,
    /total delay this month/,
    /extension of time|\beot\b/
  ];
  const score = anchors.reduce((sum, re) => sum + (re.test(source) ? 1 : 0), 0);
  const filenameHint = /delay|eot|schedule/.test(name);
  if (score >= 3 || (filenameHint && score >= 2)) {
    return {
      type: "DELAY_ANALYSIS",
      confidence: score >= 5 ? "HIGH" : "MEDIUM",
      anchor_count: score
    };
  }
  return { type: "UNKNOWN", confidence: "LOW", anchor_count: score };
}

function eev2DelayNormalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function eev2DelayExtractNumber(text, regex) {
  const m = regex.exec(text);
  return m ? Number(m[1]) : null;
}

function eev2DelayExtractProjectId(text) {
  const m = /(?:Delay Analysis ID|Project ID)\s*[:\-]?\s*([A-Z0-9_-]+)/i.exec(text);
  return m ? m[1] : "";
}

function eev2DelayExtractReportDate(text) {
  const m = /Generated\s*:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i.exec(text);
  return m ? m[1] : "";
}

function eev2DelayExtractTotalObservedDays(text) {
  const patterns = [
    /TOTAL\s+DELAY\s+THIS\s+MONTH\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /TOTAL\s+DELAY\s*[:\-]?\s*(\d+(?:\.\d+)?)/i
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const value = eev2DelayExtractNumber(text, patterns[i]);
    if (value !== null) return value;
  }
  return null;
}

function eev2DelayCanonicalResponsibility(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (/contractor/.test(value)) return "CONTRACTOR";
  if (/client|employer|owner/.test(value)) return "CLIENT";
  if (/external|authority|utility|msedcl/.test(value)) return "EXTERNAL";
  if (/neutral|weather|rain|monsoon|force majeure/.test(value)) return "NEUTRAL";
  return "UNKNOWN";
}

function eev2DelayCanonicalType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (/non[- ]?excusable/.test(value)) return "NON_EXCUSABLE";
  if (/compensable/.test(value)) return "EXCUSABLE_COMPENSABLE";
  if (/excusable/.test(value)) return "EXCUSABLE";
  return "UNKNOWN";
}

function eev2DelayExtractKnownEvents(text) {
  const source = eev2DelayNormalizeText(text);
  const specs = [
    {
      cause: "Labour shortage",
      re: /Labour\s+Shortage[^0-9]{0,180}(\d+(?:\.\d+)?)\s+Contractor\s+Non[- ]?excusable/i,
      responsibility: "CONTRACTOR",
      delay_type: "NON_EXCUSABLE"
    },
    {
      cause: "Delayed client approval",
      re: /Delayed\s+approval[^0-9]{0,220}(\d+(?:\.\d+)?)\s+Client\s+Excusable/i,
      responsibility: "CLIENT",
      delay_type: "EXCUSABLE"
    },
    {
      cause: "Rainfall / weather",
      re: /(?:Rainfall|Heavy\s+rain|Monsoon)[^0-9]{0,220}(\d+(?:\.\d+)?)[^A-Za-z]{0,20}(?:Neutral|External|Weather)?[^A-Za-z]{0,20}(?:Excusable(?:\s*\+?\s*Compensable)?|Compensable)?/i,
      responsibility: "NEUTRAL",
      delay_type: "EXCUSABLE_COMPENSABLE"
    },
    {
      cause: "MSEDCL / utility power interruption",
      re: /(?:MSEDCL|power\s+cut|electricity\s+cut)[^0-9]{0,220}(\d+(?:\.\d+)?)/i,
      responsibility: "EXTERNAL",
      delay_type: "EXCUSABLE"
    },
    {
      cause: "Batching plant breakdown",
      re: /(?:Batching\s+plant\s+breakdown|plant\s+breakdown)[^0-9]{0,220}(\d+(?:\.\d+)?)[^A-Za-z]{0,40}Contractor[^A-Za-z]{0,40}Non[- ]?excusable/i,
      responsibility: "CONTRACTOR",
      delay_type: "NON_EXCUSABLE"
    }
  ];

  const events = [];
  specs.forEach((spec) => {
    const m = spec.re.exec(source);
    if (!m) return;
    events.push({
      cause: spec.cause,
      days_lost: Number(m[1]),
      responsibility: spec.responsibility,
      delay_type: spec.delay_type,
      critical_path_impact: "NOT_ESTABLISHED",
      compensability_status: spec.delay_type === "EXCUSABLE_COMPENSABLE" ? "SOURCE_INDICATES_COMPENSABLE_REVIEW_REQUIRED" : "NOT_ESTABLISHED",
      quoted_evidence: m[0].slice(0, 500)
    });
  });
  return events;
}

function eev2DelayResponsibilitySummary(events) {
  return (events || []).reduce((out, item) => {
    const days = Number(item.days_lost || 0);
    if (item.responsibility === "CONTRACTOR" && item.delay_type === "NON_EXCUSABLE") {
      out.contractor_non_excusable_days += days;
    } else if (item.responsibility === "CLIENT") {
      out.client_days += days;
    } else if (item.responsibility === "NEUTRAL" || item.responsibility === "EXTERNAL") {
      out.neutral_external_days += days;
    } else {
      out.unclassified_days += days;
    }
    return out;
  }, {
    contractor_non_excusable_days: 0,
    client_days: 0,
    neutral_external_days: 0,
    unclassified_days: 0
  });
}

function eev2ExtractDelayEvidence(file, pageOrSheet, text) {
  const classification = eev2ClassifyDelayDocument(file, text);
  if (classification.type !== "DELAY_ANALYSIS") return null;
  const source = eev2DelayNormalizeText(text);
  const events = eev2DelayExtractKnownEvents(source);
  const totalObserved = eev2DelayExtractTotalObservedDays(source);
  const eventSum = events.reduce((sum, item) => sum + Number(item.days_lost || 0), 0);
  const summary = eev2DelayResponsibilitySummary(events);

  return {
    engine_version: EEV2_DELAY_ENGINE_VERSION,
    document_type: "DELAY_ANALYSIS",
    classification_confidence: classification.confidence,
    source_file: file,
    source_page_or_extraction_label: pageOrSheet,
    project_id: eev2DelayExtractProjectId(source),
    report_date: eev2DelayExtractReportDate(source),
    delay_events: events,
    total_observed_delay_event_days: totalObserved,
    extracted_event_days_sum: eventSum,
    responsibility_summary: summary,
    consistency: totalObserved === null
      ? "TOTAL_NOT_EXTRACTED"
      : (eventSum === totalObserved ? "EVENT_SUM_MATCHES_TOTAL" : "EVENT_SUM_DIFFERS_FROM_TOTAL"),
    critical_path_impact: "NOT_ESTABLISHED",
    concurrency_status: "NOT_ESTABLISHED",
    float_impact_status: "NOT_ESTABLISHED",
    entitlement_status: "REQUIRES_CONTRACT_AND_SCHEDULE_REVIEW",
    safety_statement: "Observed delay-event days are not equivalent to project critical-path delay without concurrency, float and schedule analysis."
  };
}

function eev2DelayEvidenceToFindings(evidence) {
  if (!evidence || evidence.document_type !== "DELAY_ANALYSIS") return [];
  const findings = [];
  const page = evidence.source_page_or_extraction_label || "Workspace OCR";
  const file = evidence.source_file || "";

  if (Number(evidence.total_observed_delay_event_days || 0) > 0) {
    findings.push({
      statement: `${evidence.total_observed_delay_event_days} observed monthly delay-event days were recorded. Critical-path impact is not established.`,
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 0,
      exposure_amount_inr: 0,
      days: Number(evidence.total_observed_delay_event_days || 0),
      citations: [{
        file,
        page_or_sheet: page,
        quoted_span: `TOTAL DELAY THIS MONTH ${evidence.total_observed_delay_event_days}`
      }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Observed delay-event days from source" },
      confidence: evidence.classification_confidence || "MEDIUM",
      eev2_semantic_classification: "OBSERVED_DELAY_EVENT_DAYS",
      recoverability_guardrail: "NOT_ESTABLISHED",
      critical_path_impact: "NOT_ESTABLISHED"
    });
  }

  const s = evidence.responsibility_summary || {};
  if ((s.contractor_non_excusable_days || s.client_days || s.neutral_external_days)) {
    findings.push({
      statement: `Delay responsibility profile: contractor non-excusable ${s.contractor_non_excusable_days || 0} days; client ${s.client_days || 0} days; neutral/external ${s.neutral_external_days || 0} days.`,
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 0,
      exposure_amount_inr: 0,
      days: 0,
      citations: (evidence.delay_events || []).slice(0, 5).map((item) => ({
        file,
        page_or_sheet: page,
        quoted_span: item.quoted_evidence || item.cause
      })),
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Sum delay-event days by responsibility" },
      confidence: evidence.classification_confidence || "MEDIUM",
      eev2_semantic_classification: "DELAY_RESPONSIBILITY_PROFILE",
      recoverability_guardrail: "NOT_ESTABLISHED",
      critical_path_impact: "NOT_ESTABLISHED"
    });
  }

  return findings;
}

function eev2ExtractStructuredDelayFindings(file, pageOrSheet, text) {
  const evidence = eev2ExtractDelayEvidence(file, pageOrSheet, text);
  return {
    document_type: evidence ? "DELAY_ANALYSIS" : "UNKNOWN",
    delay_evidence: evidence,
    findings: eev2DelayEvidenceToFindings(evidence)
  };
}