---
name: plan-02-eev2-012-m3-fix
description: Plan to close M3 for real. Records the measured finding that BOTH options in EEV2_011_ROW_BOUNDARY_PROPOSAL_20260909.md fail to fix the live defect when implemented, presents six candidate veto rules tested against the real job's own citation text plus the full 16-suite regression, and recommends one — an OCR column-join veto — with the exact diff, fixtures, and approval gate. Nothing here is built; it is a reviewed decision awaiting founder approval.
---

# EEV2-012 — the fix that actually closes the cross-row label bleed

**Status: tested in a local harness, NOT built, NOT merged, NOT pushed.**
Everything below was measured by running code, not reasoned about.

---

## 1. The headline finding: both proposed options fail

`EEV2_011_ROW_BOUNDARY_PROPOSAL_20260909.md` offers Option A (nearest-trigger + intervening row-identity content) and Option B (reuse CHECK 5d's density signal as a veto). I implemented both against the real span the proposal itself records, and ran them:

```
                                          real span    16-suite
BASELINE (current live code)                3670.55      16/16
OPTION A  (as proposed)                     3670.55      16/16   ← no change
OPTION B  (as proposed)                     3670.55      16/16   ← no change
                                            ^^^^^^^
                                            wanted: 0
```

**Why they fail.** Measured directly, the 40-character label region for the AAC Blocks figure is:

```
"-GDelayed PO-5578-007AAC Blocks335 Cu.M "
 ^^        ^^^^^^^                        ^
 |         trigger at index 2             figure starts here
 |
 previous row's supplier code
```

and the text between the trigger word and the figure is:

```
" PO-5578-007AAC Blocks335 Cu.M "
```

That fragment contains **no other currency figure and no date** — both dates and the neighbouring rupee figures sit outside the 40-char window. So Option B's density veto never fires, and Option A's "another row's identity content" test finds nothing to trip on. The signals both options rely on are real signals; they are just not present inside the window where the decision is made.

This is worth stating plainly because it is the same trap a third time: a fix reasoned from a plausible mechanism, which passes review, and does nothing. The only defence is to run it against the real text before believing it.

---

## 2. What is actually in that fragment

The distinguishing feature is `PO-5578-007AAC` and `Blocks335` — **digits welded directly to letters with no separator.** That is not a property of the document; it is the signature of Gemini's OCR flattening a table, where a cell's last character abuts the next cell's first character. Ordinary construction prose never produces it: prose puts a space between a word and a number.

That is the generalizable signal `EEV2_011` looked for and concluded did not exist. It does exist — it is just a *character-class* signal, not a delimiter.

---

## 3. Six candidates, all measured

Every candidate keeps the existing structure and adds one veto: *reject ownership if the text between the nearest trigger word and the figure looks like an OCR column join.*

Tested against: the real span (want `0`); the full 16-suite regression; 7 genuine-leakage prose cases; and 6 adversarial genuine cases containing quantities with units — the obvious false-negative risk.

| Candidate | Veto rule on the between-text | Real span | 16-suite | Genuine (7) | Adversarial (6) |
|---|---|---|---|---|---|
| C1 | any digit | 0 ✅ | 16/16 | **2 missed** ❌ | — |
| C2 | any 3-digit run | 0 ✅ | 16/16 | 0 missed | **2 missed** ❌ |
| C3 | ID token or 3-digit run | 0 ✅ | 16/16 | 0 missed | not better than C2 |
| C4 | any digit touching a letter | 0 ✅ | 16/16 | 0 missed | **2 missed** ❌ |
| C5 | C4 or 3-digit run | 0 ✅ | 16/16 | 0 missed | **3 missed** ❌ |
| **C6** | **≥3 digits touching ≥2 letters** | **0 ✅** | **16/16** | **0 missed ✅** | **0 missed ✅** |

The adversarial cases that break C2/C4/C5 are exactly the ones that matter commercially:

- `"Rework of 120m3 of slab concrete cost Rs.4,50,000"` — C2, C4, C5 all return 0. Real leakage, silently dropped.
- `"Delay penalty for 15no. units at Rs.9,00,000 total"` — C4, C5 return 0.
- `"Escalation claim ref EC-2025-014 valued Rs.18,00,000"` — C2, C5 return 0.

C6 survives all three because a unit suffix (`120m3`, `15no.`) is a short digit run touching one or two letters, while an OCR column join (`007AAC`, `Blocks335`) is a long digit run welded to a word. The threshold separates them cleanly on real data.

---

## 4. Recommendation — C6, named EEV2-012

### Current code, quoted verbatim (`apps-script/Code.gs`, lines 2322–2348)

```js
function boardroomTriggerOwnedAmount(text, keywordRegex) {
  const source = String(text || "");
  const currency = /(?:₹|\bINR\b|\bRs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/ig;
  const trigger = new RegExp(keywordRegex.source, "i");
  let match;
  let previousEnd = 0;
  while ((match = currency.exec(source))) {
    const lineStart = source.lastIndexOf("\n", match.index - 1) + 1;
    const labelStart = Math.max(previousEnd, match.index - BOARDROOM_LABEL_WINDOW, lineStart);
    const labelRegion = source.slice(labelStart, match.index);
    previousEnd = match.index + match[0].length;
    if (!trigger.test(labelRegion)) continue;
    let value = Number(match[1].replace(/,/g, ""));
    ...
```

and line 9:

```js
const BOARDROOM_LABEL_WINDOW = 40;
```

### The change — three edits, nothing else

**1.** Beside `BOARDROOM_LABEL_WINDOW`, add the signature:

```js
// EEV2-012: the signature of Gemini flattening a table -- a long digit run
// welded to a word with no separator ("PO-5578-007AAC", "Blocks335").
// Ordinary prose separates words from numbers; OCR column joins do not.
// Thresholds (3 digits, 2 letters) chosen to clear real unit suffixes
// ("120m3", "15no.") which are genuine and must keep being detected.
const BOARDROOM_OCR_COLUMN_JOIN = /[0-9]{3,}[A-Za-z]{2,}|[A-Za-z]{2,}[0-9]{3,}/;
```

**2.** Make the trigger search find the **nearest** trigger to the figure, not merely any trigger in the window — `"i"` becomes `"ig"`, and the loop keeps the last match:

```js
const trigger = new RegExp(keywordRegex.source, "ig");
...
    trigger.lastIndex = 0;
    let hit = null;
    let nearest = null;
    while ((hit = trigger.exec(labelRegion))) nearest = hit;
    if (!nearest) continue;
```

**3.** Add the veto immediately after:

```js
    // EEV2-012: if an OCR column join sits between the trigger word and the
    // figure, they are on different logical rows of a flattened table -- the
    // trigger does not own this figure. Confirmed against the real citation
    // text of job form-20260909-072421-33a43b52.
    if (BOARDROOM_OCR_COLUMN_JOIN.test(labelRegion.slice(nearest.index + nearest[0].length))) continue;
```

**Leave the EEV2-009 newline guard in place.** It is a no-op on newline-free OCR text, but it is correct and cheap when newlines do appear. Removing it would be a second change riding on this one, and this project's own principle is one change per fix.

---

## 5. Regression fixtures — provenance stated, per the gate

Add to `EEV2CitationTruncationRegression.gs` (or a new `EEV2RowBoundaryRegression.gs`), each with the source comment the fixture-provenance rule requires:

| Fixture | Source | Assert |
|---|---|---|
| Full real span | `// source: form-20260909-072421-33a43b52, final-report.json quoted_span` | `boardroomTriggerOwnedAmount(span, boardroomLeakageRe()) === 0` |
| `"Rework of 120m3 of slab concrete cost Rs.4,50,000"` | `// KNOWN-SYNTHETIC: false-negative guard, unit-suffix prose` | `=== 450000` |
| `"Delay penalty for 15no. units at Rs.9,00,000 total"` | `// KNOWN-SYNTHETIC: false-negative guard, unit-suffix prose` | `=== 900000` |
| `"Escalation claim ref EC-2025-014 valued Rs.18,00,000"` | `// KNOWN-SYNTHETIC: false-negative guard, ID-in-prose` | `=== 1800000` |

The three synthetic ones are legitimately synthetic — they exist to prove the veto does **not** over-fire — and are labelled as such, which is exactly the distinction the provenance gate is built to enforce.

Also update the assertion at `EEV2CitationTruncationRegression.gs:76`, which currently records the row-boundary guard as working. It documents behaviour that a real job disproved.

---

## 6. Verification ladder — do not skip a rung

```bash
npm run check:fixtures      # exit 0            (blocked until PLAN_01 item A lands)
npm run test:harness        # 16/16 + new suite, ok: true
node --test tests/eev2-evidence-harness.test.mjs
```

Then, and only then:

1. **Founder approval in writing** — this touches `apps-script/`, so `AGENTS.md` requires it before the commit lands.
2. Merge to `main`; confirm CI green.
3. Founder runs `clasp push`. Nobody else, ever.
4. Confirm the live checksum matches `main`'s `apps-script/Code.gs`.
5. **The rung that actually closes M3:** a fresh real Test A submission — the 9-file Procurement_* set, submitted **from `admin@constrovet.com`**, per Contract 5's canary rule (the failing run went from `bhagat.taran@gmail.com`; no exposure, but the rule was not followed).
6. Confirm the report is **HELD**, not sent, and that `INR 3,671` appears nowhere.

Step 4 alone is what a previous session accepted as DONE. It is necessary and not sufficient — that is the whole lesson of this milestone.

---

## 7. Honest limits of this fix

- **It closes a mechanism, not a category.** A table whose OCR flattening happens to insert spaces at every column boundary will not produce the signature, and the bleed can recur. C6 narrows the window of exposure; it does not seal it.
- **The thresholds (3 digits, 2 letters) are empirical.** They separate the cases available today. A document family with 2-digit row IDs welded to short codes could slip through, and a genuine prose case with a 3-digit quantity welded to a 2-letter unit (`450kg`) would be wrongly vetoed. The latter is a false negative — under-reporting, never fabrication — which is the correct direction to fail given the prime directive, but it is a real cost.
- **It is one document family's evidence.** Only the Procurement PO table's real Gemini shape has been confirmed. Every other family is inference until a real submission says otherwise. `PLAN_03` is where that gets tested rather than assumed.

## 8. Not verified

- That C6 holds on Change Order logs, RFI trackers, or correspondence logs — no real Gemini extraction from those was available to me.
- That `validateReportOutput` / CHECK 5b/5c/5d behave identically under the patch. The 16-suite run says yes; I did not trace the call chain by hand.
- Anything about live Apps Script state. I could not run `clasp`.

## 9. Next single test

Apply the three edits on a branch and run `npm run test:harness`. Expected: 16/16 plus the new suite green, and the real-span fixture returning `0`. If it returns `3670.55`, the patch was not applied to the code path production uses — stop and find out why before doing anything else.
