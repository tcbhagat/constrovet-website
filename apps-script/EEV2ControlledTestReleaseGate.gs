// Constrovet EEV2 controlled TEST-project release gate.
// Reads one explicit TEST job, writes one validation artifact, and never sends email.

function eev2RunControlledTestReleaseGate() {
  const started = new Date();
  const props = PropertiesService.getScriptProperties();
  const environment = String(props.getProperty("EEV2_ENVIRONMENT") || "").trim().toUpperCase();
  const jobId = String(props.getProperty("EEV2_TEST_JOB_ID") || "").trim();

  if (environment !== "TEST") {
    throw new Error("EEV2 release gate is blocked unless EEV2_ENVIRONMENT=TEST.");
  }
  if (!jobId) {
    throw new Error("EEV2_TEST_JOB_ID must identify the controlled GOOD/BAD/NORMAL test submission.");
  }
  if (String(props.getProperty("ENABLE_BOARDROOM_DEEP_ANALYSIS") || "false").toLowerCase() === "true") {
    throw new Error("Disable ENABLE_BOARDROOM_DEEP_ANALYSIS before running the deterministic release gate.");
  }
  if (String(props.getProperty("ENABLE_GEMINI_RELEVANCE_GATE") || "false").toLowerCase() === "true") {
    throw new Error("Disable ENABLE_GEMINI_RELEVANCE_GATE before running the deterministic release gate.");
  }

  const regression = eev2RunEvidenceHarnessV1();
  const jobFolder = findProjectFolder(jobId);
  if (!jobFolder) throw new Error(`TEST job folder not found: ${jobId}.`);
  const inputFolder = findChildFolder(jobFolder, "input");
  const outputsFolder = findChildFolder(jobFolder, "outputs");
  if (!inputFolder || !outputsFolder) throw new Error(`TEST job ${jobId} is missing its input or outputs folder.`);
  const folders = { job: jobFolder, input: inputFolder, outputs: outputsFolder };
  const inputFiles = listBoardroomFolderFiles(folders.input);
  const selected = eev2SelectReferenceFiles(inputFiles);
  const missingRoles = Object.keys(selected).filter((role) => !selected[role]);
  if (missingRoles.length) {
    throw new Error(`Required reference PDFs are missing: ${missingRoles.join(", ")}.`);
  }

  const documents = [selected.progress, selected.delay, selected.cost].map(extractBoardroomDocument);
  const browserReport = buildBoardroomOutput(documents, []);
  eev2AttachLiveSchedulePosition(browserReport);
  const findings = browserReport.findings || [];
  const semantics = findings.map((item) => String(item.eev2_semantic_classification || ""));
  const citations = findings.reduce((all, item) => all.concat(item.citations || []), []);
  const schedule = browserReport.eev2_executive_schedule_summary || {};
  const reconciliation = browserReport.eev2_schedule_reconciliation || {};
  const cost = reconciliation.cost_position || {};
  const verifier = browserReport.deterministic_verifier_result || {};

  const emailEnvelope = {
    mode: "CONTROLLED_TEST_RELEASE_GATE",
    generated_at: new Date().toISOString(),
    browser_report: browserReport,
    gemini_verifier_result: { verification_status: "NOT_RUN" }
  };
  const emailText = buildExecutiveEmailText(jobId, emailEnvelope, "");
  const emailHtml = buildExecutiveEmailHtml(jobId, emailEnvelope, "");
  const auditRow = findLatestAuditRecordForJob(jobId);

  const checks = [
    ["regression_10_of_10", regression.ok === true && regression.regression.suite_count === 10 && regression.regression.pass_count === 10],
    ["three_reference_pdfs", documents.length === 3],
    ["executive_action_plan", browserReport.report_quality_status === REPORT_EXECUTIVE_ACTION_PLAN],
    ["all_findings_cited", findings.length > 0 && citations.length >= findings.length && citations.every(eev2ValidReleaseCitation)],
    ["cost_variance_present", semantics.indexOf("COST_EXPOSURE") >= 0],
    ["fac_exposure_present", semantics.indexOf("FORECAST_OVERRUN") >= 0],
    ["recoverable_leakage_zero", Number(cost.confirmed_recoverable_leakage_inr || 0) === 0],
    ["progress_variance_exact", Number(schedule.planned_progress_pct) === 66.7 && Number(schedule.actual_progress_pct) === 64.3],
    ["observed_delay_days_exact", Number(schedule.observed_delay_event_days) === 32],
    ["eot_records_present", Number(schedule.eot_count || 0) >= 2],
    ["critical_path_not_established", schedule.critical_path_impact === "NOT_ESTABLISHED"],
    ["causation_not_established", schedule.causal_link_status === "NOT_ESTABLISHED"],
    ["unsupported_claims_removed", (verifier.unsupported_claims_removed || []).length === 0],
    ["email_render_ready_not_sent", /Schedule Position/.test(emailText) && /Schedule Position/.test(emailHtml)],
    ["audit_row_present", Boolean(auditRow)]
  ];

  const result = {
    gate: "EEV2_CONTROLLED_TEST_RELEASE_GATE",
    environment,
    job_id: jobId,
    ok: checks.every((item) => item[1] === true),
    production_deployment_authorized: false,
    email_sent_by_gate: false,
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    kpis: {
      regression_pass_rate_pct: regression.regression.pass_rate_pct,
      reference_documents_processed: documents.length,
      verified_finding_count: findings.length,
      citation_count: citations.length,
      unsupported_findings_removed: (verifier.unsupported_claims_removed || []).length,
      recoverable_leakage_inr: Number(cost.confirmed_recoverable_leakage_inr || 0),
      cumulative_cost_exposure_inr: Number(cost.cumulative_adverse_variance_inr || 0),
      fac_forecast_exposure_inr: Number(cost.fac_forecast_exposure_inr || 0),
      gemini_calls: 0,
      email_render_ready: /Schedule Position/.test(emailText) && /Schedule Position/.test(emailHtml),
      audit_row_present: Boolean(auditRow),
      execution_ms: new Date().getTime() - started.getTime()
    },
    human_review_status: HUMAN_REVIEW_PENDING,
    release_decision: checks.every((item) => item[1] === true)
      ? "READY_FOR_HUMAN_REVIEW"
      : "BLOCKED_FIX_FAILED_CHECKS"
  };

  upsertTextFile(
    folders.outputs,
    `${jobId}-eev2-controlled-test-release-gate.json`,
    JSON.stringify(result, null, 2),
    MimeType.PLAIN_TEXT
  );

  console.log("EEV2 CONTROLLED TEST RELEASE GATE");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2 controlled TEST release gate failed. Production remains blocked.");
  return result;
}

function eev2SelectReferenceFiles(files) {
  const pdfs = (files || []).filter((file) => boardroomFileKind(file) === "pdf");
  return {
    progress: pdfs.find((file) => /activityprogress.*good|good.*activityprogress/i.test(String(file.name || ""))) || null,
    delay: pdfs.find((file) => /delayanalysis.*bad|bad.*delayanalysis/i.test(String(file.name || ""))) || null,
    cost: pdfs.find((file) => /costestimate.*normal|normal.*costestimate/i.test(String(file.name || ""))) || null
  };
}

function eev2ValidReleaseCitation(citation) {
  const item = citation || {};
  return Boolean(String(item.file || "").trim() && String(item.page_or_sheet || "").trim() && String(item.quoted_span || "").trim());
}
