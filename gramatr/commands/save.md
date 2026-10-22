---
description: Shortcut for /gramatr:handoff save — fewer keystrokes, identical behavior.
argument-hint: (no arguments)
---

# /save

This command file ships under the `gramatr` plugin, so Claude Code namespaces
it as `/gramatr:save`. This is a **thin, labeled alias** — fewer keystrokes
for `/gramatr:handoff save`, nothing more. SRP/DRY: SAVE mode has exactly one
description, in `handoff.md`.

Read `packages/mcp/commands/handoff.md`'s **SAVE mode** section and execute
it exactly as written, including the `project_id` and `client_session_id`
resolution steps and the pin-vs-resolved mismatch guard that precede it in
that file. Do not improvise a different sequence here.
