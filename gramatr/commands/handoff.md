---
description: Session continuity — save a handoff, load one (renders it, then offers to resume), or show one (renders only, never offers to resume).
argument-hint: save|load|show
---

# /handoff

This command file ships under the `gramatr` plugin, so Claude Code namespaces
it as `/gramatr:handoff`. You handle session continuity for the current
project. Pick mode, resolve `project_id`, then call the matching MCP tool.

## Mode selection

- If the user passed a sub-argument, honor it verbatim: `save` → SAVE,
  `load` → LOAD, `show` → SHOW. No auto-detect.
- Otherwise, auto-detect from this conversation:
  - **SAVE mode** if there has been substantial work this session —
    multiple turns of real activity, code changes, commits/PRs opened,
    decisions made, files modified.
  - **LOAD mode** if the conversation is fresh — first few turns, no
    significant prior work in this session (typical right after a
    session start or a `/clear`).
- If genuinely ambiguous, ask the user: "save or load?" — do not guess.

## Resolve `project_id` (all modes; UUID, never a slug)

The committed `.gramatr/project.json` pin is ALWAYS authoritative. Resolve in
this order, stopping at the first that yields a UUID — but always note which
source won, because the mismatch guard below depends on it:

1. Read `.gramatr/project.json` in the repo root → `project_id` (+ `slug`).
   This is the **pin** and it wins whenever it is present.
2. Read `.gramatr/git-context.json` (written by SessionStart) → `project_id`.
3. Read `gramatr_project_id` from the latest `gmtr.intelligence.contract.v2`
   packet for this turn.

If none yield a UUID, tell the user to run `/gramatr:gramatr project` first
and stop. Do not pass a slug or placeholder.

## Resolve `client_session_id` (all modes — mandatory, not optional in practice)

Read `client_session_id` from `.gramatr/session.json` in the current working
directory (read-only; never write this file). Pass it on EVERY `save` and
`restore` call below, even though the tool schema marks it `optional`. It is
optional in the schema's narrow sense only — omitting it does not error, it
silently degrades `restore`/`save` to the old project-latest behavior (no
client-session matching, no recovery offer, no auto-recovery), which is
indistinguishable from a correct response unless you already know to suspect
it. There is no error to catch here, which is exactly why this step exists as
an explicit instruction rather than relying on good judgment to fill the gap.
If `.gramatr/session.json` is missing or has no `client_session_id`, proceed
without it (this is the legitimate degrade case for non-harness/below-floor
clients) — but still attempt the read first.

## Pin-vs-resolved mismatch guard (run before any save/load/show)

After resolving, ALSO read `gramatr_project_id` from this turn's
`gmtr.intelligence.contract.v2` packet and compare it to the **pin's**
`project_id` (the value from `.gramatr/project.json`).

- If there is no committed pin, skip this guard — there is nothing to defend.
- If the pin and the packet `gramatr_project_id` are equal, proceed silently.
- If they DIFFER, do NOT silently load, save, or show. Surface this prompt and
  WAIT for the user's choice — never auto-pick:

  > Handoff is keyed to the committed project `<pin-slug>` (`<pin-id>`), but
  > this session resolved to `<packet-id>`. Load/save against the pin
  > (recommended), the resolved id, or cancel?

  Use the pin's `project_id` only on "pin", the packet's `gramatr_project_id`
  only on "resolved", and abort the verb on "cancel". Never load or save the
  wrong project.

## SAVE mode

Compose all 5 sections below from this conversation. Be specific — the
next session reads this verbatim.

- **`where_we_are`** — current branch, latest commit, server/test status,
  what just happened in this session. **First-sentence contract:** the FIRST
  SENTENCE of this section becomes the user-visible checkpoint summary on the
  statusline (first sentence only, ≤80 chars, derived verbatim). Lead with the
  single most important current fact (e.g. "v0.24.2 released; #3555 coverage
  fix is the open thread") — NEVER a timestamp, vibe, or label like
  "~07:31Z, deep multi-hour session".
- **`what_shipped`** — numbered list of commits, PRs, deploys, tags that
  landed this session. Include PR/issue numbers.
- **`whats_next`** — priority-ordered list of next actions with issue
  numbers. Top item is what the next session picks up first.
- **`key_context`** — non-obvious facts the next agent MUST know that
  are not in code or git history (decisions made in conversation,
  constraints, blocked dependencies).
- **`dont_forget`** — recurring rules, gotchas, or hazards the agent
  has been violating or is at risk of violating.

Call the MCP tool `save` with `project_id` + all 5 sections +
`client_session_id` (resolved above — pass it even if empty-feeling; see why
above). Include `platform: "claude-code"` and, if known, `branch` and
`session_id`. Confirm with one line naming the project and the top
`whats_next` item.

## SHOW mode (the base render — LOAD below is this plus one more step)

Read-only. Call the MCP tool `restore` with `project_id` + `client_session_id`
(resolved above).

The response `status` branches three ways (same handling as `/gramatr:restore`
— see that command for the fuller rationale):

- `status: "found"` with `auto_recovered: true` — a prior session sealed
  moments ago under a different `client_session_id` was adopted
  automatically. Say so plainly in your rendered output (e.g. "picked up
  automatically from a session sealed `<recovery_saved_at>`") rather than
  presenting it as an ordinary load.
- `status: "recovery_available"` — a prior session exists but sealed too
  long ago to auto-adopt. Ask the user "Do you want to pick up the last known
  client session for this project?" and, only on confirmation, re-call
  `restore` with `client_session_id` set to the response's
  `recovery_client_session_id`. On "no," treat it as `no_handoff` below.
- `status: "no_handoff"` — nothing to recover; use the no-handoff handling
  below.

If a handoff was returned, render it as markdown with these headings,
preserving the saved prose verbatim:

```
## Where we are
<where_we_are>

## What shipped
<what_shipped>

## What's next
<whats_next>

## Key context
<key_context>

## Don't forget
<dont_forget>
```

If the tool returns no handoff, say so plainly: "No handoff found for this
project — this looks like a fresh start." Do not error, retry, or fabricate
sections. Then add one hint:

> If this project was recently rehomed or drifted, the handoff may live
> under a pre-rehome `project_id` — run `/gramatr:gramatr project fix` to reunite it.

Then STOP. Do not ask to resume, do not propose next actions, do not start
work. (This is the full SHOW mode. LOAD mode, below, is exactly this render
plus one more step.)

## LOAD mode (SHOW's render, plus one more step)

Do everything SHOW does above — same tool call, same three-way `status`
handling, same five-heading render, same no-handoff hint. LOAD never skips
the render; there is no "load without showing."

The one addition: after rendering, ask the user whether to proceed with the
top item from `whats_next` or pick something else. Do not start work without
confirmation. (SHOW stops after rendering; LOAD asks this one extra
question — that is the entire difference between the two modes.)
