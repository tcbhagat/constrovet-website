import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runEvidenceHarness } from "../scripts/run-eev2-harness.mjs";

test("Constrovet Evidence Harness v1 passes every deterministic suite without external calls", () => {
  const result = runEvidenceHarness();

  assert.equal(result.ok, true);
  assert.equal(result.mode, "TEST_ONLY");
  assert.equal(result.production_mutation_authorized, false);
  assert.equal(result.paid_service_required, false);
  assert.equal(result.regression.suite_count, 10);
  assert.equal(result.regression.pass_count, 10);
  assert.equal(result.regression.fail_count, 0);
  assert.equal(result.regression.pass_rate_pct, 100);
  assert.equal(result.regression.failed_suite_ids.length, 0);
  assert.equal(result.local_guard.external_call_count, 0);
  assert.equal(result.release_decision, "READY_FOR_CONTROLLED_TEST_PROJECT_VALIDATION");
});

test("Apps Script manifest retains the zero-cost Workspace architecture", () => {
  const manifest = JSON.parse(readFileSync(new URL("../apps-script/appsscript.json", import.meta.url), "utf8"));

  assert.equal(manifest.runtimeVersion, "V8");
  assert.equal(manifest.timeZone, "Asia/Kolkata");
  assert.deepEqual(manifest.dependencies.enabledAdvancedServices, [{
    userSymbol: "Drive",
    serviceId: "drive",
    version: "v2"
  }]);
});

test("controlled TEST release gate is fail-closed and cannot send email", () => {
  const source = readFileSync(new URL("../apps-script/EEV2ControlledTestReleaseGate.gs", import.meta.url), "utf8");

  assert.match(source, /EEV2_ENVIRONMENT/);
  assert.match(source, /EEV2_TEST_JOB_ID/);
  assert.match(source, /production_deployment_authorized:\s*false/);
  assert.match(source, /email_sent_by_gate:\s*false/);
  assert.doesNotMatch(source, /MailApp\s*\.\s*sendEmail/);
  assert.match(source, /READY_FOR_HUMAN_REVIEW/);
});
