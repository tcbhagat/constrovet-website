#!/usr/bin/env node
/**
 * verify.mjs — the one command that answers "does reality match the manifest?"
 *
 * Reads system.manifest.json and checks the repository against it.
 * No dependencies. Run with: npm run verify
 *
 * Exit code 0 = every invariant holds.
 * Exit code 1 = at least one invariant is broken.
 *
 * A finding attached to a route or file that carries a `gap` id, or that is
 * listed in known_gaps, is reported as PENDING instead of FAIL. Pending items
 * are known, logged, and owned. Unknown breakage fails the run.
 *
 * The last line of output is a single JSON object, so an agent can parse the
 * result without reading the human table.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const manifest = JSON.parse(read("system.manifest.json"));

const findings = [];
const record = (check, status, subject, message, gap = null) =>
  findings.push({ check, status, subject, message, gap });

const knownGapIds = new Set(manifest.known_gaps.map((g) => g.id));
// A route or check may point at a known gap. That downgrades FAIL to PENDING.
const softenBy = (gap) => (gap && knownGapIds.has(gap) ? "PENDING" : "FAIL");

/* ------------------------------------------------------------------ */
/* 1. Every declared route has a file behind it.                       */
/* ------------------------------------------------------------------ */
for (const r of manifest.routes) {
  if (!existsSync(join(root, r.file))) {
    record("routes_exist", "FAIL", r.path, `missing file ${r.file}`);
  }
}

/* ------------------------------------------------------------------ */
/* 2. sitemap.xml lists exactly the routes marked sitemap: true.       */
/* ------------------------------------------------------------------ */
const sitemapPaths = new Set(
  [...read("sitemap.xml").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
    m[1].replace(`https://${manifest.identity.domain}`, "")
  )
);
const declared = new Set(manifest.routes.filter((r) => r.sitemap).map((r) => r.path));

for (const p of declared) {
  if (!sitemapPaths.has(p)) record("sitemap_matches", "FAIL", p, "declared in manifest but absent from sitemap.xml");
}
for (const p of sitemapPaths) {
  if (!declared.has(p)) {
    const route = manifest.routes.find((r) => r.path === p);
    record("sitemap_matches", softenBy(route?.gap), p, "in sitemap.xml but not declared indexable in manifest", route?.gap ?? null);
  }
}

/* ------------------------------------------------------------------ */
/* 3. Routes marked index: false actually carry noindex.               */
/* ------------------------------------------------------------------ */
for (const r of manifest.routes.filter((x) => x.index === false)) {
  if (!existsSync(join(root, r.file))) continue;
  if (!/<meta\s+name="robots"\s+content="noindex,\s*nofollow">/i.test(read(r.file))) {
    record("noindex_enforced", softenBy(r.gap), r.path, "manifest says index:false but page has no noindex,nofollow meta", r.gap ?? null);
  }
}

/* ------------------------------------------------------------------ */
/* 4. Declared canonicals match the page.                              */
/* ------------------------------------------------------------------ */
for (const r of manifest.routes.filter((x) => x.canonical && existsSync(join(root, x.file)))) {
  const found = read(r.file).match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (found && found !== r.canonical) {
    record("canonical_matches", softenBy(r.gap), r.path, `canonical is ${found}, manifest says ${r.canonical}`, r.gap ?? null);
  }
}

/* ------------------------------------------------------------------ */
/* 5. One indexable page per topic. Prevents keyword cannibalisation   */
/*    and removes "which file do I edit?" ambiguity.                   */
/* ------------------------------------------------------------------ */
const byTopic = new Map();
for (const r of manifest.routes.filter((x) => x.index)) {
  byTopic.set(r.topic, [...(byTopic.get(r.topic) ?? []), r]);
}
for (const [topic, routes] of byTopic) {
  if (routes.length > 1) {
    const gap = routes.find((r) => r.gap)?.gap ?? null;
    record("one_page_per_topic", softenBy(gap), topic, `${routes.length} indexable pages share this topic: ${routes.map((r) => r.path).join(", ")}`, gap);
  }
}

