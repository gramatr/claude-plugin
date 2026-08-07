#!/usr/bin/env node
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/server/auth.js
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
    (0, import_node_fs.writeFileSync)(getConfigPath(), JSON.stringify(config, null, 2), { mode: 384 });
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
async function renewToken() {
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
var import_node_fs, import_node_path, WARNED_EXPIRY, RENEWAL_WINDOW_MS, cachedToken, cachedExpiresAt, renewalInProgress;
var init_auth = __esm({
  "dist/server/auth.js"() {
    "use strict";
    import_node_fs = require("node:fs");
    import_node_path = require("node:path");
    init_config_runtime();
    WARNED_EXPIRY = /* @__PURE__ */ new Set();
    RENEWAL_WINDOW_MS = 6 * 60 * 60 * 1e3;
    cachedToken = null;
    cachedExpiresAt = null;
    renewalInProgress = false;
  }
});

// dist/bin/classification-feedback.js
var classification_feedback_exports = {};
__export(classification_feedback_exports, {
  runClassificationFeedbackHook: () => runClassificationFeedbackHook
});
module.exports = __toCommonJS(classification_feedback_exports);

// dist/proxy/remote-client.js
init_auth();

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

// dist/hooks/lib/hook-state.js
var import_node_sqlite = require("node:sqlite");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
init_config_runtime();
var Database = import_node_sqlite.DatabaseSync;
var _db = null;
var _filesystemAvailable = true;
function getDbPath() {
  if (process.env.GRAMATR_STATE_DB)
    return process.env.GRAMATR_STATE_DB;
  const dir = getGramatrDirFromEnv() || (0, import_node_path2.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path2.join)(dir, "state.db");
}
function getDb() {
  if (_db)
    return _db;
  const path = getDbPath();
  if (path !== ":memory:") {
    try {
      const dir = (0, import_node_path2.dirname)(path);
      if (!(0, import_node_fs2.existsSync)(dir))
        (0, import_node_fs2.mkdirSync)(dir, { recursive: true });
    } catch {
      _filesystemAvailable = false;
    }
  }
  try {
    _db = new Database(_filesystemAvailable ? path : ":memory:");
    if (_filesystemAvailable && path !== ":memory:") {
      try {
        (0, import_node_fs2.chmodSync)(path, 384);
      } catch {
      }
    }
  } catch {
    _filesystemAvailable = false;
    _db = new Database(":memory:");
  }
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA synchronous = NORMAL");
  _db.exec("PRAGMA wal_autocheckpoint = 1000");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS session_context (
      session_id        TEXT PRIMARY KEY,
      user_id           TEXT,
      project_id        TEXT,
      interaction_id    TEXT,
      entity_id         TEXT,
      project_name      TEXT,
      git_root          TEXT,
      git_branch        TEXT,
      git_remote        TEXT,
      working_directory TEXT,
      session_start     TEXT,
      updated_at        TEXT NOT NULL,
      client_type       TEXT,
      agent_name        TEXT
    );

    CREATE TABLE IF NOT EXISTS turns (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id        TEXT NOT NULL,
      client_session_id TEXT,
      project_id        TEXT,
      agent_name        TEXT,
      turn_number       INTEGER,
      timestamp         TEXT,
      prompt            TEXT,
      effort_level      TEXT,
      intent_type       TEXT,
      confidence        REAL,
      tokens_saved      INTEGER
    );

    CREATE TABLE IF NOT EXISTS directive_cache (
      key        TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      value_json TEXT NOT NULL,
      cached_at  TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      PRIMARY KEY (key, user_id)
    );

    CREATE TABLE IF NOT EXISTS mutation_outbox (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name     TEXT NOT NULL,
      args_json     TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      replicated_at TEXT,
      attempts      INTEGER NOT NULL DEFAULT 0,
      last_error    TEXT
    );

    CREATE TABLE IF NOT EXISTS op_history (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   TEXT NOT NULL,
      tool         TEXT,
      time_ms      INTEGER,
      tokens_saved INTEGER,
      timestamp    INTEGER
    );

    CREATE TABLE IF NOT EXISTS latest_classification (
      session_id            TEXT PRIMARY KEY,
      classifier_model      TEXT,
      classifier_time_ms    INTEGER,
      tokens_saved          INTEGER,
      savings_ratio         REAL,
      effort                TEXT,
      intent                TEXT,
      confidence            REAL,
      memory_delivered      INTEGER,
      downstream_model      TEXT,
      server_version        TEXT,
      stage_timing          TEXT,
      recorded_at           INTEGER NOT NULL,
      original_prompt       TEXT,
      pending_feedback      INTEGER DEFAULT 0,
      feedback_submitted_at TEXT,
      client_type           TEXT,
      agent_name            TEXT,
      memory_tier           TEXT,
      memory_scope          TEXT
    );

    CREATE TABLE IF NOT EXISTS session_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     TEXT,
      project_id     TEXT,
      ended_at       TEXT,
      reason         TEXT,
      commit_log     TEXT,
      interaction_id TEXT,
      entity_id      TEXT,
      client_type    TEXT,
      agent_name     TEXT,
      synced_at      TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS session_log_session_id
      ON session_log(session_id)
      WHERE session_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      git_remote TEXT,
      directory TEXT,
      org_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
    CREATE INDEX IF NOT EXISTS idx_projects_directory ON projects(directory);

    CREATE TABLE IF NOT EXISTS compacts (
      id          TEXT PRIMARY KEY,
      project_id  TEXT,
      session_id  TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      summary     TEXT,
      turns_json  TEXT,
      metadata_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_compacts_session ON compacts(session_id);
    CREATE INDEX IF NOT EXISTS idx_compacts_project ON compacts(project_id);

    CREATE TABLE IF NOT EXISTS packets (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL,
      project_id  TEXT,
      effort      TEXT,
      intent      TEXT,
      created_at  INTEGER NOT NULL,
      payload     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_packets_session ON packets(session_id, created_at DESC);
  `);
  const migrations = [
    "ALTER TABLE session_context ADD COLUMN entity_id TEXT",
    "ALTER TABLE session_context ADD COLUMN client_type TEXT",
    "ALTER TABLE session_context ADD COLUMN agent_name TEXT",
    "ALTER TABLE latest_classification ADD COLUMN original_prompt TEXT",
    "ALTER TABLE latest_classification ADD COLUMN pending_feedback INTEGER DEFAULT 0",
    "ALTER TABLE latest_classification ADD COLUMN feedback_submitted_at TEXT",
    "ALTER TABLE latest_classification ADD COLUMN client_type TEXT",
    "ALTER TABLE latest_classification ADD COLUMN agent_name TEXT",
    "ALTER TABLE latest_classification ADD COLUMN memory_tier TEXT",
    "ALTER TABLE latest_classification ADD COLUMN memory_scope TEXT",
    "ALTER TABLE session_log ADD COLUMN interaction_id TEXT",
    "ALTER TABLE session_log ADD COLUMN entity_id TEXT",
    "ALTER TABLE session_log ADD COLUMN client_type TEXT",
    "ALTER TABLE session_log ADD COLUMN agent_name TEXT",
    "ALTER TABLE session_log ADD COLUMN synced_at TEXT",
    // Unique index is safe to re-run (IF NOT EXISTS)
    "CREATE UNIQUE INDEX IF NOT EXISTS session_log_session_id ON session_log(session_id) WHERE session_id IS NOT NULL",
    "ALTER TABLE session_context ADD COLUMN user_id TEXT",
    "ALTER TABLE session_context ADD COLUMN platform TEXT",
    "ALTER TABLE session_context ADD COLUMN arch TEXT",
    // #1214: cross-agent fields on turns for local SQLite intelligence cache
    "ALTER TABLE turns ADD COLUMN project_id TEXT",
    "ALTER TABLE turns ADD COLUMN client_session_id TEXT",
    "ALTER TABLE turns ADD COLUMN agent_name TEXT",
    // Orchestration task assignment — set by session-start when a task is picked up
    "ALTER TABLE session_context ADD COLUMN orchestration_task_id TEXT",
    // Orchestration workspace isolation — set at pickup alongside task_id
    "ALTER TABLE session_context ADD COLUMN orch_access_scope TEXT",
    "ALTER TABLE session_context ADD COLUMN orch_dir TEXT",
    "ALTER TABLE session_context ADD COLUMN orch_working_dir TEXT"
  ];
  for (const sql of migrations) {
    try {
      _db.exec(sql);
    } catch {
    }
  }
  try {
    _db.prepare("DELETE FROM turns WHERE timestamp IS NOT NULL AND timestamp < datetime('now', '-7 days')").run();
  } catch {
  }
  return _db;
}
function getLatestClassification(sessionId) {
  const row = getDb().prepare("SELECT * FROM latest_classification WHERE session_id = ?").get(sessionId);
  if (!row)
    return null;
  return { ...row, pending_feedback: row.pending_feedback === 1 };
}
function markClassificationFeedbackSubmitted(sessionId, submittedAt) {
  const ts = submittedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  getDb().prepare(`
    UPDATE latest_classification
    SET pending_feedback = 0, feedback_submitted_at = ?
    WHERE session_id = ?
  `).run(ts, sessionId);
}

// dist/hooks/lib/feedback.js
async function submitPendingClassificationFeedback(options) {
  const last = getLatestClassification(options.sessionId);
  if (!last?.pending_feedback) {
    return { submitted: false, reason: "no_pending_feedback" };
  }
  const originalPrompt = (last.original_prompt || "").trim();
  if (!originalPrompt) {
    return { submitted: false, reason: "missing_original_prompt" };
  }
  try {
    await callRemoteTool("classification_feedback", {
      timestamp: new Date(last.recorded_at).toISOString(),
      original_prompt: originalPrompt,
      downstream_model: last.downstream_model || void 0,
      downstream_provider: options.downstreamProvider,
      client_type: options.clientType,
      agent_name: options.agentName
    });
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
