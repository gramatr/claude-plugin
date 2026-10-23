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

// dist/bin/classification-feedback.js
var classification_feedback_exports = {};
__export(classification_feedback_exports, {
  runClassificationFeedbackHook: () => runClassificationFeedbackHook
});
module.exports = __toCommonJS(classification_feedback_exports);

// dist/server/auth.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// dist/config-runtime.js
function sanitizeEnvToken(raw) {
  if (!raw)
    return "";
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined")
    return "";
  return raw;
}
function getGramatrTokenFromEnv() {
  const current = sanitizeEnvToken(process.env.GRAMATR_TOKEN);
  if (current)
    return current;
  const legacy = sanitizeEnvToken(process.env.AIOS_MCP_TOKEN);
  if (legacy)
    return legacy;
  return null;
}
function getGramatrUrlFromEnv() {
  const url = process.env.GRAMATR_URL;
  return url && url.length > 0 ? url : null;
}
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
function getSessionRegistryTtlDaysFromEnv(defaultDays) {
  const raw = process.env.GRAMATR_SESSION_REGISTRY_TTL_DAYS;
  if (!raw || raw.length === 0)
    return defaultDays;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : defaultDays;
}

// dist/hooks/lib/token-stale.js
var TOKEN_STALE_ERROR_CODE = "token_stale";
function isTokenStaleSignal(signal) {
  if (signal.httpStatus !== 401)
    return false;
  if ((signal.bodyError ?? "").toLowerCase() === TOKEN_STALE_ERROR_CODE)
    return true;
  const challenge = (signal.wwwAuthenticate ?? "").toLowerCase();
  if (!challenge)
    return false;
  return challenge.includes(`error="${TOKEN_STALE_ERROR_CODE}"`) || challenge.includes(`error=${TOKEN_STALE_ERROR_CODE}`);
}
function extractEnvelopeErrorCode(response) {
  if (typeof response !== "object" || response === null)
    return null;
  const err = response.error;
  if (typeof err !== "object" || err === null)
    return null;
  const data = err.data;
  if (typeof data === "object" && data !== null) {
    const code = data.error;
    if (typeof code === "string")
      return code;
  }
  return null;
}
function createSingleFlight() {
  let inFlight = null;
  return (fn) => {
    if (inFlight)
      return inFlight;
    const run = fn();
    inFlight = run;
    void run.then(() => {
      if (inFlight === run)
        inFlight = null;
    }, () => {
      if (inFlight === run)
        inFlight = null;
    });
    return run;
  };
}

