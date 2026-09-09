---
name: plan-03-real-fixtures-m5-m8-m9
description: Zero-budget plan to close the three real-document coverage gaps — M5 (currency symbol encoding, one real intake run answers it), M8 (a document exceeding the 40-match evidence cap), M9 (a genuine scanned/image-only PDF). Each gap is closed with tools already on the founder's machine and no new spend. Includes the provenance caveat that makes or breaks each fixture.
---

# M5, M8, M9 — getting real fixtures without spending anything

These three milestones share one shape: **a question that cannot be answered by reasoning, only by putting a real document through the real pipeline.** Each is cheap. None has been done because none had a method written down. That is what this file is.

---

## M5 — does Gemini produce the `■` substitution too?

### The question, precisely

`EEV2_010_CURRENCY_SYMBOL_ENCODING_20260908.md` found `■` where a currency symbol should be — via Google Drive's `read_file_content` tool. **Production does not use that tool.** Production uses Gemini. Nobody has checked whether Gemini's extraction has the same artifact. If it does not, EEV2-010 describes a defect that does not exist in production, and the doc is noise. If it does, the currency regex has a real blind spot: `/(?:₹|\bINR\b|\bRs\.?)\s*[0-9]/` matches none of `■3,670.55`, so the figure is invisible to ownership resolution entirely.

This is the third instance of the same fixture-provenance mechanism, and the pattern doc names it as such. It is also the cheapest to close.

### Method — one submission, twenty minutes

1. Submit `M01_MonthlySummary.pdf` **or** `M01_IPC.pdf` (not both — one change per submission) through the real intake form, from `admin@constrovet.com`.
2. Open that job's `final-report.json` (or `deep-review.json`) in its Drive outputs folder.
3. Search the raw `quoted_span` values for `■`, and for `₹`, `Rs.`, `INR`.
4. Record the answer verbatim in `EEV2_010_...md` under a new "Verified against real Gemini extraction" heading.

### Acceptance

- **`■` present** → M5 becomes a real defect. Extend the currency regex to accept the substitution character, add a fixture sourced from that job id, and treat it as an EEV2-013 following the same ladder as `PLAN_02`.
- **`■` absent** → M5 closes as *not a production defect*. Amend `EEV2_010_...md` to say so, prominently, so no future session builds a fix for it. **Closing a milestone by disproving it is a real close, not a cop-out.**

Either outcome closes M5. That is why this is the best ₹0 spent this month.

---

## M8 — a document that genuinely exceeds 40 evidence matches

### What is actually known

The evidence matcher caps at the first 40 matching passages. A real EOT document once produced 98 matches with 40 surviving. Behaviour beyond the cap is untested. Sweeping the `national_Highway_PROJ` corpus found **every candidate file produces at most 1 evidence window** — nowhere near the cap.

M8's own acceptance criteria permits **"a single document or combined batch"**. That word "batch" is the whole solution, and it is free.

### Method, in order of preference

**M8-a (preferred): combine real documents into one submission.**
The 9-file Procurement_* set already exists and is already the Test A fixture. Submit a larger real batch — the Procurement set plus the Change Order log plus the RFI tracker — as one job. If the combined evidence windows exceed 40, the cap is exercised with entirely real content and zero fabrication. Count the windows in the job's own artifacts; do not estimate.

**M8-b: concatenate real documents into one PDF.**
Free, using tools already present:

```bash
pdfunite doc1.pdf doc2.pdf doc3.pdf combined.pdf   # poppler-utils
```

Weaker than M8-a because concatenation may change how Gemini segments the document, so the extraction shape is a proxy again — the exact trap this project keeps falling into. **If you use M8-b, the fixture comment must say `// KNOWN-SYNTHETIC: pdfunite concatenation of real documents`.** Never label it as a real single-document extraction.

**M8-c (do not do): generate a synthetic 50-row table.**
Fails the provenance rule outright and would produce another green suite over an unreal case.

### Acceptance

A real submission whose artifacts show >40 evidence matches, handled correctly: no crash, no silent truncation misattributed as completeness, and the report stating honestly that matching was capped. **If the report does not disclose the cap to the client, that is the finding** — an undisclosed cap is a report that misleads about what evidence was actually examined, which the prime directive forbids as squarely as a fabricated figure does.

---

## M9 — a genuinely scanned, image-only PDF

### What is known

Every document tested has had a clean text layer. No scanned fixture exists anywhere in Drive. OCR-path behaviour is completely unproven — and this is the gap most likely to bite a first real client, because clients send phone photos of site records constantly.

### Method — two tiers, both ₹0. Do both.

**Tier 1 — rasterize a real document (5 minutes, today).**

```bash
pdftoppm -r 200 -png Procurement_Purchase_Orders.pdf page     # poppler-utils
img2pdf page-*.png -o Procurement_scanned_tier1.pdf           # pip install img2pdf
```

This produces a genuine image-only PDF with no text layer, carrying real content. It forces the OCR path for real. Its limitation is honest and must be recorded: **a rasterized digital PDF is far cleaner than a real scan** — no skew, no shadow, no compression noise, perfect contrast. It proves the OCR path *runs*. It does not prove the OCR path *copes*.

**Tier 2 — a real scan (20 minutes, this week).**
Print one page of a real project document, photograph it with a phone at a slight angle in ordinary office light, and submit that. This is the document a real client actually sends. It costs one sheet of paper.

Tier 1 answers "does the pipeline handle an image-only PDF at all". Tier 2 answers "does it handle the mess". Both answers are needed and they are different questions.

### Acceptance

Both tiers submitted through real intake; OCR-path behaviour confirmed and recorded. Specifically check: does a low-confidence OCR read produce a **held** report or a **confident wrong number**? A garbled figure attributed with confidence is a fabricated figure, and it is the worst failure mode this system has.

If Tier 2 produces a confident figure from unreadable text, that is a **stop-everything finding** outranking every other milestone in this plan.

---

## The rule that binds all three

Every fixture these gaps produce must carry its provenance comment, naming the real job id and artifact it came from — or an explicit `// KNOWN-SYNTHETIC:` justification. The gate in `scripts/check-fixture-provenance.mjs` catches only the `\n\n` tell; it cannot catch a fixture that is wrong in some other way. **The gate is a backstop for the discipline, not a replacement for it.**

## Sequencing

M5 first — it is 20 minutes and it may delete a milestone's worth of work.
M9 Tier 1 second — 5 minutes, and it may surface something that outranks everything.
M8 third — depends on a batch submission, which is the largest single Gemini spend here.
M9 Tier 2 fourth — needs a printer and daylight.

All four can run in parallel with `PLAN_02`'s review cycle, because none of them touches `Code.gs`. But **none should share a submission with an M3 fix test.** One change per real-fire test.

## Not verified

- Whether `pdfunite`, `pdftoppm` (poppler-utils) and `img2pdf` are installed on `taran-MS-7C95`. All three are free and in Ubuntu's default repositories; check with `which` before planning around them.
- Whether combining documents changes Gemini's extraction shape. Unknown, and the reason M8-a is preferred over M8-b.
- Whether the evidence matcher's 40-cap is disclosed anywhere in the client-facing report today. I did not trace the report template. **Check this before running M8** — if the answer is no, that is the finding, and the submission merely confirms it.

## Next single test

Submit `M01_IPC.pdf` and search its `final-report.json` for `■`. One run, one search, and M5 resolves in one direction or the other.