/* ------------------------------------------------------------------ */
/* 6. Rule H4 — unlinked products never appear in discovery surfaces.  */
/*    This one never softens. It is a hard rule.                       */
/* ------------------------------------------------------------------ */
for (const file of manifest.discovery_surfaces) {
  if (!existsSync(join(root, file))) {
    record("discovery_clean", "FAIL", file, "discovery surface declared in manifest does not exist");
    continue;
  }
  const body = read(file);
  for (const term of manifest.denylist.terms) {
    if (body.toLowerCase().includes(term.toLowerCase())) {
      record("discovery_clean", "FAIL", file, `contains denylisted product term "${term}" (Rule H4)`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 7. Rule H3 — retired infrastructure absent from public entry pages. */
/* ------------------------------------------------------------------ */
for (const file of manifest.retired_infrastructure.checked_files) {
  if (!existsSync(join(root, file))) continue;
  const body = read(file);
  for (const pattern of manifest.retired_infrastructure.patterns) {
    if (new RegExp(pattern, "i").test(body)) {
      record("retired_infra_absent", "FAIL", file, `references retired infrastructure /${pattern}/ (Rule H3)`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 8. Rule H2 — no local paths or key-shaped strings in tracked docs.  */
/* ------------------------------------------------------------------ */
const docFiles = [
  "README.md", "AGENTS.md", "EDITING.md", "OPERATIONS_MAINTENANCE.md",
  "LOCAL_CONTENT_REFRESH_ROLLBACK.md", "llms.txt", "robots.txt"
].filter((f) => existsSync(join(root, f)));

for (const file of docFiles) {
  const body = read(file);
  for (const pattern of manifest.public_safety.forbidden_patterns_in_docs) {
    if (new RegExp(pattern).test(body)) {
      const gap = file === "LOCAL_CONTENT_REFRESH_ROLLBACK.md" ? "GAP-002" : null;
      record("public_safety", softenBy(gap), file, `matches forbidden pattern /${pattern}/ (Rule H2)`, gap);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */
const fails = findings.filter((f) => f.status === "FAIL");
const pending = findings.filter((f) => f.status === "PENDING");

const checks = [
  "routes_exist", "sitemap_matches", "noindex_enforced", "canonical_matches",
  "one_page_per_topic", "discovery_clean", "retired_infra_absent", "public_safety"
];

console.log("Constrovet system verification");
console.log("=".repeat(60));
for (const check of checks) {
  const f = findings.filter((x) => x.check === check && x.status === "FAIL").length;
  const p = findings.filter((x) => x.check === check && x.status === "PENDING").length;
  const mark = f ? "FAIL" : p ? "PEND" : " OK ";
  console.log(`[${mark}] ${check}${f || p ? `  (${f} failing, ${p} pending)` : ""}`);
}

if (fails.length) {
  console.log("\nFailures — these break an invariant and must be fixed:");
  for (const f of fails) console.log(`  ! ${f.check}: ${f.subject} — ${f.message}`);
}
if (pending.length) {
  console.log("\nPending — known, logged in manifest known_gaps, not yet closed:");
  for (const f of pending) console.log(`  ~ [${f.gap}] ${f.subject} — ${f.message}`);
}
if (!fails.length && !pending.length) console.log("\nAll invariants hold.");

console.log(
  "\n" +
    JSON.stringify({
      ok: fails.length === 0,
      manifest_version: manifest.schema_version,
      routes_checked: manifest.routes.length,
      fail_count: fails.length,
      pending_count: pending.length,
      open_gaps: [...new Set(pending.map((f) => f.gap))],
      failing_checks: [...new Set(fails.map((f) => f.check))]
    })
);

process.exit(fails.length ? 1 : 0);
