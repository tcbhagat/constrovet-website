// EEV2-016 regression -- the form-trigger path also enforces the global daily
// job cap.
//
// Background: a real Test A pair of submissions (form-20260910-071303-42ebd8de
// and form-20260910-071751-7e702a80), four minutes apart with
// GLOBAL_DAILY_JOB_LIMIT=1 set live, both got distinct real job folders -- the
// second was not refused. Confirmed live (clasp pull, scriptId
// 1ous3k8pH6pwyH0g-O44nIvmcQTvr9pYuWSfn2apVlnLFRdPWhc5WWvbo) that both job IDs
// match makeBoardroomJobId()'s "form-yyyyMMdd-HHmmss-<8 hex>" shape, and that
// function is called from nowhere except handleBoardroomFormSubmit (fired by
// the onFormSubmit installable trigger). doPost takes job_id from the caller's
// JSON body instead, so it could not have produced either ID.
//
// Root cause: doPost calls enforceGlobalDailyJobLimit() before
// prepareJobFolders() (see EEV2-014, EEV2GlobalBudgetGateRegression.gs), but
// handleBoardroomFormSubmit called prepareJobFolders() directly with no daily
// cap check anywhere in the function. This is EEV2-004's own flagged-and-never-
// resolved unknown ("whether doPost and the form path can both fire for one
// submission") -- confirmed here as a real gap, not a hypothetical one.
//
// The fix adds enforceGlobalDailyJobLimit() to handleBoardroomFormSubmit at the
// same point doPost already uses: immediately before prepareJobFolders(), so a
// refused submission creates no Drive folder.
//
// Does NOT add enforceGeminiVerifierBudget() here. Confirmed by reading the
// live and repo copies of runGeminiVerifier (they are identical, no diff):
// there is exactly one runGeminiVerifier definition, called by both doPost and
// handleBoardroomFormSubmit, and it already calls enforceGeminiVerifierBudget()
// internally as its own first action (see its EEV2-014 comment: "Consumed here
// rather than in doPost because DEEP_ANALYSIS can reach this path more than
// once per submission"). Adding it again in handleBoardroomFormSubmit would
// double-consume the Gemini counter on every deep-analysis form submission.
//
// TESTABILITY NOTE: same as EEV2GlobalBudgetGateRegression.js -- the harness
// blocks every Apps Script service, so this suite is a structural source-scan
// of handleBoardroomFormSubmit, matching that file's stripComments pattern
// (a naive indexOf would find an explanatory comment before the real call).

function eev2RunGlobalDailyLimitFormPathRegression() {
  const checks = [];

  const stripComments = (fn) => String(fn)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  const formSubmitSource = stripComments(handleBoardroomFormSubmit);
  const verifierSource = stripComments(runGeminiVerifier);

  checks.push(["handleBoardroomFormSubmit calls enforceGlobalDailyJobLimit()",
    formSubmitSource.indexOf("enforceGlobalDailyJobLimit(") >= 0]);

  checks.push(["the global cap is enforced BEFORE prepareJobFolders (no Drive write on a refused form submission)",
    formSubmitSource.indexOf("enforceGlobalDailyJobLimit(") >= 0 &&
    formSubmitSource.indexOf("prepareJobFolders(") >= 0 &&
    formSubmitSource.indexOf("enforceGlobalDailyJobLimit(") < formSubmitSource.indexOf("prepareJobFolders(")]);

  // The double-consumption guard: handleBoardroomFormSubmit must NOT call
  // enforceGeminiVerifierBudget() directly -- that budget is already consumed
  // once, internally, by the shared runGeminiVerifier() both paths call.
  checks.push(["handleBoardroomFormSubmit does NOT also call enforceGeminiVerifierBudget() directly (would double-consume the Gemini counter)",
    formSubmitSource.indexOf("enforceGeminiVerifierBudget(") === -1]);

  checks.push(["handleBoardroomFormSubmit calls the shared runGeminiVerifier() rather than duplicating its budget logic",
    formSubmitSource.indexOf("runGeminiVerifier(") >= 0]);

  checks.push(["runGeminiVerifier (the single shared definition both paths call) still consumes its own budget internally",
    verifierSource.indexOf("enforceGeminiVerifierBudget(") >= 0]);

  const output = {
    ticket: "EEV2-016",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-016 GLOBAL DAILY LIMIT (FORM PATH) REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-016 global daily limit form-path regression FAILED. See execution log.");
  console.log("EEV2-016 GLOBAL DAILY LIMIT (FORM PATH) REGRESSION PASS: ok=true");
  return output;
}
