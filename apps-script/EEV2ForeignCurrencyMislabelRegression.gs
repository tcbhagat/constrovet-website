// EEV2-018 regression — safe to run manually in Apps Script TEST project.
// Proves that a non-INR figure can never ship labelled INR.
//
// REAL INCIDENT (2026-09-18, job cv-20260917223525-2z8936, delivered by email
// to admin@constrovet.com during controlled testing — no client received it):
// a CSV denominated entirely in US dollars produced an Executive Action Plan
// headlining "Cited quantified recoverable leakage totals INR 5,400 across 12
// finding(s)". The report's own Citations section printed the contradiction:
//   "Task description: Steel Framing | Budget: $45,000.00 | Actual: $46,000.00"
//   -> "CSV row shows Actual - Budget overrun of INR 1,000."
// The arithmetic was correct ($5,400 total). The CURRENCY was fabricated.
// The charter's prime directive forbids exactly this: no fabricated *or
// mislabeled* financial figure may ship in a client report.
//
// Root cause, two independent gaps that had to line up:
//  1. EXTRACTION: boardroomParseAmount() falls through to /-?\d+(?:\.\d+)?/,
//     which matches digits inside any string and discards the currency symbol.
//     boardroomCsvBudgetActualFinding() then hardcoded the label "INR" and
//     formatInr() applied en-IN digit grouping regardless of origin.
//  2. VALIDATION: CHECK 5b — the check that stops fabricated rupee figures —
//     deliberately EXEMPTS STRUCTURED_ACTUAL_BUDGET findings, because a
//     computed Actual - Budget difference legitimately never appears verbatim
//     in source text. That exemption is right about the arithmetic but silent
//     about the currency of the inputs, so the structured path had no currency
//     guard at all. The shipped report showed the hole in its own numbers:
//     "Cited findings 12" beside "Cited amount findings: 0".
//
// Fix, defence in depth:
//  - Extraction refuses to emit a finding when the Budget or Actual cell
//    carries a foreign currency marker (boardroomHasForeignCurrency).
//  - CHECK 5f blocks the whole report if a STRUCTURED_ACTUAL_BUDGET finding's
//    own citation shows a non-INR currency, catching any other route in.
//
// Deliberate non-goal: multi-currency reporting. Until that feature exists,
// refusing is the only honest option — and an UNMARKED numeric column stays
// legitimate, because that is the common case in an India-facing tool and
// blocking it would break every ordinary submission.

