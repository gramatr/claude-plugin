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

// dist/bin/statusline.js
var statusline_exports = {};
__export(statusline_exports, {
  runStatusline: () => runStatusline
});
module.exports = __toCommonJS(statusline_exports);
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

// dist/hooks/lib/project-state.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var CLIENT_PROJECT_DIR_ENV = {
  // gramatr-allow: c1
  "claude-code": "CLAUDE_PROJECT_DIR",
  // TODO(#3289): confirm Cursor's project-dir env var name when wiring the
  // Cursor client. Placeholder constant — not yet read by any live client.
  cursor: "CURSOR_PROJECT_DIR",
  // TODO(#3289): confirm Windsurf's project-dir env var name.
  windsurf: "WINDSURF_PROJECT_DIR",
  // TODO(#3289): confirm Codex's project-dir env var name.
  codex: "CODEX_PROJECT_DIR"
};
function resolveProjectDir(opts = {}) {
  if (opts.cwd && opts.cwd.length > 0)
    return opts.cwd;
  if (opts.clientType) {
    const envName = CLIENT_PROJECT_DIR_ENV[opts.clientType];
    if (envName) {
      const value = process.env[envName];
      if (value && value.length > 0)
        return value;
    }
  }
  return process.cwd();
}
var GRAMATR_DIR = ".gramatr";
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
function synthesizeFromLegacy(projectDir) {
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  const legacyProject = readJson((0, import_node_path.join)(dir, "project.json"));
  const legacySettings = readJson((0, import_node_path.join)(dir, "settings.json"));
  const legacyGit = readJson((0, import_node_path.join)(dir, "git-context.json"));
  const legacySession = readJson((0, import_node_path.join)(dir, "session.json"));
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
  const state = {
    schema_version: SCHEMA_VERSION,
    project,
    drift,
    recent_sessions: []
  };
  if (legacySession?.session_id) {
    const active = { session_id: legacySession.session_id };
    if (legacySession.client_session_id)
      active.client_session_id = legacySession.client_session_id;
    if (legacySession.interaction_id)
      active.interaction_id = legacySession.interaction_id;
    if (legacySession.client_type)
      active.client_type = legacySession.client_type;
    if (legacySession.written_at)
      active.written_at = legacySession.written_at;
    state.active_session = active;
  }
  return state;
}
function readProjectState(projectDir) {
  const paths = getStatePaths(projectDir);
  const rawCore = readJson(paths.core);
  const isNewShape = rawCore !== null && typeof rawCore.schema_version === "number" && rawCore.project !== void 0 && typeof rawCore.project.project_id === "string";
  if (!isNewShape) {
    return synthesizeFromLegacy(projectDir);
  }
  const core = migrateCore(rawCore);
  const runtime = readJson(paths.runtime) ?? {};
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

// dist/bin/statusline.js
var REMOTE_URL = process.env.GRAMATR_URL ?? "https://api.gramatr.com";
var PROJECT_DIR = resolveProjectDir({ clientType: "claude-code" });
function getSessionId() {
  const state = readProjectState(PROJECT_DIR);
  const fromState = state?.active_session?.session_id;
  if (typeof fromState === "string" && fromState)
    return fromState;
  const sessionFile = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "session.json");
  if (!(0, import_node_fs2.existsSync)(sessionFile))
    return null;
  try {
    const data = JSON.parse((0, import_node_fs2.readFileSync)(sessionFile, "utf8"));
    return typeof data.session_id === "string" && data.session_id ? data.session_id : null;
  } catch {
    return null;
  }
}
async function main() {
  const sessionId = getSessionId();
  if (!sessionId)
    return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2e3);
    const res = await fetch(`${REMOTE_URL}/api/v1/statusline/${encodeURIComponent(sessionId)}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok)
      return;
    const text = await res.text();
    if (text)
      process.stdout.write(text);
  } catch {
  }
}
main().catch(() => void 0);
async function runStatusline(_args = []) {
  await main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runStatusline
});
