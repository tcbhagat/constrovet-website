#!/usr/bin/env bash
# scripts/session-context.sh
#
# Prints a quick orientation snapshot at the start of a session: recent git
# history, working-tree status, whether local is ahead/behind the GitHub
# remote, and (best-effort) whether the live Apps Script project's HEAD
# matches what clasp can see. Read-only throughout -- this script never
# writes, pushes, or pulls anything into the repo or the Apps Script project.
#
# Exists because this project has repeatedly lost a session to acting on a
# stale picture of "what's live/current" -- see AGENTS.md's Delegation
# Boundaries and CONTRACTS.md's repo/live drift warnings. A five-second
# printout at session start is cheaper than re-deriving this by hand, or
# worse, not re-deriving it and being wrong about it again.
#
# Every section is independent and best-effort: a failure in one section
# (most likely clasp, whose credentials expire and require the founder to
# run `clasp login`) prints a clear "not available, here's why" line for
# that section only and does not stop the rest of the script from running.
# Overall exit code is always 0 -- this is an informational tool, never a
# gate, and must never block a session from starting.

set -uo pipefail
# Deliberately NOT `set -e`: every section below handles its own failures so
# one broken section (e.g. expired clasp credentials) cannot abort the rest.

if repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  cd "$repo_root" || exit 0
else
  echo "session-context.sh: not inside a git repository -- skipping."
  exit 0
fi

section() {
  echo
  echo "=== $1 ==="
}

section "Last 8 commits"
if git log --oneline -8 2>/dev/null; then
  :
else
  echo "(could not read git log -- is this repo freshly initialized with no commits yet?)"
fi

section "Working tree status (git status --porcelain)"
status_output="$(git status --porcelain 2>&1)"
if [[ -n "$status_output" ]]; then
  echo "$status_output"
else
  echo "(clean -- no modified, staged, or untracked files)"
fi

section "Local vs GitHub remote"
if git remote get-url origin >/dev/null 2>&1; then
  if fetch_output="$(git fetch --quiet 2>&1)"; then
    git status -sb 2>/dev/null | head -1
  else
    echo "NOT AVAILABLE -- git fetch failed. Local/remote comparison below may be stale or wrong."
    echo "  fetch error: $fetch_output"
    echo "  Falling back to last-known state (no network refresh):"
    git status -sb 2>/dev/null | head -1
  fi
else
  echo "(no 'origin' remote configured -- skipping)"
fi

section "Apps Script live status (clasp)"
if ! command -v clasp >/dev/null 2>&1; then
  echo "NOT AVAILABLE -- clasp is not installed or not on PATH."
elif [[ ! -f "apps-script/.clasp.json" ]]; then
  echo "NOT AVAILABLE -- apps-script/.clasp.json not found; cannot determine which Apps Script project to check."
else
  clasp_output="$(cd apps-script && clasp status 2>&1)"
  clasp_exit=$?
  if [[ $clasp_exit -eq 0 ]]; then
    echo "$clasp_output"
  elif grep -qi "invalid_grant\|invalid_rapt\|login\|not logged in\|credential" <<<"$clasp_output"; then
    echo "NOT AVAILABLE -- clasp credentials appear to have expired or are missing."
    echo "  This is expected to happen periodically; only the founder can run 'clasp login' to fix it."
    echo "  Do NOT treat this as evidence Apps Script itself is broken -- it means this check could not run."
  else
    echo "NOT AVAILABLE -- clasp status failed for an unexpected reason:"
    echo "  $clasp_output"
  fi
fi

echo
echo "=== End of session-start context ==="
echo "Note: GitHub PR/issue state is deliberately not included here. Ask explicitly if that's needed."

exit 0
