// Constrovet Evidence Engine v2 — EEV2-002B
// Deterministic EOT extraction and source-consistency review.
// Safety rule: EOT status/figures are extracted as source evidence, not treated as entitlement conclusions.

const EEV2_EOT_ENGINE_VERSION = "2.0.0-dev.1";

function eev2EotNormalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function eev2ClassifyEotDocument(file, text) {
  const source = eev2EotNormalizeText(text).toLowerCase();
  const name = String(file || "").toLowerCase();
  const anchors = [
    /extension of time/,
    /\beot[-\s]?\d+/,
    /days claimed/,
    /days approved/,
    /under review|submitted|approved|rejected/
  ];
  const score = anchors.reduce((sum, re) => sum + (re.test(source) ? 1 : 0), 0);
  const filenameHint = /delay|eot|schedule/.test(name);
  if (score >= 2 || (filenameHint && score >= 1)) {
    return {
      type: "EOT_REGISTER",
      confidence: score >= 4 ? "HIGH" : "MEDIUM",
      anchor_count: score
    };
  }
  return { type: "UNKNOWN", confidence: "LOW", anchor_count: score };
}

function eev2CanonicalEotStatus(raw) {
  const value = String(raw || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (/UNDER_REVIEW/.test(value)) return "UNDER_REVIEW";
  if (/SUBMITTED/.test(value)) return "SUBMITTED";
  if (/APPROVED/.test(value)) return "APPROVED";
  if (/REJECTED/.test(value)) return "REJECTED";
  if (/PENDING/.test(value)) return "PENDING";
  return "UNKNOWN";
}

function eev2EotParseNumber(raw) {
  const value = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!value || /^[-—–]+$/.test(value)) return null;
  const m = value.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function eev2ExtractKnownEotEntries(text) {
  const source = eev2EotNormalizeText(text);
  const entries = [];

  const specs = [
    {
      reference: "EOT-01/2026",
      re: /EOT[-\s]?01\/2026\s+(.{0,120}?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(Under\s+Review|Submitted|Approved|Rejected|Pending)/i
    },
    {
      reference: "EOT-02/2026",
      re: /EOT[-\s]?02\/2026\s+(.{0,120}?)\s+(\d+(?:\.\d+)?)\s+([—–-]|\d+(?:\.\d+)?)\s+(Under\s+Review|Submitted|Approved|Rejected|Pending)/i
    }
  ];

  specs.forEach((spec) => {
    const m = spec.re.exec(source);
    if (!m) return;
    entries.push({
      eot_reference: spec.reference,
      basis: String(m[1] || "").trim().replace(/\s+/g, " "),
      days_claimed: eev2EotParseNumber(m[2]),
      days_approved: eev2EotParseNumber(m[3]),
      status: eev2CanonicalEotStatus(m[4]),
      quoted_evidence: m[0].slice(0, 500)
    });
  });

  return entries;
}

function eev2EotConsistencyFlags(entry) {
  const flags = [];
  if (!entry) return flags;

  const claimed = entry.days_claimed;
  const approved = entry.days_approved;
  const status = String(entry.status || "UNKNOWN");

  if (claimed !== null && approved !== null && approved > claimed) {
    flags.push("APPROVED_DAYS_EXCEED_CLAIMED_DAYS");
  }
  if (status === "UNDER_REVIEW" && approved !== null && approved > 0) {
    flags.push("APPROVED_DAYS_PRESENT_WHILE_STATUS_UNDER_REVIEW");
  }
  if (status === "SUBMITTED" && approved !== null && approved > 0) {
    flags.push("APPROVED_DAYS_PRESENT_WHILE_STATUS_SUBMITTED");
  }
  if (status === "APPROVED" && approved === null) {
    flags.push("APPROVED_STATUS_WITHOUT_APPROVED_DAYS");
  }

  return flags;
}

function eev2ReviewEotEntries(entries) {
  return (entries || []).map((entry) => {
    const flags = eev2EotConsistencyFlags(entry);
    return {
      ...entry,
      consistency_status: flags.length ? "SOURCE_INCONSISTENCY_REVIEW_REQUIRED" : "NO_DETERMINISTIC_INCONSISTENCY_DETECTED",
      consistency_flags: flags,
      entitlement_conclusion: "NOT_ESTABLISHED",
      critical_path_entitlement: "NOT_ESTABLISHED",
      compensability_conclusion: "NOT_ESTABLISHED",
      professional_review_required: flags.length > 0 || ["UNDER_REVIEW", "SUBMITTED", "PENDING"].indexOf(entry.status) >= 0
    };
  });
}

function eev2ExtractEotEvidence(file, pageOrSheet, text) {
  const classification = eev2ClassifyEotDocument(file, text);
  if (classification.type !== "EOT_REGISTER") return null;

  const source = eev2EotNormalizeText(text);
  const entries = eev2ReviewEotEntries(eev2ExtractKnownEotEntries(source));
  const flags = entries.reduce((all, entry) => all.concat(entry.consistency_flags || []), []);

  return {
    engine_version: EEV2_EOT_ENGINE_VERSION,
    document_type: "EOT_REGISTER",
    classification_confidence: classification.confidence,
    source_file: file,
    source_page_or_extraction_label: pageOrSheet,
    eot_entries: entries,
    entry_count: entries.length,
    consistency_flag_count: flags.length,
    consistency_flags: flags,
    entitlement_conclusion: "NOT_ESTABLISHED",
    critical_path_entitlement: "NOT_ESTABLISHED",
    compensability_conclusion: "NOT_ESTABLISHED",
    safety_statement: "EOT register figures and statuses are extracted as source evidence only. Entitlement, compensability and critical-path effect require contract, notice, concurrency, float and programme review."
  };
}

function eev2EotEvidenceToFindings(evidence) {
  if (!evidence || evidence.document_type !== "EOT_REGISTER") return [];
  const file = evidence.source_file || "";
  const page = evidence.source_page_or_extraction_label || "Workspace OCR";
  const findings = [];

  (evidence.eot_entries || []).forEach((entry) => {
    const approvedText = entry.days_approved === null ? "not stated" : String(entry.days_approved);
    const flags = (entry.consistency_flags || []).join(", ");
    findings.push({
      statement: `${entry.eot_reference}: basis ${entry.basis || "not stated"}; claimed ${entry.days_claimed === null ? "not stated" : entry.days_claimed} day(s); approved ${approvedText}; status ${entry.status}. Entitlement is not established.${flags ? ` Source consistency review: ${flags}.` : ""}`,
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 0,
      exposure_amount_inr: 0,
      days: 0,
      citations: [{
        file,
        page_or_sheet: page,
        quoted_span: entry.quoted_evidence || entry.eot_reference
      }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Source EOT register extraction" },
      confidence: evidence.classification_confidence || "MEDIUM",
      eev2_semantic_classification: "EOT_STATUS",
      recoverability_guardrail: "NOT_ESTABLISHED",
      entitlement_conclusion: "NOT_ESTABLISHED",
      critical_path_impact: "NOT_ESTABLISHED",
      compensability_conclusion: "NOT_ESTABLISHED",
      consistency_status: entry.consistency_status,
      consistency_flags: entry.consistency_flags || []
    });
  });

  return findings;
}

function eev2ExtractStructuredEotFindings(file, pageOrSheet, text) {
  const evidence = eev2ExtractEotEvidence(file, pageOrSheet, text);
  return {
    document_type: evidence ? "EOT_REGISTER" : "UNKNOWN",
    eot_evidence: evidence,
    findings: eev2EotEvidenceToFindings(evidence)
  };
}
