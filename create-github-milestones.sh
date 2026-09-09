#!/usr/bin/env bash
# create-github-milestones.sh
#
# Creates real GitHub Milestones (via `gh api`, since milestones aren't files —
# they're API-managed objects) plus one tracking issue per milestone, sourced
# from PROJECT_MILESTONES.md. Run this once from Claude Code, in the repo root,
# with `gh` already authenticated (it already is, given PRs are being opened).
#
# M1/M2/M4/M6 are already DONE and are not created as milestones — nothing to
# track. Only open/in-progress/not-started milestones get one.
#
# Safe to re-run: checks for an existing milestone with the same title before
# creating a duplicate.

set -euo pipefail

REPO="tcbhagat/constrovet-website"

create_milestone_if_missing() {
  local title="$1"
  local description="$2"
  local existing
  existing=$(gh api "repos/${REPO}/milestones?state=all" --jq ".[] | select(.title==\"${title}\") | .number" || true)
  if [ -n "$existing" ]; then
    echo "Milestone '${title}' already exists (#${existing}), skipping creation."
    echo "$existing"
    return
  fi
  local number
  number=$(gh api "repos/${REPO}/milestones" -f title="${title}" -f description="${description}" --jq '.number')
  echo "Created milestone '${title}' as #${number}"
  echo "$number"
}

create_tracking_issue() {
  local milestone_number="$1"
  local title="$2"
  local body="$3"
  gh issue create --repo "${REPO}" --title "${title}" --body "${body}" --milestone "${milestone_number}"
}

echo "=== M3 — EEV2-008/009 fix (citation truncation + label bleed) ==="
M3=$(create_milestone_if_missing \
  "M3 — EEV2-008/009 truncation + label-bleed fix" \
  "Highest priority. Branch claude/eev2-008-citation-truncation-fix (c0ba15d), 16/16 + 26/26 verified. DONE = merged to main, clasp push run, live checksum matches repo Code.gs.")
create_tracking_issue "$M3" \
  "Merge and deploy EEV2-008/009" \
  "Acceptance criteria: merged to main, clasp push run by founder, live Code.js checksum matches repo Code.gs (same method used to verify EEV2-004). See PROJECT_MILESTONES.md M3."

echo "=== M5 — EEV2-010 currency symbol encoding ==="
M5=$(create_milestone_if_missing \
  "M5 — EEV2-010 currency encoding verification" \
  "Doc merged (PR #22); root question unresolved. DONE = real Gemini extraction tested against M01_MonthlySummary.pdf / M01_IPC.pdf, confirms or rules out the same artifact.")
create_tracking_issue "$M5" \
  "Verify EEV2-010 against real Gemini extraction" \
  "Acceptance criteria: run M01_MonthlySummary.pdf or M01_IPC.pdf through the real intake pipeline; inspect Gemini's actual extracted text for the same currency-symbol substitution seen via Drive's read_file_content. See PROJECT_MILESTONES.md M5."

echo "=== M7 — eev2AuditJob ==="
M7=$(create_milestone_if_missing \
  "M7 — eev2AuditJob live verification" \
  "PR #23 built, 16/16 + 26/26 locally. Blocked on API-executable deployment. DONE = merged, clasp run eev2AuditJob executed for real against a real job ID, verdict matches manual check.")
create_tracking_issue "$M7" \
  "Confirm API-executable deployment and live-test eev2AuditJob" \
  "Acceptance criteria: merge PR #23; confirm/create the API-executable deployment; founder runs clasp run eev2AuditJob from Termux against a real job ID; verdict matches manual Gmail/Drive/Sheet inspection. See PROJECT_MILESTONES.md M7."

echo "=== M8 — Phase 2 gap #1: large/dense document ==="
M8=$(create_milestone_if_missing \
  "M8 — Large/dense document test" \
  "No real fixture exists; national_Highway corpus doesn't qualify (max 1 evidence window per file). DONE = a real submission exceeds the 40-match cap and is handled correctly.")
create_tracking_issue "$M8" \
  "Source or construct a real large/dense document test" \
  "Acceptance criteria: a real single document or combined batch submission genuinely exceeds 40 evidence matches; behavior confirmed correct. See PROJECT_MILESTONES.md M8."

echo "=== M9 — Phase 2 gap #2: scanned/image PDF ==="
M9=$(create_milestone_if_missing \
  "M9 — Scanned/image PDF test" \
  "No real fixture exists anywhere in Drive. DONE = a real scanned document sourced and tested; OCR-path behavior confirmed.")
create_tracking_issue "$M9" \
  "Source a real scanned/image PDF for testing" \
  "Acceptance criteria: real scanned document (not clean-text-generated) tested through the real pipeline; OCR extraction quality and downstream handling confirmed. See PROJECT_MILESTONES.md M9."

echo "=== M10 — Launch gate: consecutive clean Test A/B ==="
M10=$(create_milestone_if_missing \
  "M10 — Launch gate consecutive clean runs" \
  "Cannot meaningfully start until M3 ships. DONE = Test A and Test B both run cleanly several consecutive times under post-M3 code.")
create_tracking_issue "$M10" \
  "Run Test A/B consecutively clean, post-M3" \
  "Acceptance criteria: 9-file Procurement set (must block) and delay-only CSV (must pass) both run cleanly multiple consecutive times after M3 is deployed. Depends on M3. See PROJECT_MILESTONES.md M10."

echo "=== M11 — Auto-push trust count ==="
M11=$(create_milestone_if_missing \
  "M11 — Auto-push trust count (0/5)" \
  "Cannot start meaningfully until M7 is live. DONE = 5 consecutive matching verdict/outcome cycles logged in AUTO_PUSH_TRUST_LOG.md.")
create_tracking_issue "$M11" \
  "Log 5 consecutive matching audit cycles" \
  "Acceptance criteria: AUTO_PUSH_TRUST_LOG.md shows 5 consecutive cycles where the eev2AuditJob verdict matched the real post-push outcome. Depends on M7. See PROJECT_MILESTONES.md M11 and auto-push-trust-plan-20260908.md."

echo "=== M12 — First real pilot client ==="
M12=$(create_milestone_if_missing \
  "M12 — First real pilot client" \
  "Depends on M8-M10 being closed or explicitly accepted open by the founder.")
create_tracking_issue "$M12" \
  "Onboard first real pilot client" \
  "Acceptance criteria: M8, M9, M10 closed or explicitly accepted as open-on-purpose by the founder; one real client onboarded with manual review of their first reports. See PROJECT_MILESTONES.md M12."

echo "Done. Verify at: https://github.com/${REPO}/milestones"
