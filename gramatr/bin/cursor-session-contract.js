#!/usr/bin/env node
"use strict";

// dist/setup/generated/instruction-blocks.js
var CONTRACT_RULES = "**Contract fields \u2014 act on these, don't just read them:**\n- `directives.hard_gates` \u2014 constraints that take precedence over other guidance\n- `directives.behavioral_rules` \u2014 algorithm phases, code rules, safety rules: follow literally\n- `directives.behavioral_directives` \u2014 per-turn instructions: execute before responding\n- `directives.required_actions` \u2014 complete every item before writing a response\n- `process.phase_template.phase_description` \u2014 instruction set for current phase: execute it literally\n- `process.quality_gate_config` \u2014 Quality Gate rules: every criterion must pass before done\n- `enrichment.data.reasoning.quality_gate_scaffold` \u2014 if present, call TaskCreate with its criteria and anti_criteria verbatim as the FIRST tool call. No other action precedes this.";
var MEMORY_RULES = "**Memory:** Use gramatr MCP tools (`search_semantic`, `create_entity`,\n`add_observation`), not local markdown files. Never write to MEMORY.md.";
var REQUIRED_FIELDS = "**Required fields:** task/milestone: status (open|in_progress|blocked|review|done).\nDecision: status + project_id. Session: status + project_id.";
var QUALITY_GATE_REQUIREMENT = "**Quality Gate requirement:**\nBefore any non-instant work, call TaskCreate with Quality Gate criteria\n(minimum 4, 8-12 words each, state not action) plus at least 1\nanti-criterion (QG-A) \u2014 the platform blocks TaskCreate outright if\ncriteria are missing, so this enforces itself. After work, TaskUpdate\neach criterion with PASS/FAIL and specific evidence; that honest\nadjudication depends on me, not a backstop.";
var FEEDBACK_RULES = "**Feedback loop (MANDATORY \u2014 trains the classifier flywheel):**\n1. Call `classification_feedback` after non-trivial work \u2014 evaluates\n   if effort, intent, and skills were classified correctly.\n2. Call `save_reflection` in LEARN phase \u2014 captures what worked, what\n   didn't, what a smarter AI would do differently.\nSkipping these breaks the training flywheel.";
var SUBAGENT_RULES = "**Sub-agent composition (MANDATORY for non-trivial sub-agents):**\nBefore launching any sub-agent, call `route_request` with the task\nprompt. Pass the returned packet VERBATIM to the agent \u2014 do not rewrite or\nparaphrase: `orchestration.agents.agent_defs[0]` \u2192 agent system prompt,\n`enrichment.data.reasoning.quality_gate_criteria` \u2192 acceptance criteria,\n`enrichment.data.reasoning.reverse_engineering` \u2192 task context,\n`directives.hard_gates` \u2192 constraints. If you disagree with the packet's\nframing, state the disagreement before overriding \u2014 never silently replace.\nUse `isolation: \"worktree\"` for code-modifying agents.\n\n**Sub-agent audit briefs must include:**\n1. Static check \u2014 is the config/code correct?\n2. Runtime check \u2014 does it actually execute successfully?\n3. State check \u2014 did expected side effects happen (DB writes, API calls)?\n4. Error check \u2014 capture stderr, don't trust silent success";
var EFFORT_PHASES = "**Effort-gated phases:**\n- instant: RESPOND only\n- fast: OBSERVE \u2192 RESPOND (Quality Gates still required for non-trivial fast work)\n- standard: OBSERVE \u2192 PLAN \u2192 BUILD \u2192 VERIFY\n- extended+: OBSERVE \u2192 THINK \u2192 PLAN \u2192 BUILD \u2192 EXECUTE \u2192 VERIFY \u2192 LEARN";
var CLASSIFICATION_SUMMARY = '**Checkpoint (MANDATORY after EVERY received packet, including instant):**\nOpen each response with a one-line gr\u0101matr checkpoint that shows the user\ngr\u0101matr did THINKING before you started \u2014 surface the pre-computed analysis\nthe packet carried, NOT generic counts.\nShape: `gr\u0101matr \u2713 understood: {plain reading} \xB7 {RE: X wants + Y gotchas mapped} \xB7 {Z quality gates} \xB7 {N memories} \xB7 {plain-words depth}`\nBuild ONLY from what the packet actually delivered; omit any element whose\nsource is absent.\n- understood: one short clause in YOUR own plain words of what gr\u0101matr took\n  the request to be \u2014 from classification plus your reading, not the raw\n  intent_type.\n- reverse-engineering substance (when reverse_engineering is present): the\n  wants + gotchas it mapped \u2014 count explicit_wants + implicit_wants and\n  gotchas (e.g. `RE: 5 wants + 2 gotchas mapped`). This is the headline\n  signal that gr\u0101matr reverse-engineered the request before you touched it.\n- quality gates (when quality_gate_criteria / the QG scaffold is present):\n  the criteria count (e.g. `6 quality gates`).\n- memories (when memory.context / memory.refs carried entities): the count\n  applied (e.g. `4 memories`); add matched rules/directives count if useful.\n- depth: map classification.effort_level to plain words, never the raw\n  level \u2014 instant\u2192"quick answer", fast\u2192"light pass", standard\u2192"standard\n  pass", extended/deep\u2192"thorough pass", comprehensive\u2192"exhaustive pass".\n- alerts (only when applicable): `\u26A0 degraded` (degraded/failed packet),\n  `needs: project choice` (a Rule A/B project_resolution halt).\n**Update cue \u2014 nothing else delivers it, so it\'s on me:** while\nmanifest.update_available is set, surface `\u26A0 update \u2192 v{latest}:\n{install_cmd}` in every response, including instant \u2014 the statusline and\nthe packet header don\'t count (the packet is agent input, not user\ndisplay), so an alert that only lands there never actually reached the\nuser. Repeat it every turn until the user updates.\nNO token-savings figure in this line \u2014 token/savings metrics live in the\nstatusline (Claude Code) and dashboard, not the per-turn checkpoint. Parrot\nonly what was genuinely computed.';

