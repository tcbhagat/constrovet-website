// EEV2-017 (M15, Option A) — sendReportEmail is the single validation choke
// point for every current sender of a client report.
//
// Background: 2 of sendReportEmail's 4 real callers ran validateReportOutput
// before calling it (doPost, handleBoardroomFormSubmit). The other 2 did not
// -- rerunBoardroomJobWithCorrections (reached via the correction-form
// trigger onCorrectionFormSubmit; confirmed by the founder at the Apps
// Script Triggers UI, 2026-09-10, that this trigger is NOT currently
// installed, so this path is real but not live-reachable today) and
// resendBoardroomReport (founder-manual-only, no doPost route). Confirmed
// against a real production job: form-20260909-165508-4076a2ce's own
// job-state.json shows email_status=EMAIL_SENT, yet its real findings (see
// EEV2MustBlockGateRegression.gs's job2Findings, same real fixture reused
// here) make validateReportOutput return isValid=false via CHECK 8
// (NO_VERIFIED_EVIDENCE) -- this exact gate was reachable and bypassed in
// production by at least one caller shape.
//
// Fix: sendReportEmail (Code.gs) now runs validateReportOutput itself before
// ever calling MailApp.sendEmail, regardless of which caller invoked it. On
// failure it writes the VALIDATION_FAILED.json artifact (when a `folders`
// argument was supplied) and returns the same HELD_VALIDATION_FAILED
// delivery shape heldForValidationFailureDelivery_ already produces for the
// 2 previously-gated callers -- not a second, different held shape.
//
// This is a STATIC source check, deliberately, following the same pattern
// as EEV2GatePresenceRegression.gs (EEV2-007). Actually calling
// sendReportEmail would immediately hit the blocked PropertiesService proxy
// at the top of the function (scripts/run-eev2-harness.mjs deliberately
// throws on any Apps Script service call) before reaching any of this new
// logic -- so real end-to-end behavior can only be exercised inside the
// Apps Script TEST project, same constraint documented in
// EEV2GateHealthCircuitBreakerRegression.gs. What CAN run safely in Node,
// and is what this suite checks: (1) sendReportEmail's own source contains
// the gate, in the right place (before MailApp.sendEmail); (2) all 4 real
// call sites pass a folders-shaped argument, not silently omitting it after
// the signature changed; (3) the real JOB2 fixture, independently
// reproduced from EEV2MustBlockGateRegression.gs, actually fails
// validateReportOutput the way this suite's whole justification depends on.
//
// NOT wired into EEV2FullRegressionGate.gs's release-gate registry pending
// separate review of whether this specific suite belongs there (it is
// Node-safe, unlike GateHealthCircuitBreaker/GatePresence/LiveCallChain/
// ProgressRealOcr, so it COULD be wired in as part of the already-approved
// D2 "wire structural suites into CI" work -- that is a separate task from
// this fix and left to founder discretion, not bundled in here).

