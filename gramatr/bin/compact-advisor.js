#!/usr/bin/env node
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// dist/bin/compact-advisor.js
var compact_advisor_exports = {};
__export(compact_advisor_exports, {
  computeCompactAdvisory: () => computeCompactAdvisory,
  getModelLimit: () => getModelLimit,
  getSessionModel: () => getSessionModel
});
module.exports = __toCommonJS(compact_advisor_exports);
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var import_node_os = require("node:os");

// dist/hooks/lib/project-state.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var GRAMATR_DIR = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs.existsSync)((0, import_node_path.join)(dir, GRAMATR_DIR)))
      return dir;
    const parent = (0, import_node_path.dirname)(dir);
    if (parent === dir)
      return startDir;
    dir = parent;
  }
}
var CORE_FILE = "project.json";
var RUNTIME_FILE = "runtime.json";
function getStatePaths(projectDir) {
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  return {
    core: (0, import_node_path.join)(dir, CORE_FILE),
    runtime: (0, import_node_path.join)(dir, RUNTIME_FILE)
  };
}
var SCHEMA_VERSION = 1;
function readJson(filePath) {
  try {
    if (!(0, import_node_fs.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_node_fs.readFileSync)(filePath, "utf8"));
  } catch {
    return null;
  }
}
function migrateCore(core) {
  if (!core.schema_version || core.schema_version < SCHEMA_VERSION) {
    return { ...core, schema_version: SCHEMA_VERSION };
  }
  return core;
}
function isNewShapeCore(raw) {
  return raw !== null && typeof raw.schema_version === "number" && raw.project !== void 0 && typeof raw.project.project_id === "string";
}
function legacyCoreIdentity(projectDir) {
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  const legacyProject = readJson((0, import_node_path.join)(dir, "project.json"));
  const legacySettings = readJson((0, import_node_path.join)(dir, "settings.json"));
  const legacyGit = readJson((0, import_node_path.join)(dir, "git-context.json"));
  const project_id = legacyProject?.project_id ?? legacySettings?.project_id ?? "";
  if (!project_id)
    return null;
  const project = {
    project_id,
    slug: legacyProject?.slug ?? legacySettings?.project_name ?? ""
  };
  if (legacySettings?.project_entity_id) {
    project.project_entity_id = legacySettings.project_entity_id;
  }
  if (legacySettings?.project_name) {
    project.display_name = legacySettings.project_name;
  }
  if (legacySettings?.previously_known_as && legacySettings.previously_known_as.length > 0) {
    project.previously_known_as = legacySettings.previously_known_as;
  }
  const git_remote = legacyProject?.git_remote ?? legacyGit?.git_remote ?? legacyGit?.remote_url ?? void 0;
  const drift = git_remote ? { git_remote } : {};
  return { project, drift };
}
function legacyActiveSession(projectDir) {
  const legacySession = readJson((0, import_node_path.join)(projectDir, GRAMATR_DIR, "session.json"));
  if (!legacySession?.session_id)
    return void 0;
  const active = { session_id: legacySession.session_id };
  if (legacySession.client_session_id)
    active.client_session_id = legacySession.client_session_id;
  if (legacySession.interaction_id)
    active.interaction_id = legacySession.interaction_id;
  if (legacySession.client_type)
    active.client_type = legacySession.client_type;
  if (legacySession.written_at)
    active.written_at = legacySession.written_at;
  return active;
}
function synthesizeFromLegacy(projectDir) {
  const identity = legacyCoreIdentity(projectDir);
  if (!identity)
    return null;
  const state = {
    schema_version: SCHEMA_VERSION,
    project: identity.project,
    drift: identity.drift,
    recent_sessions: []
  };
  const active = legacyActiveSession(projectDir);
  if (active)
    state.active_session = active;
  return state;
}
function readProjectState(projectDir) {
  const paths = getStatePaths(projectDir);
  const rawCore = readJson(paths.core);
  const runtime = readJson(paths.runtime) ?? {};
  if (isNewShapeCore(rawCore)) {
    const core = migrateCore(rawCore);
    return {
      schema_version: core.schema_version,
      project: core.project,
      drift: core.drift ?? {},
      active_session: runtime.active_session,
      recent_sessions: runtime.recent_sessions ?? [],
      last_handoff: runtime.last_handoff,
      statusline_cache: runtime.statusline_cache
    };
  }
  const legacy = synthesizeFromLegacy(projectDir);
  if (!legacy)
    return null;
  return {
    ...legacy,
    active_session: runtime.active_session ?? legacy.active_session,
    recent_sessions: runtime.recent_sessions ?? legacy.recent_sessions,
    last_handoff: runtime.last_handoff ?? legacy.last_handoff,
    statusline_cache: runtime.statusline_cache ?? legacy.statusline_cache
  };
}

