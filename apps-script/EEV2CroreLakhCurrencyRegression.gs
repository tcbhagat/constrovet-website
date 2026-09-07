// EEV2-007 regression — safe to run manually in Apps Script TEST project.
// Proves CHECK 5b's Crore/Lakh unit-aware fallback in validateReportOutput
// (Code.gs): a genuine, correctly-extracted currency figure denominated in
// Crores or Lakhs must not false-positive as UNVERIFIED_AMOUNT just because
// the expanded rupee number does not appear verbatim in the source text.
//
// Root cause (confirmed live 2026-09-07, PreContract_Files_ dataset,
// job form-20260907-131337-8f2cd404, real RFQ document, submitted during a
// 15-submission repeatability cycle): extraction (boardroomTriggerOwnedAmount
// / boardroomFirstAmount / boardroomLastAmount) applies a crore/lakh/lac
// multiplier -- "245 Crores" -> amount_inr 2450000000 -- before the finding
// is built. CHECK 5b's currency-context verification only ever searched for
// the literal expanded digit string ("2450000000") near a currency marker.
// That string never appears in source text that says "245 Crores", so every
// genuine Crore/Lakh finding held with UNVERIFIED_AMOUNT. This is the
// opposite failure direction from the prime directive -- a correct,
// non-fabricated figure was wrongly blocked, not a fabricated one wrongly
// sent -- but it degrades trust in the gate and would repeat for every
// future Crore/Lakh-denominated real finding.
//
// Real held report (bhagat.taran@gmail.com, job form-20260907-131337-8f2cd404):
//   citation: "High-Level Budget: ₹ 245 Crores Key Stakeholders: ..."
//   finding: financial_category=BASELINE_BUDGET, amount_inr=2450000000
//   error: UNVERIFIED_AMOUNT: Finding 0 claims INR 2450000000 but no
//          citation shows this figure next to a currency marker
//
// Fix: CHECK 5b now also matches `<marker> <digits> <crore|cr|lakh|lac>`
// directly in the citation text, reapplies the same multiplier extraction
// uses, and compares the resulting value to amount_inr (±1 for rounding) --
// instead of requiring the literal expanded digits to appear verbatim.

function eev2RunCroreLakhCurrencyRegression() {
  const checks = [];

  function run(finding) {
    return validateReportOutput({ source_job_id: "eev2-007-test" }, { findings: [finding], analysis_generated: true });
  }

  // REAL PRODUCTION CASE: must now pass. Exact real citation text and
  // amount_inr from job form-20260907-131337-8f2cd404.
  {
    const finding = {
      statement: "Baseline budget evidence of INR 2,45,00,00,000 is cited.",
      financial_category: "BASELINE_BUDGET",
      amount_inr: 2450000000,
      days: 0,
      citations: [{
        file: "3ed7ecc4.Request-for-Qualification-RFQ-.101545---Taran-Bhagat.pdf",
        page_or_sheet: "Workspace OCR",
        quoted_span: "High-Level Budget: ₹ 245 Crores Key Stakeholders: · Internal: Greenfield Directors, Sales Team, Finance Team."
      }],
      calculation: { budget: 2450000000, actual: 0, difference: 0, formula: "Actual - Budget" },
      confidence: "MEDIUM",
      evidence_quality: "CITED_AMOUNT"
    };
    const result = run(finding);
    checks.push(["real production case: 245 Crores citation, amount_inr=2450000000, must pass", result.isValid === true]);
  }

  // Lakh variant, singular and plural unit forms, and the "cr"/"lac"
  // abbreviations extraction itself already recognizes.
  const genuineUnitCases = [
    ["Contract value: Rs. 50 Lakh as per BOQ.", 5000000],
    ["Contract value: Rs. 50 Lakhs as per BOQ.", 5000000],
    ["Total budget INR 12 Cr sanctioned for phase 1.", 120000000],
    ["Approved spend of Rs.8 Lac for site mobilization.", 800000]
  ];
  genuineUnitCases.forEach(([text, amount]) => {
    const finding = {
      financial_category: "BASELINE_BUDGET",
      amount_inr: amount,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: text }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      evidence_quality: "CITED_AMOUNT"
    };
    const result = run(finding);
    checks.push([`genuine unit case passes: "${text}"`, result.isValid === true]);
  });

  // REGRESSION GUARD: every fabrication case already documented in CHECK 5b's
  // own comment must still be caught -- the crore/lakh fallback must not
  // create a new laundering path for these.
  const fabricationCases = [
    ["HSE Inspections by Engineer 4 16 >=6/month penalty imposed", 6],
    ["Total Purchase Orders 12", 12],
    ["Working Hours 08:00 - 18:00", 8],
    ["Skilled Workers 120 78 -42 35%", 120],
    ["Total Change Orders: 21", 21]
  ];
  fabricationCases.forEach(([text, amount]) => {
    const finding = {
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: amount,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: text }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      evidence_quality: "CITED_AMOUNT"
    };
    const result = run(finding);
    const caught = result.isValid === false && result.errors.some((e) => e.indexOf("UNVERIFIED_AMOUNT") === 0);
    checks.push([`fabrication still caught: "${text}" -> INR ${amount}`, caught]);
  });

  // REGRESSION GUARD: a genuine non-unit currency figure (no crore/lakh
  // suffix) must still pass via the original literal-digit-match path.
  {
    const finding = {
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 2500000,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: "NGT imposed a penalty of Rs. 25,00,000 and an immediate work-stoppage" }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      evidence_quality: "CITED_AMOUNT"
    };
    const result = run(finding);
    checks.push(["genuine non-unit currency (NGT penalty) still passes", result.isValid === true]);
  }

  // REGRESSION GUARD: CHECK 5e (aggregate-value-as-leakage) must still fire
  // on its own real incident case -- the crore/lakh fallback in 5b must not
  // accidentally cause 5e to be skipped or bypassed.
  {
    const finding = {
      financial_category: "LEAKAGE_AND_OVERRUN",
      amount_inr: 34503245.66,
      citations: [{ file: "x.pdf", page_or_sheet: "1", quoted_span: "Total Purchase Orders 12 Total Procurement Value Rs.34503245.66 Delayed POs 7" }],
      calculation: { budget: 0, actual: 0, difference: 0, formula: "Actual - Budget" },
      evidence_quality: "CITED_AMOUNT"
    };
    const result = run(finding);
    const caught = result.isValid === false && result.errors.some((e) => e.indexOf("AGGREGATE_VALUE_READ_AS_LEAKAGE") === 0);
    checks.push(["CHECK 5e original incident case still blocked (crore fallback in 5b does not bypass 5e)", caught]);
  }

  const output = {
    ticket: "EEV2-007",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-007 CRORE/LAKH CURRENCY REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-007 crore/lakh currency regression FAILED. See execution log.");
  console.log("EEV2-007 CRORE/LAKH CURRENCY REGRESSION PASS: ok=true");
  return output;
}