// dist/hooks/generated/schema-constants.js
var EFFORT_LEVELS = ["instant", "fast", "standard", "extended", "deep", "advanced", "comprehensive"];
var INTENT_TYPES = ["search", "retrieve", "create", "update", "analyze", "generate"];
var ENTITY_TYPES = ["profile", "voice", "craft", "work_style", "memory", "relationship", "preference", "team_identity", "org_identity", "task", "milestone", "prd", "decision", "quality_gate", "qg_criterion", "steering_rule", "directive", "skill", "agent_definition", "agent", "playbook", "workflow", "standard", "guideline", "principle", "runbook", "reference", "blog_idea", "strategy", "pattern", "tool", "example", "template", "atom_knowledge", "agent_diary", "session", "conversation", "turn", "classification_record", "classification_telemetry", "reasoning_usage", "agent_execution", "intelligence_packet", "learning_signal", "learning_reflection", "usage_pattern", "learning_correction", "attachment", "execution_record", "model_evaluation", "benchmark", "external_connection", "infrastructure", "audit_log", "brand", "presentation", "slide_template", "email_template", "social_campaign", "content_asset", "cluster_label", "taxonomy_proposal"];
var WORK_STATUSES = ["open", "in_progress", "blocked", "review", "done"];
var EFFORT_LEVEL_SET = new Set(EFFORT_LEVELS);
var INTENT_TYPE_SET = new Set(INTENT_TYPES);
var ENTITY_TYPE_SET = new Set(ENTITY_TYPES);
var WORK_STATUS_SET = new Set(WORK_STATUSES);

// dist/hooks/cursor-session-contract.js
var ENTITY_TYPES2 = `**Entity types (${ENTITY_TYPES.length}-type taxonomy):** \`create_entity\` requires \`entity_type\`
from: ${ENTITY_TYPES.join(", ")}.
Invalid types are blocked server-side.`;
var CURSOR_PER_TURN_ROUTING = `**Per-turn routing (still manual \u2014 Cursor's \`beforeSubmitPrompt\` hook can block a prompt but cannot inject context):**

Before responding to any non-trivial request, call \`route_request\` with the
user's prompt. Treat the response as a \`gmtr.intelligence.contract.v2\` packet:
- \`orchestration.agents.agent_defs[0]\` \u2014 pass VERBATIM as sub-agent system prompts;
  do not rewrite or paraphrase
- \`process.phase_template\` \u2014 effort-gated phase sequence to follow
- \`directives.hard_gates\` \u2014 constraints that take precedence over other guidance
- \`directives.behavioral_directives\` \u2014 per-turn behavioral instructions
- \`enrichment.data.reasoning.quality_gate_criteria\` \u2014 Quality Gate criteria

Skip for instant/greeting requests. Degrade cleanly if gramatr is unavailable.`;
var CURSOR_TIER1_CONTRACT = `# gr\u0101matr (Cursor)

This guidance is injected fresh every session via Cursor's \`sessionStart\`
hook \u2014 it is not a static file, so it cannot go stale between gr\u0101matr
releases.

${CONTRACT_RULES}

${MEMORY_RULES}

${ENTITY_TYPES2}

${REQUIRED_FIELDS}

${EFFORT_PHASES}

${QUALITY_GATE_REQUIREMENT}

${CLASSIFICATION_SUMMARY}

${FEEDBACK_RULES}

${SUBAGENT_RULES}

${CURSOR_PER_TURN_ROUTING}`;
function buildOutput() {
  return {
    additional_context: CURSOR_TIER1_CONTRACT,
    env: {}
  };
}
async function runCursorSessionContractHook(_args = []) {
  try {
    process.stdout.write(JSON.stringify(buildOutput()));
  } catch {
    try {
      process.stdout.write(JSON.stringify({}));
    } catch {
    }
  }
  return 0;
}

// dist/bin/cursor-session-contract.js
if (process.env.GRAMATR_CURSOR_CONTRACT_NO_AUTOSTART !== "1") {
  runCursorSessionContractHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
