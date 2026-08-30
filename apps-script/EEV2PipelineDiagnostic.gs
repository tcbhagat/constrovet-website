// Constrovet Evidence Engine v2 — EEV2-001F
// DEV-only pipeline diagnostic for the latest Boardroom job.
// Replays the latest cost PDF through the CURRENT Apps Script functions without
// sending email, mutating reports, invoking Gemini, or touching production.

function eev2RunLatestPipelineDiagnostic() {
  const props = PropertiesService.getScriptProperties();
  const jobId = String(props.getProperty(BOARDROOM_LAST_JOB_PROPERTY) || "").trim();
  if (!jobId) throw new Error("EEV2-001F: BOARDROOM_LAST_JOB_ID is empty.");

  const liveFnSource = String(extractBoardroomFindings);
  const hookPresent = liveFnSource.indexOf("eev2ExtractStructuredFindings") >= 0;

  const folders = prepareJobFolders(jobId);
  const files = listBoardroomFolderFiles(folders.input);
  const pdfs = files.filter((file) => boardroomFileKind(file) === "pdf");
  if (!pdfs.length) throw new Error(`EEV2-001F: No PDF found in latest job input folder (${jobId}).`);

  const costPdf = pdfs.find((file) => /cost|estimate|expenditure|forecast|fac|budget/i.test(String(file.name || ""))) || pdfs[0];
  const document = extractBoardroomDocument(costPdf);
  const page = ((document || {}).pages || [])[0] || {};
  const text = String(page.text || "");

  const directFindings = text
    ? extractBoardroomFindings(document.file, page.label || "Workspace OCR", text, page)
    : [];
  const report = buildBoardroomOutput([document], []);

  const triggers = ScriptApp.getProjectTriggers().map((trigger) => ({
    handler: trigger.getHandlerFunction(),
    event_type: String(trigger.getEventType()),
    source: String(trigger.getTriggerSource()),
    source_id: (typeof trigger.getTriggerSourceId === "function") ? String(trigger.getTriggerSourceId() || "") : ""
  }));

  const diagnostic = {
    ticket: "EEV2-001F",
    job_id: jobId,
    source_file: costPdf.name,
    source_file_id: costPdf.id,
    live_hook_present_in_extractBoardroomFindings: hookPresent,
    eev2_module_available: typeof eev2ExtractStructuredFindings === "function",
    current_document_type: (document || {}).type || "",
    current_page_count: ((document || {}).pages || []).length,
    current_ocr_text_length: text.length,
    direct_extract_findings_count: (directFindings || []).length,
    direct_findings: (directFindings || []).map((item) => ({
      statement: item.statement || "",
      semantic: item.eev2_semantic_classification || "",
      amount_inr: Number(item.amount_inr || 0),
      exposure_amount_inr: Number(item.exposure_amount_inr || 0),
      recoverability_guardrail: item.recoverability_guardrail || ""
    })),
    build_output_raw_finding_count: Number((report || {}).raw_finding_count || 0),
    build_output_verified_finding_count: (((report || {}).findings) || []).length,
    build_output_document_outcomes: (report || {}).document_outcomes || [],
    build_output_findings: (((report || {}).findings) || []).map((item) => ({
      statement: item.statement || "",
      semantic: item.eev2_semantic_classification || "",
      amount_inr: Number(item.amount_inr || 0),
      exposure_amount_inr: Number(item.exposure_amount_inr || 0),
      recoverability_guardrail: item.recoverability_guardrail || "",
      actionability: item.actionability || "",
      recoverability: item.recoverability || ""
    })),
    project_triggers: triggers
  };

  console.log("EEV2-001F LIVE PIPELINE DIAGNOSTIC");
  console.log(JSON.stringify(diagnostic, null, 2));
  return diagnostic;
}
