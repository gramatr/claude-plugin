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
var TOOL_INPUT_RULES = {
  create_entity: [
    { field: "name" },
    { field: "entity_type", validValues: ENTITY_TYPES },
    { field: "project_id" }
  ],
  update_entity: [
    { field: "entity_id" }
  ],
  add_observation: [
    { field: "entity_id" },
    { field: "content" }
  ],
  search_semantic: [
    { field: "query" }
  ],
  search_entities: [],
  // all fields optional
  create_relation: [
    { field: "source_entity_id" },
    { field: "target_entity_id" },
    { field: "relation_type" }
  ],
  mark_entity_inactive: [
    { field: "entity_id" }
  ],
  mark_observation_inactive: [
    { field: "observation_id" }
  ],
  reactivate_entity: [
    { field: "entity_id" }
  ],
  get_entities: [
    { field: "entity_ids" }
  ],
  list_entities: []
  // all fields optional
};

// dist/hooks/generated/hook-timeouts.js
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;

// dist/hooks/lib/classification-cache.js
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");

// dist/config-runtime.js
function getGramatrDirFromEnv() {
  const dir = process.env.GRAMATR_DIR;
  return dir && dir.length > 0 ? dir : null;
}
function getHomeDir() {
  const home = process.env.HOME;
  if (home && home.length > 0)
    return home;
  const userProfile = process.env.USERPROFILE;
  if (userProfile && userProfile.length > 0)
    return userProfile;
  return "";
}

// dist/hooks/lib/hook-state.js
var import_node_path = require("node:path");
function getGramatrStateDir() {
  const dir = getGramatrDirFromEnv() || (0, import_node_path.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path.join)(dir, ".state");
}

// dist/hooks/lib/project-state.js
function activeSessionKeyFileName(clientSessionId, ext = "json") {
  const safe = clientSessionId.replace(/[^A-Za-z0-9._-]/g, "");
  if (!safe || safe === "." || safe === "..")
    return null;
  return `${safe}.${ext}`;
}

