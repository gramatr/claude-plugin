---
description: Show your grāmatr identity — user, display name, roles, org, active project, and session — read directly over REST.
allowed-tools: Bash
---

# /whoami

Run the grāmatr `whoami` verb. The bundled bin reads `.gramatr/.session` and
calls `GET /api/v1/users/me` (Bearer) directly — you only PRESENT its output.

!`node "${CLAUDE_PLUGIN_ROOT}/bin/verb-whoami.js" "$ARGUMENTS"`

Present the bin output above to the user verbatim or lightly formatted as a
table. Do not call any tool — the bin already did the work. If the bin printed
a degraded note (no session), relay it and suggest the user start a turn so
grāmatr can mint a session token.
