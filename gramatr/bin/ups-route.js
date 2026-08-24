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
function getClaudeModelFromEnv() {
  const anthropic = process.env.ANTHROPIC_MODEL;
  if (anthropic && anthropic.length > 0)
    return anthropic;
  const claude = process.env.CLAUDE_MODEL;
  if (claude && claude.length > 0)
    return claude;
  return null;
}
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/hooks/lib/hook-promotion-telemetry.js
var hook_promotion_telemetry_exports = {};
__export(hook_promotion_telemetry_exports, {
  appendHookPromotionSample: () => appendHookPromotionSample,
  buildPromotionSample: () => buildPromotionSample,
  isDegraded: () => isDegraded,
  isProjectCorrect: () => isProjectCorrect,
  packetTokenCost: () => packetTokenCost,
  projectIdFromAud: () => projectIdFromAud,
  recordBootstrapRecovered: () => recordBootstrapRecovered,
  recordTurn1Arming: () => recordTurn1Arming,
  resolvedProjectId: () => resolvedProjectId
});
function resolvedProjectId(route) {
  if (!route)
    return null;
  return route.manifest?.project_id ?? route.project_state?.project_id ?? route.packet_1?.project_state?.project_id ?? null;
}
function isProjectCorrect(route, expectedProjectId) {
  if (!route || !expectedProjectId)
    return false;
  if (route.directives?.project_correction?.canonical_id)
    return false;
  return resolvedProjectId(route) === expectedProjectId;
}
function isDegraded(route) {
  if (!route)
    return false;
  const fromSummary = (route.execution_summary?.degraded_components?.length ?? 0) > 0 || (route.execution?.summary?.degraded_components?.length ?? 0) > 0;
  if (fromSummary)
    return true;
  const completeness = route.completeness ?? route.manifest?.completeness;
  if (typeof completeness === "string" && completeness.length > 0 && completeness !== "full") {
    return true;
  }
  return false;
}
function packetTokenCost(route) {
  if (!route)
    return null;
  const v2 = route.execution?.summary?.reasoning_tokens_used;
  if (typeof v2 === "number")
    return v2;
  const flat = route.token_savings?.reasoning_tokens_used;
  return typeof flat === "number" ? flat : null;
}
function buildPromotionSample(args) {
  const route = args.route;
  return {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    path: args.path,
    session_id: args.session_id,
    project_id: resolvedProjectId(route),
    expected_project_id: args.expected_project_id,
    client_type: args.client_type,
    status: args.status,
    latency_ms: args.latency_ms,
    packet_token_cost: packetTokenCost(route),
    packet_bytes: args.packet_bytes ?? null,
    project_correct: isProjectCorrect(route, args.expected_project_id),
    degraded: isDegraded(route)
  };
}
function projectIdFromAud(aud) {
  if (typeof aud !== "string" || aud.length === 0)
    return null;
  const m = aud.match(/\/projects\/([^/?#]+)/);
  return m ? m[1] : null;
}
function debugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path7.join)(home, ".gramatr", "debug");
}
function recordTurn1Arming(args) {
  const sample = {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    session_id: args.session_id,
    project_id: args.project_id,
    client_type: args.client_type,
    result: args.result,
    rest_armed: args.result === "minted" || args.result === "already_armed",
    keyring_backend: args.keyring_backend
  };
  try {
    const dir = debugDir();
    if (!(0, import_node_fs7.existsSync)(dir))
      (0, import_node_fs7.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path7.join)(dir, "turn1-arming.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs7.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs7.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs7.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
  } catch {
  }
}
function recordBootstrapRecovered(args) {
  const sample = {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    session_id: args.session_id,
    client_type: args.client_type,
    result: args.result,
    turns_since_start: args.turns_since_start ?? null
  };
  try {
    const dir = debugDir();
    if (!(0, import_node_fs7.existsSync)(dir))
      (0, import_node_fs7.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path7.join)(dir, "bootstrap-recovered.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs7.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs7.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs7.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
  } catch {
  }
}
function appendHookPromotionSample(sample) {
  try {
    const dir = debugDir();
    if (!(0, import_node_fs7.existsSync)(dir))
      (0, import_node_fs7.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path7.join)(dir, "hook-promotion.jsonl");
    const lastPath = (0, import_node_path7.join)(dir, "last-sample.json");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs7.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs7.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs7.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
    (0, import_node_fs7.writeFileSync)(lastPath, JSON.stringify(sample, null, 2), "utf8");
  } catch {
  }
}
var import_node_fs7, import_node_path7, MAX_SAMPLES;
var init_hook_promotion_telemetry = __esm({
  "dist/hooks/lib/hook-promotion-telemetry.js"() {
    "use strict";
    import_node_fs7 = require("node:fs");
    import_node_path7 = require("node:path");
    init_config_runtime();
    MAX_SAMPLES = 200;
  }
});

// dist/server/auth.js
var RENEWAL_WINDOW_MS;
var init_auth = __esm({
  "dist/server/auth.js"() {
    "use strict";
    init_config_runtime();
    RENEWAL_WINDOW_MS = 6 * 60 * 60 * 1e3;
  }
});

// dist/bin/ups-route.js
var ups_route_exports = {};
__export(ups_route_exports, {
  computeUpsRoute: () => computeUpsRoute,
  degradedSurfaceWarning: () => degradedSurfaceWarning,
  loudRecoveryFailureWarning: () => loudRecoveryFailureWarning,
  main: () => main
});
module.exports = __toCommonJS(ups_route_exports);

// dist/hooks/lib/session-rest-token.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var GRAMATR_DIR = ".gramatr";
var SESSION_FILE = ".session";
var SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
var SESSION_TOKEN_PROACTIVE_RENEW_FRACTION = 0.8;
var RENEW_TIMEOUT_MS = 3e3;
function getSessionTokenPath(projectDir) {
  return (0, import_node_path.join)(projectDir, GRAMATR_DIR, SESSION_FILE);
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
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  if (!(0, import_node_fs.existsSync)(dir)) {
    (0, import_node_fs.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getSessionTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs.renameSync)(tmp, dest);
  try {
    (0, import_node_fs.chmodSync)(dest, 384);
  } catch {
  }
}
function persistBootstrapRestToken(projectDir, block) {
  const file = normalizeRestTokenBlock(block);
  if (!file)
    return false;
  writeSessionToken(projectDir, file);
  return true;
}
function readSessionToken(projectDir) {
  const dest = getSessionTokenPath(projectDir);
  try {
    if (!(0, import_node_fs.existsSync)(dest))
      return null;
    const parsed = JSON.parse((0, import_node_fs.readFileSync)(dest, "utf8"));
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
    (0, import_node_fs.rmSync)(getSessionTokenPath(projectDir), { force: true });
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

// dist/hooks/lib/bootstrap-recovery.js
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");
init_config_runtime();

// dist/hooks/lib/gramatr-hook-utils.js
var import_fs = require("fs");
var import_path = require("path");
init_config_runtime();

// dist/hooks/lib/hook-state.js
var import_node_sqlite = require("node:sqlite");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
init_config_runtime();
var Database = import_node_sqlite.DatabaseSync;
var _db = null;
function p(obj) {
  return obj;
}
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
function setLatestClassification(record) {
  getDb().prepare(`
    INSERT OR REPLACE INTO latest_classification
      (session_id, classifier_model, classifier_time_ms, tokens_saved, savings_ratio,
       effort, intent, confidence, memory_delivered, downstream_model,
       server_version, stage_timing, recorded_at,
       original_prompt, pending_feedback, feedback_submitted_at,
       client_type, agent_name, memory_tier, memory_scope)
    VALUES
      (@session_id, @classifier_model, @classifier_time_ms, @tokens_saved, @savings_ratio,
       @effort, @intent, @confidence, @memory_delivered, @downstream_model,
       @server_version, @stage_timing, @recorded_at,
       @original_prompt, @pending_feedback, @feedback_submitted_at,
       @client_type, @agent_name, @memory_tier, @memory_scope)
  `).run(p({
    ...record,
    pending_feedback: record.pending_feedback ? 1 : 0
  }));
}

// dist/hooks/lib/gramatr-hook-utils.js
var HOME = getHomeDir();
function resolveMcpUrl() {
  try {
    const configPath2 = (0, import_path.join)(HOME, ".gramatr.json");
    const config = JSON.parse((0, import_fs.readFileSync)(configPath2, "utf8"));
    if (config.server_url)
      return config.server_url;
  } catch {
  }
  try {
    const gmtrDir = getGramatrDirFromEnv() || (0, import_path.join)(HOME, ".gramatr");
    const settingsPath = (0, import_path.join)(gmtrDir, "settings.json");
    const settings = JSON.parse((0, import_fs.readFileSync)(settingsPath, "utf8"));
    if (settings.auth?.server_url)
      return settings.auth.server_url;
  } catch {
  }
  const envUrl = getGramatrUrlFromEnv();
  if (envUrl)
    return envUrl;
  return "https://api.gramatr.com/mcp";
}

// dist/user-config.js
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");
init_config_runtime();
var DEFAULT_TTL_SECONDS = 3600;
function configPath() {
  return (0, import_node_path3.join)(getHomeDir(), ".gramatr.json");
}
function readGramatrJson() {
  try {
    const raw = (0, import_node_fs3.readFileSync)(configPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}
function readCachedUserIdentity() {
  const cfg = readGramatrJson();
  if (!cfg.user || typeof cfg.user !== "object")
    return null;
  return cfg.user;
}
function writeCachedUserIdentity(patch, options) {
  try {
    const cfg = readGramatrJson();
    const existing = cfg.user && typeof cfg.user === "object" ? cfg.user : {};
    const merged = {
      ...existing,
      ...patch,
      cached_at: (/* @__PURE__ */ new Date()).toISOString(),
      cache_ttl_seconds: patch.cache_ttl_seconds ?? options?.ttlSeconds ?? existing.cache_ttl_seconds ?? DEFAULT_TTL_SECONDS
    };
    const next = { ...cfg, user: merged };
    (0, import_node_fs3.writeFileSync)(configPath(), JSON.stringify(next, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}
function isUserIdentityStale(identity) {
  if (!identity || !identity.cached_at)
    return true;
  const cachedMs = Date.parse(identity.cached_at);
  if (!Number.isFinite(cachedMs))
    return true;
  const ttl = (identity.cache_ttl_seconds ?? DEFAULT_TTL_SECONDS) * 1e3;
  return Date.now() - cachedMs > ttl;
}

// dist/hooks/lib/bootstrap-recovery.js
function readGitRemoteFromProjectFile(projectDir) {
  try {
    const proj = JSON.parse((0, import_node_fs4.readFileSync)((0, import_node_path4.join)(projectDir, ".gramatr", "project.json"), "utf8"));
    const drift = proj.drift;
    const remote = typeof proj.git_remote === "string" && proj.git_remote || drift && typeof drift.git_remote === "string" && drift.git_remote || null;
    return remote || null;
  } catch {
    return null;
  }
}
var RECOVERY_TIMEOUT_MS = 3e3;
var RECOVERY_RETRY_JITTER_MS = 250;
function findUsableMcpOAuthEntry(remoteUrl) {
  try {
    const credFile = (0, import_node_path4.resolve)(getHomeDir(), ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs4.readFileSync)(credFile, "utf8"));
    const mcpOAuth = creds.mcpOAuth;
    if (mcpOAuth) {
      for (const entry of Object.values(mcpOAuth)) {
        if (entry.serverUrl === remoteUrl && entry.accessToken && (!entry.expiresAt || Date.now() < Number(entry.expiresAt))) {
          return {
            accessToken: entry.accessToken,
            expiresAt: entry.expiresAt ? Number(entry.expiresAt) : null
          };
        }
      }
    }
  } catch {
  }
  return null;
}
function resolveClientBearerToken(remoteUrl) {
  const envApiKey = process.env.GRAMATR_API_KEY ?? "";
  const envToken = process.env.GRAMATR_TOKEN ?? "";
  const env = sanitizeEnvToken(envApiKey) || sanitizeEnvToken(envToken);
  if (env)
    return env;
  const pluginDataDir = process.env.CLAUDE_PLUGIN_DATA ?? "";
  if (pluginDataDir) {
    try {
      const cfg = JSON.parse((0, import_node_fs4.readFileSync)((0, import_node_path4.join)(pluginDataDir, "token.json"), "utf8"));
      if (typeof cfg.token === "string" && cfg.token)
        return cfg.token;
    } catch {
    }
  }
  const entry = findUsableMcpOAuthEntry(remoteUrl);
  if (entry)
    return entry.accessToken;
  return "";
}
function extractRestToken(parsed) {
  return normalizeRestTokenBlock(parsed.rest_token);
}
function parseBootstrapPayload(contentType, raw) {
  let payload = null;
  try {
    if (contentType.includes("text/event-stream")) {
      let lastData = null;
      for (const line of raw.split("\n")) {
        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (data && data !== "[DONE]")
            lastData = data;
        }
      }
      if (!lastData)
        return null;
      payload = JSON.parse(lastData);
    } else {
      payload = JSON.parse(raw);
    }
  } catch {
    return null;
  }
  const result = payload?.result;
  const content = result?.content;
  const text = typeof content?.[0]?.text === "string" ? content[0].text : "";
  if (!text)
    return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function extractUser(parsed) {
  const user = parsed.user;
  if (!user || !(user.id || user.email))
    return null;
  return user;
}
function syncIdentityCacheFromPayload(parsed) {
  const user = extractUser(parsed);
  if (!user)
    return false;
  try {
    return writeCachedUserIdentity({
      id: user.id ?? null,
      email: user.email ?? null,
      display_name: user.display_name ?? null,
      system_roles: user.system_roles ?? [],
      org_memberships: user.org_memberships ?? [],
      team_memberships: user.team_memberships ?? [],
      timezone: user.timezone ?? null
    });
  } catch {
    return false;
  }
}
async function attemptRecovery(remoteUrl, token, opts, fetchImpl) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "session_bootstrap",
      arguments: {
        // Structured (non-hook) payload exposes the rest_token + resolved ids.
        cwd: opts.projectDir,
        client_type: "claude-code",
        // #3529 — flag so the server audit-logs the self-heal distinctly from a
        // normal SessionStart bootstrap.
        recovery: true,
        ...opts.gitRemote ? { git_remote: opts.gitRemote } : {},
        ...opts.clientSessionId ? { client_session_id: opts.clientSessionId } : {}
      }
    }
  };
  let res;
  try {
    res = await fetchImpl(remoteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(RECOVERY_TIMEOUT_MS)
    });
  } catch {
    return { status: "error" };
  }
  if (!res.ok)
    return { status: "error" };
  const contentType = res.headers.get("content-type") ?? "";
  let raw;
  try {
    raw = await res.text();
  } catch {
    return { status: "error" };
  }
  const parsed = parseBootstrapPayload(contentType, raw);
  if (!parsed)
    return { status: "error" };
  syncIdentityCacheFromPayload(parsed);
  const restToken = extractRestToken(parsed);
  if (!restToken) {
    return { status: "no_token" };
  }
  const wrote = persistBootstrapRestToken(opts.projectDir, restToken);
  if (!wrote)
    return { status: "error" };
  const file = readSessionToken(opts.projectDir);
  if (!file)
    return { status: "error" };
  return { status: "recovered", file };
}
async function recoverSessionToken(opts) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const remoteUrl = opts.remoteUrl ?? resolveMcpUrl();
  const token = opts.token ?? resolveClientBearerToken(remoteUrl);
  if (!token)
    return { status: "no_credential" };
  const recoveryOpts = {
    ...opts,
    gitRemote: opts.gitRemote ?? readGitRemoteFromProjectFile(opts.projectDir)
  };
  opts = recoveryOpts;
  let outcome = await attemptRecovery(remoteUrl, token, opts, fetchImpl);
  if (outcome.status === "error") {
    const delay = Math.floor(Math.random() * RECOVERY_RETRY_JITTER_MS);
    await new Promise((r) => setTimeout(r, delay));
    outcome = await attemptRecovery(remoteUrl, token, opts, fetchImpl);
  }
  return outcome;
}

// dist/hooks/lib/credential-heal.js
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
init_config_runtime();
function isCachedMcpOAuthEntryStale(remoteUrl, now = Date.now()) {
  try {
    const credFile = (0, import_node_path5.resolve)(getHomeDir(), ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs5.readFileSync)(credFile, "utf8"));
    const mcpOAuth = creds.mcpOAuth;
    if (!mcpOAuth)
      return false;
    for (const entry of Object.values(mcpOAuth)) {
      if (entry.serverUrl !== remoteUrl)
        continue;
      if (!entry.accessToken)
        return true;
      if (entry.expiresAt && now >= Number(entry.expiresAt))
        return true;
    }
  } catch {
  }
  return false;
}
var PROTO_POLLUTION_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function removeStaleMcpOAuthEntry(creds, remoteUrl) {
  if (!isPlainObject(creds)) {
    return { creds: /* @__PURE__ */ Object.create(null), removed: [] };
  }
  const out = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(creds)) {
    if (PROTO_POLLUTION_KEYS.has(key))
      continue;
    out[key] = creds[key];
  }
  const mcpOAuth = creds.mcpOAuth;
  if (!isPlainObject(mcpOAuth)) {
    return { creds: out, removed: [] };
  }
  const removed = [];
  const nextMcpOAuth = /* @__PURE__ */ Object.create(null);
  for (const entryKey of Object.keys(mcpOAuth)) {
    if (PROTO_POLLUTION_KEYS.has(entryKey))
      continue;
    const entry = mcpOAuth[entryKey];
    if (isPlainObject(entry) && entry.serverUrl === remoteUrl) {
      removed.push(entryKey);
      continue;
    }
    nextMcpOAuth[entryKey] = entry;
  }
  out.mcpOAuth = nextMcpOAuth;
  return { creds: out, removed };
}
function credentialsFilePath() {
  return (0, import_node_path5.resolve)(getHomeDir(), ".claude", ".credentials.json");
}
var PURGE_CLI_ENV = "GRAMATR_PURGE_STALE_MCP_OAUTH";
function runStaleAuthPurge(remoteUrl) {
  const credFile = credentialsFilePath();
  if (!(0, import_node_fs5.existsSync)(credFile)) {
    return { status: "no-file", removed: [] };
  }
  const parsed = JSON.parse((0, import_node_fs5.readFileSync)(credFile, "utf8"));
  const { creds, removed } = removeStaleMcpOAuthEntry(parsed, remoteUrl);
  if (removed.length === 0) {
    return { status: "nothing-to-remove", removed: [] };
  }
  const backupPath = `${credFile}.gramatr-bak-${Date.now()}`;
  (0, import_node_fs5.copyFileSync)(credFile, backupPath);
  const tmp = `${credFile}.gramatr-tmp-${process.pid}`;
  (0, import_node_fs5.writeFileSync)(tmp, `${JSON.stringify(creds, null, 2)}
`, { encoding: "utf8", mode: 384 });
  try {
    (0, import_node_fs5.renameSync)(tmp, credFile);
  } catch (err) {
    (0, import_node_fs5.rmSync)(tmp, { force: true });
    throw err;
  }
  return { status: "purged", removed, backupPath };
}
function buildStaleAuthPurgeInstruction(remoteUrl, scriptPath) {
  const safePath = (scriptPath ?? "").replace(/'/g, "");
  const safeRemote = remoteUrl.replace(/'/g, "");
  const command = `${PURGE_CLI_ENV}='${safeRemote}' node '${safePath}'`;
  return [
    "gr\u0101matr: your Claude Code login for gr\u0101matr is stuck in a PKCE deadlock \u2014 a half-written",
    "credential is being replayed without a code challenge, so the server keeps returning 400.",
    "Running `/mcp` alone will NOT fix it: it replays the same broken cached entry.",
    "",
    "To unblock, run this once in your shell (it backs up ~/.claude/.credentials.json, then",
    "removes ONLY the stale gr\u0101matr entry \u2014 your other logins are untouched):",
    "",
    `  ${command}`,
    "",
    "Then run `/mcp` in Claude Code and reconnect gr\u0101matr \u2014 it will start a fresh, clean login."
  ].join("\n");
}
function describePurgeOutcome(result, remoteUrl) {
  switch (result.status) {
    case "purged":
      return `gr\u0101matr: removed ${result.removed.length} stale credential entr${result.removed.length === 1 ? "y" : "ies"} for ${remoteUrl}. Backup: ${result.backupPath}
Now run \`/mcp\` in Claude Code and reconnect gr\u0101matr.
`;
    case "nothing-to-remove":
      return `gr\u0101matr: no stale credential entry for ${remoteUrl} was found \u2014 nothing to remove. Your credentials file is unchanged. Run \`/mcp\` and reconnect gr\u0101matr.
`;
    case "no-file":
      return "gr\u0101matr: no ~/.claude/.credentials.json found \u2014 nothing to purge. Run `/mcp` and reconnect gr\u0101matr.\n";
  }
}

// dist/hooks/lib/server-version-watch.js
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
var SERVER_VERSION_FILE = ".server-version";
function getServerVersionPath(projectDir) {
  return (0, import_node_path6.join)(projectDir, GRAMATR_DIR2, SERVER_VERSION_FILE);
}
function extractServerVersion(route) {
  if (!route)
    return null;
  const v2 = route.execution?.summary?.server_version;
  if (typeof v2 === "string" && v2.length > 0)
    return v2;
  const legacy = route.execution_summary?.server_version;
  if (typeof legacy === "string" && legacy.length > 0)
    return legacy;
  return null;
}
function readLastSeenServerVersion(projectDir) {
  try {
    const path = getServerVersionPath(projectDir);
    if (!(0, import_node_fs6.existsSync)(path))
      return null;
    const raw = (0, import_node_fs6.readFileSync)(path, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function writeLastSeenServerVersion(projectDir, version) {
  try {
    const dir = (0, import_node_path6.join)(projectDir, GRAMATR_DIR2);
    if (!(0, import_node_fs6.existsSync)(dir))
      (0, import_node_fs6.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getServerVersionPath(projectDir);
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs6.writeFileSync)(tmp, version + "\n", { encoding: "utf8", mode: 384 });
    (0, import_node_fs6.renameSync)(tmp, dest);
  } catch {
  }
}
function isServerVersionChange(lastSeen, observed) {
  if (!observed)
    return false;
  if (!lastSeen)
    return false;
  return lastSeen !== observed;
}

// dist/bin/ups-route.js
init_hook_promotion_telemetry();

// dist/hooks/lib/version.js
var import_fs2 = require("fs");
var import_path2 = require("path");
var import_url = require("url");
var import_meta = {};
function findPackageJson(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = (0, import_path2.join)(dir, "package.json");
    if ((0, import_fs2.existsSync)(candidate))
      return candidate;
    const parent = (0, import_path2.dirname)(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  return null;
}
function resolveVersion() {
  try {
    if (typeof __GRAMATR_VERSION__ === "string" && __GRAMATR_VERSION__.length > 0) {
      return __GRAMATR_VERSION__;
    }
    const here = (0, import_path2.dirname)((0, import_url.fileURLToPath)(import_meta.url));
    const pkgPath = findPackageJson(here);
    if (!pkgPath)
      return "0.0.0";
    const pkg = JSON.parse((0, import_fs2.readFileSync)(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
var VERSION = resolveVersion();

// dist/hooks/lib/session-root-registry.js
var import_node_fs9 = require("node:fs");
var import_node_path9 = require("node:path");
init_config_runtime();

// dist/hooks/lib/project-state.js
var import_node_child_process = require("node:child_process");
var import_node_fs8 = require("node:fs");
var import_node_path8 = require("node:path");
var GRAMATR_DIR3 = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs8.existsSync)((0, import_node_path8.join)(dir, GRAMATR_DIR3)))
      return dir;
    const parent = (0, import_node_path8.dirname)(dir);
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
  const abs = (p2) => p2.startsWith("/") ? p2 : (0, import_node_path8.join)(dir, p2);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path8.dirname)(absCommonDir);
  if ((0, import_node_fs8.existsSync)((0, import_node_path8.join)(mainRoot, GRAMATR_DIR3)))
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
  const dir = (0, import_node_path8.join)(projectDir, GRAMATR_DIR3);
  return {
    core: (0, import_node_path8.join)(dir, CORE_FILE),
    runtime: (0, import_node_path8.join)(dir, RUNTIME_FILE)
  };
}
function atomicWriteJson(filePath, dir, payload) {
  if (!(0, import_node_fs8.existsSync)(dir)) {
    (0, import_node_fs8.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const tmp = `${filePath}.tmp.${process.pid}`;
  (0, import_node_fs8.writeFileSync)(tmp, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs8.renameSync)(tmp, filePath);
  try {
    (0, import_node_fs8.chmodSync)(filePath, 384);
  } catch {
  }
}
function readJson(filePath) {
  try {
    if (!(0, import_node_fs8.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_node_fs8.readFileSync)(filePath, "utf8"));
  } catch {
    return null;
  }
}
function readRuntime(projectDir) {
  return readJson(getStatePaths(projectDir).runtime) ?? {};
}
function patchRuntime(projectDir, patch) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path8.join)(projectDir, GRAMATR_DIR3);
  const prev = readRuntime(projectDir);
  const next = { ...prev, ...patch };
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return;
  }
  atomicWriteJson(paths.runtime, dir, next);
}
function setCurrentTurnId(projectDir, turnId) {
  patchRuntime(projectDir, { current_turn_id: turnId ?? void 0 });
}

// dist/hooks/lib/session-root-registry.js
var DEFAULT_REGISTRY_TTL_DAYS = 14;
function registryTtlMs() {
  const days = getSessionRegistryTtlDaysFromEnv(DEFAULT_REGISTRY_TTL_DAYS);
  return days * 24 * 60 * 60 * 1e3;
}
function registryDir() {
  return (0, import_node_path9.join)(getHomeDir(), ".gramatr", "sessions");
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
  return (0, import_node_path9.join)(registryDir(), name);
}
function readRaw(path) {
  try {
    if (!(0, import_node_fs9.existsSync)(path))
      return null;
    return JSON.parse((0, import_node_fs9.readFileSync)(path, "utf8"));
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
        (0, import_node_fs9.rmSync)(path, { force: true });
      } catch {
      }
      return null;
    }
  }
  if (!(0, import_node_fs9.existsSync)(raw.project_root)) {
    try {
      (0, import_node_fs9.rmSync)(path, { force: true });
    } catch {
    }
    return null;
  }
  return raw.project_root;
}
function registryDebugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path9.join)(home, ".gramatr", "debug");
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
    if (!(0, import_node_fs9.existsSync)(dir))
      (0, import_node_fs9.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path9.join)(dir, "registry-resolution.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs9.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs9.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > REGISTRY_SAMPLE_CAP) {
      existing = existing.slice(existing.length - REGISTRY_SAMPLE_CAP);
    }
    (0, import_node_fs9.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
  } catch {
  }
}
var REGISTRY_SAMPLE_CAP = 200;
function resolveSessionRoot(opts) {
  if (opts.sessionId) {
    const hit = readSessionRoot(opts.sessionId);
    if (hit) {
      return hit;
    }
    recordRegistryResolution("miss", opts.sessionId, opts.clientType);
  } else {
    recordRegistryResolution("no_session_id", opts.sessionId, opts.clientType);
  }
  return resolveProjectDir({
    cwd: opts.cwd,
    clientType: opts.clientType,
    canonicalizeWorktree: true
  });
}

// dist/proxy/remote-client.js
init_auth();

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
var remoteBackoffOpts = {
  ...HOT_PATH_BACKOFF,
  isRetryable,
  getRetryAfterMs: (err) => err instanceof TransientHttpError ? err.retryAfterMs : void 0
};

// dist/hooks/lib/routing.js
function persistClassificationResult(options) {
  const packet1 = options.route?.packet_1;
  const classification = packet1?.classification || options.route?.classification;
  const executionSummary = packet1?.execution_summary || options.route?.execution_summary;
  const routingSignals = packet1?.routing_signals || options.route?.routing_signals;
  const tokenSavings = packet1?.token_savings || options.route?.token_savings;
  const memoryContext = packet1?.memory_context || options.route?.memory_context;
  setLatestClassification({
    session_id: options.sessionId,
    classifier_model: executionSummary?.classifier_model || null,
    classifier_time_ms: executionSummary?.classifier_time_ms || null,
    tokens_saved: tokenSavings?.total_saved || tokenSavings?.tokens_saved || 0,
    savings_ratio: tokenSavings?.savings_ratio || null,
    effort: classification?.effort_level || null,
    intent: classification?.intent_type || null,
    confidence: classification?.confidence ?? null,
    memory_delivered: memoryContext?.results?.length || null,
    downstream_model: options.downstreamModel || null,
    server_version: executionSummary?.server_version || null,
    stage_timing: executionSummary?.stage_timing ? JSON.stringify(executionSummary.stage_timing) : null,
    recorded_at: Date.now(),
    original_prompt: options.prompt,
    pending_feedback: true,
    feedback_submitted_at: null,
    client_type: options.clientType,
    agent_name: options.agentName,
    memory_tier: null,
    memory_scope: classification?.memory_scope || routingSignals?.memory_scope || null
  });
}

// dist/bin/ups-route.js
init_config_runtime();
var ROUTE_TIMEOUT_MS = 8e3;
var TOKEN_REJECTED_STATUSES = /* @__PURE__ */ new Set([401, 403]);
function resolveUpsRouteProjectDir(input) {
  return resolveSessionRoot({
    sessionId: typeof input.session_id === "string" ? input.session_id : void 0,
    cwd: input.cwd,
    clientType: "claude-code"
  });
}
function loudRecoveryFailureWarning() {
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: "gr\u0101matr: session token missing and recovery failed \u2014 REST surfaces degraded. Run `/mcp` in Claude Code to reconnect, or check connectivity to the gr\u0101matr server."
    }
  };
}
function degradedSurfaceWarning(remoteUrl, now = Date.now(), scriptPath = process.argv[1] ?? "") {
  if (isCachedMcpOAuthEntryStale(remoteUrl, now)) {
    try {
      const result = runStaleAuthPurge(remoteUrl);
      return {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: describePurgeOutcome(result, remoteUrl)
        }
      };
    } catch {
      if (scriptPath) {
        return {
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: buildStaleAuthPurgeInstruction(remoteUrl, scriptPath)
          }
        };
      }
    }
  }
  return loudRecoveryFailureWarning();
}
async function selfHealSessionToken(input, projectDir, fetchImpl) {
  const clientSessionId = typeof input.session_id === "string" ? input.session_id : null;
  const outcome = await recoverSessionToken({
    projectDir,
    clientSessionId,
    fetchImpl
  });
  try {
    const { recordBootstrapRecovered: recordBootstrapRecovered2 } = await Promise.resolve().then(() => (init_hook_promotion_telemetry(), hook_promotion_telemetry_exports));
    recordBootstrapRecovered2({
      session_id: clientSessionId,
      client_type: "claude-code",
      result: outcome.status
    });
  } catch {
  }
  return outcome.status === "recovered" ? outcome.file : null;
}
async function maybeRefreshStaleIdentity(input, projectDir, fetchImpl, alreadyRecovered) {
  if (alreadyRecovered)
    return;
  if (!isUserIdentityStale(readCachedUserIdentity()))
    return;
  await selfHealSessionToken(input, projectDir, fetchImpl);
}
async function computeUpsRoute(input, fetchImpl = fetch, projectDirOverride) {
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (!prompt)
    return {};
  const projectDir = projectDirOverride ?? resolveUpsRouteProjectDir(input);
  const remoteUrl = resolveMcpUrl();
  let token = await resolveUsableSessionToken(projectDir, fetchImpl);
  let selfHealedThisTurn = false;
  if (!token) {
    token = await selfHealSessionToken(input, projectDir, fetchImpl);
    selfHealedThisTurn = true;
    if (!token) {
      return degradedSurfaceWarning(remoteUrl);
    }
  }
  await maybeRefreshStaleIdentity(input, projectDir, fetchImpl, selfHealedThisTurn);
  const reqBody = JSON.stringify({
    prompt,
    client_type: "claude-code",
    // Guard against a broken VERSION resolution (falls back to '0.0.0' when no
    // real package.json version is found on the upward walk) poisoning the
    // server's manifest.update_available computation — mirrors routing.ts's
    // client_version guard (#1869).
    ...VERSION && VERSION !== "0.0.0" ? { client_version: VERSION } : {}
  });
  const t0 = Date.now();
  const record = (forToken, status, additionalContext, route) => {
    appendHookPromotionSample(buildPromotionSample({
      path: "rest",
      session_id: typeof input.session_id === "string" ? input.session_id : "",
      client_type: "claude-code",
      expected_project_id: projectIdFromAud(forToken.aud),
      status,
      latency_ms: Date.now() - t0,
      route,
      packet_bytes: additionalContext != null ? Buffer.byteLength(additionalContext, "utf8") : null
    }));
  };
  const attemptRoute = async (forToken) => {
    const url = `${apiV1Base(forToken.base_url)}/route`;
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...bearerHeader(forToken)
        },
        body: reqBody,
        signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS)
      });
    } catch {
      record(forToken, "error", null, null);
      return { kind: "failed" };
    }
    if (!res.ok) {
      record(forToken, "error", null, null);
      return TOKEN_REJECTED_STATUSES.has(res.status) ? { kind: "token_rejected" } : { kind: "failed" };
    }
    let envelope;
    try {
      envelope = await res.json();
    } catch {
      record(forToken, "error", null, null);
      return { kind: "failed" };
    }
    const hookSpecificOutput = envelope?.hookSpecificOutput;
    if (!hookSpecificOutput || typeof hookSpecificOutput.additionalContext !== "string" || hookSpecificOutput.additionalContext.length === 0) {
      record(forToken, "skipped", null, null);
      return { kind: "failed" };
    }
    const additionalContext = hookSpecificOutput.additionalContext;
    let parsedRoute = null;
    try {
      parsedRoute = JSON.parse(additionalContext);
    } catch {
      parsedRoute = null;
    }
    record(forToken, "ok", additionalContext, parsedRoute);
    return { kind: "ok", envelope, route: parsedRoute };
  };
  let attempt = await attemptRoute(token);
  if (attempt.kind === "token_rejected") {
    const fresh = await selfHealSessionToken(input, projectDir, fetchImpl);
    if (!fresh) {
      return degradedSurfaceWarning(remoteUrl);
    }
    token = fresh;
    attempt = await attemptRoute(token);
    if (attempt.kind !== "ok") {
      return degradedSurfaceWarning(remoteUrl);
    }
  }
  if (attempt.kind !== "ok") {
    return {};
  }
  try {
    persistClassificationResult({
      sessionId: typeof input.session_id === "string" ? input.session_id : "unknown",
      prompt: prompt.slice(0, 500),
      route: attempt.route,
      downstreamModel: getClaudeModelFromEnv(),
      clientType: "claude-code",
      agentName: "Claude Code"
    });
  } catch {
  }
  try {
    const serverTurnId = attempt.envelope.turn_id;
    const turnId = typeof serverTurnId === "string" && serverTurnId.length > 0 ? serverTurnId : crypto.randomUUID();
    setCurrentTurnId(projectDir, turnId);
  } catch {
  }
  if ("turn_id" in attempt.envelope) {
    delete attempt.envelope.turn_id;
  }
  await reconcileServerVersion(input, projectDir, attempt.route, fetchImpl);
  return attempt.envelope;
}
async function reconcileServerVersion(input, projectDir, route, fetchImpl) {
  const observed = extractServerVersion(route);
  if (!observed)
    return;
  const lastSeen = readLastSeenServerVersion(projectDir);
  if (isServerVersionChange(lastSeen, observed)) {
    await selfHealSessionToken(input, projectDir, fetchImpl);
  }
  if (lastSeen !== observed) {
    writeLastSeenServerVersion(projectDir, observed);
  }
}
async function readStdinJson() {
  const chunks = [];
  await new Promise((resolve3) => {
    const t = setTimeout(resolve3, 1e3);
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => {
      clearTimeout(t);
      resolve3();
    });
    process.stdin.on("error", () => {
      clearTimeout(t);
      resolve3();
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
async function main() {
  const input = await readStdinJson();
  const payload = await computeUpsRoute(input);
  process.stdout.write(JSON.stringify(payload));
}
function runPurgeCli(remoteUrl) {
  try {
    const result = runStaleAuthPurge(remoteUrl);
    process.stdout.write(describePurgeOutcome(result, remoteUrl));
    process.exit(0);
  } catch (err) {
    process.stderr.write(`gr\u0101matr: could not purge stale credential \u2014 ${err.message}. Your credentials file (and any backup) is intact; no partial write occurred.
`);
    process.exit(1);
  }
}
if (process.env.GRAMATR_UPS_ROUTE_NO_AUTOSTART !== "1") {
  const purgeRemote = process.env[PURGE_CLI_ENV];
  if (purgeRemote) {
    runPurgeCli(purgeRemote);
  } else {
    main().catch(() => process.stdout.write("{}"));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeUpsRoute,
  degradedSurfaceWarning,
  loudRecoveryFailureWarning,
  main
});
