// EEV2-005 regression — safe to run manually in Apps Script TEST project.
// Proves the word-boundary fix in boardroomLeakageRe (ROADMAP.md Milestone 3,
// 2026-09-04): trigger terms must be standalone tokens, not substrings inside
// ordinary construction vocabulary.
//
// Root cause (confirmed against the live, deployed Code.js on 2026-09-04): the
// leakage-trigger regex had a bare `late` term with no word boundary, so it
// matched inside "plate", "template", "escalated", "calculate", "translate",
// "relate", and "inflate". Combined with boardroomTriggerOwnedAmount's 40-char
// label window (EEV2-004), this let ordinary construction vocabulary — e.g.
// "Shuttering plate hire for slab casting Rs.2,40,000" — falsely claim
// ownership of a nearby genuine currency figure and report it as recoverable
// leakage. Fix: `\blate\b`, matching the same word-boundary pattern already
// applied to `\bld\b` in the same regex on 2026-09-01 for an identical bug
// shape (this is the second time this exact mechanism has needed the same
// fix — see ROADMAP.md's Recurring Failure Pattern #5).
//
// Confirmed via a 30-word construction-vocabulary sweep against the fixed
// regex (recovery-v11/Code.merged-candidate.js, 2026-09-04): only "late" had
// a live substring-match defect. "cold", "building", "welding", "ladder",
// "solder", "holder", "folder", "welder", "milder", "colder", "bolder",
// "boulder", "scaffolding", "elevator" and 16 other ordinary terms were
// already correctly excluded by the existing \bld\b fix and did not need
// further changes.

function eev2RunLeakageWordBoundaryRegression() {
  const checks = [];

  // FABRICATION: ordinary construction vocabulary containing "late" as a
  // substring, immediately followed by a genuine currency figure within the
  // 40-char label window. Must NOT be claimed as leakage -- boardroomTrigger-
  // OwnedAmount must return 0.
  const fabricationCases = [
    ["Cold storage civil works Rs.15,00,000 as per BOQ item 4.2", 0],
    ["Shuttering plate hire for slab casting Rs.2,40,000 billed this month", 0],
    ["Base plate fabrication cost Rs.85,000 for the column footing", 0],
    ["Template drawings revised, printing cost Rs.3,200", 0]
  ];
  fabricationCases.forEach(([text, expected]) => {
    const actual = boardroomTriggerOwnedAmount(text, boardroomLeakageRe());
    checks.push([`fabrication: "${text}" -> ${expected}`, actual === expected]);
  });

  // GENUINE: standalone "late" as its own word must still correctly trigger
  // ownership -- the fix removes the substring match, not the word itself.
  {
    const text = "A late fee of Rs. 1,20,000 was charged for the delay.";
    const actual = boardroomTriggerOwnedAmount(text, boardroomLeakageRe());
    checks.push([`genuine standalone word: "${text}" -> 120000`, actual === 120000]);
  }

  // GENUINE: other leakage trigger terms must be unaffected by this fix --
  // confirms the fix is scoped to "late" only, not a regression elsewhere in
  // the same regex.
  const genuineCases = [
    ["NGT imposed a penalty of Rs. 25,00,000 payable within 30 days.", 2500000],
    ["Liquidated damages of Rs. 8,50,000 were deducted per the contract.", 850000],
    ["Material wastage valued at Rs. 3,75,000 was recorded this quarter.", 375000]
  ];
  genuineCases.forEach(([text, expected]) => {
    const actual = boardroomTriggerOwnedAmount(text, boardroomLeakageRe());
    checks.push([`genuine: "${text}" -> ${expected}`, actual === expected]);
  });

  // REGRESSION GUARD: the \bld\b fix from 2026-09-01 must still hold -- this
  // fix must not have accidentally reverted it.
  const ldRegressionCases = [
    ["Cold storage racking installed, invoice Rs.6,40,000 attached.", 0],
    ["Welding works for structural steel Rs.2,10,000 completed.", 0]
  ];
  ldRegressionCases.forEach(([text, expected]) => {
    const actual = boardroomTriggerOwnedAmount(text, boardroomLeakageRe());
    checks.push([`ld-fix regression guard: "${text}" -> ${expected}`, actual === expected]);
  });

  const output = {
    ticket: "EEV2-005",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-005 LEAKAGE WORD-BOUNDARY REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-005 leakage word-boundary regression FAILED. See execution log.");
  console.log("EEV2-005 LEAKAGE WORD-BOUNDARY REGRESSION PASS: ok=true");
  return output;
}
