---
name: fixture-provenance-pattern-20260909
description: Diagnoses the repeating failure mechanism behind EEV2-005, EEV2-008/009, and EEV2-010 — every one of them a real fix or real regression test built against a proxy data source instead of the actual Gemini extraction artifact production code consumes. Read this before writing or trusting any new regression fixture in this project.
---

# The repeating pattern — fixture provenance mismatch — 2026-09-09

## Three real instances, not hypothetical
1. **EEV2-005 (citation truncation).** The validator read a citation stored via a
   `.slice(0, 500)` call, while the extractor that decided the finding's amount had
   already read the full span. Same underlying text, two different truncated/untruncated
   views of it, never reconciled until a real job exposed it.
2. **EEV2-008/009 (row-boundary guard).** The regression fixture used text extracted via
   Google Drive's `read_file_content` tool, which inserts `\n\n` between table rows. Real
   Gemini extraction — what production actually runs on — produces one continuous
   string, no newlines. The fix passed 16/16 against a fixture that didn't represent
   reality, shipped, and failed identically to the original bug on the first real job
   (`form-20260909-072421-33a43b52`).
3. **EEV2-010 (currency `■` encoding).** Found via the same Drive tool. Documented,
   correctly, as unverified against real Gemini extraction — that verification still
   hasn't happened as of this doc.

## The mechanism, one sentence
Every one of these treated a convenient proxy for the real data (Drive's own text
extraction, a hand-reconstructed string, a synthetic fixture) as if it were equivalent to
the actual artifact production code consumes (Gemini's `quoted_span`), without ever
checking whether the two produce the same format — so regression suites kept passing
while the real-world case was never actually exercised.

## Why this keeps recurring
Drive's `read_file_content` is the easiest tool available in this chat to pull real
document text quickly. It produces real *content* (verified byte-for-byte accurate
against the source document each time it's been checked) but not the real *shape*
Gemini's extraction produces — different whitespace/newline handling entirely. Convenient
and accurate are not the same as representative.

## Smallest structural fix — not a bigger regression suite, a provenance gate
Adding more tests doesn't fix this; the last fix was tested plenty, against the wrong
thing. The fix is a rule plus a mechanical check:

1. **Rule:** any fixture in an EEV2 regression file claiming to represent real extracted
   text must carry a comment stating its source — the real job ID and artifact it came
   from (e.g. `// source: form-20260909-072421-33a43b52, deep-review.json quoted_span`) —
   not "Drive" and not "reconstructed."
2. **Mechanical check:** a small script (`scripts/check-fixture-provenance.mjs`) that
   scans `apps-script/EEV2*Regression.gs` for any fixture string containing `\n\n` (the
   Drive-extraction tell) and fails CI if one is found without an explicit
   `// KNOWN-SYNTHETIC:` comment justifying it. This can't catch every case, but it
   catches the exact, specific mistake that caused this twice.

## Regression test for the fix itself
Add one fixture deliberately containing `\n\n` with no justifying comment; confirm
`check-fixture-provenance.mjs` fails on it. Add the same fixture with a
`// KNOWN-SYNTHETIC:` comment; confirm it passes. Wire the script into
`eev2-harness-ci.yml` as a cheap pre-check before the real suite runs.

## Not verified
- Whether Gemini's extraction format is consistent across all document types, or varies
  (e.g. maybe some document structures do get newlines) — only confirmed for this one
  Procurement PO table format so far.
- Whether any *other* existing regression fixture in the repo has the same
  Drive-vs-Gemini mismatch, undiscovered. The check above only prevents new instances;
  it doesn't retroactively audit the ~16 existing suites.

## Next single test
Run `check-fixture-provenance.mjs` (once written) against every existing
`EEV2*Regression.gs` file, not just new ones — report what it finds. That answers the
"not verified" item above with evidence instead of leaving it open indefinitely.
