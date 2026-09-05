// For every project-prefixed call token (eev2*/boardroom*/validate*/log*/held*/render*/detect*) in a directory,
// check that a `function NAME(` definition exists somewhere in that same directory.
import { readdirSync, readFileSync } from "node:fs"; import { join } from "node:path";
for (const dir of process.argv.slice(2)) {
  const files = readdirSync(dir).filter(f => /\.(gs|js)$/.test(f));
  const defs = new Set(), calls = new Map();
  for (const f of files) {
    const t = readFileSync(join(dir, f), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of t.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defs.add(m[1]);
    for (const m of t.matchAll(/(?<![\w$.])((?:eev2|boardroom|validateReportOutput|logValidationError|initValidationErrorLog|heldFor|render|detectDocumentTemplate|claimBoardroom|getBoardroom)[\w$]*)\s*\(/g)) {
      if (!calls.has(m[1])) calls.set(m[1], new Set()); calls.get(m[1]).add(f);
    }
  }
  const dangling = [...calls].filter(([n]) => !defs.has(n));
  console.log(`\n${dir}\n  files=${files.length} defs=${defs.size} distinct project-prefixed call tokens=${calls.size}`);
  if (!dangling.length) console.log("  DANGLING CALLS: none");
  for (const [n, fs] of dangling) console.log(`  DANGLING: ${n}  called from ${[...fs].join(", ")}`);
}
