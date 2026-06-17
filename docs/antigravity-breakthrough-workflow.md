# Antigravity Breakthrough Workflow

Use Antigravity for high-variance UI/product exploration, not direct production edits.

## Workspace Rule

Do not point Antigravity at `/home/taran/constrovet-website` while production work is active there. Use a separate Git worktree so agent edits, browser checks, and generated artifacts stay isolated until reviewed.

```bash
cd /home/taran/constrovet-website
git fetch origin
git worktree add -b antigravity/ui-breakthrough ../constrovet-website-antigravity main
```

Open this folder in Antigravity:

```text
/home/taran/constrovet-website-antigravity
```

## Antigravity Task Prompt

```text
Optimize Constrovet for pilot lead conversion.

Constraints:
- Do not edit Apps Script report generation unless explicitly asked.
- Keep the production architecture: GitHub Pages + Google Workspace Apps Script/Drive/Mail.
- Make /boardroom/ the primary upload-session conversion path.
- Keep /app/ positioned as browser demo/local analysis.
- Simplify navigation and CTA hierarchy.
- Produce screenshots/artifacts and a clear diff before merge review.

Target outcomes:
- Cleaner first viewport for pilot leads.
- Shorter navigation.
- Stronger Boardroom intake page.
- Less repeated homepage explanation.
- No unreviewed changes to main.
```

## Review Gate

Inspect the Antigravity worktree before merging:

```bash
git -C /home/taran/constrovet-website-antigravity status
git -C /home/taran/constrovet-website-antigravity diff
```

Merge into production only after visual review, link checks, and pipeline checks pass:

```bash
git -C /home/taran/constrovet-website merge antigravity/ui-breakthrough
```