// dist/hooks/lib/context-usage.js
var MODEL_CONTEXT_LIMITS = [
  // Haiku is 200k on every generation — checked first so a hypothetical
  // future "haiku-5" can't fall through to a 1M entry below.
  { match: "haiku", limit: 2e5 },
  // Older-generation 200k carve-outs.
  { match: "sonnet-4-5", limit: 2e5 },
  { match: "sonnet-4.5", limit: 2e5 },
  { match: "opus-4-5", limit: 2e5 },
  { match: "opus-4.5", limit: 2e5 },
  { match: "sonnet-4-0", limit: 2e5 },
  { match: "sonnet-4.0", limit: 2e5 },
  { match: "opus-4-0", limit: 2e5 },
  { match: "opus-4.0", limit: 2e5 },
  // Current Claude 5 family + the 4.6/4.7/4.8-class Opus and Sonnet 4.6 —
  // all 1M standard. Named explicitly (not left to the generic fallback
  // below) so this table reads as a real matrix, not an accident of order.
  { match: "fable", limit: 1e6 },
  { match: "mythos", limit: 1e6 },
  { match: "opus-5", limit: 1e6 },
  { match: "opus-4-8", limit: 1e6 },
  { match: "opus-4.8", limit: 1e6 },
  { match: "opus-4-7", limit: 1e6 },
  { match: "opus-4.7", limit: 1e6 },
  { match: "opus-4-6", limit: 1e6 },
  { match: "opus-4.6", limit: 1e6 },
  { match: "sonnet-5", limit: 1e6 },
  { match: "sonnet-4-6", limit: 1e6 },
  { match: "sonnet-4.6", limit: 1e6 },
  // Catch-all: any other opus/sonnet string (e.g. a future dated snapshot
  // not yet named above) defaults to the current 1M standard, since
  // current-gen is now the common case.
  { match: "opus", limit: 1e6 },
  { match: "sonnet", limit: 1e6 }
];
var DEFAULT_CONTEXT_LIMIT = 2e5;
function getModelLimit(model) {
  const m = model.toLowerCase();
  if (!m)
    return DEFAULT_CONTEXT_LIMIT;
  for (const entry of MODEL_CONTEXT_LIMITS) {
    if (m.includes(entry.match))
      return entry.limit;
  }
  return DEFAULT_CONTEXT_LIMIT;
}