// dist/hooks/lib/classification-cache.js
var CLASSIFICATION_SUBDIR = "classification";
function classificationCacheKeyPath(sessionId) {
  const name = activeSessionKeyFileName(sessionId);
  if (!name)
    return null;
  return (0, import_node_path2.join)(getGramatrStateDir(), CLASSIFICATION_SUBDIR, name);
}
function getLatestClassification(sessionId) {
  const path = classificationCacheKeyPath(sessionId);
  if (!path)
    return null;
  try {
    const raw = (0, import_node_fs.readFileSync)(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// dist/hooks/input-validator.js
var CONTRACT_BANNED_PATTERNS = [
  {
    label: "hardcoded effort-level enum (instant/fast/standard/\u2026)",
    regex: /['"`]instant['"`]\s*,\s*['"`]fast['"`]\s*,\s*['"`]standard['"`]/,
    fix: "Import EFFORT_LEVELS from '@gramatr/mcp/hooks/generated/schema-constants.js' instead of hardcoding."
  },
  {
    label: "hardcoded intent-type enum array (search/retrieve/create/update/\u2026)",
    // Only flag when these four appear together as an array literal — not inside
    // switch/case or if/else where partial matches are legitimate.
    regex: /\[\s*['"`]search['"`]\s*,\s*['"`]retrieve['"`]\s*,\s*['"`]create['"`]\s*,\s*['"`]update['"`]/,
    fix: "Import INTENT_TYPES from '@gramatr/mcp/hooks/generated/schema-constants.js' instead of hardcoding."
  },
  {
    label: "hardcoded memory-tier enum (hot/warm/cold) \u2014 concept removed from contracts",
    // Flag any array literal that includes these three tier strings together.
    regex: /['"`]hot['"`]\s*,\s*['"`]warm['"`]\s*,\s*['"`]cold['"`]/,
    fix: "The hot/warm/cold memory-tier concept has been removed. Use MEMORY_SCOPES from schema-constants.js."
  },
  {
    label: "inline Zod enum that should import from generated contracts",
    // z.enum([ followed immediately by a string literal — catches inline enum
    // definitions that bypass the generated constants.
    regex: /z\.enum\(\s*\[\s*['"`]/,
    fix: "Use z.enum(EFFORT_LEVELS) / z.enum(INTENT_TYPES) / z.enum(ENTITY_TYPES) \u2014 import arrays from '@gramatr/mcp/hooks/generated/schema-constants.js'."
  }
];
function isEnforcedPath(filePath) {
  const p = filePath.replace(/\\/g, "/");
  if (!p.endsWith(".ts"))
    return false;
  if (!/\/packages\/[^/]+\/src\//.test(p))
    return false;
  if (/\/generated\//.test(p))
    return false;
  if (/\.test\./.test(p))
    return false;
  return true;
}
function checkContractViolations(filePath, content) {
  if (!isEnforcedPath(filePath))
    return void 0;
  const violations = [];
  for (const pattern of CONTRACT_BANNED_PATTERNS) {
    if (pattern.regex.test(content)) {
      violations.push(`  \u2022 ${pattern.label}
    Fix: ${pattern.fix}`);
    }
  }
  if (violations.length === 0)
    return void 0;
  return `[gramatr contract enforcement] Banned hardcoded enum pattern(s) detected in ${filePath}:
` + violations.join("\n") + "\n\nAll classifier enums must be imported from generated/schema-constants.js, not inlined.";
}
function extractWriteTarget(toolName, input) {
  const shortTool = toolName.split("__").pop() ?? toolName;
  if (shortTool === "Write") {
    const filePath = typeof input.file_path === "string" ? input.file_path : void 0;
    const content = typeof input.content === "string" ? input.content : void 0;
    if (filePath && content !== void 0)
      return { filePath, content };
  }
  if (shortTool === "Edit") {
    const filePath = typeof input.file_path === "string" ? input.file_path : void 0;
    const newString = typeof input.new_string === "string" ? input.new_string : void 0;
    if (filePath && newString !== void 0)
      return { filePath, content: newString };
  }
  return void 0;
}
function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.resume();
  });
}
function extractToolShortName(fullName) {
  const parts = fullName.split("__");
  return parts.length >= 3 ? parts.slice(2).join("__") : fullName;
}
function validate(toolName, input) {
  const shortName = extractToolShortName(toolName);
  const rules = TOOL_INPUT_RULES[shortName];
  if (!rules || rules.length === 0)
    return { allow: true };
  for (const rule of rules) {
    const value = input[rule.field];
    if (value === void 0 || value === null || value === "") {
      return { allow: false, reason: `Missing required field "${rule.field}" for ${shortName}. Provide a non-empty value.` };
    }
    if (rule.validValues && typeof value === "string") {
      const validSet = rule.field === "entity_type" ? ENTITY_TYPE_SET : new Set(rule.validValues);
      if (!validSet.has(value)) {
        return { allow: false, reason: `Invalid ${rule.field}="${value}" for ${shortName}. Valid values: ${rule.validValues.join(", ")}` };
      }
    }
  }
  if ("entity_type" in input && typeof input.entity_type === "string" && !ENTITY_TYPE_SET.has(input.entity_type)) {
    return {
      allow: false,
      reason: `Invalid entity_type="${input.entity_type}". Call list_entity_types for the full list.`
    };
  }
  return { allow: true };
}
function validateContractCompliance(toolName, input) {
  const target = extractWriteTarget(toolName, input);
  if (!target)
    return { allow: true };
  const warning = checkContractViolations(target.filePath, target.content);
  if (!warning)
    return { allow: true };
  return { allow: true, reason: warning };
}
var NEW_TOOL_PHASE_HINTS = {
  get_reverse_engineering: /* @__PURE__ */ new Set(["think", "plan"]),
  get_quality_gates: /* @__PURE__ */ new Set(["plan", "verify", "build"]),
  add_quality_gate_criteria: /* @__PURE__ */ new Set(["plan", "verify"]),
  get_composed_agent: /* @__PURE__ */ new Set(["plan", "build"])
};
function logPhaseAdvisory(toolName, sessionId) {
  const short = extractToolShortName(toolName);
  const expectedPhases = NEW_TOOL_PHASE_HINTS[short];
  if (!expectedPhases)
    return;
  if (!sessionId)
    return;
  try {
    const latest = getLatestClassification(sessionId);
    const effort = (latest?.effort ?? "").toLowerCase();
    if (effort === "instant" || effort === "fast") {
      process.stderr.write(`[gramatr advisory] ${short} called at effort=${effort} \u2014 enrichment tools have no payload for trivial requests.
`);
      return;
    }
    if (!effort) {
      process.stderr.write(`[gramatr advisory] ${short} called with no active packet \u2014 phase context unknown. Expected phases: ${[...expectedPhases].join(", ")}.
`);
    }
  } catch {
  }
}
function buildPreToolUseOutput(allow, reason) {
  if (allow) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        // Include reason as an informational warning when present (allow + reason = warning)
        ...reason ? { permissionDecisionReason: reason } : {}
      }
    };
  }
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason || "Tool call blocked by gramatr input validation."
    }
  };
}
async function runInputValidatorHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
    return 0;
  }
  try {
    const input = JSON.parse(raw);
    if (!input.tool_name || !input.tool_input) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
      return 0;
    }
    try {
      logPhaseAdvisory(input.tool_name, input.session_id);
    } catch {
    }
    const result = validate(input.tool_name, input.tool_input);
    if (!result.allow) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(false, result.reason)));
      return 0;
    }
    const contractResult = validateContractCompliance(input.tool_name, input.tool_input);
    if (!contractResult.allow) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(false, contractResult.reason)));
      return 0;
    }
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(contractResult.allow, contractResult.reason)));
  } catch {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
  }
  return 0;
}

// dist/bin/input-validator.js
if (process.env.GRAMATR_INPUT_VALIDATOR_NO_AUTOSTART !== "1") {
  runInputValidatorHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
