#!/usr/bin/env node
"use strict";

// dist/bin/project-init.js
var import_node_child_process = require("node:child_process");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

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
function atomicWriteJson(filePath, dir, payload) {
  if (!(0, import_node_fs.existsSync)(dir)) {
    (0, import_node_fs.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const tmp = `${filePath}.tmp.${process.pid}`;
  (0, import_node_fs.writeFileSync)(tmp, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs.renameSync)(tmp, filePath);
  try {
    (0, import_node_fs.chmodSync)(filePath, 384);
  } catch {
  }
}
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
function migrateLegacyCore(projectDir) {
  const identity = legacyCoreIdentity(projectDir);
  if (!identity)
    return null;
  return { schema_version: SCHEMA_VERSION, project: identity.project, drift: identity.drift };
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
function migrateProjectCore(projectDir) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  const rawCore = readJson(paths.core);
  const upgraded = isNewShapeCore(rawCore) ? migrateCore(rawCore) : migrateLegacyCore(projectDir);
  if (!upgraded)
    return "unidentified";
  const next = {
    schema_version: SCHEMA_VERSION,
    project: upgraded.project,
    drift: upgraded.drift ?? {}
  };
  if (rawCore && JSON.stringify(rawCore) === JSON.stringify(next)) {
    return "unchanged";
  }
  atomicWriteJson(paths.core, dir, next);
  return "migrated";
}
function readRuntime(projectDir) {
  return readJson(getStatePaths(projectDir).runtime) ?? {};
}
function patchRuntime(projectDir, patch) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  const prev = readRuntime(projectDir);
  const next = { ...prev, ...patch };
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return;
  }
  atomicWriteJson(paths.runtime, dir, next);
}
function writeGitContext(projectDir, ctx) {
  patchRuntime(projectDir, { git_context: ctx });
}
function buildGitContextPayload(input) {
  const payload = {
    remote_url: input.remoteUrl,
    branch: input.branch,
    cwd: input.cwd,
    updated_at: input.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.projectId)
    payload.project_id = input.projectId;
  if (input.slug)
    payload.slug = input.slug;
  return payload;
}

// dist/config-runtime.js
function isRuntimeGitContextEnabledFromEnv() {
  return process.env.GRAMATR_RUNTIME_GIT_CONTEXT_ENABLED === "true";
}

// dist/bin/project-init.js
var PROJECT_DIR = findProjectRoot();
try {
  migrateProjectCore(PROJECT_DIR);
} catch {
}
var savedProject = {};
try {
  const state = readProjectState(PROJECT_DIR);
  if (state) {
    savedProject = {
      project_id: state.project.project_id || void 0,
      slug: state.project.slug || void 0,
      git_remote: state.drift.git_remote
    };
  }
} catch {
}
var remote_url = (0, import_node_child_process.spawnSync)("git", ["remote", "get-url", "origin"], { cwd: PROJECT_DIR, encoding: "utf8" }).stdout?.trim() ?? "";
var branch = (0, import_node_child_process.spawnSync)("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: PROJECT_DIR, encoding: "utf8" }).stdout?.trim() ?? "";
var outDir = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr");
(0, import_node_fs2.mkdirSync)(outDir, { recursive: true });
var gitContextPayload = buildGitContextPayload({
  projectId: savedProject.project_id,
  slug: savedProject.slug,
  remoteUrl: remote_url || savedProject.git_remote || "",
  branch,
  cwd: PROJECT_DIR
});
(0, import_node_fs2.writeFileSync)((0, import_node_path2.join)(outDir, "git-context.json"), JSON.stringify(gitContextPayload, null, 2) + "\n", "utf8");
if (isRuntimeGitContextEnabledFromEnv()) {
  try {
    writeGitContext(PROJECT_DIR, {
      remote_url: gitContextPayload.remote_url,
      branch: gitContextPayload.branch,
      cwd: gitContextPayload.cwd,
      updated_at: gitContextPayload.updated_at
    });
  } catch {
  }
}
process.stderr.write(`gr\u0101matr: project context written (branch: ${branch}, project_id: ${savedProject.project_id ?? "unresolved"})
`);
