// EEV2InconsistencyScan.gs — Stage 3 "inconsistency-scan" crew.
//
// Read-only scan of VALIDATION_LOG_SHEET_ID's "validation-errors" tab (the
// same real, live sheet Contract 1/2 and eev2AuditJob's artifact 4a already
// read) for recurring anomaly patterns across ALL logged jobs, not just one
// job_id at a time. Unlike eev2AuditJob (audits a single known job), this
// looks across the whole sheet for patterns that only show up in aggregate:
// the same warning/error code recurring, the same amount misfiring
// repeatedly, or a source_document_template with a disproportionate
// REVERTED_NOT_SENT rate.
//
// Read-only by construction: only SpreadsheetApp.openById(...).getDataRange()
// is called. Never writes, never sends email, never creates a folder. Safe to
// run at any time without founder approval, per GOALS.md's S3 scope.
//
// Usage from clasp (same Execution API caveat as eev2AuditJob -- see
// EEV2AuditJob.gs's header and safety-gate-check.mjs):
//   clasp run eev2InconsistencyScan
//
// Categories scanned (all drawn from warning/error codes actually observed
// in the real sheet as of 2026-09-15 -- see docs/SESSION_LOG.md's Stage 1
// audit -- not invented categories):
//   - recurring_multi_amount_citation: same cited amount flagged
//     MULTI_AMOUNT_CITATION across multiple distinct jobs -- suggests a
//     structural extraction ambiguity for that figure/document shape, not a
//     one-off.
//   - recurring_unverified_or_count_amount: same amount repeatedly flagged
//     UNVERIFIED_AMOUNT or COUNT_READ_AS_AMOUNT across multiple jobs.
//   - possible_truncation_present: any row whose warning_list contains
//     POSSIBLE_TRUNCATION (a live signal Code.gs itself emits; distinct from
//     the now-fixed EEV2-008 storage-time truncation).
//   - template_high_hold_rate: a source_document_template whose
//     REVERTED_NOT_SENT rate across its own logged jobs is unusually high
//     relative to the sheet overall (systemic issue with that document
//     shape, not isolated).

