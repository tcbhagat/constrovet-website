// Constrovet Evidence Engine v2 — EEV2-001E
// DEV-only diagnostic: re-run the same Workspace OCR path against the latest
// Boardroom job's copied cost PDF, then inspect exactly what EEV2 sees.
// No report mutation, no email send, no Gemini, no production deployment.

function eev2RunLatestCostOcrDiagnostic() {
  const props = PropertiesService.getScriptProperties();
  const jobId = String(props.getProperty("BOARDROOM_LAST_JOB_ID") || "").trim();
  if (!jobId) throw new Error("EEV2-001E: BOARDROOM_LAST_JOB_ID is empty. Run one TEST form submission first.");

  if (typeof eev2ExtractStructuredFindings !== "function" || typeof eev2ClassifyDocument !== "function") {
    throw new Error("EEV2-001E: EEV2CostModule.gs is not available in this Apps Script project.");
  }

  const folders = prepareJobFolders(jobId);
  const files = listBoardroomFolderFiles(folders.input);
  const pdfs = files.filter((file) => boardroomFileKind(file) === "pdf");
  if (!pdfs.length) throw new Error(`EEV2-001E: No PDF found in latest job input folder (${jobId}).`);

  const costPdf = pdfs.find((file) => /cost|estimate|expenditure|forecast|fac|budget/i.test(String(file.name || ""))) || pdfs[0];
  const ocr = extractPdfTextWithOptionalOcr(costPdf);
  const text = String((ocr || {}).text || "");

  const classification = eev2ClassifyDocument(costPdf.name, text);
  const structured = eev2ExtractStructuredFindings(costPdf.name, "Workspace OCR", text);
  const evidence = (structured || {}).cost_evidence || {};
  const fields = evidence.fields || {};
  const calculations = evidence.calculations || {};

  function fieldValue(name) {
    const field = fields[name] || {};
    return Object.prototype.hasOwnProperty.call(field, "value") ? field.value : null;
  }

  function calcValue(name) {
    const calc = calculations[name] || {};
    return Object.prototype.hasOwnProperty.call(calc, "value") ? calc.value : null;
  }

  const diagnostic = {
    ticket: "EEV2-001E",
    job_id: jobId,
    source_file: costPdf.name,
    source_file_id: costPdf.id,
    ocr_ok: Boolean(text),
    ocr_reason: String((ocr || {}).reason || ""),
    ocr_text_length: text.length,
    document_type: (structured || {}).document_type || "UNKNOWN",
    classification_confidence: (classification || {}).confidence || "LOW",
    anchor_count: Number((classification || {}).anchor_count || 0),
    fields: {
      monthly_budget: fieldValue("monthly_budget"),
      monthly_actual: fieldValue("monthly_actual"),
      cumulative_budget: fieldValue("cumulative_budget"),
      cumulative_actual: fieldValue("cumulative_actual"),
      original_budget: fieldValue("original_budget"),
      forecast_at_completion: fieldValue("forecast_at_completion")
    },
    calculations: {
      monthly_variance: calcValue("monthly_variance"),
      cumulative_variance: calcValue("cumulative_variance"),
      fac_variance: calcValue("fac_variance")
    },
    findings_count: ((structured || {}).findings || []).length,
    finding_semantics: ((structured || {}).findings || []).map((item) => ({
      semantic: item.eev2_semantic_classification || "",
      amount_inr: Number(item.amount_inr || 0),
      exposure_amount_inr: Number(item.exposure_amount_inr || 0),
      recoverability_guardrail: item.recoverability_guardrail || ""
    })),
    marker_checks: {
      monthly_budget: /monthly\s+budget/i.test(text),
      monthly_actual: /monthly\s+actual/i.test(text),
      cumulative_budget: /cumul(?:ative|\.)?\s+budget/i.test(text),
      cumulative_actual: /cumul(?:ative|\.)?\s+actual/i.test(text),
      original_budget: /original\s+budget/i.test(text),
      revised_fac: /revised\s+fac/i.test(text),
      fac_anywhere: /\bfac\b/i.test(text)
    },
    ocr_preview: text.replace(/\s+/g, " ").trim().slice(0, 1800)
  };

  console.log("EEV2-001E REAL OCR DIAGNOSTIC");
  console.log(JSON.stringify(diagnostic, null, 2));

  if (!diagnostic.ocr_ok) {
    throw new Error(`EEV2-001E OCR FAILED: ${diagnostic.ocr_reason || "No extracted text"}`);
  }

  return diagnostic;
}
