import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

const repoRoot = new URL("../", import.meta.url);
const siteOrigin = "https://www.constrovet.com";
const read = (path) => readFileSync(new URL(path, repoRoot), "utf8");
const sitemap = read("sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

function localPathFor(url) {
  const pathname = decodeURIComponent(new URL(url, siteOrigin).pathname);
  const relativePath = pathname.replace(/^\//, "");
  const candidates = [];

  if (!relativePath) candidates.push("index.html");
  else if (pathname.endsWith("/")) candidates.push(join(relativePath, "index.html"));
  else {
    candidates.push(relativePath);
    if (!extname(relativePath)) {
      candidates.push(`${relativePath}.html`, join(relativePath, "index.html"));
    }
  }

  return candidates.find((candidate) => existsSync(new URL(candidate, repoRoot))) ?? null;
}

function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].flatMap((match) => {
    const href = match[1].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) return [];
    return [{
      href,
      label: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    }];
  });
}

const publicPages = sitemapUrls.map((url) => {
  const file = localPathFor(url);
  assert.ok(file, `Sitemap URL has no local file: ${url}`);
  return { file, html: read(file), url };
});

const sharedPartials = [
  { file: "assets/nav.html", html: read("assets/nav.html"), url: `${siteOrigin}/` },
  { file: "assets/footer.html", html: read("assets/footer.html"), url: `${siteOrigin}/` }
];

test("every public internal link and fragment resolves locally", () => {
  for (const page of [...publicPages, ...sharedPartials]) {
    for (const anchor of anchors(page.html)) {
      if (/^(?:mailto:|tel:)/i.test(anchor.href)) continue;
      const target = new URL(anchor.href, page.url);
      if (target.origin !== siteOrigin) continue;

      const targetFile = localPathFor(target);
      assert.ok(targetFile, `${page.file}: broken internal link ${anchor.href}`);

      if (target.hash) {
        const id = decodeURIComponent(target.hash.slice(1)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        assert.match(read(targetFile), new RegExp(`\\bid=["']${id}["']`), `${page.file}: missing fragment ${target.hash}`);
      }
    }
  }
});

test("all public pilot entry CTAs converge on Review Room intake", () => {
  const expected = `${siteOrigin}/boardroom/#intake`;
  const pilotLabel = /^(?:start pilot|start review|request pilot(?: access)?)$/i;

  for (const page of [...publicPages, ...sharedPartials]) {
    for (const anchor of anchors(page.html).filter((item) => pilotLabel.test(item.label))) {
      assert.equal(new URL(anchor.href, page.url).href, expected, `${page.file}: ${anchor.label}`);
    }
  }
});

test("Review Room owns the single secure external intake action", () => {
  const intakeLinks = publicPages.flatMap((page) =>
    anchors(page.html)
      .filter((anchor) => anchor.label === "Request Review Intake")
      .map((anchor) => ({ ...anchor, file: page.file }))
  );

  assert.deepEqual(intakeLinks.map((link) => link.file), ["boardroom/index.html"]);
  assert.match(intakeLinks[0].href, /^https:\/\/docs\.google\.com\/forms\//);
});

test("sample-report and analyzer links have distinct labels", () => {
  for (const page of [...publicPages, ...sharedPartials]) {
    for (const anchor of anchors(page.html)) {
      const target = new URL(anchor.href, page.url);
      if (target.origin !== siteOrigin) continue;

      if (target.pathname === "/demo" || target.pathname === "/demo.html") {
        assert.match(anchor.label, /sample report|synthetic (?:executive )?demo/i, `${page.file}: ${anchor.label}`);
      }
      if (target.pathname === "/app/" && !target.hash) {
        assert.match(anchor.label, /try analyzer/i, `${page.file}: ${anchor.label}`);
      }
    }
  }
});

test("Contact is a general-enquiry form, not a competing pilot intake", () => {
  const contact = read("pages/contact.html");

  assert.match(contact, /<h1>Contact Constrovet<\/h1>/);
  assert.match(contact, /<form action="https:\/\/formsubmit\.co\//);
  assert.doesNotMatch(contact, /name="Review interest"/);
  assert.doesNotMatch(contact, /<h1>Request Pilot Access<\/h1>/);
});

test("blog cards open their local HTML articles without extensionless 404s", () => {
  const blogIndex = read("blog/index.html");
  const expectedArticlePaths = [
    "/blog/documents-needed-for-construction-cost-leakage-audit.html",
    "/blog/boq-vs-actual-cost-overrun.html",
    "/blog/construction-carbon-audit-india.html"
  ];

  for (const articlePath of expectedArticlePaths) {
    assert.match(blogIndex, new RegExp(`href=["']${articlePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`));
    assert.ok(localPathFor(new URL(articlePath, siteOrigin)), `Missing local article: ${articlePath}`);
  }
});

test("each featured article contains an actionable professional review method", () => {
  const requiredSections = [
    "What the review should establish",
    "Review sequence",
    "Decision-ready output"
  ];

  for (const file of [
    "blog/documents-needed-for-construction-cost-leakage-audit.html",
    "blog/boq-vs-actual-cost-overrun.html",
    "blog/construction-carbon-audit-india.html"
  ]) {
    const article = read(file);
    for (const section of requiredSections) {
      assert.match(article, new RegExp(`<h2>${section}<\\/h2>`, "i"), `${file}: missing ${section}`);
    }
  }
});
