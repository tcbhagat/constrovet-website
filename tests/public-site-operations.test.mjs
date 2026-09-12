import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRootUrl = new URL("../", import.meta.url);
const repoRoot = fileURLToPath(repoRootUrl);
const read = (path) => readFileSync(new URL(path, repoRootUrl), "utf8");

function fileForPath(pathname) {
  const relativePath = decodeURIComponent(pathname).replace(/^\//, "");
  const candidates = [];

  if (!relativePath) candidates.push("index.html");
  else if (pathname.endsWith("/")) candidates.push(join(relativePath, "index.html"));
  else {
    candidates.push(relativePath);
    if (!extname(relativePath)) {
      candidates.push(`${relativePath}.html`, join(relativePath, "index.html"));
    }
  }

  return candidates.find((candidate) => existsSync(new URL(candidate, repoRootUrl))) ?? null;
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr, stdout }));
  });
}

test("public-site CI watches every public navigation surface", () => {
  const workflow = read(".github/workflows/claim-companion-ci.yml");

  assert.match(workflow, /^name: Public Site and Claim Companion CI/m);
  for (const requiredPath of [
    '"*.html"',
    '"app/**"',
    '"assets/**"',
    '"blog/**"',
    '"boardroom/**"',
    '"pages/**"',
    '"sitemap.xml"',
    '"tests/*.test.mjs"',
    '"scripts/verify-production-deploy.sh"'
  ]) {
    assert.match(workflow, new RegExp(requiredPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("public-site CI runs Playwright as a browser regression gate", () => {
  const workflow = read(".github/workflows/claim-companion-ci.yml");

  for (const requiredText of [
    '"tests/e2e/**"',
    '"playwright.config.mjs"',
    '"package-lock.json"',
    "browser-regression:",
    "run: npm ci",
    "run: npx playwright install --with-deps chromium",
    "run: npm run test:e2e",
    "name: playwright-report"
  ]) {
    assert.match(workflow, new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("production verifier checks every sitemap route against a local preview", async (context) => {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const file = fileForPath(pathname);

    if (!file) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200);
    response.end(read(file));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  assert.ok(address && typeof address === "object");

  const result = await run("bash", ["scripts/verify-production-deploy.sh"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      LIVE_URL: `http://127.0.0.1:${address.port}`
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /routes: 22 sitemap URLs plus \/llms\.txt \/robots\.txt \/assets\/nav\.html/);
});
