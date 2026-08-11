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
var import_node_fs3 = require("node:fs");
var import_node_path4 = require("node:path");

// dist/hooks/lib/project-state.js
var import_node_child_process = require("node:child_process");
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
function canonicalizeProjectRoot(dir) {
  const git = (args) => {
    try {
      return (0, import_node_child_process.execFileSync)("git", args, {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim();
    } catch {
      return null;
    }
  };
  const gitDir = git(["rev-parse", "--git-dir"]);
  const commonDir = git(["rev-parse", "--git-common-dir"]);
  if (!gitDir || !commonDir)
    return dir;
  const abs = (p) => p.startsWith("/") ? p : (0, import_node_path.join)(dir, p);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path.dirname)(absCommonDir);
  if ((0, import_node_fs.existsSync)((0, import_node_path.join)(mainRoot, GRAMATR_DIR)))
    return mainRoot;
  return dir;
}
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
  const winner = (() => {
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
    return findProjectRoot();
  })();
  return opts.canonicalizeWorktree ? canonicalizeProjectRoot(winner) : winner;
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
function mergeActiveSession(projectDir, patch) {
  const prev = readRuntime(projectDir).active_session;
  const defined = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== void 0)
      defined[k] = v;
  }
  const next = {
    session_id: prev?.session_id ?? "",
    ...prev,
    ...defined
  };
  patchRuntime(projectDir, { active_session: next });
}

// dist/hooks/lib/session-rest-token.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
var SESSION_FILE = ".session";
var SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
var SESSION_TOKEN_PROACTIVE_RENEW_FRACTION = 0.8;
var RENEW_TIMEOUT_MS = 3e3;
function getSessionTokenPath(projectDir) {
  return (0, import_node_path2.join)(projectDir, GRAMATR_DIR2, SESSION_FILE);
}
function normalizeRestTokenBlock(block) {
  if (!block || typeof block !== "object")
    return null;
  const { token, expires_at, base_url, aud, issued_at, written_at } = block;
  if (typeof token === "string" && token.length > 0 && typeof expires_at === "string" && expires_at.length > 0 && typeof base_url === "string" && base_url.length > 0 && typeof aud === "string" && aud.length > 0) {
    const file = { token, expires_at, base_url, aud };
    if (typeof issued_at === "string" && issued_at.length > 0)
      file.issued_at = issued_at;
    if (typeof written_at === "string" && written_at.length > 0)
      file.written_at = written_at;
    return file;
  }
  return null;
}
function writeSessionToken(projectDir, file) {
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR2);
  if (!(0, import_node_fs2.existsSync)(dir)) {
    (0, import_node_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getSessionTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs2.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs2.renameSync)(tmp, dest);
  try {
    (0, import_node_fs2.chmodSync)(dest, 384);
  } catch {
  }
}
function readSessionToken(projectDir) {
  const dest = getSessionTokenPath(projectDir);
  try {
    if (!(0, import_node_fs2.existsSync)(dest))
      return null;
    const parsed = JSON.parse((0, import_node_fs2.readFileSync)(dest, "utf8"));
    return normalizeRestTokenBlock(parsed);
  } catch {
    return null;
  }
}
function isSessionTokenValid(file, now = Date.now()) {
  if (!file)
    return false;
  const exp = Date.parse(file.expires_at);
  if (Number.isNaN(exp))
    return false;
  return exp - SESSION_TOKEN_EXPIRY_SKEW_MS > now;
}
function shouldProactivelyRenew(file, now = Date.now()) {
  if (!file)
    return false;
  const exp = Date.parse(file.expires_at);
  if (Number.isNaN(exp))
    return false;
  const startIso = file.issued_at ?? file.written_at;
  if (!startIso)
    return false;
  const start = Date.parse(startIso);
  if (Number.isNaN(start))
    return false;
  const lifetime = exp - start;
  if (lifetime <= 0)
    return false;
  const elapsed = now - start;
  return elapsed >= lifetime * SESSION_TOKEN_PROACTIVE_RENEW_FRACTION;
}
function deleteSessionToken(projectDir) {
  try {
    (0, import_node_fs2.rmSync)(getSessionTokenPath(projectDir), { force: true });
  } catch {
  }
}
function bearerHeader(file) {
  if (!file || !file.token)
    return {};
  return { Authorization: `Bearer ${file.token}` };
}
function apiV1Base(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/api/v1`;
}
async function renewSessionToken(projectDir, file, fetchImpl = fetch) {
  const url = `${apiV1Base(file.base_url)}/session/token/renew`;
  let res;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${file.token}`
      },
      signal: AbortSignal.timeout(RENEW_TIMEOUT_MS)
    });
  } catch {
    return { status: "error" };
  }
  if (res.status === 401) {
    deleteSessionToken(projectDir);
    return { status: "denied" };
  }
  if (!res.ok) {
    return { status: "error" };
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return { status: "error" };
  }
  const fresh = normalizeRestTokenBlock({
    token: body.token,
    expires_at: body.expires_at,
    // The renew response carries token + expires_at (+ issued_at on newer
    // servers); the audience and host are unchanged, so we preserve them from
    // the presenting file. issued_at, when present, RESETS the 80%-of-life clock;
    // when absent, writeSessionToken stamps a fresh written_at fallback.
    issued_at: body.issued_at,
    base_url: file.base_url,
    aud: file.aud
  });
  if (!fresh) {
    return { status: "error" };
  }
  writeSessionToken(projectDir, fresh);
  return { status: "renewed", file: fresh };
}
async function resolveUsableSessionToken(projectDir, fetchImpl = fetch, now = Date.now()) {
  const file = readSessionToken(projectDir);
  if (!file)
    return null;
  if (isSessionTokenValid(file, now)) {
    if (shouldProactivelyRenew(file, now)) {
      const outcome2 = await renewSessionToken(projectDir, file, fetchImpl);
      if (outcome2.status === "renewed")
        return outcome2.file;
      return file;
    }
    return file;
  }
  const outcome = await renewSessionToken(projectDir, file, fetchImpl);
  if (outcome.status === "renewed")
    return outcome.file;
  if (outcome.status === "denied")
    return null;
  return file;
}

