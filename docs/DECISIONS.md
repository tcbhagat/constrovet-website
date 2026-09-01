# DECISIONS

**Append-only. Newest at the bottom. Never edit or delete an entry — supersede it with a new one.**

This file exists so a future agent does not re-litigate a settled question, and does not silently reverse a deliberate choice because the reason was invisible.

Format:

```
## D-000 — Title
Date · Status: active | superseded by D-00X
Decision:   what was chosen
Because:    the reason, including the constraint that forced it
Instead of: what was rejected and why
Reverses if: the condition under which this should be revisited
```

Add an entry whenever you make a choice a reasonable person could have made differently. Not for typo fixes.

---

## D-001 — Static GitHub Pages, no backend
2026-07 · Status: active
**Decision:** Host the entire public site as static files on GitHub Pages from `main`.
**Because:** Zero budget is a hard operating constraint, not a preference. Static hosting has no idle cost, no scaling surprise, and no credential surface.
**Instead of:** Cloud Run, which was retired. Its Dockerfile and nginx.conf remain only as rollback references.
**Reverses if:** A funded operating budget is approved and a release approver signs off on a new rollback plan.

## D-002 — Google Workspace Apps Script is the only processor
2026-07 · Status: active
**Decision:** Deeper analysis, Drive storage, and report email run on Workspace Apps Script owned by the Workspace admin.
**Because:** It is free at our volume, it is already owned, and it keeps evidence out of this public repository.
**Instead of:** Service-account Drive upload, GCS, Cloud SQL, Firestore, or a hosted backend.
**Reverses if:** Workspace quotas become binding and a paid path is explicitly approved.

## D-003 — Deterministic extraction is authoritative, AI is a layer
2026-07 · Status: active
**Decision:** Citations and calculations come from deterministic extraction. AI may summarise, critique, and draft actions from cited findings only.
**Because:** The product's only durable advantage is that a human can check every number. An AI that fills gaps destroys that in one bad report.
**Instead of:** Letting a model read documents and write the report end to end.
**Reverses if:** Never, while the product is sold as an audit.

## D-004 — Unlinked products are preserved, not deleted
2026-08 · Status: active
**Decision:** Claim Companion, ChallanSe and SSM Core source stays in the repository, marked `noindex,nofollow`, never linked from construction surfaces.
**Because:** Deleting during an incident loses optionality. Linking them dilutes the construction positioning and confuses discovery.
**Instead of:** Deleting the code, or moving it to separate repositories now.
**Reverses if:** A retirement decision is taken deliberately, or a product moves to its own approved domain.

## D-005 — EEV2 baseline selected from the TEST export
2026-08-29 · Status: active
**Decision:** Develop from `codex/constrovet-evidence-harness-v1` (PR #14), sourced from the `Constrovet Boardroom — EEV2 TEST` export.
**Because:** It carries live schedule attachment, structured cost/delay/progress routing ahead of legacy fallback, and preserves unestablished exposure without converting it to recoverable leakage.
**Instead of:** The historical branch `eev2-002-structured-schedule` at `e6ce4bb`, whose `.clasp.json` points at a different Apps Script project and whose integration note documents a cost-only hook.
**Reverses if:** Controlled TEST validation fails in a way traced to the selected baseline.

## D-006 — EEV2 production deployment is blocked pending human review
2026-08-29 · Status: active
**Decision:** The baseline is locally stable, not production-approved. Deployment requires a harness run in the approved TEST project plus GOOD/BAD/NORMAL smoke tests, then human sign-off.
**Because:** The failure mode of a bad evidence pipeline is a wrong number in a client boardroom. That is not recoverable by rollback.
**Reverses if:** Those results are reviewed and approved.

## D-007 — The manifest becomes the single source of truth
2026-09-01 · Status: active
**Decision:** Routes, service statuses, denylists, retired infrastructure, and known gaps move into `system.manifest.json`. Documents reference it and stop restating it. `scripts/verify.mjs` checks reality against it on every change.
**Because:** The same facts were restated across README, OPERATIONS_MAINTENANCE, seven SEO documents, two tests and a shell script. Drift was already present: the README structure tree was stale, and duplicate service pages were both indexed and self-canonicalising.
**Instead of:** Continuing to keep documents in sync by discipline, which does not survive contact with an agent that has no memory of yesterday.
**Reverses if:** The manifest becomes larger than the thing it describes.

## D-008 — Local content refresh rollback note retired
2026-09-01 · Status: active
**Decision:** Delete `LOCAL_CONTENT_REFRESH_ROLLBACK.md`. The rollback approach it describes is: work on a local branch, review at `http://localhost:4173`, then `git restore . && git clean -fd && git switch main` to discard, or restore from a dated backup copy of the working folder.
**Because:** The file published a real operator home directory in a public repository, which breaks Rule H2, and described a completed one-off task as if it were standing procedure.
**Instead of:** Editing the path out and keeping the file, which leaves a stale task note that a future agent may read as a live instruction.
