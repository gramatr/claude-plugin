---
description: Save or load a grāmatr handoff. Auto-detects intent from session context; pass `save` or `load` to override.
---

# /handoff

You handle session continuity for the current project. Pick mode, resolve
`project_id`, then call the matching MCP tool.

## Mode selection

- If the user passed an argument, honor it verbatim: `save` → SAVE,
  `load` → LOAD. No auto-detect.
- Otherwise, auto-detect from this conversation:
  - **SAVE mode** if there has been substantial work this session —
    multiple turns of real activity, code changes, commits/PRs opened,
    decisions made, files modified.
  - **LOAD mode** if the conversation is fresh — first few turns, no
    significant prior work in this session (typical right after a
    session start or a `/clear`).
- If genuinely ambiguous, ask the user: "save or load?" — do not guess.

## Resolve `project_id` (both modes; UUID, never a slug)

Try in order, stop at the first that yields a UUID:

1. Read `.gramatr/project.json` in the repo root → `project_id`.
2. Read `.gramatr/git-context.json` (written by SessionStart) → `project_id`.
3. Read `gramatr_project_id` from the latest `gmtr.intelligence.contract.v2`
   packet for this turn.

If none yield a UUID, tell the user to run `/gramatr-setup-project` first
and stop. Do not pass a slug or placeholder.

## SAVE mode

Compose all 5 sections below from this conversation. Be specific — the
next session reads this verbatim.

- **`where_we_are`** — current branch, latest commit, server/test status,
  what just happened in this session.
- **`what_shipped`** — numbered list of commits, PRs, deploys, tags that
  landed this session. Include PR/issue numbers.
- **`whats_next`** — priority-ordered list of next actions with issue
  numbers. Top item is what the next session picks up first.
- **`key_context`** — non-obvious facts the next agent MUST know that
  are not in code or git history (decisions made in conversation,
  constraints, blocked dependencies).
- **`dont_forget`** — recurring rules, gotchas, or hazards the agent
  has been violating or is at risk of violating.

Call the MCP tool `save_handoff` with `project_id` + all 5 sections.
Include `platform: "claude-code"` and, if known, `branch` and
`session_id`. Confirm with one line naming the project and the top
`whats_next` item.

## LOAD mode

Call the MCP tool `load_handoff` with `project_id`.

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

If the tool returns no handoff (none yet saved for this project), say so
plainly: "No handoff found for this project — this looks like a fresh
start." Do not error, retry, or fabricate sections.

After rendering, ask the user whether to proceed with the top item from
`whats_next` or pick something else. Do not start work without
confirmation.
