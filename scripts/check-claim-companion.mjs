import { existsSync, readFileSync, statSync } from "node:fs";

const required = [
  "claim-companion/index.html", "claim-companion/styles.css", "claim-companion/app.js", "claim-companion/api.js",
  "claim-companion/calculator.js", "claim-companion/extractor.js", "claim-companion/config.js",
  "claim-companion/manifest.webmanifest", "claim-companion/service-worker.js", "claim-companion/privacy.html",
  "claim-companion/terms.html", "claim-companion/delete-data.html", "claim-companion/icons/icon-192.png",
  "claim-companion/icons/icon-512.png", "claim-companion/apps-script/Code.gs"
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Missing Claim Companion files: ${missing.join(", ")}`);

const manifest = JSON.parse(readFileSync("claim-companion/manifest.webmanifest", "utf8"));
for (const icon of manifest.icons) {
  const path = `claim-companion/${icon.src}`;
  if (!existsSync(path) || statSync(path).size < 1000) throw new Error(`Invalid PWA icon: ${path}`);
}

const config = readFileSync("claim-companion/config.js", "utf8");
if (/AKfy[a-zA-Z0-9_-]+/.test(config)) throw new Error("A deployment-specific Apps Script URL must not be committed before preview approval.");
const source = required.filter((file) => file.endsWith(".js") || file.endsWith(".gs") || file.endsWith(".html")).map((file) => readFileSync(file, "utf8")).join("\n");
if (/AIza[0-9A-Za-z_-]{20,}/.test(source)) throw new Error("Potential Google API key found.");
if (/pre-authorization approved|cashless approved|expected insurer sanction/i.test(source)) throw new Error("Unsafe approval wording found.");
console.log("Claim Companion static, PWA, wording and secret checks passed.");
