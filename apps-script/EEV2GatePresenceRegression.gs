// EEV2-007 — Gate-presence assertion.
// Closes the first documented test-suite blind spot (CONTINUATION_CONTRACT.md
// Ground Truth): the 12-suite harness has never once checked whether the
// validation gate EXISTS or is actually WIRED into a real submission path — it
// only checks the behaviour of individual functions if they happen to be
// present. This suite checks two independent things, either of which failing
// fails the whole suite:
//
//   1. PRESENCE — the validation-layer functions this deployment depends on
//      are defined at all (typeof checks, not "grep found the name somewhere").
//   2. WIRING — validateReportOutput/logValidationError are actually CALLED
//      from inside the real form-trigger submission path
//      (handleBoardroomFormSubmit, source of every real client job per
//      AGENTS.md's intake-path fact), and a validation failure is capable of
//      reaching a hold-and-alert branch rather than always falling through to
//      sendReportEmail regardless of validationResult.isValid.
//
// This is a STATIC source check, deliberately. Actually driving
// handleBoardroomFormSubmit end-to-end would require GmailApp/DriveApp/
// SpreadsheetApp/PropertiesService/LockService/CacheService — services the
// local harness deliberately blocks (scripts/run-eev2-harness.mjs) so it stays
// safe to run unattended with zero external calls. Reading the real function
// body's own source text is the way to confirm wiring without executing a
// live send: it looks for the exact call tokens in the exact place regexes
// can't be fooled by (inside the named function's own brace-matched body),
// not "this string appears somewhere in Code.gs".
//
// This suite must be provably able to FAIL. Run against the CURRENT
// apps-script/Code.gs (no validation layer at all, per CONTRACTS.md's
// ground-truth warning) it must return ok:false. That is not a hypothetical —
// see recovery-v11/tools/prove-eev2-007-fail-then-pass.mjs, which runs this
// exact function against three real source trees and asserts the direction of
// each result.
//
// NOT wired into EEV2FullRegressionGate.gs — a new suite joining the release
// gate needs separate approval per AGENTS.md's Delegation Boundaries. This
// file only defines the check; nothing calls it automatically.

function eev2ExtractFunctionBody_(sourceText, functionName) {
  const marker = "function " + functionName + "(";
  const start = sourceText.indexOf(marker);
  if (start === -1) return null;
  const braceStart = sourceText.indexOf("{", start);
  if (braceStart === -1) return null;
  let depth = 0;
  let inString = null;
  for (let i = braceStart; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    const prev = sourceText[i - 1];
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inString = ch; continue; }
    if (ch === "/" && sourceText[i + 1] === "/") { i = sourceText.indexOf("\n", i); if (i === -1) break; continue; }
    if (ch === "/" && sourceText[i + 1] === "*") { i = sourceText.indexOf("*/", i) + 1; continue; }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return sourceText.slice(start, i + 1);
    }
  }
  return null;
}