// Takes the real apps-script/Code.gs source text as a parameter, matching
// EEV2GatePresenceRegression.gs's own convention (eev2RunGatePresenceRegression
// (sourceFilesByName)) of never assuming how or where the caller obtained the
// source -- callable against the real Code.gs (production use), or against
// an old/broken candidate for a fail-then-pass proof.
function eev2SendGateChokePointCheckSource_(codeSourceText) {
  const checks = [];

  const sendBody = eev2ExtractFunctionBody_(codeSourceText, "sendReportEmail");
  checks.push(["sendReportEmail is defined", sendBody !== null]);

  let callsValidateBeforeMail = false;
  let callsHeldOnFailure = false;
  let mailPrecedesValidate = false;
  if (sendBody) {
    const validateIdx = sendBody.indexOf("validateReportOutput(");
    const mailIdxs = [];
    let m;
    const mailRe = /MailApp\.sendEmail\s*\(/g;
    while ((m = mailRe.exec(sendBody))) mailIdxs.push(m.index);
    callsValidateBeforeMail = validateIdx !== -1 && mailIdxs.every((idx) => idx > validateIdx);
    mailPrecedesValidate = validateIdx !== -1 && mailIdxs.some((idx) => idx < validateIdx);
    callsHeldOnFailure = /heldForValidationFailureDelivery_\s*\(/.test(sendBody);
  }
  checks.push(["sendReportEmail calls validateReportOutput before any MailApp.sendEmail call", callsValidateBeforeMail]);
  checks.push(["sendReportEmail does not have a MailApp.sendEmail call that precedes validateReportOutput", !mailPrecedesValidate]);
  checks.push(["sendReportEmail calls heldForValidationFailureDelivery_ (the same held-shape all callers already trust)", callsHeldOnFailure]);

  // --- Caller wiring: all 4 real call sites pass a 6th (folders) argument ---
  // Counts top-level commas inside the sendReportEmail(...) call's own
  // parens -- respects nested parens/brackets/braces and string literals, so
  // a call like sendReportEmail(a, b, c, d.getBlob(), e, f) is not
  // miscounted by the comma inside getBlob().
  function countCallArgs_(sourceStr, callName) {
    const calls = [];
    const callRe = new RegExp(callName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\(", "g");
    let m;
    while ((m = callRe.exec(sourceStr))) {
      const parenStart = m.index + m[0].length - 1;
      let depth = 0;
      let argCount = 0;
      let sawAnyChar = false;
      let inString = null;
      for (let i = parenStart; i < sourceStr.length; i += 1) {
        const ch = sourceStr[i];
        const prev = sourceStr[i - 1];
        if (inString) {
          if (ch === inString && prev !== "\\") inString = null;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") { inString = ch; continue; }
        if (ch === "(" || ch === "[" || ch === "{") { depth += 1; continue; }
        if (ch === ")" || ch === "]" || ch === "}") {
          depth -= 1;
          if (depth === 0 && ch === ")") {
            calls.push({ index: m.index, argCount: sawAnyChar ? argCount + 1 : argCount });
            break;
          }
          continue;
        }
        if (depth === 1 && ch === "," ) { argCount += 1; continue; }
        if (!/\s/.test(ch)) sawAnyChar = true;
      }
    }
    return calls;
  }

  const rerunBody = eev2ExtractFunctionBody_(codeSourceText, "rerunBoardroomJobWithCorrections");
  const resendBody = eev2ExtractFunctionBody_(codeSourceText, "resendBoardroomReport");
  const doPostBody = eev2ExtractFunctionBody_(codeSourceText, "doPost");
  const formSubmitBody = eev2ExtractFunctionBody_(codeSourceText, "handleBoardroomFormSubmit");

  [
    ["doPost", doPostBody],
    ["handleBoardroomFormSubmit", formSubmitBody],
    ["rerunBoardroomJobWithCorrections", rerunBody],
    ["resendBoardroomReport", resendBody]
  ].forEach((pair) => {
    const name = pair[0];
    const body = pair[1];
    checks.push([`${name} is defined`, body !== null]);
    if (body) {
      const calls = countCallArgs_(body, "sendReportEmail");
      checks.push([`${name} calls sendReportEmail at least once`, calls.length > 0]);
      checks.push([`${name} passes 6 arguments to sendReportEmail (folders included), got [${calls.map((c) => c.argCount).join(", ")}]`,
        calls.length > 0 && calls.every((c) => c.argCount === 6)]);
    }
  });

  // --- Real fixture: the actual production job that was bypassed ---
  // Independently reproduced from EEV2MustBlockGateRegression.gs's
  // job2Findings (same source job, same provenance: form-20260909-165508-
  // 4076a2ce, real 9-file Procurement_* resubmission, AFTER EEV2-012). Not
  // re-pasted here to avoid a second copy of a 9-finding real array drifting
  // out of sync with the original; this suite instead calls that suite's own
  // exported check function and inspects its result, so there is exactly one
  // place this real fixture is defined.
  if (typeof eev2RunMustBlockGateRegression === "function") {
    const mustBlockResult = eev2RunMustBlockGateRegression();
    const job2Check = (mustBlockResult.checks || []).find((c) => /JOB2 \(real MUST-BLOCK failure/.test(c.check));
    checks.push(["real job form-20260909-165508-4076a2ce (JOB2, via EEV2MustBlockGateRegression) fails validateReportOutput -- the exact gate sendReportEmail now runs internally",
      Boolean(job2Check) && job2Check.pass === true]);
  } else {
    checks.push(["EEV2MustBlockGateRegression is available to cross-check the real JOB2 fixture", false]);
  }

  return {
    ticket: "EEV2-017",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };
}

// Throwing wrapper for production/manual use (matches the eev2Run*Regression
// convention every other suite in this directory follows, e.g.
// eev2RunMustBlockGateRegression). Not used by the Node test, which calls
// eev2SendGateChokePointCheckSource_ directly so it can inspect a
// deliberately-broken source tree without a thrown exception aborting the
// test itself -- matching how EEV2GatePresenceRegression.gs's own
// non-throwing eev2RunGatePresenceRegression is designed to be run against
// old/broken candidates.
function eev2RunSendGateChokePointRegression(codeSourceText) {
  const output = eev2SendGateChokePointCheckSource_(codeSourceText);
  console.log("EEV2-017 SEND GATE CHOKE POINT REGRESSION (static source check)");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-017 send-gate choke-point regression FAILED. See execution log.");
  console.log("EEV2-017 SEND GATE CHOKE POINT REGRESSION PASS: ok=true");
  return output;
}
