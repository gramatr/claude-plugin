---
description: Write a Q1/Q2/Q3 reflection on demand — the model authors it, then ships it envelope-stamped (manual escape hatch for the LEARN phase).
argument-hint: [topic — defaults to this session]
allowed-tools: Bash
---

# /reflect

Run the grāmatr `reflect` verb (hybrid: you author, the bin ships).

!`node "${CLAUDE_PLUGIN_ROOT}/bin/verb-reflect.js" "$ARGUMENTS"`

The bin output above is an ENVELOPE BRIEF: it confirms your `.session`
identity (so the correction/reflection is stamped to the right user, project,
and turn — never a caller-supplied identity, #2521) and tells you which
public tool to call. Author the structured content, then call `save_reflection`
with it. The brief states whether a REST shipping path exists; today it does
not, so you ship via the public MCP tool — relay that honestly.
