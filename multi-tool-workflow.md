---
name: multi-tool-workflow
description: Protocol for working across Claude Cowork, Termux (mobile terminal), and Claude Code in VS Code (desktop terminal) on this project without losing thread or causing sync conflicts. Read this before starting any session in any of the three tools.
---

# Multi-tool workflow — Cowork, Termux, Claude Code (VS Code)

## The one rule everything else follows
**`main` + `PROJECT_MILESTONES.md` + the Drive `PLAN_*` docs are the only sources of
truth.** No tool carries private state between sessions. Every session starts by reading
these three; every session ends by updating whichever ones it touched. This exists
because it already failed once — a stale local clone caused a real push of pre-fix code
(the M3 incident), and Cowork produced a full plan in Drive that this chat didn't know
existed until told.

## What each tool is actually for — don't blur these
| Tool | Role | Writes to |
|---|---|---|
| **Claude Cowork** | Big-picture planning, multi-step analysis, proposal-writing (like `PLAN_00`–`PLAN_04`) | Drive docs — **not** the repo directly |
| **Claude Code (VS Code, desktop)** | Real implementation: code, commits, branches, PRs | Git branches, opens PRs |
| **Termux (mobile terminal)** | Same as VS Code's terminal, but mobile — primarily `clasp push`/`clasp run`, the founder-only deploy actions | Live Apps Script (via clasp), git branches when away from desktop |
| **This chat** | Reviews and verifies claims against real artifacts, tracks milestones, catches drift | `PROJECT_MILESTONES.md`, this project's memory |

Cowork's plans don't become code automatically — that's a manual handoff: read the
Drive doc, then give Claude Code (or a terminal session) the concrete next action from
it. Cowork does not push to git on its own.

## Starting ANY session, in any of the three tools
1. **`git pull` first, always** — before reading any code, before doing anything.
   Assume your local clone is stale; it usually is if more than a few hours have passed.
2. **Read `PROJECT_MILESTONES.md`** at repo root for real current milestone state.
3. **Check Drive for the `PLAN_*` docs** (folder `0ANKQEZnWLkhxUk9PVA`) — if Cowork has
   run since you last checked, there may be a newer plan superseding what you're about
   to do.
4. **Check CI status on `main`**, not just on your branch — a red `main` blocks every
   new PR touching `apps-script/**`, and this has already happened invisibly once.

## Ending ANY session
1. Push real work, or state plainly what's staying local and why.
2. If milestone state changed, update `PROJECT_MILESTONES.md` in the same PR — not a
   separate follow-up that might not happen.
3. Leave a one-line session-end note (matches the existing `SESSION_LOG.md`/timestamp
   commit pattern already in use).

## Terminal-specific hygiene (Termux and VS Code both)
- **One dedicated, consistently-named folder per device for the production clone** —
  never a throwaway folder, never a bare `.clasp.json` sitting in the home directory.
  A stray `~/.clasp.json` from an old experiment already caused real confusion once
  (blocked `clasp clone` silently, no useful error message).
- Before any `clasp push`: `git pull`, then `md5sum apps-script/Code.gs` against what
  you expect, **then** push. This is the exact sequence that would have caught the M3
  incident before it happened, not after.
- After any `clasp push`: verify with a fresh `clasp clone` into a throwaway folder and
  checksum it against the repo — the standard already established for every fix in this
  project's history (M2, M3).

## When two tools might collide
If Cowork is mid-analysis and you also want Claude Code to start implementing the same
milestone: **don't run both at once on the same milestone.** Cowork's output is a
proposal until a human (you) reads it and hands a concrete instruction to Claude Code —
that handoff is the synchronization point, not simultaneous work. If in doubt, check
the Drive `PLAN_*` docs' modified timestamps and this chat's memory before starting
parallel work on the same item.

## Not yet verified
- Whether Claude Cowork has any direct git/GitHub write capability beyond Drive — 
  observed behavior so far is Drive-only output. Worth confirming directly if this
  changes, since it would change this protocol's handoff step.
