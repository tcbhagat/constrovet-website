function eev2RunLatestPipelineDiagnostic() {
  const props = PropertiesService.getScriptProperties();

  // Use the literal Script Property key because top-level const values
  // declared in another .gs file are not reliably visible cross-file.
  const jobId = String(
    props.getProperty("BOARDROOM_LAST_JOB_ID") || ""
  ).trim();

  if (!jobId) {
    throw new Error(
      "EEV2-001F: BOARDROOM_LAST_JOB_ID is empty. Run one TEST form submission first."
    );
  }

  if (typeof eev2ExtractStructuredFindings !== "function") {
    throw new Error(
      "EEV2-001F: EEV2CostModule.gs is not available."
    );
  }

  if (typeof extractBoardroomFindings !== "function") {
    throw new Error(
      "EEV2-001F: extractBoardroomFindings() is not available from Code.gs."
    );
  }

  if (typeof buildBoardroomOutput !== "function") {
    throw new Error(
      "EEV2-001F: buildBoardroomOutput() is not available from Code.gs."
    );
  }

  const folders = prepareJobFolders(jobId);
  const files = listBoardroomFolderFiles(folders.input);

  const pdfs = files.filter(
    (file) => boardroomFileKind(file) === "pdf"
  );

  if (!pdfs.length) {
    throw new Error(
      `EEV2-001F: No PDF found in latest job input folder (${jobId}).`
    );
  }

  const costPdf =
    pdfs.find((file) =>
      /cost|estimate|expenditure|forecast|fac|budget/i.test(
        String(file.name || "")
      )
    ) || pdfs[0];

  const currentDocument = extractBoardroomDocument(costPdf);

  const pages = currentDocument.pages || [];
  const firstPage = pages[0] || {};
  const currentText = String(firstPage.text || "");

  const liveFunctionSource = String(extractBoardroomFindings);

  const liveHookPresent =
    liveFunctionSource.indexOf(
      "eev2ExtractStructuredFindings"
    ) >= 0;

  let directFindings = [];

  if (currentText) {
    directFindings = extractBoardroomFindings(
      currentDocument.file,
      firstPage.label || "Workspace OCR",
      currentText,
      firstPage
    ) || [];
  }

  const buildOutput = buildBoardroomOutput(
    [currentDocument],
    []
  );

  const triggers = ScriptApp.getProjectTriggers().map(
    (trigger) => ({
      handler:
        typeof trigger.getHandlerFunction === "function"
          ? trigger.getHandlerFunction()
          : "",
      event_type:
        typeof trigger.getEventType === "function"
          ? String(trigger.getEventType())
          : "",
      source:
        typeof trigger.getTriggerSource === "function"
          ? String(trigger.getTriggerSource())
          : "",
      source_id:
        typeof trigger.getTriggerSourceId === "function"
          ? String(trigger.getTriggerSourceId() || "")
          : ""
    })
  );

  const diagnostic = {
    ticket: "EEV2-001F",
    job_id: jobId,

    source_file: costPdf.name,
    source_file_id: costPdf.id,

    live_hook_present_in_extractBoardroomFindings:
      liveHookPresent,

    eev2_module_available:
      typeof eev2ExtractStructuredFindings === "function",

    current_document_type:
      currentDocument.type || "unknown",

    current_page_count:
      pages.length,

    current_ocr_text_length:
      currentText.length,

    direct_extract_findings_count:
      directFindings.length,

    direct_findings:
      directFindings.map((item) => ({
        statement: item.statement || "",
        semantic:
          item.eev2_semantic_classification || "",
        amount_inr:
          Number(item.amount_inr || 0),
        exposure_amount_inr:
          Number(item.exposure_amount_inr || 0),
        recoverability_guardrail:
          item.recoverability_guardrail || ""
      })),

    build_output_raw_finding_count:
      Number(buildOutput.raw_finding_count || 0),

    build_output_verified_finding_count:
      Number(
        (
          buildOutput.deterministic_verifier_result ||
          {}
        ).verified_finding_count || 0
      ),

    build_output_document_outcomes:
      buildOutput.document_outcomes || [],

    build_output_findings:
      (buildOutput.findings || []).map((item) => ({
        statement: item.statement || "",
        semantic:
          item.eev2_semantic_classification || "",
        amount_inr:
          Number(item.amount_inr || 0),
        exposure_amount_inr:
          Number(item.exposure_amount_inr || 0),
        recoverability_guardrail:
          item.recoverability_guardrail || "",
        actionability:
          item.actionability || "",
        recoverability:
          item.recoverability || ""
      })),

    project_triggers:
      triggers
  };

  console.log(
    "EEV2-001F LIVE PIPELINE DIAGNOSTIC"
  );

  console.log(
    JSON.stringify(diagnostic, null, 2)
  );

  return diagnostic;
}