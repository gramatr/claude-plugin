---
description: Disable the grāmatr statusline — removes the statusLine key from ~/.claude/settings.json without touching any other settings.
allowed-tools: Bash
---

# /gramatr:disable-statusline

Removes the grāmatr statusline from Claude Code. Performs a safe **read-modify-write**:
only the `statusLine` key is removed. No other settings are affected.

## Steps

**1. Check current settings**

!`node "${CLAUDE_PLUGIN_ROOT}/bin/statusline-toggle.js" check`

**2. Remove the key**

(#4855 — shared with `/gramatr:enable-statusline` and the `statusline` verb
in `/gramatr:gramatr`, one implementation instead of three copies.) Always
safe to run — it's a no-op if nothing is registered:

!`node "${CLAUDE_PLUGIN_ROOT}/bin/statusline-toggle.js" disable`

Report the result to the user.
