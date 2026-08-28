// Constrovet Evidence Engine v2 — EEV2-001
// Isolated DEV module. No paid services. No Gemini arithmetic.
// Purpose: classify COST_ESTIMATE documents and extract cited cost evidence
// without changing production semantics for delay/progress/ESG.

const EEV2_ENGINE_VERSION = "2.0.0-dev";
const EEV2_SCHEMA_VERSION = "2.0";
const EEV2_RULESET_VERSION = "2026.08";

function eev2ClassifyDocument(file, text) {
  const normalized = String(text || "").replace(/\s+/g, " ").toLowerCase();
  const name = String(file || "").toLowerCase();
  const anchors = [
    /monthly\s+budget/,
    /monthly\s+actual/,
    /cumul(?:ative|\.)?\s+budget/,
    /cumul(?:ative|\.)?\s+actual/,
    /forecast\s+at\s+completion|\bfac\b/,
    /original\s+budget/,
    /revised\s+fac/,
    /cost\s+head/
  ];
  const score = anchors.reduce((sum, re) => sum + (re.test(normalized) ? 1 : 0), 0);
  const filenameHint = /cost|estimate|expenditure|forecast|fac|budget/.test(name);
  if (score >= 3 || (filenameHint && score >= 2)) {
    return { type: "COST_ESTIMATE", confidence: score >= 5 ? "HIGH" : "MEDIUM", anchor_count: score };
  }
  return { type: "UNKNOWN", confidence: "LOW", anchor_count: score };
}

