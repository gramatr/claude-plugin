---
description: Explicitly recover and verify the saved thread for this project — the same restore the SessionStart hook already runs automatically on /clear, but visible and on demand, so you can see what came back and what was checked.
argument-hint: (no arguments)
---

# /restore

**Goal:** one job, recovery. Pull back the saved handoff + recent turns for
this project, verify their concrete claims against the real repo, and report
plainly what you got and what you checked.

**When to invoke:** the user types `/restore` — usually right after `/clear`,
but it works any time they want an explicit, visible recovery rather than
waiting for it to happen quietly in the background. It does **not** save
anything and does **not** clear anything; those aren't its job.

**Why this exists separately from the automatic hook:** the SessionStart
hydration hook (`session-hydration.ts`, #6890) already injects this same
material automatically on `/clear`/`resume`/`compact` — no command needed for
that case. `/restore` is for when the user wants to *see* the recovery happen
on demand: right after typing `/clear`, mid-session to double-check nothing
drifted, or in a context where the hook didn't fire (an older harness, a
client without SessionStart hooks). One deterministic verb, always available,
never required.

**You don't need to save anything first.** Every turn is sealed server-side
by the Stop hook as it completes — by the time a user can type `/restore` (or
`/clear`), the turn they just saw has already been sealed. There is no
"did I save in time" risk here. If you decided something substantial this
session that genuinely isn't reflected in any turn yet (rare — most work is),
you can call `save_handoff` yourself first, but that's a judgment call, not a
prerequisite this command enforces.

## What to do

1. Resolve `project_id` the same way `/gramatr:gramatr handoff load` does:
   `.gramatr/project.json` → `.gramatr/git-context.json` →
   `gramatr_project_id` from the packet. If none resolve, say so plainly —
   "Nothing to restore yet, no project is resolved" — and stop.

2. Read `client_session_id` from `.gramatr/session.json` in the current
   working directory (read-only; never write this file). Call
   `load_handoff({ project_id, session_id, client_session_id })` and, if
   available, `ReadMcpResource("gramatr://project/recent-turns/<project_id>?n=10&client_session_id=<value>")`.

3. **Verify before you report.** This is the whole point of the command: the
   saved material is a snapshot, not a live read. Before telling the user
   what was recovered, check its concrete claims against the real repo —
   `git status`, `gh pr view` for anything it names a PR/issue number for,
   branch state. Say plainly what you verified and what, if anything, turned
   out stale. Never repeat a saved claim as current fact without that check.

4. Report in plain, warm language — no alarm bells, no shouting:

   ```
   Restored — <slug>
     Handoff said: <one line from the saved where_we_are>
     Checked now:  <what you verified, and any mismatch found>
     Next:         <top whats_next item>
   ```

   Then ask whether to continue with that, or do something else.

## Failure modes

- **No handoff and no turns:** a fresh project, not an error — "Nothing to
  restore — this looks like a fresh start for `<slug>`."
- **A resource errors:** fall back to whichever of handoff/turns did load;
  say plainly what didn't come through. Never claim a restore that didn't
  happen.
