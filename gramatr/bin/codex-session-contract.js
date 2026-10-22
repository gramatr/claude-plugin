#!/usr/bin/env node
"use strict";

// dist/hooks/generated/schema-constants.js
var EFFORT_LEVELS = ["instant", "fast", "standard", "extended", "deep", "advanced", "comprehensive"];
var INTENT_TYPES = ["search", "retrieve", "create", "update", "analyze", "generate"];
var ENTITY_TYPES = ["profile", "voice", "craft", "work_style", "memory", "relationship", "preference", "team_identity", "org_identity", "task", "milestone", "prd", "decision", "quality_gate", "qg_criterion", "steering_rule", "directive", "skill", "agent_definition", "agent", "playbook", "workflow", "standard", "guideline", "principle", "runbook", "reference", "blog_idea", "strategy", "pattern", "tool", "example", "template", "atom_knowledge", "agent_diary", "session", "conversation", "turn", "classification_record", "classification_telemetry", "reasoning_usage", "agent_execution", "intelligence_packet", "learning_signal", "learning_reflection", "usage_pattern", "learning_correction", "attachment", "execution_record", "model_evaluation", "benchmark", "external_connection", "infrastructure", "audit_log", "brand", "presentation", "slide_template", "email_template", "social_campaign", "content_asset", "cluster_label", "taxonomy_proposal"];
var WORK_STATUSES = ["open", "in_progress", "blocked", "review", "done"];
var EFFORT_LEVEL_SET = new Set(EFFORT_LEVELS);
var INTENT_TYPE_SET = new Set(INTENT_TYPES);
var ENTITY_TYPE_SET = new Set(ENTITY_TYPES);
var WORK_STATUS_SET = new Set(WORK_STATUSES);

// dist/setup/generated/instruction-blocks.js
var CONTRACT_RULES = "**Contract fields \u2014 act on these, don't just read them:**\n- `directives.hard_gates` \u2014 constraints that take precedence over other guidance\n- `directives.behavioral_rules` \u2014 algorithm phases, code rules, safety rules: follow literally\n- `directives.behavioral_directives` \u2014 per-turn instructions: execute before responding\n- `directives.required_actions` \u2014 complete every item before writing a response\n- `process.phase_template.phase_description` \u2014 instruction set for current phase: execute it literally\n- `process.quality_gate_config` \u2014 Quality Gate rules: every criterion must pass before done\n- `enrichment.data.reasoning.quality_gate_scaffold` \u2014 if present, call TaskCreate with its criteria and anti_criteria verbatim as the FIRST tool call. No other action precedes this.";
var MEMORY_RULES = "**Memory:** Use gramatr MCP tools (`search_semantic`, `create_entity`,\n`add_observation`), not local markdown files. Never write to MEMORY.md.";
var REQUIRED_FIELDS = "**Required fields:** task/milestone: status (open|in_progress|blocked|review|done).\nDecision: status + project_id. Session: status + project_id.";
var QUALITY_GATE_REQUIREMENT = "**Quality Gate requirement:**\nBefore any non-instant work, call TaskCreate with Quality Gate criteria\n(minimum 4, 8-12 words each, state not action) plus at least 1\nanti-criterion (QG-A) \u2014 the platform blocks TaskCreate outright if\ncriteria are missing, so this enforces itself. After work, TaskUpdate\neach criterion with PASS/FAIL and specific evidence; that honest\nadjudication depends on me, not a backstop.";
var FEEDBACK_RULES = "**Feedback loop (MANDATORY \u2014 trains the classifier flywheel):**\n1. Call `classification_feedback` after non-trivial work \u2014 evaluates\n   if effort, intent, and skills were classified correctly.\n2. Call `save_reflection` in LEARN phase \u2014 captures what worked, what\n   didn't, what a smarter AI would do differently.\nSkipping these breaks the training flywheel.";
var SUBAGENT_RULES = "**Sub-agent composition (MANDATORY for non-trivial sub-agents):**\nBefore launching any sub-agent, call `route_request` with the task\nprompt. Pass the returned packet VERBATIM to the agent \u2014 do not rewrite or\nparaphrase: `orchestration.agents.agent_defs[0]` \u2192 agent system prompt,\n`enrichment.data.reasoning.quality_gate_criteria` \u2192 acceptance criteria,\n`enrichment.data.reasoning.reverse_engineering` \u2192 task context,\n`directives.hard_gates` \u2192 constraints. If you disagree with the packet's\nframing, state the disagreement before overriding \u2014 never silently replace.\nUse `isolation: \"worktree\"` for code-modifying agents.\n\n**Sub-agent audit briefs must include:**\n1. Static check \u2014 is the config/code correct?\n2. Runtime check \u2014 does it actually execute successfully?\n3. State check \u2014 did expected side effects happen (DB writes, API calls)?\n4. Error check \u2014 capture stderr, don't trust silent success";
var EFFORT_PHASES = "**Effort-gated phases:**\n- instant: RESPOND only\n- fast: OBSERVE \u2192 RESPOND (Quality Gates still required for non-trivial fast work)\n- standard: OBSERVE \u2192 PLAN \u2192 BUILD \u2192 VERIFY\n- extended+: OBSERVE \u2192 THINK \u2192 PLAN \u2192 BUILD \u2192 EXECUTE \u2192 VERIFY \u2192 LEARN";
var DEGRADED_MODE = "**If the server is unavailable:** Degrade cleanly and keep working. Use the\n7-phase structure. Create Quality Gates before work. Never combine phases.";
var PROJECT_UNRESOLVED = "**Project unresolved:** When `project_resolution_needed: true` appears in\nthe v2 intelligence packet, the server refused to silently bind a project.\nThis is a HALT \u2014 do not start project-scoped work until the user chooses.\nThe packet carries a structured `project_resolution` object; discriminate\non `project_resolution.rule`:\n- `anchor_disagreement` (Rule A): a committed pin and the git remote\n  resolved to DIFFERENT projects. Present both `project_resolution.candidates`\n  (anchor `pin` vs `git_remote`); ASK which is correct; NEVER silently\n  prefer either anchor. Persist the answer (re-pin `.gramatr/project.json`\n  or correct the remote).\n- `no_anchor` (Rule B): nothing resolved. Present `project_resolution.options`\n  (`[create_new, use_scratch]`) with the pre-computed candidates (anchor\n  `scratch` + `recent`). Do NOT call `resolve_project` with `action: 'list'`\n  \u2014 the packet already carries the choices.\nFallback (older servers with no `project_resolution` object): call\n`resolve_project` with `action: 'list'`, present the list, let the user\npick, then `resolve_project` with `action: 'resolve'` and the chosen slug.\n- Include `project_id` in all subsequent gramatr tool calls.\n- Do NOT guess the project \u2014 always ask when the flag is set.";
var PROJECT_NEW = "**New project detected:** When `resolve_project` returns\n`is_new: true`, this is the first session in this project.\n- Call `session_start` with the returned project_id to\n  initialize a new session.\n- The session_start response will contain any available project context.\n- Include both project_id and session_id in subsequent tool calls.";
var PROJECT_RESUMED = "**Resuming project:** When `resolve_project` returns\n`is_new: false`, this is a known project.\n- Call `session_start` with the project_id.\n- Call `restore` to restore session context from the\n  previous session.\n- The handoff contains: last working state, open tasks, recent\n  decisions, and pending items.\n- Include both project_id and session_id in subsequent tool calls.";