// dist/hooks/lib/collect-git-state.js
var import_node_child_process2 = require("node:child_process");
var EMPTY_GIT_STATE = {
  branch: "",
  ahead: 0,
  behind: 0,
  modified: 0,
  untracked: 0,
  stash: 0,
  last_commit_age: ""
};
var GIT_TIMEOUT_MS = 500;
function runGit(args, cwd) {
  try {
    return (0, import_node_child_process2.execFileSync)("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: GIT_TIMEOUT_MS
    }).trim();
  } catch {
    return null;
  }
}
function parsePorcelainV2(output) {
  const out = { modified: 0, untracked: 0 };
  for (const line of output.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      const head = line.slice("# branch.head ".length).trim();
      if (head && head !== "(detached)")
        out.branch = head;
    } else if (line.startsWith("# branch.ab ")) {
      const m = /^\+(\d+)\s+-(\d+)/.exec(line.slice("# branch.ab ".length).trim());
      if (m) {
        out.ahead = Number(m[1]);
        out.behind = Number(m[2]);
      }
    } else if (line.startsWith("1 ") || line.startsWith("2 ") || line.startsWith("u ")) {
      out.modified = (out.modified ?? 0) + 1;
    } else if (line.startsWith("? ")) {
      out.untracked = (out.untracked ?? 0) + 1;
    }
  }
  return out;
}
function collectGitState(cwd) {
  const state = { ...EMPTY_GIT_STATE };
  const porcelain = runGit(["status", "--porcelain=v2", "--branch"], cwd);
  if (porcelain !== null) {
    Object.assign(state, parsePorcelainV2(porcelain));
  }
  const stash = runGit(["rev-list", "--walk-reflogs", "--count", "refs/stash"], cwd);
  if (stash !== null && /^\d+$/.test(stash))
    state.stash = Number(stash);
  const age = runGit(["log", "-1", "--format=%cr"], cwd);
  if (age !== null)
    state.last_commit_age = age;
  return state;
}

// dist/hooks/lib/context-usage.js
var import_node_path3 = require("node:path");
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
  return (0, import_node_path3.join)(projectDir, ".gramatr", name);
}
function formatContextUsageSegment(ctxFile, limit) {
  const used = ctxFile?.ctx_tokens_used;
  if (typeof used !== "number" || used <= 0)
    return "";
  if (!Number.isFinite(limit) || limit <= 0)
    return "";
  const pct = Math.round(used / limit * 100);
  const usedK = Math.round(used / 1e3);
  const limitK = Math.round(limit / 1e3);
  return `\u25D4 ${pct}% ctx (${usedK}K/${limitK}K)`;
}

