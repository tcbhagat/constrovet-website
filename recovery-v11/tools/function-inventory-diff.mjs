import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
const [,, dirA, dirB] = process.argv;
const codeExt = new Set([".js", ".gs", ".json"]);
function load(dir) {
  const out = new Map();
  for (const f of readdirSync(dir)) {
    const ext = extname(f);
    if (!codeExt.has(ext) || f === ".clasp.json") continue;
    const key = basename(f, ext);
    out.set(key, { file: f, text: readFileSync(join(dir, f), "utf8"), bytes: statSync(join(dir, f)).size });
  }
  return out;
}
function fns(text) {
  const names = new Set();
  const decl = /^[ \t]*(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/gm;
  const expr = /^[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/gm;
  let m; while ((m = decl.exec(text))) names.add(m[1]);
  while ((m = expr.exec(text))) names.add(m[1]);
  return names;
}
function globals(text) {
  const names = new Set(); const re = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm; let m;
  while ((m = re.exec(text))) names.add(m[1]); return names;
}
const A = load(dirA), B = load(dirB);
const keys = [...new Set([...A.keys(), ...B.keys()])].sort();
console.log(`A=${dirA} (${A.size} files)  B=${dirB} (${B.size} files)\n`);
let totalOnlyA = 0, totalOnlyB = 0;
for (const k of keys) {
  const a = A.get(k), b = B.get(k);
  if (!a || !b) { console.log(`FILE ${k}: ${a ? "ONLY IN A" : "ONLY IN B"} (${(a||b).file}, ${(a||b).bytes} B, fns=${fns((a||b).text).size})`); continue; }
  const fa = fns(a.text), fb = fns(b.text), ga = globals(a.text), gb = globals(b.text);
  const onlyA = [...fa].filter(x => !fb.has(x)), onlyB = [...fb].filter(x => !fa.has(x));
  const gOnlyA = [...ga].filter(x => !gb.has(x)), gOnlyB = [...gb].filter(x => !ga.has(x));
  const identical = a.text === b.text;
  const identNoTrail = a.text.replace(/\s+$/, "") === b.text.replace(/\s+$/, "");
  totalOnlyA += onlyA.length; totalOnlyB += onlyB.length;
  const tag = identical ? "IDENTICAL" : identNoTrail ? "IDENTICAL-except-trailing-ws" : "DIFFERS";
  console.log(`FILE ${k}: ${tag}  A=${a.bytes}B/${fa.size}fn  B=${b.bytes}B/${fb.size}fn`);
  if (onlyA.length) console.log(`   fn only in A: ${onlyA.join(", ")}`);
  if (onlyB.length) console.log(`   fn only in B: ${onlyB.join(", ")}`);
  if (gOnlyA.length) console.log(`   top-level const only in A: ${gOnlyA.join(", ")}`);
  if (gOnlyB.length) console.log(`   top-level const only in B: ${gOnlyB.join(", ")}`);
}
console.log(`\nTOTAL fn only in A (across shared files): ${totalOnlyA}; only in B: ${totalOnlyB}`);