// dist/setup/generated/platform-guidance.js
var CODEX_CLAUDE_MD = {
  blockStart: "<!-- GRAMATR-CODEX-START -->",
  blockEnd: "<!-- GRAMATR-CODEX-END -->",
  title: "gr\u0101matr codex guidance",
  intro: "Hooks inject a `gmtr.intelligence.contract.v2` packet on every prompt.\nFollow it as authoritative. Call `route_request` when missing.",
  instructionBlocks: ["CONTRACT_RULES", "MEMORY_RULES", "ENTITY_TYPES", "REQUIRED_FIELDS", "FEEDBACK_RULES", "SUBAGENT_RULES", "EFFORT_PHASES", "QUALITY_GATE_REQUIREMENT", "CLASSIFICATION_SUMMARY", "IDENTITY", "PROJECT_UNRESOLVED", "PROJECT_NEW", "PROJECT_RESUMED", "DEGRADED_MODE"]
};

// dist/setup/instructions.js
var CODEX_BLOCK_START = CODEX_CLAUDE_MD.blockStart;
var CODEX_BLOCK_END = CODEX_CLAUDE_MD.blockEnd;
var ENTITY_TYPES2 = `**Entity types (${ENTITY_TYPES.length}-type taxonomy):** \`create_entity\` requires \`entity_type\`
from: ${ENTITY_TYPES.join(", ")}.
Invalid types are blocked by the PreToolUse hook.`;
var CODEX_GUIDANCE = `${CODEX_BLOCK_START}
# ${CODEX_CLAUDE_MD.title}

${CODEX_CLAUDE_MD.intro}

${CONTRACT_RULES}

${MEMORY_RULES}

${ENTITY_TYPES2}

${REQUIRED_FIELDS}

${FEEDBACK_RULES}

${SUBAGENT_RULES}

${EFFORT_PHASES}

${PROJECT_UNRESOLVED}

${PROJECT_NEW}

${PROJECT_RESUMED}

${DEGRADED_MODE}
${CODEX_BLOCK_END}
`;
function buildOpenCodeInstructions() {
  return `# gramatr (OpenCode)

gramatr is installed. Call \`gramatr_route_request\` before responding to any user message.
Follow the returned \`gmtr.intelligence.contract.v2\` packet as authoritative.
Use gramatr MCP tools for memory (search_semantic, create_entity, add_observation) \u2014 not local files.

${CONTRACT_RULES}

${ENTITY_TYPES2}

${REQUIRED_FIELDS}

${QUALITY_GATE_REQUIREMENT}

${FEEDBACK_RULES}

${SUBAGENT_RULES}

${EFFORT_PHASES}

${PROJECT_UNRESOLVED}

${PROJECT_NEW}

${PROJECT_RESUMED}

${DEGRADED_MODE}`;
}
var OPENCODE_GUIDANCE = buildOpenCodeInstructions();

// dist/hooks/codex-session-contract.js
function stripBlockMarkers(guidance) {
  return guidance.replace(CODEX_BLOCK_START, "").replace(CODEX_BLOCK_END, "").trim();
}
var CODEX_TIER1_CONTRACT = stripBlockMarkers(CODEX_GUIDANCE);
function buildOutput() {
  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: CODEX_TIER1_CONTRACT
    }
  };
}
async function runCodexSessionContractHook(_args = []) {
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

// dist/bin/codex-session-contract.js
if (process.env.GRAMATR_CODEX_CONTRACT_NO_AUTOSTART !== "1") {
  runCodexSessionContractHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