function eev2RunForeignCurrencyMislabelRegression() {
  const checks = [];

  // ---- Layer 1: extraction must not redenominate --------------------------

  const headers = ["Task description", "Budget", "Actual", "Invoices"];
  const csvSpan = (task, b, a) => `Task description: ${task} | Budget: ${b} | Actual: ${a}`;

  // THE REAL INCIDENT ROW. Must now produce no finding at all.
  {
    const row = ["Steel Framing", "$45,000.00", "$46,000.00", "$46,000.00"];
    const finding = boardroomCsvBudgetActualFinding(
      "actual-budget-invoices - Sheet1.csv", "CSV row 6",
      csvSpan("Steel Framing", "$45,000.00", "$46,000.00"), headers, row
    );
    checks.push(["real incident row ($45,000 -> $46,000) emits NO finding", finding === null]);
  }

  // Other foreign denominations must be refused the same way.
  const foreignRows = [
    ["EUR symbol", ["Excavation", "€12,000.00", "€12,500.00", ""]],
    ["GBP symbol", ["Roofing", "£22,000.00", "£23,000.00", ""]],
    ["JPY symbol", ["Cladding", "¥15,000", "¥15,500", ""]],
    ["USD code", ["Masonry", "USD 18000", "USD 18500", ""]],
    ["EUR code", ["Flooring", "EUR 13000", "EUR 13500", ""]],
    ["AED code", ["Painting", "AED 9000", "AED 9500", ""]]
  ];
  foreignRows.forEach(function (entry) {
    const label = entry[0];
    const row = entry[1];
    const finding = boardroomCsvBudgetActualFinding(
      "x.csv", "CSV row 2", csvSpan(row[0], row[1], row[2]), headers, row
    );
    checks.push([`foreign currency refused at extraction: ${label}`, finding === null]);
  });

  // REGRESSION GUARD: the legitimate cases must still work. An unmarked
  // numeric column and an explicitly-INR column are both ordinary, and
  // over-blocking here would break every real submission.
  const genuineRows = [
    ["unmarked numeric column", ["Excavation", "12000", "12500", ""], 500],
    ["INR code", ["Steel Framing", "INR 45,000.00", "INR 46,000.00", ""], 1000],
    ["Rs. prefix", ["Roofing", "Rs. 22,000", "Rs. 23,000", ""], 1000],
    ["rupee symbol", ["Cladding", "₹15,000", "₹15,500", ""], 500]
  ];
  genuineRows.forEach(function (entry) {
    const label = entry[0];
    const row = entry[1];
    const expected = entry[2];
    const finding = boardroomCsvBudgetActualFinding(
      "x.csv", "CSV row 2", csvSpan(row[0], row[1], row[2]), headers, row
    );
    const ok = finding !== null && Math.abs(finding.amount_inr - expected) <= 1;
    checks.push([`genuine INR/unmarked row still produces a finding: ${label}`, ok]);
  });

  // The existing no-overrun rule must be untouched by this change.
  {
    const row = ["Concrete Curing", "3000", "3000", ""];
    const finding = boardroomCsvBudgetActualFinding(
      "x.csv", "CSV row 5", csvSpan("Concrete Curing", "3000", "3000"), headers, row
    );
    checks.push(["actual <= budget still produces no finding", finding === null]);
  }

  // ---- Layer 2: the validator backstop ------------------------------------

  function validateOne(finding) {
    return validateReportOutput({ source_job_id: "eev2-018-test" }, { findings: [finding], analysis_generated: true });
  }

  function structuredFinding(span, budget, actual) {
    return {
      statement: `CSV row shows Actual - Budget overrun of INR ${actual - budget}.`,
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: actual - budget,
      days: 0,
      citations: [{ file: "actual-budget-invoices - Sheet1.csv", page_or_sheet: "CSV row 6", quoted_span: span }],
      calculation: { budget: budget, actual: actual, difference: actual - budget, formula: "Actual - Budget" },
      confidence: "HIGH",
      evidence_quality: "STRUCTURED_ACTUAL_BUDGET"
    };
  }

  // THE REAL INCIDENT FINDING, as actually shipped. Must now be blocked even
  // if something upstream produces it — this is the check CHECK 5b's
  // STRUCTURED_ACTUAL_BUDGET exemption was silently skipping.
  {
    const finding = structuredFinding(
      "Task description: Steel Framing | Budget: $45,000.00 | Actual: $46,000.00 | Invoices: $46,000.00",
      45000, 46000
    );
    const result = validateOne(finding);
    const caught = result.isValid === false &&
      result.errors.some((e) => e.indexOf("FOREIGN_CURRENCY_LABELLED_INR") === 0);
    checks.push(["shipped incident finding is now BLOCKED by CHECK 5f", caught]);
  }

  // REGRESSION GUARD: the structured path's legitimate cases must still pass
  // validation. If CHECK 5f over-fires here it blocks every ordinary CSV.
  {
    const finding = structuredFinding(
      "Task description: Steel Framing | Budget: 45000 | Actual: 46000", 45000, 46000
    );
    const result = validateOne(finding);
    checks.push(["unmarked numeric structured finding still passes validation", result.isValid === true]);
  }
  {
    const finding = structuredFinding(
      "Task description: Steel Framing | Budget: INR 45,000 | Actual: INR 46,000", 45000, 46000
    );
    const result = validateOne(finding);
    checks.push(["explicitly-INR structured finding still passes validation", result.isValid === true]);
  }

  // CHECK 5f must not reach past its own scope: a CITED_AMOUNT finding is
  // CHECK 5b's territory, and 5b already requires an INR marker beside the
  // figure. Confirm a genuine INR narrative finding is unaffected.
  {
    const finding = {
      statement: "Penalty of INR 25,00,000 cited.",
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 2500000,
      days: 0,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: "NGT imposed a penalty of Rs. 25,00,000 and an immediate work-stoppage" }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      confidence: "HIGH",
      evidence_quality: "CITED_AMOUNT"
    };
    const result = validateOne(finding);
    checks.push(["genuine INR CITED_AMOUNT finding unaffected by CHECK 5f", result.isValid === true]);
  }

  // The helper itself, directly — cheap to assert, and it is the single point
  // both layers depend on.
  const helperCases = [
    ["$45,000.00", true], ["€12,000", true], ["£22,000", true], ["¥15,000", true],
    ["USD 18000", true], ["EUR 13000", true], ["GBP 9000", true], ["AED 9000", true], ["SAR 9000", true],
    ["45000", false], ["INR 45,000", false], ["Rs. 45,000", false], ["₹45,000", false], ["", false]
  ];
  helperCases.forEach(function (entry) {
    const text = entry[0];
    const expected = entry[1];
    checks.push([`boardroomHasForeignCurrency("${text}") === ${expected}`,
      boardroomHasForeignCurrency(text) === expected]);
  });

  const output = {
    ticket: "EEV2-018",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-018 FOREIGN CURRENCY MISLABEL REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-018 foreign currency mislabel regression FAILED. See execution log.");
  console.log("EEV2-018 FOREIGN CURRENCY MISLABEL REGRESSION PASS: ok=true");
  return output;
}
