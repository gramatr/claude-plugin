---
description: Semantic search across your grāmatr knowledge graph — ranked results printed inline, no agent round trip.
argument-hint: <query>
allowed-tools: Bash
---

# /recall

Run the grāmatr `recall` verb. The bundled bin reads `.gramatr/.session` and
calls `POST /api/v1/search` (Bearer) directly — you only PRESENT its output.

!`node "${CLAUDE_PLUGIN_ROOT}/bin/verb-recall.js" "$ARGUMENTS"`

Present the bin output above to the user verbatim or lightly formatted as a
table. Do not call any tool — the bin already did the work. If the bin printed
a degraded note (no session), relay it and suggest the user start a turn so
grāmatr can mint a session token.