// Runs the gate-presence + wiring check against a source tree, expressed as
// { fileName: fileText }, so it can be run against the real apps-script/
// directory, a candidate directory, or an old broken candidate — anything
// that hands it real file contents, never a mock or a reconstruction.
function eev2RunGatePresenceRegression(sourceFilesByName) {
  const files = sourceFilesByName || {};
  const allSource = Object.keys(files).map((name) => files[name]).join("\n");
  const reasons = [];

  // --- 1. PRESENCE ---
  // This list must match boardroomGateHealthCheck's own presence list in
  // Code.gs exactly -- both answer "is the validation layer this deployment
  // depends on actually present," checked against handleBoardroomFormSubmit's
  // real call graph. initValidationErrorLog is deliberately NOT here: it is a
  // manual, one-time setup function a human runs once from the editor and is
  // never called from the submission path, so its presence proves nothing
  // about whether a live job is protected. (Corrected 2026-09-05: this list
  // previously included initValidationErrorLog and omitted
  // boardroomTechnicalExtractionFailures_ -- an unreviewed divergence from
  // boardroomGateHealthCheck's list, not a deliberate design choice.)
  const REQUIRED_FUNCTIONS = [
    "validateReportOutput",
    "logValidationError",
    "heldForValidationFailureDelivery_",
    "heldForExtractionFailureDelivery_",
    "boardroomTechnicalExtractionFailures_"
  ];
  const presence = {};
  REQUIRED_FUNCTIONS.forEach((name) => {
    const found = eev2ExtractFunctionBody_(allSource, name) !== null;
    presence[name] = found;
    if (!found) reasons.push("ABSENT: " + name + " is not defined anywhere in this source tree.");
  });

  // --- 2. WIRING ---
  // handleBoardroomFormSubmit is the one real function that sits on every
  // real client job (AGENTS.md intake-path fact: onFormSubmit -> that
  // function). If it exists but does not itself call validateReportOutput,
  // the gate can be fully present and fully unreachable -- exactly last
  // week's incident shape one level up (function deleted vs. function never
  // called are both "the gate did not run").
  const formSubmitBody = eev2ExtractFunctionBody_(allSource, "handleBoardroomFormSubmit");
  let wiring = {
    handleBoardroomFormSubmit_found: formSubmitBody !== null,
    calls_validateReportOutput: false,
    calls_logValidationError: false,
    has_validation_failure_branch: false,
    validation_failure_branch_reaches_hold: false
  };

  if (!formSubmitBody) {
    reasons.push("WIRING: handleBoardroomFormSubmit is not defined -- the real form-trigger submission path cannot be inspected at all.");
  } else {
    wiring.calls_validateReportOutput = /\bvalidateReportOutput\s*\(/.test(formSubmitBody);
    wiring.calls_logValidationError = /\blogValidationError\s*\(/.test(formSubmitBody);
    if (!wiring.calls_validateReportOutput) {
      reasons.push("WIRING: handleBoardroomFormSubmit never calls validateReportOutput -- the gate is not invoked on the real submission path, even if it is defined.");
    }
    if (!wiring.calls_logValidationError) {
      reasons.push("WIRING: handleBoardroomFormSubmit never calls logValidationError -- a hold or pass cannot be recorded even if validation runs.");
    }

    // A real branch on validationResult.isValid, not merely a variable that
    // exists and is ignored. Matches any of the three real shapes this could
    // take: a standalone `if (!validationResult.isValid) { ... }`, that same
    // condition as one arm of an `if/else if/else if` chain (the shape the
    // Phase-1 candidate actually uses, alongside the extraction-failure and
    // send arms), or the inverted `if (validationResult.isValid) {send} else
    // {hold}` form. Brace-depth matched, not a naive non-greedy regex, so a
    // nested `if` inside the branch body does not truncate the match early.
    function extractIfBody(sourceStr, conditionRe) {
      const condMatch = conditionRe.exec(sourceStr);
      if (!condMatch) return null;
      const braceStart = sourceStr.indexOf("{", condMatch.index + condMatch[0].length - 1);
      if (braceStart === -1) return null;
      let depth = 0;
      for (let i = braceStart; i < sourceStr.length; i += 1) {
        if (sourceStr[i] === "{") depth += 1;
        if (sourceStr[i] === "}") {
          depth -= 1;
          if (depth === 0) return sourceStr.slice(braceStart + 1, i);
        }
      }
      return null;
    }
    const branchBodyDirect = extractIfBody(formSubmitBody, /(?:else\s+)?if\s*\(\s*!\s*validationResult\.isValid\s*\)\s*/);
    const branchMatch = branchBodyDirect !== null ? [null, branchBodyDirect] : null;
    wiring.has_validation_failure_branch = !!branchMatch;
    if (!branchMatch) {
      reasons.push("WIRING: no conditional branch on validationResult.isValid was found in handleBoardroomFormSubmit -- a failing validation result has no distinct code path from a passing one.");
    } else {
      const branchBody = branchBodyDirect;
      wiring.validation_failure_branch_reaches_hold = /heldForValidationFailureDelivery_\s*\(/.test(branchBody);
      if (!wiring.validation_failure_branch_reaches_hold) {
        reasons.push("WIRING: the validationResult.isValid branch does not call heldForValidationFailureDelivery_ -- a failing validation result is not held.");
      }
    }

    // Negative check: sendReportEmail must not be called UNCONDITIONALLY
    // ahead of / outside the validation branch for this path (i.e. before the
    // gate can ever hold it). We approximate this by requiring that every
    // sendReportEmail call site in this function textually follows the
    // validateReportOutput call in the source order -- catches a gate that
    // exists and is called, but AFTER the email already went out.
    const validateIdx = formSubmitBody.indexOf("validateReportOutput(");
    const sendCallIdxs = [];
    let m;
    const sendRe = /sendReportEmail\s*\(/g;
    while ((m = sendRe.exec(formSubmitBody))) sendCallIdxs.push(m.index);
    const sendBeforeValidate = validateIdx !== -1 && sendCallIdxs.some((idx) => idx < validateIdx);
    wiring.send_report_email_precedes_validation = sendBeforeValidate;
    if (sendBeforeValidate) {
      reasons.push("WIRING: sendReportEmail is called before validateReportOutput in handleBoardroomFormSubmit -- a failing validation cannot stop a send that already happened.");
    }
  }

  return {
    ticket: "EEV2-007",
    ok: reasons.length === 0,
    presence: presence,
    wiring: wiring,
    reasons: reasons
  };
}
