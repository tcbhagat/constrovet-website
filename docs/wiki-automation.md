---
name: wiki-automation
description: How the llm-wiki stays synchronized with constrovet-website source docs via automation.
---

# Wiki Automation

The `llm-wiki-constrovet` wiki is automatically kept in sync with source documents in the `constrovet-website` repository using a three-tier system and GitHub Actions.

## Architecture

### Tier 1: Canonical Source (Automated)
**Location:** `constrovet-website` repo root and `docs/` directories
**Content:** Governance documents, incident write-ups, decisions
- `REPO_MAP.md` — product structure, deploy paths
- `AGENTS.md` — operating rules, delegation boundaries
- `CONTRACTS.md` — formal correctness contracts
- `PROJECT_MILESTONES.md` — current project state
- `docs/chat-exports/` — curated chat transcripts (manual additions)
- `incidents/EEV2_*.md` — incident write-ups

**Why:** Already version-controlled, peer-reviewed, deliberately written to be durable.

### Tier 2: Wiki (Auto-Generated from Tier 1)
**Location:** `tcbhagat/-llm-wiki-constrovet` GitHub repo
**Content:** Regenerated from Tier 1 source documents
- `00-repo-map.md` ← REPO_MAP.md
- `01-operating-rules.md` ← AGENTS.md
- `02-contracts.md` ← CONTRACTS.md
- `03-milestones.md` ← PROJECT_MILESTONES.md
- `INDEX.md` ← generated with cross-links
- `incidents/` ← preserved from manual edits
- `glossary.md` ← preserved from manual edits

**Why:** Provides a clean, organized entry point for new sessions without duplicating source docs.

### Tier 3: Session Context (Not Archived)
**Location:** Local to each Claude Code / ChatGPT / Gemini session
**Content:** Session-specific memory and custom instructions

**Why:** Ephemeral; doesn't need to persist across sessions.

## How It Works

### Manual Workflow (For Now)

1. **Update source docs in constrovet-website**
   ```bash
   # Edit any of these:
   - REPO_MAP.md
   - AGENTS.md
   - CONTRACTS.md
   - PROJECT_MILESTONES.md
   - docs/chat-exports/*.md (new chat transcripts)
   ```

2. **Run the generation script locally**
   ```bash
   cd constrovet-website
   node scripts/generate-wiki.mjs --wiki-path ../llm-wiki
   ```

3. **Push both repos**
   ```bash
   cd ../llm-wiki
   git add -A && git commit -m "Regenerate wiki from source" && git push origin main
   
   cd ../constrovet-website
   git push origin main  # This will eventually trigger the GitHub Actions workflow
   ```

### Automatic Workflow (GitHub Actions)

**Workflow file:** `.github/workflows/sync-wiki.yml`

**Triggers:**
- Push to `main` branch when any of these change:
  - `REPO_MAP.md`
  - `AGENTS.md`
  - `CONTRACTS.md`
  - `PROJECT_MILESTONES.md`
  - `scripts/generate-wiki.mjs`
- Manual trigger: `workflow_dispatch` (via GitHub Actions UI)

**What it does:**
1. Checks out `constrovet-website` main branch
2. Checks out `llm-wiki-constrovet` main branch
3. Runs `scripts/generate-wiki.mjs --wiki-path ./llm-wiki`
4. Commits and pushes changes to wiki main branch (if any)

**Requirements:**
- Wiki repo must be publicly readable (it is)
- Workflow uses `${{ secrets.GITHUB_TOKEN }}` (built-in, no setup needed)

## The Script

**File:** `scripts/generate-wiki.mjs`

**Purpose:** Reads Tier 1 source documents and generates corresponding Tier 2 wiki pages.

**Usage:**
```bash
# Dry run (preview, don't write)
node scripts/generate-wiki.mjs --wiki-path /path/to/wiki --dry-run

# Write to wiki
node scripts/generate-wiki.mjs --wiki-path /path/to/wiki

# Use WIKI_REPO_PATH environment variable
WIKI_REPO_PATH=/path/to/wiki node scripts/generate-wiki.mjs
```

**Output:**
- `00-repo-map.md` (from REPO_MAP.md)
- `01-operating-rules.md` (from AGENTS.md)
- `02-contracts.md` (from CONTRACTS.md)
- `03-milestones.md` (from PROJECT_MILESTONES.md)
- `INDEX.md` (new, with navigation)
- Preserves: `glossary.md`, `STALE.md`, `incidents/` (manual content not overwritten)

## Adding Chat Transcripts

When you want to preserve a chat session:

1. **Export the transcript** from ChatGPT / Claude.ai / Gemini as a text or markdown file
2. **Save to constrovet-website repo:**
   ```bash
   cp exported-transcript.md constrovet-website/docs/chat-exports/2026-09-14-chatgpt-session-topic.md
   ```
3. **Commit and push:**
   ```bash
   cd constrovet-website
   git add docs/chat-exports/*.md
   git commit -m "Add chat export: 2026-09-14 ChatGPT session on topic"
   git push origin main
   ```
4. **The wiki regenerates automatically** (GitHub Actions picks up the change to `docs/chat-exports/`)
5. **Update INDEX.md manually** (or update the script to link them) to surface important transcripts

## FAQ

**Q: Why not just push directly to the wiki from Claude Code?**
A: Because the wiki should reflect what's in the constrovet-website repo (the canonical source). Direct edits to the wiki risk divergence.

**Q: Can I edit the wiki manually?**
A: Yes, but only for `incidents/`, `glossary.md`, `STALE.md`, and similar reference material. The main pages (`00-03` and `INDEX.md`) regenerate from source and will overwrite manual edits.

**Q: What if I want to add a new type of document to the wiki?**
A: Update `scripts/generate-wiki.mjs` to read that document and generate the corresponding wiki page.

**Q: How often does the sync happen?**
A: On every push to `main` when a watched file changes. Or manually via "Run workflow" in GitHub Actions UI.

**Q: What if the GitHub Actions workflow fails?**
A: Check the workflow run in GitHub Actions. Common reasons:
- Wiki repo is private (should be public)
- Token doesn't have write access (should be automatic with `${{ secrets.GITHUB_TOKEN }}`)
- `generate-wiki.mjs` is broken (test locally first)

**Q: Can I sync on a schedule instead of on push?**
A: Yes, add a `schedule` trigger to `.github/workflows/sync-wiki.yml`:
```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
```

## Next Steps

1. Test the GitHub Actions workflow by editing a source doc and pushing to `main`
2. Verify the wiki updates automatically
3. Add manual chat export to `docs/chat-exports/` and verify it lands in the wiki
4. Document process in team onboarding docs

---

**Last updated:** 2026-09-13
**Automation added by:** Claude Code
