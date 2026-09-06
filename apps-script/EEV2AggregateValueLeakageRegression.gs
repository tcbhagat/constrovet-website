// EEV2-005 regression — safe to run manually in Apps Script TEST project.
// Proves CHECK 5e in validateReportOutput (Code.gs): a LEAKAGE_AND_OVERRUN
// finding with no real budget/actual math (evidence_quality !==
// STRUCTURED_ACTUAL_BUDGET) whose cited amount is immediately preceded by an
// aggregate/totals-value label must be held, not passed through as leakage.
//
// Root cause (CONTRACTS.md Open Item 7, confirmed live 2026-09-02, job
// form-20260902-184403-e5014284): a genuinely-extracted currency figure
// (Rs.34503245.66, correctly matched by CHECK 5b's currency-marker check) was
// the source document's own "Total Procurement Value" line, not an overrun.
// CHECK 5b passed (real currency marker adjacent to the figure). CHECK 5c did
// not fire (the preceding phrase is a value label, not a count phrase like
// "Total Purchase Orders"). Neither check asks whether the figure's own label
// means "spend total" rather than "overrun". This produced a client-facing
// report citing INR 27,60,26,419 "recoverable leakage" that was actually the
// sum of 8 near-identical total-procurement-value citations. Live evidence:
// SESSION_LOG.md, 2026-09-05 escalation entry.

function eev2RunAggregateValueLeakageRegression() {
  const checks = [];

  function runCheck(finding) {
    const report = { source_job_id: "eev2-005-test" };
    const browserReport = { findings: [finding], analysis_generated: true };
    return validateReportOutput(report, browserReport);
  }

  // FABRICATION: the exact real production finding that produced the
  // ₹27.6 Cr incident. Must now be held (isValid=false), specifically on
  // AGGREGATE_VALUE_READ_AS_LEAKAGE, not merely isValid=false for some
  // unrelated reason.
  {
    const finding = {
      statement: "Possible leakage or overrun signal (trigger term: delay) was found in this document. Cited figure(s): INR 3,45,03,246. Supporting evidence is required before any recovery action.",
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 34503245.66,
      days: 0,
      citations: [{
        file: "Procurement_Material_Inspection_Reports---Taran-Bhagat.pdf",
        page_or_sheet: "Workspace OCR",
        quoted_span: "PRJ-2026-5578 Document Type Material Inspection Reports Category Procurement Total Purchase Orders 12 Total Procurement Value Rs.34503245.66 Delayed POs 7 (58%) On-Time Delivery Rate 41% Category: 09_Procurement NBC 2016"
      }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      confidence: "MEDIUM",
      evidence_quality: "CITED_AMOUNT"
    };
    const result = runCheck(finding);
    const caught = result.isValid === false && result.errors.some((e) => e.indexOf("AGGREGATE_VALUE_READ_AS_LEAKAGE") === 0);
    checks.push(["real incident finding (Total Procurement Value) is held, not passed", caught]);
  }

  // FABRICATION variants: the same aggregate-label family across the
  // narrow phrase list this check was deliberately scoped to.
  const aggregateVariants = [
    ["Total Contract Value Rs.125000000 as per the signed agreement", 125000000],
    ["Total Project Cost INR 87500000 across all work packages", 87500000],
    ["Total BOQ Value Rs. 42000000 for the awarded scope", 42000000],
    ["Total Estimated Cost Rs.99900000 at planning stage", 99900000]
  ];
  aggregateVariants.forEach(([text, amount]) => {
    const finding = {
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: amount,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: text }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      evidence_quality: "CITED_AMOUNT"
    };
    const result = runCheck(finding);
    const caught = result.isValid === false && result.errors.some((e) => e.indexOf("AGGREGATE_VALUE_READ_AS_LEAKAGE") === 0);
    checks.push([`aggregate-label variant held: "${text}"`, caught]);
  });

  // GENUINE, must still pass: a real STRUCTURED_ACTUAL_BUDGET overrun is
  // exempt regardless of nearby wording, since CHECK 3 already re-verifies
  // its arithmetic and this amount is computed, not read off a totals line.
  {
    const finding = {
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 150000,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: "Budget: INR 500000 | Actual: INR 650000" }],
      calculation: { budget: 500000, actual: 650000, difference: 150000, formula: "Actual - Budget" },
      evidence_quality: "STRUCTURED_ACTUAL_BUDGET"
    };
    const result = runCheck(finding);
    checks.push(["genuine STRUCTURED_ACTUAL_BUDGET overrun still passes", result.isValid === true]);
  }

  // GENUINE, must still pass: the named false-positive control from
  // ROADMAP.md Milestone 5 — a real NGT penalty with no aggregate-value
  // label anywhere near the figure.
  {
    const finding = {
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 2500000,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: "NGT imposed a penalty of Rs. 25,00,000 and an immediate work-stoppage" }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      evidence_quality: "CITED_AMOUNT"
    };
    const result = runCheck(finding);
    checks.push(["NGT penalty false-positive control still passes", result.isValid === true]);
  }

  // GENUINE, must still pass: a non-LEAKAGE_AND_OVERRUN category citing a
  // total-value phrase (e.g. BASELINE_BUDGET) is out of scope for this check
  // by design — totals are expected and correct context there.
  {
    const finding = {
      financial_category: "BASELINE_BUDGET",
      amount_inr: 34503245.66,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: "Total Procurement Value Rs.34503245.66 for the awarded package" }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      evidence_quality: "CITED_AMOUNT"
    };
    const result = runCheck(finding);
    checks.push(["BASELINE_BUDGET category with same phrase is out of scope, still passes", result.isValid === true]);
  }

  const output = {
    ticket: "EEV2-005",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-005 AGGREGATE VALUE LEAKAGE REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-005 aggregate value leakage regression FAILED. See execution log.");
  console.log("EEV2-005 AGGREGATE VALUE LEAKAGE REGRESSION PASS: ok=true");
  return output;
}
