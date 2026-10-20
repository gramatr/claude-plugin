#!/usr/bin/env node
"use strict";

// dist/hooks/project-write-guard.js
var import_node_path2 = require("node:path");

// dist/hooks/generated/hook-timeouts.js
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;

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
    statusline_cache: runtime.statusline_cache ?? legacy.statusline_cache
  };
}

// dist/hooks/project-write-guard.js
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
function buildPreToolUseOutput(allow, reason) {
  if (allow) {
    return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } };
  }
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason || "Write/Edit blocked by the gramatr project-write guard."
    }
  };
}
function resolveProjectIdentity(startDir) {
  const root = findProjectRoot(startDir);
  const state = readProjectState(root);
  if (!state)
    return null;
  return state.project.project_id || state.project.slug || null;
}
function checkProjectWrite(filePath, cwd) {
  if (!filePath)
    return { allow: true };
  const ownIdentity = resolveProjectIdentity(cwd);
  if (!ownIdentity) {
    return { allow: true };
  }
  const absoluteTarget = (0, import_node_path2.resolve)(cwd, filePath);
  const targetIdentity = resolveProjectIdentity((0, import_node_path2.dirname)(absoluteTarget));
  if (!targetIdentity) {
    return { allow: true };
  }
  if (targetIdentity === ownIdentity) {
    return { allow: true };
  }
  return {
    allow: false,
    reason: `This session is rooted in project "${ownIdentity}", but ${absoluteTarget} belongs to a different project ("${targetIdentity}"). If this cross-project write is deliberate, confirm to proceed.`
  };
}
async function runProjectWriteGuardHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
    return 0;
  }
  try {
    const input = JSON.parse(raw);
    if (input.tool_name !== "Write" && input.tool_name !== "Edit") {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
      return 0;
    }
    const filePath = input.tool_input?.file_path || input.tool_input?.path || "";
    if (!filePath) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
      return 0;
    }
    const result = checkProjectWrite(filePath, process.cwd());
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(result.allow, result.reason)));
  } catch {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
  }
  return 0;
}

// dist/bin/project-write-guard.js
if (process.env.GRAMATR_PROJECT_WRITE_GUARD_NO_AUTOSTART !== "1") {
  runProjectWriteGuardHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
