// Constrovet Evidence Engine v2 — EEV2-002F
// Deterministic schedule-status contradiction detection.
// Safety rule: flag only literal, arithmetic/semantic contradictions between a document's own
// stated indicator value and its own stated status label -- never infer project delay, critical-path
// impact, entitlement, compensability or cost causation from the contradiction itself.

const EEV2_SCHEDULE_STATUS_ENGINE_VERSION = "2.0.0-dev.1";
const EEV2_SCHEDULE_STATUS_LABEL_VOCAB = "ON SCHEDULE|ON TRACK|ON TARGET|AHEAD OF SCHEDULE";

function eev2ScheduleStatusNormalizeText(text) {
  return String(text || "")
    .replace(/ /g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function eev2ClassifyScheduleStatusDocument(file, text) {
  const source = eev2ScheduleStatusNormalizeText(text).toLowerCase();
  const name = String(file || "").toLowerCase();
  const anchors = [
    /schedule status report/,
    /schedule performance index/,
    /\(spi\)/,
    /critical path status/,
    /revised completion date/
  ];
  const score = anchors.reduce((sum, re) => sum + (re.test(source) ? 1 : 0), 0);
  const filenameHint = /schedule.*status|status.*schedule/.test(name);
  if (score >= 2 || (filenameHint && score >= 1)) {
    return { type: "SCHEDULE_STATUS", confidence: score >= 3 ? "HIGH" : "MEDIUM", anchor_count: score };
  }
  return { type: "UNKNOWN", confidence: "LOW", anchor_count: score };
}

// Schedule Performance Index vs its own stated label. SPI < 1.0 is, by definition, behind
// baseline on an earned-value basis. A document that states an SPI below 1.0 and labels that
// same line "ON SCHEDULE" (or equivalent) is contradicting itself, not us.
function eev2ScheduleStatusExtractSpi(text) {
  const re = new RegExp(
    "Schedule\\s+Performance\\s+Index\\s*\\(SPI\\)\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(" + EEV2_SCHEDULE_STATUS_LABEL_VOCAB + ")?",
    "i"
  );
  const m = re.exec(text);
  if (!m) return null;
  return { value: Number(m[1]), stated_label: (m[2] || "").trim().toUpperCase(), quoted_evidence: m[0] };
}

// Planned vs Revised/Actual Completion Date, and the label attached to that comparison. Any
// positive gap between the two dates is a schedule slip on the document's own numbers.
function eev2ScheduleStatusExtractCompletionSlip(text) {
  const re = new RegExp(
    "Planned\\s+Completion\\s+Date\\s+([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})\\s+(?:Original\\s+)?(?:Revised|Actual)\\s+Completion\\s+Date\\s+([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})\\s*(" + EEV2_SCHEDULE_STATUS_LABEL_VOCAB + ")?",
    "i"
  );
  const m = re.exec(text);
  if (!m) return null;
  const planned = eev2ScheduleStatusParseDate(m[1]);
  const revised = eev2ScheduleStatusParseDate(m[2]);
  if (planned === null || revised === null) return null;
  const slipDays = Math.round((revised - planned) / (24 * 60 * 60 * 1000));
  return {
    planned_date: m[1],
    revised_date: m[2],
    slip_days: slipDays,
    stated_label: (m[3] || "").trim().toUpperCase(),
    quoted_evidence: m[0]
  };
}

function eev2ScheduleStatusParseDate(raw) {
  const m = /([0-9]{1,2})-([A-Za-z]{3})-([0-9]{4})/.exec(String(raw || ""));
  if (!m) return null;
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const mon = months[m[2].toLowerCase()];
  if (mon === undefined) return null;
  return new Date(Number(m[3]), mon, Number(m[1])).getTime();
}

// Critical Path Status is a standalone risk signal: "CRITICAL" (float consumed) deserves
// executive visibility on its own, regardless of how the rest of the report is summarized --
// it should never be able to sit invisibly under a "Critical/high findings: 0" rollup.
function eev2ScheduleStatusExtractCriticalPath(text) {
  const m = /Critical\s+Path\s+Status\s+([\s\S]{0,60}?)(CRITICAL|CLEAR|NOT ESTABLISHED)\b/i.exec(text);
  if (!m) return null;
  return { detail: m[1].trim(), status: m[2].toUpperCase(), quoted_evidence: m[0] };
}

function eev2ExtractScheduleStatusEvidence(file, pageOrSheet, text) {
  const classification = eev2ClassifyScheduleStatusDocument(file, text);
  if (classification.type !== "SCHEDULE_STATUS") return null;
  const source = eev2ScheduleStatusNormalizeText(text);
  return {
    engine_version: EEV2_SCHEDULE_STATUS_ENGINE_VERSION,
    document_type: "SCHEDULE_STATUS",
    classification_confidence: classification.confidence,
    source_file: file,
    source_page_or_extraction_label: pageOrSheet,
    spi: eev2ScheduleStatusExtractSpi(source),
    completion_slip: eev2ScheduleStatusExtractCompletionSlip(source),
    critical_path: eev2ScheduleStatusExtractCriticalPath(source)
  };
}

function eev2ScheduleStatusEvidenceToFindings(evidence) {
  if (!evidence || evidence.document_type !== "SCHEDULE_STATUS") return [];
  const findings = [];
  const page = evidence.source_page_or_extraction_label || "Workspace OCR";
  const file = evidence.source_file || "";

  // recoverability_guardrail is set to NOT_ESTABLISHED on every finding below, matching the
  // delay-findings convention -- these are schedule-integrity flags to verify, not quantified
  // cost-recovery claims. Without it, boardroomActionability() would route a finding carrying a
  // positive `days` value (the completion-slip finding, below) into ACTION_RECOVERABLE -- the
  // "recover quantified cost exposure" bucket -- which is the wrong action for a label
  // contradiction with no dollar amount attached.
  const spi = evidence.spi;
  if (spi && spi.value < 0.995 && new RegExp(EEV2_SCHEDULE_STATUS_LABEL_VOCAB, "i").test(spi.stated_label)) {
    const gap = Number(((1 - spi.value) * 100).toFixed(1));
    findings.push({
      ...boardroomFinding(
        `This document's own Schedule Performance Index (SPI) of ${spi.value} indicates the project is running behind schedule (an SPI below 1.0), a gap of ${gap} percentage point(s) below baseline pace -- yet the document labels this status "${spi.stated_label}". Verify current schedule position before relying on the stated status.`,
        "LEAKAGE_AND_OVERRUN", 0, 0, file, page, spi.quoted_evidence, 0, 0, 0, "MEDIUM"
      ),
      eev2_semantic_classification: "SCHEDULE_STATUS_CONTRADICTION",
      recoverability_guardrail: "NOT_ESTABLISHED"
    });
  }

  const slip = evidence.completion_slip;
  if (slip && slip.slip_days > 0 && new RegExp(EEV2_SCHEDULE_STATUS_LABEL_VOCAB, "i").test(slip.stated_label)) {
    findings.push({
      ...boardroomFinding(
        `This document's own Revised Completion Date (${slip.revised_date}) is ${slip.slip_days} day(s) later than its Planned Completion Date (${slip.planned_date}) -- a schedule slippage -- yet the document labels this status "${slip.stated_label}". Verify current schedule position before relying on the stated status.`,
        "LEAKAGE_AND_OVERRUN", 0, slip.slip_days, file, page, slip.quoted_evidence, 0, 0, 0, "MEDIUM"
      ),
      eev2_semantic_classification: "SCHEDULE_STATUS_CONTRADICTION",
      recoverability_guardrail: "NOT_ESTABLISHED"
    });
  }

  const criticalPath = evidence.critical_path;
  if (criticalPath && criticalPath.status === "CRITICAL") {
    findings.push({
      ...boardroomFinding(
        `This document states its own Critical Path Status as CRITICAL (${criticalPath.detail || "float consumed"}) -- no float remains to absorb further delay without the completion date slipping late. This is a schedule risk signal that warrants executive visibility on its own, however the rest of this report is otherwise summarized. Verify current critical-path position with the planning team.`,
        "LEAKAGE_AND_OVERRUN", 0, 0, file, page, criticalPath.quoted_evidence, 0, 0, 0, "MEDIUM"
      ),
      eev2_semantic_classification: "SCHEDULE_STATUS_CONTRADICTION",
      recoverability_guardrail: "NOT_ESTABLISHED"
    });
  }

  return findings;
}

// Called unconditionally alongside the structured document router, the same way the ESG rate
// recompute check runs regardless of which document type handled the page -- a Schedule Status
// document is very likely also classified and handled as a PROGRESS_REPORT (it carries Planned/
// Actual Progress percentages), and that handling must not be replaced or skipped. This adds
// contradiction findings on top of whatever else was extracted from the same page.
function eev2ScheduleStatusContradictionFindings_(file, pageOrSheet, text) {
  const evidence = eev2ExtractScheduleStatusEvidence(file, pageOrSheet, text);
  return eev2ScheduleStatusEvidenceToFindings(evidence);
}

// Mirrors boardroomParseRateContradiction_ for the ESG rate-recompute check: parses the
// contradiction marker back out of a finding's own statement so boardroomRiskScore can weight
// severity by how material the contradiction is, without re-deriving it from source text.
function eev2ParseScheduleStatusContradiction_(statement) {
  const text = String(statement || "");
  const spiMatch = /Schedule Performance Index \(SPI\) of ([0-9.]+)[\s\S]*?gap of ([0-9.]+) percentage point/i.exec(text);
  if (spiMatch) return { type: "SPI", gap: Number(spiMatch[2]) };
  const slipMatch = /is (\d+) day\(s\) later than its Planned Completion Date[\s\S]*?a schedule slippage/i.exec(text);
  if (slipMatch) return { type: "COMPLETION_SLIP", gap: Number(slipMatch[1]) };
  const criticalMatch = /Critical Path Status as CRITICAL/i.exec(text);
  if (criticalMatch) return { type: "CRITICAL_PATH", gap: null };
  return null;
}