function eev2NormalizeAmount(raw) {
  if (raw === null || raw === undefined) return null;
  const value = String(raw)
    .replace(/₹/g, "")
    .replace(/\bINR\b/ig, "")
    .replace(/\bRs\.?\b/ig, "")
    .replace(/,/g, "")
    .trim();
  const m = value.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function eev2EscapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function eev2FindLabeledAmount(text, labelPatterns) {
  const source = String(text || "").replace(/\u00a0/g, " ");
  for (let i = 0; i < labelPatterns.length; i += 1) {
    const label = labelPatterns[i];
    const re = new RegExp(
      "(" + label + ")\\s*(?:[:\\-]|\\s)?\\s*(?:₹|INR|Rs\\.?)?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)",
      "i"
    );
    const m = re.exec(source);
    if (!m) continue;
    const value = eev2NormalizeAmount(m[2]);
    if (value === null) continue;
    const start = Math.max(0, m.index - 60);
    const end = Math.min(source.length, m.index + m[0].length + 100);
    return {
      value,
      quoted_evidence: source.slice(start, end).replace(/\s+/g, " ").trim(),
      matched_label: m[1]
    };
  }
  return null;
}

function eev2ExtractCostEvidence(file, pageOrSheet, text) {
  const classification = eev2ClassifyDocument(file, text);
  if (classification.type !== "COST_ESTIMATE") return null;

  const fields = {
    monthly_budget: eev2FindLabeledAmount(text, ["Monthly\\s+Budget"]),
    monthly_actual: eev2FindLabeledAmount(text, ["Monthly\\s+Actual"]),
    cumulative_budget: eev2FindLabeledAmount(text, ["Cumul(?:ative|\\.)?\\s+Budget", "Cumulative\\s+Budget"]),
    cumulative_actual: eev2FindLabeledAmount(text, ["Cumul(?:ative|\\.)?\\s+Actual", "Cumulative\\s+Actual"]),
    original_budget: eev2FindLabeledAmount(text, ["Original\\s+Budget"]),
    forecast_at_completion: eev2FindLabeledAmount(text, ["Revised\\s+FAC(?:\\s*\\(Cost\\))?", "Forecast\\s+at\\s+Completion(?:\\s*\\(FAC\\))?"])
  };

  const extractedCount = Object.keys(fields).filter((key) => fields[key] && fields[key].value !== null).length;
  const evidence = {
    engine_version: EEV2_ENGINE_VERSION,
    schema_version: EEV2_SCHEMA_VERSION,
    ruleset_version: EEV2_RULESET_VERSION,
    document_type: "COST_ESTIMATE",
    classification_confidence: classification.confidence,
    source_file: file,
    source_page_or_extraction_label: pageOrSheet,
    fields: {},
    calculations: {},
    confidence: extractedCount >= 6 ? "HIGH" : (extractedCount >= 4 ? "MEDIUM" : "LOW")
  };

  Object.keys(fields).forEach((key) => {
    const field = fields[key];
    if (!field) return;
    evidence.fields[key] = {
      value: field.value,
      unit: "INR",
      source_file: file,
      source_page_or_extraction_label: pageOrSheet,
      quoted_evidence: field.quoted_evidence,
      confidence: classification.confidence
    };
  });

  const mb = evidence.fields.monthly_budget && evidence.fields.monthly_budget.value;
  const ma = evidence.fields.monthly_actual && evidence.fields.monthly_actual.value;
  const cb = evidence.fields.cumulative_budget && evidence.fields.cumulative_budget.value;
  const ca = evidence.fields.cumulative_actual && evidence.fields.cumulative_actual.value;
  const ob = evidence.fields.original_budget && evidence.fields.original_budget.value;
  const fac = evidence.fields.forecast_at_completion && evidence.fields.forecast_at_completion.value;

  if (typeof mb === "number" && typeof ma === "number") {
    evidence.calculations.monthly_variance = {
      value: ma - mb,
      formula: "monthly_actual - monthly_budget",
      classification: ma - mb > 0 ? "COST_VARIANCE_ADVERSE" : "COST_VARIANCE_FAVOURABLE"
    };
  }
  if (typeof cb === "number" && typeof ca === "number") {
    evidence.calculations.cumulative_variance = {
      value: ca - cb,
      formula: "cumulative_actual - cumulative_budget",
      classification: ca - cb > 0 ? "COST_EXPOSURE" : "COST_VARIANCE_FAVOURABLE"
    };
  }
  if (typeof ob === "number" && typeof fac === "number") {
    evidence.calculations.fac_variance = {
      value: fac - ob,
      formula: "forecast_at_completion - original_budget",
      classification: fac - ob > 0 ? "FORECAST_OVERRUN" : "FORECAST_WITHIN_BUDGET"
    };
  }

  return evidence;
}

function eev2CostEvidenceToFindings(evidence) {
  if (!evidence || evidence.document_type !== "COST_ESTIMATE") return [];
  const findings = [];
  const fields = evidence.fields || {};
  const calcs = evidence.calculations || {};
  const sourceFile = evidence.source_file || "";
  const page = evidence.source_page_or_extraction_label || "Workspace OCR";

  function citationFor(keys) {
    const spans = keys
      .map((key) => fields[key] && fields[key].quoted_evidence)
      .filter(Boolean);
    return [{
      file: sourceFile,
      page_or_sheet: page,
      quoted_span: spans.join(" | ").slice(0, 500)
    }];
  }

  if (calcs.monthly_variance) {
    const value = Number(calcs.monthly_variance.value || 0);
    findings.push({
      statement: value > 0
        ? `Monthly actual exceeds monthly budget by INR ${formatInr(Math.abs(value))}.`
        : `Monthly actual is below monthly budget by INR ${formatInr(Math.abs(value))}.`,
      financial_category: value > 0 ? "LEAKAGE_AND_OVERRUN" : "BASELINE_BUDGET",
      amount_inr: value > 0 ? value : 0,
      days: 0,
      citations: citationFor(["monthly_budget", "monthly_actual"]),
      calculation: {
        budget: Number((fields.monthly_budget || {}).value || 0),
        actual: Number((fields.monthly_actual || {}).value || 0),
        difference: value,
        formula: "Actual - Budget"
      },
      confidence: evidence.confidence
    });
  }

  if (calcs.cumulative_variance && Number(calcs.cumulative_variance.value || 0) > 0) {
    const value = Number(calcs.cumulative_variance.value || 0);
    findings.push({
      statement: `Cumulative actual exceeds cumulative budget by INR ${formatInr(value)}. This is cost exposure, not confirmed recoverable leakage.`,
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: value,
      days: 0,
      citations: citationFor(["cumulative_budget", "cumulative_actual"]),
      calculation: {
        budget: Number((fields.cumulative_budget || {}).value || 0),
        actual: Number((fields.cumulative_actual || {}).value || 0),
        difference: value,
        formula: "Actual - Budget"
      },
      confidence: evidence.confidence,
      eev2_semantic_classification: "COST_EXPOSURE",
      recoverability_guardrail: "NOT_ESTABLISHED"
    });
  }

  if (calcs.fac_variance && Number(calcs.fac_variance.value || 0) > 0) {
    const value = Number(calcs.fac_variance.value || 0);
    findings.push({
      statement: `Revised forecast at completion exceeds original budget by INR ${formatInr(value)}. This is forecast exposure, not confirmed recoverable leakage.`,
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: value,
      days: 0,
      citations: citationFor(["original_budget", "forecast_at_completion"]),
      calculation: {
        budget: Number((fields.original_budget || {}).value || 0),
        actual: Number((fields.forecast_at_completion || {}).value || 0),
        difference: value,
        formula: "Actual - Budget"
      },
      confidence: evidence.confidence,
      eev2_semantic_classification: "FORECAST_OVERRUN",
      recoverability_guardrail: "NOT_ESTABLISHED"
    });
  }

  return findings;
}

function eev2ExtractStructuredFindings(file, pageOrSheet, text) {
  const costEvidence = eev2ExtractCostEvidence(file, pageOrSheet, text);
  return {
    document_type: costEvidence ? "COST_ESTIMATE" : "UNKNOWN",
    cost_evidence: costEvidence,
    findings: eev2CostEvidenceToFindings(costEvidence)
  };
}

function eev2SyntheticCostRegression() {
  const text = [
    "COST ESTIMATE & EXPENDITURE STATEMENT",
    "Monthly Budget Rs. 43,333,333 Monthly Actual Rs. 42,706,471 Variance -1.4%",
    "Cumul. Budget Rs. 346,666,667 Cumul. Actual Rs. 352,164,801 Cumul. Var. +1.6%",
    "Forecast at Completion (FAC)",
    "Revised FAC (Cost) Rs. 528,247,202 ON BUDGET",
    "Original Budget Rs. 520,000,000 Baseline"
  ].join("\n");
  const result = eev2ExtractStructuredFindings("M08_CostEstimate_NORMAL.pdf", "Page 1", text);
  const e = result.cost_evidence || {};
  const f = e.fields || {};
  const c = e.calculations || {};
  const checks = [
    ["document_type", result.document_type === "COST_ESTIMATE"],
    ["monthly_budget", Number((f.monthly_budget || {}).value) === 43333333],
    ["monthly_actual", Number((f.monthly_actual || {}).value) === 42706471],
    ["cumulative_budget", Number((f.cumulative_budget || {}).value) === 346666667],
    ["cumulative_actual", Number((f.cumulative_actual || {}).value) === 352164801],
    ["original_budget", Number((f.original_budget || {}).value) === 520000000],
    ["revised_fac", Number((f.forecast_at_completion || {}).value) === 528247202],
    ["monthly_variance", Number((c.monthly_variance || {}).value) === -626862],
    ["cumulative_variance", Number((c.cumulative_variance || {}).value) === 5498134],
    ["fac_variance", Number((c.fac_variance || {}).value) === 8247202],
    ["no_confirmed_leakage_wording", (result.findings || []).every((x) => !/confirmed recoverable leakage/i.test(x.statement || "") || /not confirmed recoverable leakage/i.test(x.statement || ""))]
  ];
  return {
    ok: checks.every((item) => item[1]),
    engine_version: EEV2_ENGINE_VERSION,
    checks: checks.map((item) => ({ check: item[0], pass: item[1] })),
    result
  };
}
