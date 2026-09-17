#!/usr/bin/env bash
# scripts/session-context.sh
#
# Prints a quick orientation snapshot at the start of a session: recent git
# history, working-tree status, whether local is ahead/behind the GitHub
# remote, and (best-effort) a real file-by-file diff of the live Apps Script
# project against this working tree. Read-only throughout -- it never writes,
# pushes, or deploys. It does `clasp pull`, but only into a throwaway mktemp
# directory that is deleted on exit; the repo and the live project are never
# modified.
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

section "Apps Script live-vs-repo drift (clasp)"
# This section previously ran `clasp status`, which only lists the LOCAL files
# queued for a push -- it never contacts the live project's content. That gap is
# how live drifted 11 days behind main (repo 6078bb1, 2026-09-07) without anyone
# noticing until 2026-09-18, with the EEV2-005/008 truncation defect still live.
# It also misleads by design: its "Untracked files" heading means "not pushed to
# Apps Script", which reads as git's meaning of untracked and has been misread.
# This pulls the live project into a throwaway directory and diffs it for real.
if ! command -v clasp >/dev/null 2>&1; then
  echo "NOT AVAILABLE -- clasp is not installed or not on PATH."
elif [[ ! -f "apps-script/.clasp.json" ]]; then
  echo "NOT AVAILABLE -- apps-script/.clasp.json not found; cannot determine which Apps Script project to check."
else
  drift_dir="$(mktemp -d)"
  trap 'rm -rf "$drift_dir"' EXIT
  cp apps-script/.clasp.json "$drift_dir"/ 2>/dev/null

  if command -v timeout >/dev/null 2>&1; then
    pull_output="$(cd "$drift_dir" && timeout 90 clasp pull 2>&1)"
  else
    pull_output="$(cd "$drift_dir" && clasp pull 2>&1)"
  fi
  pull_exit=$?

  if [[ $pull_exit -ne 0 ]]; then
    if grep -qi "invalid_grant\|invalid_rapt\|login\|not logged in\|credential" <<<"$pull_output"; then
      echo "NOT AVAILABLE -- clasp credentials appear to have expired or are missing."
      echo "  This is expected to happen periodically; only the founder can run 'clasp login' to fix it."
      echo "  Do NOT treat this as evidence Apps Script itself is broken -- it means this check could not run."
      echo "  It is ALSO not evidence that live matches the repo. Drift is unknown until this runs."
    else
      echo "NOT AVAILABLE -- clasp pull failed for an unexpected reason (drift is UNKNOWN, not zero):"
      echo "  $pull_output" | tail -3
    fi
  else
    differ=(); missing_live=(); extra_live=(); same=0

    for repo_file in apps-script/*.gs; do
      [[ -e "$repo_file" ]] || continue
      base="$(basename "$repo_file" .gs)"
      if [[ ! -f "$drift_dir/$base.js" ]]; then
        missing_live+=("$base")
      elif diff -q "$repo_file" "$drift_dir/$base.js" >/dev/null 2>&1; then
        same=$((same + 1))
      else
        differ+=("$base")
      fi
    done

    for live_file in "$drift_dir"/*.js; do
      [[ -e "$live_file" ]] || continue
      base="$(basename "$live_file" .js)"
      [[ -f "apps-script/$base.gs" ]] || extra_live+=("$base")
    done

    manifest_note=""
    if [[ -f "$drift_dir/appsscript.json" ]] && \
       ! diff -q apps-script/appsscript.json "$drift_dir/appsscript.json" >/dev/null 2>&1; then
      manifest_note="appsscript.json DIFFERS (manifest controls OAuth scopes / executionApi)"
    fi

    if [[ ${#differ[@]} -eq 0 && ${#missing_live[@]} -eq 0 && ${#extra_live[@]} -eq 0 && -z "$manifest_note" ]]; then
      echo "IN SYNC -- live matches this working tree ($same files + manifest)."
    else
      echo "*** DRIFT DETECTED -- live Apps Script does NOT match this working tree. ***"
      echo "  identical: $same file(s)"
      [[ -n "$manifest_note" ]] && echo "  manifest:  $manifest_note"
      [[ ${#differ[@]} -gt 0 ]] && echo "  differing content (${#differ[@]}): ${differ[*]}"
      [[ ${#missing_live[@]} -gt 0 ]] && echo "  in repo but NOT live (${#missing_live[@]}): ${missing_live[*]}"
      [[ ${#extra_live[@]} -gt 0 ]] && echo "  live but NOT in repo (${#extra_live[@]}): ${extra_live[*]}"
      echo
      echo "  Live is what runs for real submissions. Do NOT assume a merged PR, a green"
      echo "  test run, or an Apps Script version label means the change is deployed:"
      echo "  versions can be created without a preceding push, so a version's label can"
      echo "  describe changes it does not contain (confirmed 2026-09-18, versions 17-20)."
      echo "  Reconciling this is a FOUNDER ACTION -- see STATE.md's 'Live push plan'."
    fi
  fi
fi

echo
echo "=== End of session-start context ==="
echo "Note: GitHub PR/issue state is deliberately not included here. Ask explicitly if that's needed."

exit 0
