import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../claim-companion/index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../claim-companion/script.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8");

test("Claim Companion exposes the canonical public route and landing link", () => {
  assert.match(page, /https:\/\/www\.constrovet\.com\/claim-companion\//);
  assert.match(home, /href="\/claim-companion\/"/);
  assert.match(sitemap, /https:\/\/www\.constrovet\.com\/claim-companion\//);
});

test("Claim Companion requires all promised inputs and explicit consent", () => {
  for (const name of ["patientName", "email", "providerName", "sumInsured", "treatmentName", "estimatedCost", "proposedHospital", "roomCategory", "consent"]) {
    assert.match(page, new RegExp(`name="${name}"[^>]*required|required[^>]*name="${name}"`));
  }
  assert.match(page, /name="policyNumber"/);
  assert.doesNotMatch(page, /name="policyNumber"[^>]*required/);
});

test("submission maps the supplied payload without false delivery claims", () => {
  for (const key of ["patientName", "email", "providerName", "policyNumber", "sumInsured", "treatmentName", "estimatedCost", "proposedHospital", "roomCategory"]) {
    assert.match(script, new RegExp(`${key}:`));
  }
  assert.match(script, /mode: "no-cors"/);
  assert.match(script, /submitted for processing/i);
  assert.doesNotMatch(script, /has been sent|report sent|email was sent/i);
  assert.doesNotMatch(script, /YOUR_DEPLOYED_WEB_APP_URL_HERE/);
  assert.doesNotMatch(script, /console\.(log|info|debug)/);
});
