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
  extractSessionId: () => extractSessionId,
  getModelLimit: () => getModelLimit,
  getSessionModel: () => getSessionModel,
  readSessionCtxTokens: () => readSessionCtxTokens
});
module.exports = __toCommonJS(compact_advisor_exports);
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");
var import_node_os2 = require("node:os");

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
function readActiveSessionForKey(projectDir, clientSessionId) {
  if (!clientSessionId)
    return null;
  const path = activeSessionKeyPath(projectDir, clientSessionId);
  if (!path)
    return null;
  return readJson(path);
}

// dist/hooks/lib/context-usage.js
var import_node_path2 = require("node:path");
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
function ctxTokensFileName(sessionId) {
  if (typeof sessionId !== "string")
    return null;
  const safe = sessionId.replace(/[^A-Za-z0-9._-]/g, "");
  if (!safe || safe === "." || safe === "..")
    return null;
  return `ctx-tokens-${safe}.json`;
}
function ctxTokensPath(projectDir, sessionId) {
  const name = ctxTokensFileName(sessionId);
  if (!name)
    return null;
  return (0, import_node_path2.join)(projectDir, ".gramatr", name);
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

// dist/bin/compact-advisor.js
var PROJECT_DIR = findProjectRoot();
var HOME = (0, import_node_os2.homedir)();
function getSessionModel() {
  const fromSidecar = readActiveSessionForKey(PROJECT_DIR, getProcessPin()?.value)?.model;
  if (typeof fromSidecar === "string" && fromSidecar)
    return fromSidecar;
  const state = readProjectState(PROJECT_DIR);
  const fromState = state?.active_session?.model;
  if (typeof fromState === "string" && fromState)
    return fromState;
  try {
    const data = JSON.parse((0, import_node_fs3.readFileSync)((0, import_node_path3.join)(PROJECT_DIR, ".gramatr", "session.json"), "utf8"));
    return typeof data.model === "string" ? data.model : "";
  } catch {
    return "";
  }
}
function readConfig() {
  try {
    return JSON.parse((0, import_node_fs3.readFileSync)((0, import_node_path3.join)(HOME, ".gramatr.json"), "utf8"));
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
      return `[gr\u0101matr: context ${pct}% full (${usedK}K/${limitK}K)]
Your context window is getting tight \u2014 quality can start to drop from here. Good time to tell the user it's time to /clear. Nothing will be lost: every turn is already sealed continuously, not something /clear needs to trigger. The thread picks back up automatically afterward; mention /restore if they'd like an explicit walkthrough of what came back.`;
    }
    return `[gr\u0101matr: context ${pct}% full (${usedK}K/${limitK}K)]
Tell the user their context window is ${pct}% full and it's a good time to /clear. Nothing will be lost \u2014 every turn is already sealed continuously. The thread picks back up automatically afterward; mention /restore if they'd like an explicit walkthrough of what came back.`;
  }
  if (pct >= warnPct) {
    return `[gr\u0101matr: context ~${pct}% full (${usedK}K/${limitK}K)]
Context is filling up. No action needed yet \u2014 when it's time to /clear, nothing will be lost; work is sealed continuously as you go.`;
  }
  return "";
}
function extractSessionId(raw) {
  const trimmed = raw.trim();
  if (!trimmed)
    return null;
  try {
    const data = JSON.parse(trimmed);
    return typeof data.session_id === "string" && data.session_id ? data.session_id : null;
  } catch {
    return null;
  }
}
function readSessionCtxTokens(projectDir, sessionId) {
  let stateKey = sessionId;
  try {
    stateKey = getProcessPin()?.value ?? sessionId;
  } catch {
    stateKey = sessionId;
  }
  const ctxPath = ctxTokensPath(projectDir, stateKey);
  if (!ctxPath || !(0, import_node_fs3.existsSync)(ctxPath))
    return null;
  try {
    const data = JSON.parse((0, import_node_fs3.readFileSync)(ctxPath, "utf8"));
    return data.ctx_tokens_used ?? 0;
  } catch {
    return null;
  }
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
  let sessionId = null;
  try {
    sessionId = extractSessionId(Buffer.concat(chunks).toString("utf8"));
  } catch {
  }
  const cfg = readConfig();
  const warnPct = cfg.context_window?.warn_pct ?? 85;
  const compactPct = cfg.context_window?.compact_pct ?? 95;
  const auto = cfg.auto_compact?.auto ?? false;
  const model = getSessionModel();
  const modelKnown = model !== "";
  const limit = getModelLimit(model);
  const sessionKnown = sessionId !== null;
  let advisory = "";
  if (sessionKnown) {
    const ctxTokensUsed = readSessionCtxTokens(PROJECT_DIR, sessionId);
    if (ctxTokensUsed !== null) {
      advisory = computeCompactAdvisory(ctxTokensUsed, limit, warnPct, compactPct, auto, modelKnown);
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
  extractSessionId,
  getModelLimit,
  getSessionModel,
  readSessionCtxTokens
});
