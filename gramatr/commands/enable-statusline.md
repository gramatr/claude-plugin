---
description: Enable the grāmatr statusline in Claude Code — opt-in safe merge-write to ~/.claude/settings.json.
allowed-tools: Bash
---

# /gramatr:enable-statusline

Adds the grāmatr statusline to Claude Code. Performs a safe **read-modify-write**:
only the `statusLine` key is touched. No other settings are affected.

## Steps

**1. Check current settings**

!`node "${CLAUDE_PLUGIN_ROOT}/bin/statusline-toggle.js" check`

**2. Apply the merge-write**

Always run the write below. It is idempotent (#4855 — shared with
`/gramatr:disable-statusline` and the `statusline` verb in `/gramatr:gramatr`,
one implementation instead of three copies): it installs — or normalizes an
existing/broken block to — the single canonical form. Claude Code's `statusLine`
config runs `command` as ONE shell string and has NO `args` array (that split is
a hooks-only schema). A block shaped `{ command: 'node', args: [...] }` makes
Claude Code run bare `node`, which reads the render payload on stdin, fails, and
renders nothing — the exact "statusline disappeared after enable" bug.

!`node "${CLAUDE_PLUGIN_ROOT}/bin/statusline-toggle.js" enable`

Report the result to the user. If it was already present in the correct form,
tell them and offer to run `/gramatr:disable-statusline` to remove it.
