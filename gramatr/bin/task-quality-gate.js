#!/usr/bin/env node
"use strict";

// dist/hooks/generated/hook-timeouts.js
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;

// dist/hooks/generated/effort-phases.js
var FLOORS_BY_EFFORT = {
  instant: { "qg_criteria_floor": 0, "qg_anti_criteria_floor": 0, "thinking_capability_floor": 0, "verification_depth": "none", "learn_required": false },
  fast: { "qg_criteria_floor": 0, "qg_anti_criteria_floor": 0, "thinking_capability_floor": 0, "verification_depth": "none", "learn_required": false },
  standard: { "qg_criteria_floor": 4, "qg_anti_criteria_floor": 1, "thinking_capability_floor": 0, "verification_depth": "recall", "learn_required": false },
  extended: { "qg_criteria_floor": 6, "qg_anti_criteria_floor": 2, "thinking_capability_floor": 2, "verification_depth": "criteria", "learn_required": true },
  advanced: { "qg_criteria_floor": 6, "qg_anti_criteria_floor": 2, "thinking_capability_floor": 4, "verification_depth": "criteria_plus_anti", "learn_required": true },
  deep: { "qg_criteria_floor": 8, "qg_anti_criteria_floor": 3, "thinking_capability_floor": 6, "verification_depth": "cross_vendor_audit", "learn_required": true },
  comprehensive: { "qg_criteria_floor": 8, "qg_anti_criteria_floor": 3, "thinking_capability_floor": 8, "verification_depth": "interview_pass", "learn_required": true }
};

