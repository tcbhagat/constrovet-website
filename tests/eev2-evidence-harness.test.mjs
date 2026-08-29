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
  assert.equal(result.regression.suite_count, 9);
  assert.equal(result.regression.pass_count, 9);
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