// dist/bin/statusline.js
var REMOTE_URL = process.env.GRAMATR_URL ?? "https://api.gramatr.com";
var PROJECT_DIR = resolveProjectDir({ clientType: "claude-code" });
var FETCH_TIMEOUT_MS = 2e3;
var ownStdinModel = "";
var ownStdinSessionId = "";
async function readOwnStdinPayload() {
  const empty = { model: "", sessionId: "" };
  if (process.stdin.isTTY)
    return empty;
  let raw;
  try {
    raw = (0, import_node_fs3.readFileSync)(0, "utf8");
  } catch {
    return empty;
  }
  if (!raw)
    return empty;
  try {
    const data = JSON.parse(raw);
    let model = "";
    const modelField = data.model;
    if (typeof modelField === "string" && modelField) {
      model = modelField;
    } else if (modelField && typeof modelField === "object") {
      const m = modelField;
      if (typeof m.id === "string" && m.id)
        model = m.id;
      else if (typeof m.display_name === "string" && m.display_name)
        model = m.display_name;
    }
    const sessionId = typeof data.session_id === "string" && data.session_id ? data.session_id : "";
    return { model, sessionId };
  } catch {
    return empty;
  }
}
function getSessionId() {
  const state = readProjectState(PROJECT_DIR);
  const fromState = state?.active_session?.session_id;
  if (typeof fromState === "string" && fromState)
    return fromState;
  const sessionFile = (0, import_node_path4.join)(PROJECT_DIR, ".gramatr", "session.json");
  if (!(0, import_node_fs3.existsSync)(sessionFile))
    return null;
  try {
    const data = JSON.parse((0, import_node_fs3.readFileSync)(sessionFile, "utf8"));
    return typeof data.session_id === "string" && data.session_id ? data.session_id : null;
  } catch {
    return null;
  }
}
function getSessionModel() {
  if (ownStdinModel)
    return ownStdinModel;
  const state = readProjectState(PROJECT_DIR);
  const fromState = state?.active_session?.model;
  if (typeof fromState === "string" && fromState)
    return fromState;
  const sessionFile = (0, import_node_path4.join)(PROJECT_DIR, ".gramatr", "session.json");
  if (!(0, import_node_fs3.existsSync)(sessionFile))
    return "";
  try {
    const data = JSON.parse((0, import_node_fs3.readFileSync)(sessionFile, "utf8"));
    return typeof data.model === "string" ? data.model : "";
  } catch {
    return "";
  }
}
function readCtxTokensFile(sessionId) {
  const path = ctxTokensPath(PROJECT_DIR, sessionId);
  if (!path || !(0, import_node_fs3.existsSync)(path))
    return null;
  try {
    return JSON.parse((0, import_node_fs3.readFileSync)(path, "utf8"));
  } catch {
    return null;
  }
}
function contextUsageSegment() {
  if (!ownStdinSessionId)
    return "";
  const ctxFile = readCtxTokensFile(ownStdinSessionId);
  const limit = getModelLimit(getSessionModel());
  return formatContextUsageSegment(ctxFile, limit);
}
function composeWithContextUsage(serverText) {
  const segment = contextUsageSegment();
  if (!segment)
    return serverText;
  return `${serverText} \u2502 ${segment}`;
}
function cacheStatuslineText(text) {
  try {
    const gmtrDir = (0, import_node_path4.join)(PROJECT_DIR, ".gramatr");
    (0, import_node_fs3.mkdirSync)(gmtrDir, { recursive: true });
    (0, import_node_fs3.writeFileSync)((0, import_node_path4.join)(gmtrDir, "statusline.txt"), text, "utf8");
  } catch {
  }
}
async function fetchAndWrite(url, headers) {
  try {
    const res = await fetch(url, {
      headers,
      // AbortSignal.timeout (not a setTimeout-abort callback) — no dangling timer.
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!res.ok)
      return false;
    const text = await res.text();
    if (!text)
      return false;
    process.stdout.write(composeWithContextUsage(text));
    cacheStatuslineText(text);
    return true;
  } catch {
    return false;
  }
}
function gitStateQuery(state) {
  return new URLSearchParams({
    git_branch: state.branch,
    git_ahead: String(state.ahead),
    git_behind: String(state.behind),
    git_modified: String(state.modified),
    git_untracked: String(state.untracked),
    git_stash: String(state.stash),
    git_last_commit_age: state.last_commit_age
  }).toString();
}
async function tryAuthenticated(gitState) {
  let token;
  try {
    token = await resolveUsableSessionToken(PROJECT_DIR);
  } catch {
    return false;
  }
  if (!token)
    return false;
  const url = `${apiV1Base(token.base_url)}/statusline?${gitStateQuery(gitState)}`;
  return fetchAndWrite(url, bearerHeader(token));
}
async function tryLegacy(gitState) {
  const sessionId = getSessionId();
  if (!sessionId)
    return false;
  const url = `${REMOTE_URL}/api/v1/statusline/${encodeURIComponent(sessionId)}?${gitStateQuery(gitState)}`;
  return fetchAndWrite(url, {});
}
function tryFileFallback() {
  const path = (0, import_node_path4.join)(PROJECT_DIR, ".gramatr", "statusline.txt");
  if (!(0, import_node_fs3.existsSync)(path))
    return false;
  try {
    const text = (0, import_node_fs3.readFileSync)(path, "utf8").trim();
    if (!text)
      return false;
    process.stdout.write(composeWithContextUsage(text));
    return true;
  } catch {
    return false;
  }
}
async function main() {
  const ownStdin = await readOwnStdinPayload();
  ownStdinModel = ownStdin.model;
  ownStdinSessionId = ownStdin.sessionId;
  if (ownStdinModel) {
    try {
      const existing = readProjectState(PROJECT_DIR)?.active_session;
      if (existing?.model !== ownStdinModel) {
        const sid = getSessionId();
        mergeActiveSession(PROJECT_DIR, {
          ...sid ? { session_id: sid } : {},
          model: ownStdinModel
        });
      }
    } catch {
    }
  }
  const gitState = collectGitState(PROJECT_DIR);
  if (await tryAuthenticated(gitState))
    return;
  if (await tryLegacy(gitState))
    return;
  tryFileFallback();
}
main().catch(() => void 0);
async function runStatusline(_args = []) {
  await main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runStatusline
});