function eev2InconsistencyScan() {
  const sheet = SpreadsheetApp.openById(VALIDATION_LOG_SHEET_ID).getSheetByName("validation-errors");
  if (!sheet) {
    const result = { ticket: "INCONSISTENCY-SCAN", scanned_at: new Date().toISOString(), error: "validation-errors tab not found on VALIDATION_LOG_SHEET_ID." };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const data = sheet.getDataRange().getValues();
  const header = data.length ? data[0].map((h) => String(h || "").trim()) : [];
  const col = {
    timestamp: header.indexOf("timestamp"),
    job_id: header.indexOf("job_id"),
    error_list: header.indexOf("error_list"),
    warning_list: header.indexOf("warning_list"),
    action_taken: header.indexOf("action_taken"),
    source_document_template: header.indexOf("source_document_template")
  };

  const rows = data.slice(1).map((r) => ({
    timestamp: col.timestamp >= 0 ? String(r[col.timestamp] || "") : "",
    job_id: col.job_id >= 0 ? String(r[col.job_id] || "") : "",
    error_list: col.error_list >= 0 ? String(r[col.error_list] || "") : "",
    warning_list: col.warning_list >= 0 ? String(r[col.warning_list] || "") : "",
    action_taken: col.action_taken >= 0 ? String(r[col.action_taken] || "") : "",
    source_document_template: col.source_document_template >= 0 ? String(r[col.source_document_template] || "") : ""
  }));

  // -- recurring_multi_amount_citation / recurring_unverified_or_count_amount --
  // Extract the INR amount named inside each MULTI_AMOUNT_CITATION /
  // UNVERIFIED_AMOUNT / COUNT_READ_AS_AMOUNT message and count how many
  // DISTINCT job_ids each amount appears under.
  const amountJobsByCode = { MULTI_AMOUNT_CITATION: {}, UNVERIFIED_AMOUNT: {}, COUNT_READ_AS_AMOUNT: {} };
  rows.forEach((row) => {
    const combinedText = `${row.error_list} | ${row.warning_list}`;
    Object.keys(amountJobsByCode).forEach((code) => {
      const re = new RegExp(code + "[^|]*?INR\\s*([\\d,.]+)", "g");
      let m;
      while ((m = re.exec(combinedText))) {
        const amount = m[1];
        if (!amountJobsByCode[code][amount]) amountJobsByCode[code][amount] = new Set();
        amountJobsByCode[code][amount].add(row.job_id);
      }
    });
  });
  function recurringAmounts(byAmount) {
    return Object.entries(byAmount)
      .map(([amount, jobSet]) => ({ amount_inr: amount, distinct_job_count: jobSet.size, job_ids: Array.from(jobSet) }))
      .filter((e) => e.distinct_job_count > 1)
      .sort((a, b) => b.distinct_job_count - a.distinct_job_count);
  }
  const recurringMultiAmountCitation = recurringAmounts(amountJobsByCode.MULTI_AMOUNT_CITATION);
  const recurringUnverifiedOrCount = recurringAmounts({
    // merge UNVERIFIED_AMOUNT and COUNT_READ_AS_AMOUNT job sets per amount --
    // these two codes co-occur on the same figure in the real data (same
    // amount misread two ways), so report them together, not doubled.
    ...Object.fromEntries(
      Object.keys({ ...amountJobsByCode.UNVERIFIED_AMOUNT, ...amountJobsByCode.COUNT_READ_AS_AMOUNT }).map((amount) => {
        const merged = new Set([
          ...(amountJobsByCode.UNVERIFIED_AMOUNT[amount] || []),
          ...(amountJobsByCode.COUNT_READ_AS_AMOUNT[amount] || [])
        ]);
        return [amount, merged];
      })
    )
  });

  // -- possible_truncation_present --
  const truncationRows = rows
    .filter((row) => row.warning_list.includes("POSSIBLE_TRUNCATION"))
    .map((row) => ({ job_id: row.job_id, timestamp: row.timestamp }));

  // -- template_high_hold_rate --
  const byTemplate = {};
  rows.forEach((row) => {
    const key = row.source_document_template || "(blank)";
    if (!byTemplate[key]) byTemplate[key] = { total: 0, held: 0 };
    byTemplate[key].total += 1;
    if (row.action_taken === "REVERTED_NOT_SENT") byTemplate[key].held += 1;
  });
  const overallTotal = rows.length;
  const overallHeld = rows.filter((r) => r.action_taken === "REVERTED_NOT_SENT").length;
  const overallHoldRate = overallTotal ? overallHeld / overallTotal : 0;
  const templateHighHoldRate = Object.entries(byTemplate)
    .map(([template, counts]) => ({
      source_document_template: template,
      total_jobs: counts.total,
      held_jobs: counts.held,
      hold_rate: counts.total ? counts.held / counts.total : 0
    }))
    // "unusually high" = at least 2 jobs (so a single sample can't trigger
    // this) and a hold rate at least double the sheet-wide rate, or 100%
    // held when the sheet-wide rate is 0 and this template has 2+ holds.
    .filter((e) => e.total_jobs >= 2 && e.held_jobs >= 2 && (overallHoldRate > 0 ? e.hold_rate >= overallHoldRate * 2 : e.hold_rate === 1))
    .sort((a, b) => b.hold_rate - a.hold_rate);

  const result = {
    ticket: "INCONSISTENCY-SCAN",
    scanned_at: new Date().toISOString(),
    rows_scanned: rows.length,
    overall_hold_rate: overallHoldRate,
    findings: {
      recurring_multi_amount_citation: recurringMultiAmountCitation,
      recurring_unverified_or_count_amount: recurringUnverifiedOrCount,
      possible_truncation_present: truncationRows,
      template_high_hold_rate: templateHighHoldRate
    },
    findings_count:
      recurringMultiAmountCitation.length +
      recurringUnverifiedOrCount.length +
      truncationRows.length +
      templateHighHoldRate.length
  };

  console.log("INCONSISTENCY-SCAN");
  console.log(JSON.stringify(result, null, 2));
  return result;
}
