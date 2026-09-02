// EEV2-003 regression — safe to run manually in Apps Script TEST project.
// Proves the word-boundary fix in boardroomFirstAmount / boardroomLastAmount:
// "Rs" and "INR" must be standalone tokens, not substrings inside ordinary words
// such as "Orders", "Workers", or "Hours".
//
// Root cause (confirmed against production Code.gs on 2026-09-02): the currency
// marker in the regex was `(?:₹|INR|Rs\.?)` with no word boundary, so "Rs" matched
// inside "Orders", "Workers", and "Hours". Fix: `(?:₹|\bINR\b|\bRs\.?)`.
//
// FABRICATION cases below use the five real strings reported against production,
// tested directly against boardroomFirstAmount (the same call shape
// extractBoardroomFindings uses via boardroomEvidenceWindows spans). Two of the
// five ("Total Change Orders: 21" and the HSE inspection line) never contained a
// substring-match bug in the first place -- confirmed by testing them standalone
// before the fix, where they already returned 0. Only three of the five actually
// reproduced the fabrication: Purchase Orders (Rs in "Orders"), Skilled Workers
// (Rs in "Workers"), Working Hours (Rs in "Hours"). All five are kept here as
// regression cases regardless, since a future regex change could reintroduce a
// match on any of them.
//
// The Purchase Orders case is intentionally NOT a "no amount" case: that exact
// sentence also contains a genuine "Rs.34503245.66" later in the same string, so
// correct behavior after the fix is to extract THAT real amount, not zero. This
// is documented here explicitly rather than asserted as a fabrication case, so a
// future reader does not "fix" it back into a false negative.

function eev2RunAmountFabricationRegression() {
  const checks = [];

  // FABRICATION: trigger word is a plain English word containing "rs"/"ors" etc,
  // with no real currency marker present at all. Must extract 0.
  const fabricationCases = [
    ["Skilled Workers 120 78 -42 35%", 0],
    ["Working Hours 08:00 - 18:00 (10 hours)", 0],
    ["Total Change Orders: 21", 0],
    ["HSE Inspections by Engineer 4 16 >=6/month", 0]
  ];
  fabricationCases.forEach(([text, expected]) => {
    const actual = boardroomFirstAmount(text);
    checks.push([`fabrication: "${text}" -> ${expected}`, actual === expected]);
  });

  // MIXED: same sentence that triggered the original bug report also contains a
  // genuine Rs. figure later in the string. After the fix this must extract the
  // real amount (34503245.66), not the fabricated 12, and not 0.
  {
    const text = "Total Purchase Orders 12 Total Procurement Value Rs.34503245.66";
    const actual = boardroomFirstAmount(text);
    checks.push([`mixed: "${text}" -> real amount 34503245.66, not fabricated 12`, actual === 34503245.66]);
  }

  // GENUINE: a real currency marker immediately precedes the digits. Must keep
  // extracting the correct amount after the word-boundary fix.
  const genuineCases = [
    ["NGT penalty of Rs. 25,00,000 and an immediate work-stoppage", 2500000],
    ["Cost Impact: Rs. 2,008,360.45", 2008360.45]
  ];
  genuineCases.forEach(([text, expected]) => {
    const actual = boardroomFirstAmount(text);
    checks.push([`genuine: "${text}" -> ${expected}`, actual === expected]);
  });

  // GENUINE: Budget vs Actual overrun math (INR marker, whole-word boundary).
  {
    const budgetText = "Budget: INR 500000 | Actual: INR 650000";
    const budget = boardroomFirstAmount(budgetText);
    const actual = boardroomLastAmount(budgetText);
    const overrun = actual - budget;
    checks.push(["genuine: Budget/Actual INR overrun = 150000", overrun === 150000]);
  }

  // NON-CURRENCY: a bare number with a days/percent suffix and no currency marker
  // anywhere in the string. Must extract 0 rupees -- these are not money.
  const nonCurrencyCases = [
    ["Delay Days: 14 days", 0],
    ["cost variance 30.0%", 0]
  ];
  nonCurrencyCases.forEach(([text, expected]) => {
    const actual = boardroomFirstAmount(text);
    checks.push([`non-currency: "${text}" -> ${expected} rupees`, actual === expected]);
  });

  const output = {
    ticket: "EEV2-003",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-003 AMOUNT FABRICATION REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-003 amount fabrication regression FAILED. See execution log.");
  console.log("EEV2-003 AMOUNT FABRICATION REGRESSION PASS: ok=true");
  return output;
}
