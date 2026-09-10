// EEV2-014 regression -- global spend + abuse cap on the public endpoint.
//
// Background (found 2026-09-10 during the pre-launch audit, not previously
// tracked in any doc): apps-script/appsscript.json deploys this web app as
// "access": "ANYONE_ANONYMOUS" with "executeAs": "USER_DEPLOYING". Anyone on
// the internet could POST and have it execute with the deploying account's full
// Drive + Gmail authority. The only limit in place was enforceRateLimit(), which
// keys on `payload.email` -- a caller-supplied field in the request body -- and
// is therefore bypassed by sending a different string on each request.
//
// The pre-existing GEMINI_DAILY_CALL_LIMIT did NOT mitigate this, for two
// independent reasons confirmed by reading the code: it is consulted only by the
// optional gemini-2.5-flash relevance gate (never by runGeminiVerifier's paid
// gemini-2.5-pro call), and that gate is off by default
// (geminiRelevanceGateEnabled() returns false unless explicitly "true"). Net
// exposure: unbounded Gemini spend and unbounded Drive writes by an anonymous
// caller. The founder un-published the deployment on discovery; this gate is the
// precondition for republishing.
//
// The fix is a global, date-keyed daily budget that takes NO caller input, so
// there is nothing for an attacker to vary.
//
// TESTABILITY NOTE: scripts/run-eev2-harness.mjs deliberately replaces every
// Apps Script service (PropertiesService, LockService is not even present) with
// a proxy that records an external call and throws -- that is what guarantees
// the harness makes zero external calls. So this suite exercises the PURE
// decision helpers (eev2ResolveLimitValue_, eev2IsWithinDailyBudget_,
// eev2IsEmailAllowed_) that the storage-backed enforcers delegate to, plus a
// structural assertion that the enforcers are actually wired into the request
// path. It deliberately does NOT call enforceGlobalDailyJobLimit() etc., which
// would trip the harness's own external-call guard.
//
// KNOWN-SYNTHETIC: every fixture in this suite is a limit integer, a counter
// integer, or an email string. There is no document-extraction text here at all,
// so the Gemini-vs-Drive fixture-shape concern that governs the evidence suites
// does not apply to this file.

