#!/usr/bin/env node
"use strict";

// dist/bin/project-init.js
var import_node_child_process2 = require("node:child_process");
var import_node_fs3 = require("node:fs");
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
var GRAMATR_SESSIONS_SUBDIR = "sessions";
function activeSessionKeyFileName(clientSessionId, ext = "json") {
  const safe = clientSessionId.replace(/[^A-Za-z0-9._-]/g, "");
  if (!safe || safe === "." || safe === "..")
    return null;
  return `${safe}.${ext}`;
}
function activeSessionKeyPath(projectDir, clientSessionId) {
  const name = activeSessionKeyFileName(clientSessionId);
  if (!name)
    return null;
  return (0, import_node_path.join)(projectDir, GRAMATR_DIR, GRAMATR_SESSIONS_SUBDIR, name);
}
function writeActiveSessionForKey(projectDir, clientSessionId, session) {
  if (!clientSessionId)
    return false;
  const dest = activeSessionKeyPath(projectDir, clientSessionId);
  if (!dest)
    return false;
  try {
    atomicWriteJson(dest, (0, import_node_path.join)(projectDir, GRAMATR_DIR, GRAMATR_SESSIONS_SUBDIR), session);
    return true;
  } catch {
    return false;
  }
}
function readActiveSessionForKey(projectDir, clientSessionId) {
  if (!clientSessionId)
    return null;
  const path = activeSessionKeyPath(projectDir, clientSessionId);
  if (!path)
    return null;
  return readJson(path);
}
function mergeActiveSessionFields(prev, patch) {
  const defined = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== void 0)
      defined[k] = v;
  }
  return {
    session_id: prev?.session_id ?? "",
    ...prev,
    ...defined
  };
}
function mergeActiveSession(projectDir, patch) {
  const prev = readRuntime(projectDir).active_session;
  const next = mergeActiveSessionFields(prev, patch);
  patchRuntime(projectDir, { active_session: next });
}
function mergeActiveSessionForKey(projectDir, clientSessionId, patch) {
  const prev = readActiveSessionForKey(projectDir, clientSessionId);
  const next = mergeActiveSessionFields(prev, patch);
  return writeActiveSessionForKey(projectDir, clientSessionId, next);
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

// dist/hooks/lib/process-pin.js
var import_node_crypto = require("node:crypto");
var import_node_child_process = require("node:child_process");
var import_node_fs2 = require("node:fs");
var import_node_os = require("node:os");
var CLIENT_SESSION_ID_PREFIX = "pin2-";
var CLIENT_SESSION_ID_AGENT_PREFIX = "pin3-";
var SHELL_NAME_RE = /^(sh|bash|zsh|dash|fish|ksh|csh|tcsh|cmd(\.exe)?|powershell(\.exe)?|pwsh(\.exe)?)$/i;
function defaultReadProcStat(pid) {
  return (0, import_node_fs2.readFileSync)(`/proc/${pid}/stat`, "utf8");
}
function defaultReadProcComm(pid) {
  return (0, import_node_fs2.readFileSync)(`/proc/${pid}/comm`, "utf8");
}
function defaultHasProc() {
  return (0, import_node_fs2.existsSync)("/proc/self/stat");
}
function defaultRunPs(args) {
  return (0, import_node_child_process.execFileSync)("ps", args, { encoding: "utf8", timeout: 2e3 });
}
function defaultReadMachineId() {
  return (0, import_node_fs2.readFileSync)("/etc/machine-id", "utf8");
}
function defaultGetUser() {
  try {
    const name = (0, import_node_os.userInfo)().username;
    if (name)
      return name;
  } catch {
  }
  return process.env.USER ?? process.env.USERNAME ?? "";
}
function parseProcStat(raw) {
  const lastParen = raw.lastIndexOf(")");
  if (lastParen === -1)
    return null;
  const rest = raw.slice(lastParen + 1).trim().split(/\s+/);
  const ppidStr = rest[1];
  const starttimeStr = rest[19];
  if (!ppidStr || !starttimeStr)
    return null;
  const ppid = Number.parseInt(ppidStr, 10);
  if (!Number.isFinite(ppid))
    return null;
  return { ppid, starttime: starttimeStr };
}
function walkLinuxAncestry(startPid, maxHops, readStat, readComm) {
  let pid = startPid;
  let statInfo = null;
  for (let hop = 0; hop <= maxHops; hop++) {
    let stat;
    try {
      stat = readStat(pid);
    } catch {
      return statInfo ? { pid, starttime: statInfo.starttime } : null;
    }
    const parsed = parseProcStat(stat);
    if (!parsed)
      return statInfo ? { pid, starttime: statInfo.starttime } : null;
    statInfo = parsed;
    let comm = "";
    try {
      comm = readComm(pid).trim();
    } catch {
      return { pid, starttime: parsed.starttime };
    }
    if (!SHELL_NAME_RE.test(comm) || hop === maxHops) {
      return { pid, starttime: parsed.starttime };
    }
    pid = parsed.ppid;
  }
  return statInfo ? { pid, starttime: statInfo.starttime } : null;
}
function walkPsAncestry(startPid, maxHops, runPs) {
  let pid = startPid;
  for (let hop = 0; hop <= maxHops; hop++) {
    let out;
    try {
      out = runPs(["-o", "ppid=,comm=,lstart=", "-p", String(pid)]);
    } catch {
      return null;
    }
    const line = out.trim();
    if (!line)
      return null;
    const match = line.match(/^(\d+)\s+(\S+)\s+(.+)$/);
    if (!match)
      return null;
    const [, ppidStr, comm, lstart] = match;
    const ppid = Number.parseInt(ppidStr, 10);
    if (!Number.isFinite(ppid))
      return null;
    if (!SHELL_NAME_RE.test(comm) || hop === maxHops) {
      return { pid, starttime: lstart.trim() };
    }
    pid = ppid;
  }
  return null;
}
function getProcessPin(options = {}) {
  try {
    const platform = options.platform ?? process.platform;
    const startPid = options.startPid ?? process.ppid;
    const maxHops = options.maxWalkHops ?? 3;
    if (!Number.isFinite(startPid) || startPid <= 0)
      return null;
    let ancestor = null;
    const hasProc = options.hasProc ?? defaultHasProc;
    if (platform === "linux" && hasProc()) {
      ancestor = walkLinuxAncestry(startPid, maxHops, options.readProcStat ?? defaultReadProcStat, options.readProcComm ?? defaultReadProcComm);
    } else if (platform === "darwin" || platform === "linux") {
      ancestor = walkPsAncestry(startPid, maxHops, options.runPs ?? defaultRunPs);
    }
    if (!ancestor)
      return null;
    let host = "";
    try {
      host = (options.readMachineId ?? defaultReadMachineId)().trim();
    } catch {
    }
    if (!host) {
      host = (options.getHostname ?? import_node_os.hostname)();
    }
    if (!host)
      return null;
    let user = "";
    try {
      user = (options.getUser ?? defaultGetUser)().trim();
    } catch {
      user = "";
    }
    const agentId = (options.agentId ?? "").trim();
    const raw = agentId ? `${host}|${user}|${ancestor.pid}|${ancestor.starttime}|${agentId}` : `${host}|${user}|${ancestor.pid}|${ancestor.starttime}`;
    const prefix = agentId ? CLIENT_SESSION_ID_AGENT_PREFIX : CLIENT_SESSION_ID_PREFIX;
    const value = `${prefix}${(0, import_node_crypto.createHash)("sha256").update(raw).digest("hex").slice(0, 32)}`;
    return {
      value,
      pid: ancestor.pid,
      startTime: ancestor.starttime,
      host,
      user,
      ...agentId ? { agentId } : {}
    };
  } catch {
    return null;
  }
}

// dist/bin/project-init.js
var PROJECT_DIR = findProjectRoot();
function readSessionStartModel() {
  if (process.stdin.isTTY)
    return "";
  let raw;
  try {
    raw = (0, import_node_fs3.readFileSync)(0, "utf8");
  } catch {
    return "";
  }
  if (!raw.trim())
    return "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.model === "string" ? parsed.model : "";
  } catch {
    return "";
  }
}
try {
  migrateProjectCore(PROJECT_DIR);
} catch {
}
try {
  const model = readSessionStartModel();
  if (model) {
    mergeActiveSession(PROJECT_DIR, { model });
    mergeActiveSessionForKey(PROJECT_DIR, getProcessPin()?.value, { model });
  }
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
var remote_url = (0, import_node_child_process2.spawnSync)("git", ["remote", "get-url", "origin"], { cwd: PROJECT_DIR, encoding: "utf8" }).stdout?.trim() ?? "";
var branch = (0, import_node_child_process2.spawnSync)("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: PROJECT_DIR, encoding: "utf8" }).stdout?.trim() ?? "";
var outDir = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr");
(0, import_node_fs3.mkdirSync)(outDir, { recursive: true });
var gitContextPayload = buildGitContextPayload({
  projectId: savedProject.project_id,
  slug: savedProject.slug,
  remoteUrl: remote_url || savedProject.git_remote || "",
  branch,
  cwd: PROJECT_DIR
});
(0, import_node_fs3.writeFileSync)((0, import_node_path2.join)(outDir, "git-context.json"), JSON.stringify(gitContextPayload, null, 2) + "\n", "utf8");
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
