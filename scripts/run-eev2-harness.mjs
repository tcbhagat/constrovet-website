import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "apps-script");

const externalCalls = [];
const blockedService = (service) => new Proxy({}, {
  get(_target, operation) {
    return (...args) => {
      externalCalls.push({ service, operation: String(operation), argument_count: args.length });
      throw new Error(`${service}.${String(operation)} is prohibited in the local evidence harness`);
    };
  }
});

export function runEvidenceHarness({ verbose = false } = {}) {
  const logs = [];
  const harnessConsole = {
    log: (...args) => logs.push(args.map(String).join(" ")),
    error: (...args) => logs.push(args.map(String).join(" ")),
    warn: (...args) => logs.push(args.map(String).join(" "))
  };

  const context = vm.createContext({
    console: harnessConsole,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    Set,
    Map,
    DriveApp: blockedService("DriveApp"),
    MailApp: blockedService("MailApp"),
    UrlFetchApp: blockedService("UrlFetchApp"),
    PropertiesService: blockedService("PropertiesService"),
    ScriptApp: blockedService("ScriptApp"),
    FormApp: blockedService("FormApp")
  });

  const sourceFiles = readdirSync(sourceDir)
    .filter((name) => name.endsWith(".gs"))
    .sort((a, b) => {
      if (a === "Code.gs") return -1;
      if (b === "Code.gs") return 1;
      if (a === "EEV2EvidenceHarnessV1.gs") return 1;
      if (b === "EEV2EvidenceHarnessV1.gs") return -1;
      return a.localeCompare(b);
    });

  for (const sourceFile of sourceFiles) {
    vm.runInContext(readFileSync(join(sourceDir, sourceFile), "utf8"), context, {
      filename: sourceFile
    });
  }

  const result = vm.runInContext("eev2RunEvidenceHarnessV1()", context);
  result.local_guard = {
    external_call_count: externalCalls.length,
    external_calls: externalCalls,
    passed: externalCalls.length === 0
  };
  result.ok = result.ok === true && result.local_guard.passed;

  if (verbose) process.stdout.write(`${logs.join("\n")}\n`);
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = runEvidenceHarness({ verbose: process.argv.includes("--verbose") });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  }
}
