import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Constrovet public discovery is limited to construction services", () => {
  const publicSurfaces = [
    read("index.html"),
    read("assets/nav.html"),
    read("assets/footer.html"),
    read("pages/contact.html"),
    read("sitemap.xml")
  ].join("\n");

  for (const unrelatedOffer of [
    /claim-companion/i,
    /Claim Companion/i,
    /Hospital Cost Estimate/i,
    /ChallanSe/i,
    /ssm-core-demo/i,
    /CA Beta/i,
    /CA statutory cockpit/i
  ]) {
    assert.doesNotMatch(publicSurfaces, unrelatedOffer);
  }
});

test("unlinked product code is preserved but excluded from indexing", () => {
  assert.match(read("claim-companion/index.html"), /<meta name="robots" content="noindex,nofollow">/);
  assert.match(read("pages/challanse.html"), /<meta name="robots" content="noindex,nofollow">/);
  assert.match(read("ssm-core-demo/index.html"), /<meta name="robots" content="noindex,nofollow">/);
});