// dist/bin/compact-advisor.js
var PROJECT_DIR = findProjectRoot();
var HOME = (0, import_node_os.homedir)();
function getSessionModel() {
  const state = readProjectState(PROJECT_DIR);
  const fromState = state?.active_session?.model;
  if (typeof fromState === "string" && fromState)
    return fromState;
  try {
    const data = JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "session.json"), "utf8"));
    return typeof data.model === "string" ? data.model : "";
  } catch {
    return "";
  }
}
function readConfig() {
  try {
    return JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(HOME, ".gramatr.json"), "utf8"));
  } catch {
    return {};
  }
}
function computeCompactAdvisory(ctxTokensUsed, limit, warnPct, compactPct, auto, modelKnown = true) {
  if (!modelKnown)
    return "";
  if (ctxTokensUsed <= 0)
    return "";
  const pct = Math.round(ctxTokensUsed / limit * 100);
  const usedK = Math.round(ctxTokensUsed / 1e3);
  const limitK = Math.round(limit / 1e3);
  if (pct >= compactPct) {
    if (auto) {
      return `[gr\u0101matr: context ${pct}% full (${usedK}K/${limitK}K) \u2014 CRITICAL]
MANDATORY, ACT NOW: Your context window is critically full. Run /gramatr:continue right now \u2014 it atomically saves a full handoff, clears, and rehydrates in one step, so nothing is lost. If a slash command isn't available in this context, call save_handoff yourself FIRST and confirm it returned success \u2014 ONLY THEN tell the user "Handoff saved \u2014 it is safe to run /clear now." Never tell the user it is safe to clear before the save has actually succeeded.`;
    }
    return `[gr\u0101matr: context ${pct}% full (${usedK}K/${limitK}K) \u2014 CRITICAL]
MANDATORY, ACT NOW: Tell the user their context window is ${pct}% full and recommend they run /gramatr:continue now \u2014 it atomically saves a full handoff, clears, and rehydrates in one step. If they'd rather do it manually: call save_handoff yourself FIRST and confirm it returned success \u2014 ONLY THEN tell the user "Handoff saved \u2014 it is safe to run /clear now." Never tell the user it is safe to clear before the save has actually succeeded.`;
  }
  if (pct >= warnPct) {
    return `[gr\u0101matr: context ~${pct}% full (${usedK}K/${limitK}K)]
Context is filling up. Recommend the user run /gramatr:continue soon (atomic save + clear + rehydrate), or plan to call save_handoff yourself and confirm it succeeds before things get critical.`;
  }
  return "";
}
async function main() {
  const chunks = [];
  await new Promise((resolve) => {
    const t = setTimeout(resolve, 500);
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => {
      clearTimeout(t);
      resolve();
    });
    process.stdin.on("error", () => {
      clearTimeout(t);
      resolve();
    });
    process.stdin.resume();
  });
  const cfg = readConfig();
  const warnPct = cfg.context_window?.warn_pct ?? 85;
  const compactPct = cfg.context_window?.compact_pct ?? 95;
  const auto = cfg.auto_compact?.auto ?? false;
  const model = getSessionModel();
  const modelKnown = model !== "";
  const limit = getModelLimit(model);
  const ctxFile = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "ctx-tokens.json");
  let advisory = "";
  if ((0, import_node_fs2.existsSync)(ctxFile)) {
    let ctxTokensUsed = 0;
    try {
      const data = JSON.parse((0, import_node_fs2.readFileSync)(ctxFile, "utf8"));
      ctxTokensUsed = data.ctx_tokens_used ?? 0;
    } catch {
    }
    advisory = computeCompactAdvisory(ctxTokensUsed, limit, warnPct, compactPct, auto, modelKnown);
  }
  const reflectionFile = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "reflection-due.json");
  if ((0, import_node_fs2.existsSync)(reflectionFile)) {
    let stale = false;
    try {
      const flag = JSON.parse((0, import_node_fs2.readFileSync)(reflectionFile, "utf8"));
      const age = flag.written_at ? Date.now() - new Date(flag.written_at).getTime() : Infinity;
      stale = age > 5 * 60 * 1e3;
    } catch {
      stale = true;
    }
    if (!stale) {
      try {
        (0, import_node_fs2.unlinkSync)(reflectionFile);
      } catch {
      }
      const reflectionAdvisory = `[gr\u0101matr: MANDATORY END-OF-TURN \u2014 Before completing your response, call mcp__plugin_gramatr_gramatr__classification_feedback and mcp__plugin_gramatr_gramatr__save_reflection. These feed the classifier flywheel. The directives.required_actions in this packet specify the exact arguments needed.]`;
      if (advisory) {
        advisory = advisory + "\n" + reflectionAdvisory;
      } else {
        advisory = reflectionAdvisory;
      }
    } else {
      try {
        (0, import_node_fs2.unlinkSync)(reflectionFile);
      } catch {
      }
    }
  }
  if (!advisory) {
    process.stdout.write("{}");
    return;
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: advisory
    }
  }));
}
if (process.env.GRAMATR_COMPACT_ADVISOR_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeCompactAdvisory,
  getModelLimit,
  getSessionModel
});