// dist/server/auth.js
var WARNED_EXPIRY = /* @__PURE__ */ new Set();
var RENEWAL_WINDOW_MS = 6 * 60 * 60 * 1e3;
var cachedToken = null;
var cachedExpiresAt = null;
var renewalInProgress = false;
function getConfigPath() {
  const gramatrDir = getGramatrDirFromEnv();
  if (gramatrDir) {
    return (0, import_node_path.join)((0, import_node_path.dirname)(gramatrDir), ".gramatr.json");
  }
  return (0, import_node_path.join)(getHomeDir(), ".gramatr.json");
}
function readConfig() {
  try {
    const raw = (0, import_node_fs.readFileSync)(getConfigPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeConfig(config) {
  try {
    const path = getConfigPath();
    (0, import_node_fs.writeFileSync)(path, JSON.stringify(config, null, 2), { mode: 384 });
    (0, import_node_fs.chmodSync)(path, 384);
  } catch {
  }
}
function isExpired(expiresAt) {
  if (expiresAt === null)
    return false;
  return Date.now() >= expiresAt;
}
function isNearExpiry(expiresAt) {
  if (expiresAt === null)
    return false;
  return Date.now() >= expiresAt - RENEWAL_WINDOW_MS;
}
function getToken() {
  const envKey = sanitizeEnvToken(process.env.GRAMATR_API_KEY);
  if (envKey)
    return envKey;
  const envToken = getGramatrTokenFromEnv();
  if (envToken)
    return envToken;
  if (cachedToken && isExpired(cachedExpiresAt)) {
    cachedToken = null;
    cachedExpiresAt = null;
  }
  if (!cachedToken) {
    refreshToken();
  }
  if (cachedToken && isNearExpiry(cachedExpiresAt) && !renewalInProgress) {
    const tokenSnap = cachedToken;
    if (!WARNED_EXPIRY.has(tokenSnap.slice(-8))) {
      WARNED_EXPIRY.add(tokenSnap.slice(-8));
      process.stderr.write("[gramatr] Token nearing expiry \u2014 renewing in background\n");
    }
    void renewTokenBackground();
  }
  return cachedToken;
}
function refreshToken() {
  const config = readConfig();
  if (!config?.token) {
    cachedToken = null;
    cachedExpiresAt = null;
    return null;
  }
  const expiresAt = config.token_expires_at ? Date.parse(config.token_expires_at) : null;
  if (isExpired(expiresAt)) {
    cachedToken = null;
    cachedExpiresAt = null;
    process.stderr.write("[gramatr] Stored token is expired \u2014 run `npx @gramatr/mcp login` to re-authenticate\n");
    return null;
  }
  cachedToken = config.token;
  cachedExpiresAt = expiresAt;
  return cachedToken;
}
var renewSingleFlight = createSingleFlight();
async function renewToken() {
  return renewSingleFlight(renewTokenInner);
}
async function renewTokenInner() {
  const currentToken = cachedToken ?? readConfig()?.token;
  if (!currentToken)
    return null;
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/auth/token/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok)
      return null;
    const body = await response.json();
    if (!body.access_token)
      return null;
    const expiresIn = body.expires_in ?? 31536e3;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
    const config = readConfig() ?? {};
    config.token = body.access_token;
    config.token_expires_at = newExpiresAt;
    writeConfig(config);
    cachedToken = body.access_token;
    cachedExpiresAt = Date.parse(newExpiresAt);
    renewalInProgress = false;
    return cachedToken;
  } catch {
    return null;
  }
}
async function renewTokenBackground() {
  if (renewalInProgress || !cachedToken)
    return;
  renewalInProgress = true;
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/auth/token/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cachedToken}` },
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) {
      process.stderr.write(`[gramatr] Token renewal failed (HTTP ${response.status}) \u2014 re-login may be required
`);
      return;
    }
    const body = await response.json();
    if (!body.access_token)
      return;
    const expiresIn = body.expires_in ?? 31536e3;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
    const config = readConfig() ?? {};
    config.token = body.access_token;
    config.token_expires_at = newExpiresAt;
    writeConfig(config);
    cachedToken = body.access_token;
    cachedExpiresAt = Date.parse(newExpiresAt);
    process.stderr.write("[gramatr] Token renewed successfully\n");
  } catch {
  } finally {
    renewalInProgress = false;
  }
}
function getServerUrl() {
  const envUrl = getGramatrUrlFromEnv();
  if (envUrl) {
    return envUrl.replace(/\/mcp\/?$/, "");
  }
  const config = readConfig();
  return (config?.server_url || "https://api.gramatr.com").replace(/\/mcp\/?$/, "");
}

// dist/hooks/generated/hook-timeouts.js
var REMOTE_TOOL_CALL_TIMEOUT_MS = 3e4;

// dist/proxy/lib/retry.js
function isRetryable(err) {
  if (err === null || err === void 0)
    return false;
  const status = extractStatus(err);
  if (status !== void 0) {
    if (status === 502 || status === 503 || status === 504 || status === 429)
      return true;
    if (status === 401 || status === 403 || status === 400)
      return false;
    if (status >= 500)
      return true;
    if (status >= 400)
      return false;
  }
  const code = extractCode(err);
  if (code) {
    if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "EAI_AGAIN" || code === "ECONNRESET" || code === "ENETUNREACH" || code === "EPIPE") {
      return true;
    }
  }
  const message = extractMessage(err).toLowerCase();
  if (!message)
    return false;
  if (message.includes("abort") || message.includes("timeout") || message.includes("timed out")) {
    return true;
  }
  if (message.includes("not connected") || message.includes("socket closed") || message.includes("econnreset")) {
    return true;
  }
  if (message.includes("econnrefused") || message.includes("etimedout") || message.includes("eai_again") || message.includes("network")) {
    return true;
  }
  return false;
}
function extractStatus(err) {
  if (typeof err === "object" && err !== null && "status" in err) {
    const s = err.status;
    if (typeof s === "number")
      return s;
  }
  return void 0;
}
function extractCode(err) {
  if (typeof err === "object" && err !== null && "code" in err) {
    const c = err.code;
    if (typeof c === "string")
      return c;
  }
  return void 0;
}
function extractMessage(err) {
  if (err instanceof Error)
    return err.message;
  if (typeof err === "string")
    return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = err.message;
    if (typeof m === "string")
      return m;
  }
  return "";
}
function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function computeDelayMs(n, baseMs, capMs, random, retryAfterMs) {
  const exp = Math.min(capMs, baseMs * Math.pow(2, n));
  const ceiling = retryAfterMs !== void 0 ? Math.min(capMs, Math.max(exp, retryAfterMs)) : exp;
  return Math.floor(random() * ceiling);
}
async function withBackoff(fn, opts = {}) {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 200;
  const capMs = opts.capMs ?? 2e3;
  const retryable = opts.isRetryable ?? isRetryable;
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === attempts - 1;
      if (isLast || !retryable(err))
        throw err;
      const retryAfterMs = opts.getRetryAfterMs?.(err);
      const delay = computeDelayMs(attempt, baseMs, capMs, random, retryAfterMs);
      if (delay > 0)
        await sleep(delay);
    }
  }
  throw lastErr;
}

// dist/proxy/remote-client.js
var DEBUG = !!process.env.GRAMATR_DEBUG;
var HOT_PATH_BACKOFF = { attempts: 3, baseMs: 200, capMs: 2e3 };
var TransientHttpError = class extends Error {
  status;
  retryAfterMs;
  constructor(status, statusText, retryAfterMs) {
    super(`Remote server error: HTTP ${status} ${statusText}`);
    this.name = "TransientHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
};
function parseRetryAfterMs(headerValue) {
  if (!headerValue)
    return void 0;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds))
    return Math.max(0, seconds * 1e3);
  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs))
    return Math.max(0, dateMs - Date.now());
  return void 0;
}
var remoteBackoffOpts = {
  ...HOT_PATH_BACKOFF,
  isRetryable,
  getRetryAfterMs: (err) => err instanceof TransientHttpError ? err.retryAfterMs : void 0
};
async function safeJson(response) {
  try {
    if (typeof response.json !== "function")
      return {};
    return await response.json();
  } catch {
    return {};
  }
}
function extractBodyErrorCode(body) {
  if (typeof body !== "object" || body === null)
    return null;
  const topError = body.error;
  if (typeof topError === "string")
    return topError;
  return extractEnvelopeErrorCode(body);
}
function debugLog(label, data) {
  if (!DEBUG)
    return;
  const json = JSON.stringify(data, null, 2);
  process.stderr.write(`[gramatr-debug] ${label}:
${json}

`);
}
var requestId = 0;
async function callRemoteTool(toolName, args, sessionContext) {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "tools/call",
    params: { name: toolName, arguments: args }
  };
  const attempt = async () => {
    let response = await postToRemote(payload, sessionContext);
    if (response.status === 401) {
      const staleSignal = {
        httpStatus: 401,
        wwwAuthenticate: response.headers.get("www-authenticate"),
        // Body read consumes the stream, but on a 401 we always re-post (a fresh
        // Response), so peeking the body here is safe.
        bodyError: extractBodyErrorCode(await safeJson(response))
      };
      if (isTokenStaleSignal(staleSignal)) {
        const renewed = await renewToken();
        if (!renewed) {
          throw new Error("Remote server error: HTTP 401 \u2014 token_stale; refresh grant failed (re-login required)");
        }
        response = await postToRemote(payload, sessionContext);
        if (response.status === 401) {
          const churnBody = await safeJson(response);
          if (isTokenStaleSignal({
            httpStatus: 401,
            wwwAuthenticate: response.headers.get("www-authenticate"),
            bodyError: extractBodyErrorCode(churnBody)
          })) {
            process.stderr.write(JSON.stringify({
              level: "error",
              event: "token_stale_after_refresh",
              message: "token_stale persisted after a successful refresh \u2014 epoch churn defect",
              tool: toolName,
              component: "remote-client"
            }) + "\n");
          }
          throw new Error("Remote server error: HTTP 401 \u2014 token_stale persisted after refresh");
        }
      } else {
        const refreshed = refreshToken();
        if (refreshed) {
          response = await postToRemote(payload);
        }
        if (response.status === 401) {
          const renewed = await renewToken();
          if (renewed) {
            response = await postToRemote(payload);
          }
        }
      }
    }
    if (!response.ok) {
      if (response.status === 401) {
        const body2 = await response.json().catch(() => ({}));
        const code = body2.code ?? "";
        throw new Error(`Remote server error: HTTP 401 \u2014 ${code || response.statusText}`);
      }
      if (response.status === 502 || response.status === 503 || response.status === 504 || response.status === 429) {
        throw new TransientHttpError(response.status, response.statusText, parseRetryAfterMs(response.headers.get("retry-after")));
      }
      throw new Error(`Remote server error: HTTP ${response.status} ${response.statusText}`);
    }
    const body = await parseSSEResponse(response);
    if (body.error) {
      throw new Error(`Remote tool error: ${body.error.message}`);
    }
    return body.result;
  };
  return withBackoff(attempt, remoteBackoffOpts);
}
async function postToRemote(payload, sessionContext) {
  const serverUrl = getServerUrl();
  const token = getToken();
  const url = `${serverUrl}/mcp`;
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (sessionContext?.sessionId) {
    headers["Mcp-Session-Id"] = sessionContext.sessionId;
  }
  if (sessionContext?.projectId) {
    headers["X-Gramatr-Project-Id"] = sessionContext.projectId;
  }
  if (sessionContext?.clientSessionId) {
    headers["X-Gramatr-Client-Session"] = sessionContext.clientSessionId;
  }
  debugLog(`\u2192 POST ${url} [${payload.method}]`, {
    ...payload,
    // Redact large argument values in debug output
    params: payload.params && typeof payload.params === "object" ? Object.fromEntries(Object.entries(payload.params).map(([k, v]) => [
      k,
      typeof v === "string" && v.length > 500 ? `${v.slice(0, 200)}... [${v.length} chars]` : v
    ])) : payload.params
  });
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REMOTE_TOOL_CALL_TIMEOUT_MS)
  });
  debugLog(`\u2190 ${response.status} ${response.statusText} [${payload.method}]`, {
    status: response.status,
    headers: Object.fromEntries([...response.headers.entries()].filter(([k]) => !k.toLowerCase().includes("authorization")))
  });
  return response;
}
async function parseSSEResponse(response) {
  const text = await response.text();
  if (DEBUG) {
    const preview = text.length > 2e3 ? `${text.slice(0, 2e3)}... [${text.length} chars]` : text;
    debugLog("\u2190 response body", preview);
  }
  try {
    return JSON.parse(text);
  } catch {
  }
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      try {
        return JSON.parse(data);
      } catch {
      }
    }
  }
  throw new Error(`Could not parse remote response: ${text.substring(0, 200)}`);
}

// dist/hooks/lib/classification-cache.js
var import_node_fs3 = require("node:fs");
var import_node_path4 = require("node:path");

// dist/hooks/lib/hook-state.js
var import_node_path2 = require("node:path");
function getGramatrStateDir() {
  const dir = getGramatrDirFromEnv() || (0, import_node_path2.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path2.join)(dir, ".state");
}

// dist/hooks/lib/project-state.js
var import_node_child_process = require("node:child_process");
var import_node_fs2 = require("node:fs");
var import_node_path3 = require("node:path");
var GRAMATR_DIR = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs2.existsSync)((0, import_node_path3.join)(dir, GRAMATR_DIR)))
      return dir;
    const parent = (0, import_node_path3.dirname)(dir);
    if (parent === dir)
      return startDir;
    dir = parent;
  }
}
function canonicalizeProjectRoot(dir) {
  const gitEnv = { ...process.env };
  for (const key of [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_CEILING_DIRECTORIES"
  ]) {
    delete gitEnv[key];
  }
  const git = (args) => {
    try {
      return (0, import_node_child_process.execFileSync)("git", args, {
        cwd: dir,
        env: gitEnv,
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
  const abs = (p) => p.startsWith("/") ? p : (0, import_node_path3.join)(dir, p);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path3.dirname)(absCommonDir);
  if ((0, import_node_fs2.existsSync)((0, import_node_path3.join)(mainRoot, GRAMATR_DIR)))
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
  const dir = (0, import_node_path3.join)(projectDir, GRAMATR_DIR);
  return {
    core: (0, import_node_path3.join)(dir, CORE_FILE),
    runtime: (0, import_node_path3.join)(dir, RUNTIME_FILE)
  };
}
var SCHEMA_VERSION = 1;
function readJson(filePath) {
  try {
    if (!(0, import_node_fs2.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_node_fs2.readFileSync)(filePath, "utf8"));
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
  const dir = (0, import_node_path3.join)(projectDir, GRAMATR_DIR);
  const legacyProject = readJson((0, import_node_path3.join)(dir, "project.json"));
  const legacySettings = readJson((0, import_node_path3.join)(dir, "settings.json"));
  const legacyGit = readJson((0, import_node_path3.join)(dir, "git-context.json"));
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
  const legacySession = readJson((0, import_node_path3.join)(projectDir, GRAMATR_DIR, "session.json"));
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
  return (0, import_node_path3.join)(projectDir, GRAMATR_DIR, GRAMATR_SESSIONS_SUBDIR, name);
}
function readActiveSessionForKey(projectDir, clientSessionId) {
  if (!clientSessionId)
    return null;
  const path = activeSessionKeyPath(projectDir, clientSessionId);
  if (!path)
    return null;
  return readJson(path);
}

// dist/hooks/lib/classification-cache.js
var CLASSIFICATION_SUBDIR = "classification";
function classificationCacheKeyPath(sessionId) {
  const name = activeSessionKeyFileName(sessionId);
  if (!name)
    return null;
  return (0, import_node_path4.join)(getGramatrStateDir(), CLASSIFICATION_SUBDIR, name);
}
function setLatestClassification(record) {
  const dest = classificationCacheKeyPath(record.session_id);
  if (!dest)
    return;
  try {
    const dir = (0, import_node_path4.dirname)(dest);
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true, mode: 448 });
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs3.writeFileSync)(tmp, JSON.stringify(record) + "\n", { encoding: "utf8", mode: 384 });
    (0, import_node_fs3.renameSync)(tmp, dest);
  } catch {
  }
}
function getLatestClassification(sessionId) {
  const path = classificationCacheKeyPath(sessionId);
  if (!path)
    return null;
  try {
    const raw = (0, import_node_fs3.readFileSync)(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function markClassificationFeedbackSubmitted(sessionId, submittedAt) {
  const prev = getLatestClassification(sessionId);
  if (!prev)
    return;
  setLatestClassification({
    ...prev,
    pending_feedback: false,
    feedback_submitted_at: submittedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  });
}

// dist/hooks/lib/process-pin.js
var import_node_crypto = require("node:crypto");
var import_node_child_process2 = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_os = require("node:os");
var CLIENT_SESSION_ID_PREFIX = "pin2-";
var CLIENT_SESSION_ID_AGENT_PREFIX = "pin3-";
var SHELL_NAME_RE = /^(sh|bash|zsh|dash|fish|ksh|csh|tcsh|cmd(\.exe)?|powershell(\.exe)?|pwsh(\.exe)?)$/i;
function defaultReadProcStat(pid) {
  return (0, import_node_fs4.readFileSync)(`/proc/${pid}/stat`, "utf8");
}
function defaultReadProcComm(pid) {
  return (0, import_node_fs4.readFileSync)(`/proc/${pid}/comm`, "utf8");
}
function defaultHasProc() {
  return (0, import_node_fs4.existsSync)("/proc/self/stat");
}
function defaultRunPs(args) {
  return (0, import_node_child_process2.execFileSync)("ps", args, { encoding: "utf8", timeout: 2e3 });
}
function defaultReadMachineId() {
  return (0, import_node_fs4.readFileSync)("/etc/machine-id", "utf8");
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

// dist/hooks/lib/session-root-registry.js
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
var DEFAULT_REGISTRY_TTL_DAYS = 14;
function registryTtlMs() {
  const days = getSessionRegistryTtlDaysFromEnv(DEFAULT_REGISTRY_TTL_DAYS);
  return days * 24 * 60 * 60 * 1e3;
}
function registryDir() {
  return (0, import_node_path5.join)(getHomeDir(), ".gramatr", "sessions");
}
function sessionFileName(sessionId) {
  const safe = sessionId.replace(/[^A-Za-z0-9._-]/g, "");
  if (!safe || safe === "." || safe === "..")
    return null;
  return `${safe}.json`;
}
function sessionRootPath(sessionId) {
  const name = sessionFileName(sessionId);
  if (!name)
    return null;
  return (0, import_node_path5.join)(registryDir(), name);
}
function readRaw(path) {
  try {
    if (!(0, import_node_fs5.existsSync)(path))
      return null;
    return JSON.parse((0, import_node_fs5.readFileSync)(path, "utf8"));
  } catch {
    return null;
  }
}
function readSessionRoot(sessionId) {
  const path = sessionRootPath(sessionId);
  if (!path)
    return null;
  const raw = readRaw(path);
  if (!raw || typeof raw.project_root !== "string" || raw.project_root.length === 0) {
    return null;
  }
  const ttlMs = registryTtlMs();
  if (ttlMs > 0 && typeof raw.last_seen_at === "string" && raw.last_seen_at.length > 0) {
    const lastSeen = Date.parse(raw.last_seen_at);
    if (Number.isFinite(lastSeen) && Date.now() - lastSeen > ttlMs) {
      try {
        (0, import_node_fs5.rmSync)(path, { force: true });
      } catch {
      }
      return null;
    }
  }
  if (!(0, import_node_fs5.existsSync)(raw.project_root)) {
    try {
      (0, import_node_fs5.rmSync)(path, { force: true });
    } catch {
    }
    return null;
  }
  return raw.project_root;
}
function peekSessionRootProjectId(sessionId) {
  const path = sessionRootPath(sessionId);
  if (!path)
    return null;
  const raw = readRaw(path);
  if (!raw || typeof raw.gramatr_project_id !== "string" || raw.gramatr_project_id.length === 0) {
    return null;
  }
  return raw.gramatr_project_id;
}
function registryDebugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path5.join)(home, ".gramatr", "debug");
}
function recordRegistryResolution(resolution, sessionId, clientType) {
  if (resolution === "hit")
    return;
  const sample = {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    session_id: sessionId ?? null,
    client_type: clientType ?? null,
    resolution
  };
  try {
    const dir = registryDebugDir();
    if (!(0, import_node_fs5.existsSync)(dir))
      (0, import_node_fs5.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path5.join)(dir, "registry-resolution.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs5.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs5.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > REGISTRY_SAMPLE_CAP) {
      existing = existing.slice(existing.length - REGISTRY_SAMPLE_CAP);
    }
    (0, import_node_fs5.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
  } catch {
  }
}
var REGISTRY_SAMPLE_CAP = 200;
function resolveSessionRoot(opts) {
  const recordedProjectId = opts.sessionId ? peekSessionRootProjectId(opts.sessionId) : null;
  if (opts.sessionId) {
    const hit = readSessionRoot(opts.sessionId);
    if (hit) {
      return hit;
    }
    recordRegistryResolution("miss", opts.sessionId, opts.clientType);
  } else {
    recordRegistryResolution("no_session_id", opts.sessionId, opts.clientType);
  }
  const rawWinner = resolveProjectDir({ cwd: opts.cwd, clientType: opts.clientType });
  const canonical = canonicalizeProjectRoot(rawWinner);
  if (canonical === rawWinner)
    return canonical;
  if (recordedProjectId) {
    const canonicalProjectId = readCommittedProjectId(canonical);
    if (canonicalProjectId && canonicalProjectId !== recordedProjectId) {
      recordRegistryResolution("canonicalization_rejected", opts.sessionId, opts.clientType);
      return rawWinner;
    }
  }
  return canonical;
}
function readCommittedProjectId(dir) {
  try {
    return readProjectState(dir)?.project?.project_id ?? null;
  } catch {
    return null;
  }
}

// dist/hooks/lib/feedback.js
function resolveClientSessionId(projectDir) {
  try {
    const ownPinValue = getProcessPin()?.value;
    return (ownPinValue && readActiveSessionForKey(projectDir, ownPinValue) ? ownPinValue : readProjectState(projectDir)?.active_session?.client_session_id) || void 0;
  } catch {
    return void 0;
  }
}
async function submitPendingClassificationFeedback(options) {
  const last = getLatestClassification(options.sessionId);
  if (!last?.pending_feedback) {
    return { submitted: false, reason: "no_pending_feedback" };
  }
  const originalPrompt = (last.original_prompt || "").trim();
  if (!originalPrompt) {
    return { submitted: false, reason: "missing_original_prompt" };
  }
  const projectDir = options.projectDir ?? resolveSessionRoot({ sessionId: options.sessionId, clientType: options.clientType });
  const clientSessionId = resolveClientSessionId(projectDir);
  try {
    await callRemoteTool("classification_feedback", {
      timestamp: new Date(last.recorded_at).toISOString(),
      original_prompt: originalPrompt,
      downstream_model: last.downstream_model || void 0,
      downstream_provider: options.downstreamProvider,
      client_type: options.clientType,
      agent_name: options.agentName
    }, clientSessionId ? { clientSessionId } : void 0);
    markClassificationFeedbackSubmitted(options.sessionId);
    return { submitted: true, reason: "submitted" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[gramatr] feedback submission failed: ${detail}
`);
    return { submitted: false, reason: "call_tool_error" };
  }
}

// dist/hooks/lib/hook-stdin.js
async function readHookStdin() {
  const chunks = [];
  await new Promise((resolve) => {
    const t = setTimeout(resolve, 1e3);
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
  try {
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw)
      return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// dist/bin/classification-feedback.js
var CLASSIFICATION_FEEDBACK_TIMEOUT_MS = 5e3;
async function runClassificationFeedbackHook(input) {
  const sessionId = typeof input.session_id === "string" ? input.session_id : null;
  if (!sessionId)
    return;
  try {
    await Promise.race([
      submitPendingClassificationFeedback({
        sessionId,
        clientType: "claude-code",
        agentName: "Claude Code"
      }),
      new Promise((resolve) => setTimeout(resolve, CLASSIFICATION_FEEDBACK_TIMEOUT_MS))
    ]);
  } catch {
  }
}
async function main() {
  const input = await readHookStdin();
  await runClassificationFeedbackHook(input);
  process.stdout.write("{}");
}
if (process.env.GRAMATR_CLASSIFICATION_FEEDBACK_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runClassificationFeedbackHook
});