function eev2RunGlobalBudgetGateRegression() {
  const checks = [];

  // --- Limit resolution: unsafe values must never mean "unlimited" ----------
  checks.push(["unset property falls back to the conservative default (not unlimited)",
    eev2ResolveLimitValue_(null, 25) === 25]);
  checks.push(["blank property falls back to the default",
    eev2ResolveLimitValue_("   ", 25) === 25]);
  checks.push(["non-numeric property falls back to the default",
    eev2ResolveLimitValue_("banana", 25) === 25]);
  checks.push(["negative property falls back to the default (never unlimited)",
    eev2ResolveLimitValue_("-1", 25) === 25]);
  checks.push(["explicit 0 is honoured as a real hard stop, not replaced by the default",
    eev2ResolveLimitValue_("0", 25) === 0]);
  checks.push(["a real configured value is used verbatim",
    eev2ResolveLimitValue_("5", 25) === 5]);
  checks.push(["a fractional value floors rather than rounding up",
    eev2ResolveLimitValue_("7.9", 25) === 7]);

  // --- Budget decision ------------------------------------------------------
  checks.push(["first request of the day is allowed",
    eev2IsWithinDailyBudget_(0, 25) === true]);
  checks.push(["the request that exactly reaches the limit is REFUSED (>= not >)",
    eev2IsWithinDailyBudget_(25, 25) === false]);
  checks.push(["the last request under the limit is allowed",
    eev2IsWithinDailyBudget_(24, 25) === true]);
  checks.push(["a counter already past the limit stays refused",
    eev2IsWithinDailyBudget_(99, 25) === false]);
  checks.push(["limit 0 refuses everything, including the very first request",
    eev2IsWithinDailyBudget_(0, 0) === false]);
  checks.push(["a missing/blank counter reads as 0 used, not NaN (which would refuse wrongly)",
    eev2IsWithinDailyBudget_("", 25) === true]);

  // --- Allowlist (optional pilot second layer) ------------------------------
  checks.push(["unset allowlist means open to all (default posture)",
    eev2IsEmailAllowed_(null, "anyone@example.com") === true]);
  checks.push(["blank allowlist means open to all",
    eev2IsEmailAllowed_("  ", "anyone@example.com") === true]);
  checks.push(["a listed address is allowed",
    eev2IsEmailAllowed_("a@x.com, b@y.com", "b@y.com") === true]);
  checks.push(["an unlisted address is refused when the allowlist is set",
    eev2IsEmailAllowed_("a@x.com, b@y.com", "c@z.com") === false]);
  checks.push(["allowlist matching is case- and whitespace-insensitive",
    eev2IsEmailAllowed_(" A@X.com ", "a@x.COM") === true]);

  // --- Structural wiring ----------------------------------------------------
  // The pure helpers above can all be correct while the gate is never actually
  // called. These assertions pin the wiring itself, which is the part that
  // would silently regress in a future refactor.
  // Comments are stripped before any ordering assertion below. Without this,
  // a "// ... runs BEFORE prepareJobFolders() ..." comment placed above the
  // call it describes makes a naive indexOf find the COMMENT first and report
  // the wrong order -- which is exactly what happened when this suite was
  // first written. Same class of false positive that
  // scripts/check-fixture-provenance.mjs had to fix for the same reason:
  // prose that mentions a pattern is not an occurrence of that pattern.
  const stripComments = (fn) => String(fn)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  const doPostSource = stripComments(doPost);
  const verifierSource = stripComments(runGeminiVerifier);

  checks.push(["doPost calls enforceGlobalDailyJobLimit()",
    doPostSource.indexOf("enforceGlobalDailyJobLimit(") >= 0]);
  checks.push(["doPost calls enforcePilotAllowlist()",
    doPostSource.indexOf("enforcePilotAllowlist(") >= 0]);
  checks.push(["runGeminiVerifier consumes the verifier budget",
    verifierSource.indexOf("enforceGeminiVerifierBudget(") >= 0]);

  // Ordering is the whole point of the fix: a refused request must not have
  // created Drive folders or spent Gemini quota first.
  checks.push(["the global cap is enforced BEFORE prepareJobFolders (no Drive write on a refused request)",
    doPostSource.indexOf("enforceGlobalDailyJobLimit(") < doPostSource.indexOf("prepareJobFolders(")]);
  checks.push(["the verifier budget is consumed BEFORE the paid UrlFetchApp call",
    verifierSource.indexOf("enforceGeminiVerifierBudget(") < verifierSource.indexOf("UrlFetchApp.fetch(")]);

  // The counter key must not interpolate anything the caller controls. This is
  // the exact defect being fixed -- enforceRateLimit builds its key from
  // `email`, which is why it is a courtesy limit and not a security control.
  const consumeSource = stripComments(eev2ConsumeDailyBudget_);
  checks.push(["the global counter key is built from the date only, with no caller-supplied field",
    consumeSource.indexOf("eev2UtcDayStamp_()") >= 0 && consumeSource.indexOf("email") === -1]);
  checks.push(["the budget consumer takes a script lock (no lost-update race under concurrent POSTs)",
    consumeSource.indexOf("LockService.getScriptLock()") >= 0]);
  checks.push(["the budget consumer fails CLOSED when the lock cannot be acquired",
    consumeSource.indexOf("throw new Error") >= 0]);

  const output = {
    ticket: "EEV2-014",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-014 GLOBAL BUDGET / ABUSE GATE REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-014 global budget gate regression FAILED. See execution log.");
  console.log("EEV2-014 GLOBAL BUDGET / ABUSE GATE REGRESSION PASS: ok=true");
  return output;
}
