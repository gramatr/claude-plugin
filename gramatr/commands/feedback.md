---
description: Correct a misclassification in your own words — the model maps it onto the classifier heads, then ships the correction envelope-stamped.
argument-hint: <what was wrong, e.g. "that should have been extended, intent was analyze">
allowed-tools: Bash
---

# /feedback

Run the grāmatr `feedback` verb (hybrid: you author, the bin ships).

!`node "${CLAUDE_PLUGIN_ROOT}/bin/verb-feedback.js" "$ARGUMENTS"`

The bin output above is an ENVELOPE BRIEF: it confirms your `.session`
identity (so the correction/reflection is stamped to the right user, project,
and turn — never a caller-supplied identity, #2521) and tells you which
public tool to call. Author the structured content, then call `classification_feedback`
with it. The brief states whether a REST shipping path exists; today it does
not, so you ship via the public MCP tool — relay that honestly.
