// EEV2XaiExplain.gs — Stage 3 "xai-explain" crew.
//
// Given a job_id and a finding index, produces a "why this figure" markdown
// explanation grounded ONLY in fields already present on that real finding's
// final-report.json (statement, citation, calculation, confidence,
// financial_category) -- it does not call Gemini or infer anything the
// report doesn't already contain. This is a rendering tool, not a second
// analysis pass: its entire purpose is to make an already-computed finding's
// evidence legible, never to add new claims to it.
//
// Read-only: opens the job's real outputs folder and reads
// `${jobId}-final-report.json`, same file eev2AuditJob and the real pipeline
// itself already treat as the source of truth for a job's findings. Never
// writes, never sends email, never creates a folder.
//
// Usage from clasp (same Execution API caveat as eev2AuditJob/
// eev2InconsistencyScan):
//   clasp run eev2XaiExplain -p '["form-20260902-135120-81f4fd27", 0]'

function eev2XaiExplain(jobId, findingIndex) {
  const id = String(jobId || "").trim();
  const index = Number(findingIndex);
  if (!id) {
    throw new Error("eev2XaiExplain(jobId, findingIndex) requires a non-empty job_id.");
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("eev2XaiExplain(jobId, findingIndex) requires findingIndex to be a non-negative integer.");
  }

  const result = { ticket: "XAI-EXPLAIN", job_id: id, finding_index: index, generated_at: new Date().toISOString() };

  const jobFolder = eev2FindJobFolderReadOnly_(id);
  if (!jobFolder) {
    result.error = `job folder not found for ${id} -- cannot read its final-report.json.`;
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const outputs = eev2FindOutputsFolderReadOnly_(jobFolder);
  if (!outputs) {
    result.error = `outputs subfolder not found for ${id}.`;
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const fileName = `${id}-final-report.json`;
  const files = outputs.getFilesByName(fileName);
  if (!files.hasNext()) {
    result.error = `${fileName} not found in outputs folder.`;
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const file = files.next();

  let report;
  try {
    report = JSON.parse(file.getBlob().getDataAsString());
  } catch (err) {
    result.error = `${fileName} could not be parsed as JSON: ${String(err && err.message ? err.message : err)}`;
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  const findings = report.findings || report.boardroom_findings || [];
  if (index >= findings.length) {
    result.error = `finding index ${index} out of range -- ${fileName} has ${findings.length} finding(s).`;
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const finding = findings[index];
  const citation = (finding.citations && finding.citations[0]) || {};
  const calc = finding.calculation || {};

  const lines = [];
  lines.push(`# Why this figure — ${id}, finding ${index}`, "");
  lines.push(`**Statement:** ${finding.statement || "(none)"}`, "");
  lines.push(`**Financial category:** ${finding.financial_category || "(none)"}`);
  lines.push(`**Amount (INR):** ${finding.amount_inr != null ? finding.amount_inr : "(none)"}`);
  lines.push(`**Days:** ${finding.days != null ? finding.days : "(none)"}`);
  lines.push(`**Confidence:** ${finding.confidence || "(none)"}`, "");
  if (calc.formula) {
    lines.push(`**Calculation:** ${calc.formula} = INR ${calc.difference != null ? calc.difference : "(none)"} (budget: ${calc.budget != null ? calc.budget : "(none)"}, actual: ${calc.actual != null ? calc.actual : "(none)"})`, "");
  } else {
    lines.push(`**Calculation:** (none present on this finding)`, "");
  }
  lines.push(`**Citation:** ${citation.file || "(unknown file)"} (${citation.page_or_sheet || "unknown location"})`);
  lines.push("");
  lines.push("> " + (citation.quoted_span ? boardroomDisplaySpan(citation.quoted_span) : "(no quoted span on this finding)"));
  lines.push("");
  lines.push(`_This explanation is drawn only from fields already present on the finding as stored in ${fileName}. It does not add or infer anything the report does not already contain._`);

  result.markdown = lines.join("\n");
  console.log("XAI-EXPLAIN " + id + " #" + index);
  console.log(JSON.stringify(result, null, 2));
  return result;
}