// dist/hooks/task-quality-gate.js
var VALID_FLOOR_MODES = /* @__PURE__ */ new Set(["off", "warn", "enforce"]);
function resolveTierFloorMode() {
  const raw = (process.env.GRAMATR_TIER_FLOORS_ENFORCE || "").trim().toLowerCase();
  if (VALID_FLOOR_MODES.has(raw))
    return raw;
  return "warn";
}
var MIN_CRITERIA = 4;
var MIN_WORDS = 8;
var MAX_WORDS = 12;
var DENY_MESSAGE = [
  "Quality Gate criteria required before creating a task.",
  "Format:",
  `  - Minimum ${MIN_CRITERIA} criteria, ${MIN_WORDS}-${MAX_WORDS} words each, describing the ideal end STATE (not actions)`,
  "  - At least 1 anti-criterion: what must NOT happen",
  "",
  "Example:",
  '  QG-C1: "Rate limiter enforces 100 requests per minute per user"',
  '  QG-A1: "No request is silently dropped without a logged error"',
  "",
  "Call TaskCreate again with QG-C#:/QG-A#: lines in the description, or",
  "pass metadata: { quality_gate_criteria: [...] }."
].join("\n");
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
var ANTI_ID_PATTERN = /^(QG-A|ISC-A)/i;
var ANTI_TEXT_PATTERNS = [
  /\bNOT\b/,
  /must not\b/i,
  /anti-criterion/i,
  /never\b/i
];
function isAntiCriterion(c) {
  if (c.is_anti === true)
    return true;
  if (typeof c.type === "string" && c.type.toLowerCase().includes("anti"))
    return true;
  if (typeof c.id === "string" && ANTI_ID_PATTERN.test(c.id))
    return true;
  const text = c.text || c.description || c.criterion || "";
  return ANTI_TEXT_PATTERNS.some((r) => r.test(text));
}
function criterionText(c) {
  return (c.text || c.description || c.criterion || "").trim();
}
function wordCount(text) {
  if (!text)
    return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function extractCriteria(toolInput) {
  if (!toolInput || typeof toolInput !== "object")
    return [];
  const keys = ["quality_gate_criteria", "criteria", "acceptance_criteria"];
  for (const key of keys) {
    const value = toolInput[key];
    if (Array.isArray(value) && value.length > 0) {
      return value.map((v) => {
        if (typeof v === "string")
          return { text: v };
        if (v && typeof v === "object")
          return v;
        return { text: String(v) };
      });
    }
  }
  return [];
}
var CRITERION_LINE_PREFIX = /^(QG-[CA]\d+|ISC-A\d+)\s*:\s*/i;
function parseCriteriaFromDescription(description) {
  if (!description)
    return [];
  const criteria = [];
  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[-*•]\s*/, "");
    const idMatch = line.match(CRITERION_LINE_PREFIX);
    if (!idMatch)
      continue;
    const id = idMatch[1].toUpperCase();
    const text = line.slice(idMatch[0].length).trim().replace(/^"(.*)"$/, "$1").trim();
    if (text)
      criteria.push({ id, text });
  }
  return criteria;
}
function extractTaskCriteria(input) {
  const fromMetadata = extractCriteria(input.task_metadata);
  if (fromMetadata.length > 0)
    return fromMetadata;
  return parseCriteriaFromDescription(input.task_description);
}
function validateQualityGate(toolInput) {
  const criteria = extractCriteria(toolInput);
  if (criteria.length < MIN_CRITERIA) {
    return { allow: false, reason: DENY_MESSAGE };
  }
  for (const c of criteria) {
    const words = wordCount(criterionText(c));
    if (words < MIN_WORDS || words > MAX_WORDS) {
      return { allow: false, reason: DENY_MESSAGE };
    }
  }
  if (!criteria.some(isAntiCriterion)) {
    return { allow: false, reason: DENY_MESSAGE };
  }
  return { allow: true };
}
function extractEffortLevel(toolInput) {
  if (!toolInput || typeof toolInput !== "object")
    return "standard";
  const candidates = ["effort_level", "effort", "tier"];
  for (const key of candidates) {
    const v = toolInput[key];
    if (typeof v === "string" && v.length > 0)
      return v;
  }
  return "standard";
}
function checkQGFloorsForTaskInput(toolInput) {
  const mode = resolveTierFloorMode();
  const effortLevel = extractEffortLevel(toolInput);
  const floor = FLOORS_BY_EFFORT[effortLevel] ?? null;
  if (mode === "off" || !floor)
    return { mode, floor, breaches: [], effortLevel };
  const criteriaArr = extractCriteria(toolInput);
  const total = criteriaArr.length;
  const antiCount = criteriaArr.filter(isAntiCriterion).length;
  const criteriaCount = total - antiCount;
  const breaches = [];
  if (criteriaCount < floor.qg_criteria_floor) {
    breaches.push({ breach_type: "qg_criteria", expected: floor.qg_criteria_floor, actual: criteriaCount });
  }
  if (antiCount < floor.qg_anti_criteria_floor) {
    breaches.push({ breach_type: "qg_anti_criteria", expected: floor.qg_anti_criteria_floor, actual: antiCount });
  }
  return { mode, floor, breaches, effortLevel };
}
function logTierFloorBreaches(result) {
  for (const b of result.breaches) {
    const payload = {
      operation: "tier_floor_breach",
      tier: result.effortLevel,
      breach_type: b.breach_type,
      expected: b.expected,
      actual: b.actual,
      mode: result.mode,
      severity: "soft",
      source: "task-quality-gate-hook",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      process.stderr.write(JSON.stringify(payload) + "\n");
    } catch {
    }
  }
}
function buildOutput(allow, reason) {
  if (allow) {
    return {
      continue: true,
      hookSpecificOutput: { hookEventName: "TaskCreated", permissionDecision: "allow" }
    };
  }
  return {
    continue: false,
    stopReason: reason || "Quality Gate validation failed.",
    hookSpecificOutput: {
      hookEventName: "TaskCreated",
      permissionDecision: "deny",
      permissionDecisionReason: reason || "Quality Gate validation failed."
    }
  };
}
async function runTaskQualityGateHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify(buildOutput(true)));
    return 0;
  }
  try {
    const input = JSON.parse(raw);
    if (input.hook_event_name && input.hook_event_name !== "TaskCreated") {
      process.stdout.write(JSON.stringify(buildOutput(true)));
      return 0;
    }
    const combinedInput = {
      ...input.task_metadata || {},
      quality_gate_criteria: extractTaskCriteria(input)
    };
    const decision = validateQualityGate(combinedInput);
    if (!decision.allow && decision.reason) {
      process.stderr.write(decision.reason + "\n");
    }
    try {
      const floorCheck = checkQGFloorsForTaskInput(combinedInput);
      if (floorCheck.breaches.length > 0) {
        logTierFloorBreaches(floorCheck);
      }
    } catch {
    }
    process.stdout.write(JSON.stringify(buildOutput(decision.allow, decision.reason)));
  } catch {
    process.stdout.write(JSON.stringify(buildOutput(true)));
  }
  return 0;
}

// dist/bin/task-quality-gate.js
if (process.env.GRAMATR_TASK_QUALITY_GATE_NO_AUTOSTART !== "1") {
  runTaskQualityGateHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
