import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const mainScript = readFileSync(
  new URL("../assets/js/main.js", import.meta.url),
  "utf8"
);

const navHrefs = [
  "/",
  "/boardroom/",
  "/pages/solution.html",
  "/pages/knowledge.html",
  "/pages/company.html",
  "/pages/contact.html"
];

function createAnchor(href) {
  const attributes = new Map([["href", href]]);
  const classes = new Set();

  return {
    href,
    attributes,
    classes,
    classList: {
      add: (className) => classes.add(className)
    },
    getAttribute: (name) => attributes.get(name) ?? null,
    removeAttribute: (name) => attributes.delete(name),
    setAttribute: (name, value) => attributes.set(name, value)
  };
}

async function renderNavigation(pathname) {
  const anchors = navHrefs.map(createAnchor);
  const populatedPartial = { innerHTML: "<nav>loaded</nav>" };

  const document = {
    getElementById: () => null,
    querySelector: (selector) =>
      selector === "#cv-nav-placeholder" || selector === "#cv-footer-placeholder"
        ? populatedPartial
        : null,
    querySelectorAll: (selector) =>
      selector === ".cv-nav__links a, .cv-nav__drawer a" ? anchors : []
  };

  runInNewContext(mainScript, {
    URL,
    console,
    document,
    window: {
      location: {
        origin: "https://www.constrovet.com",
        pathname
      }
    }
  });

  await new Promise((resolve) => setImmediate(resolve));
  return anchors;
}

async function assertActiveParent(pathname, expectedHref) {
  const anchors = await renderNavigation(pathname);
  const activeHrefs = anchors
    .filter((anchor) => anchor.classes.has("active"))
    .map((anchor) => anchor.href);

  assert.deepEqual(activeHrefs, [expectedHref]);
}

test("an exact top-level route keeps its active navigation state", async () => {
  await assertActiveParent("/pages/solution.html", "/pages/solution.html");
});

test("a service detail route identifies Solution as its active parent", async () => {
  await assertActiveParent(
    "/pages/construction-cost-leakage-audit.html",
    "/pages/solution.html"
  );
});

test("the blog identifies Knowledge as its active parent", async () => {
  await assertActiveParent("/blog/", "/pages/knowledge.html");
});

test("a team route identifies Company as its active parent", async () => {
  await assertActiveParent("/pages/team.html", "/pages/company.html");
});

test("the active navigation link exposes aria-current", async () => {
  const anchors = await renderNavigation("/pages/solution.html");
  const activeAnchor = anchors.find((anchor) => anchor.classes.has("active"));

  assert.equal(activeAnchor?.attributes.get("aria-current"), "page");
});
