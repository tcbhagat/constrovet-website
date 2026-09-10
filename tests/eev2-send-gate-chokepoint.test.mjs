import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// EEV2-017 (M15, Option A). Mirrors scripts/run-eev2-harness.mjs's approach
// of loading real apps-script/*.gs files into one shared VM context, but
// only the 3 files this static check actually needs: Code.gs (the function
// under test, plus validateReportOutput/heldForValidationFailureDelivery_
// which the real JOB2 fixture check depends on transitively),
// EEV2GatePresenceRegression.gs (for the shared eev2ExtractFunctionBody_
// helper, already established by EEV2-007), and EEV2MustBlockGateRegression.gs
// (for the real JOB2 fixture and its own CHECK-8 assertion, reused rather
// than re-pasted). This makes EEV2SendGateChokePointRegression.gs's suite
// actually exercised by `npm test`, unlike EEV2GatePresenceRegression.gs
// itself, which today has no caller anywhere in the repo.

function loadSendGateContext() {
  const context = vm.createContext({ console, JSON, Math, Number, String, Boolean, Array, Object, RegExp, Error, Set, Map });
  const files = ["Code.gs", "EEV2GatePresenceRegression.gs", "EEV2MustBlockGateRegression.gs", "EEV2SendGateChokePointRegression.gs"];
  for (const file of files) {
    vm.runInContext(readFileSync(new URL(`../apps-script/${file}`, import.meta.url), "utf8"), context, { filename: file });
  }
  return context;
}

test("sendReportEmail is the single choke point: gates before MailApp, and all 4 real callers pass folders", () => {
  const context = loadSendGateContext();
  const codeSource = readFileSync(new URL("../apps-script/Code.gs", import.meta.url), "utf8");
  context.__codeSource = codeSource;

  const result = vm.runInContext("eev2SendGateChokePointCheckSource_(__codeSource)", context);

  assert.equal(result.ticket, "EEV2-017");
  assert.equal(result.ok, true, JSON.stringify(result.checks.filter((c) => !c.pass), null, 2));
  assert.ok(result.checks.length >= 10);
});

test("fails before the fix: a source tree where sendReportEmail never calls validateReportOutput is caught", () => {
  const context = loadSendGateContext();
  const brokenSource = `
    function sendReportEmail(email, jobId, report, markdownBlob, resultUrl, folders) {
      MailApp.sendEmail({ to: email });
      return { email_status: "EMAIL_SENT" };
    }
    function rerunBoardroomJobWithCorrections(jobId, correctionFiles, recipientEmail) {
      sendReportEmail(recipientEmail, jobId, report, markdownFile.getBlob(), report.result_url, folders);
    }
    function resendBoardroomReport(jobId, recipientEmail) {
      sendReportEmail(recipient, jobId, report, markdownBlob, report.result_url);
    }
  `;
  context.__brokenSource = brokenSource;

  const result = vm.runInContext("eev2SendGateChokePointCheckSource_(__brokenSource)", context);

  assert.equal(result.ok, false);
  const failed = result.checks.filter((c) => !c.pass).map((c) => c.check);
  assert.ok(failed.some((c) => /calls validateReportOutput before any MailApp\.sendEmail/.test(c)));
  assert.ok(failed.some((c) => /resendBoardroomReport passes 6 arguments/.test(c)));
});
