#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// dist/config-runtime.js
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

// dist/hooks/lib/hook-state.js
var import_node_sqlite = require("node:sqlite");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
init_config_runtime();

// dist/hooks/generated/hook-timeouts.js
var SUBAGENT_ROUTE_FRESHNESS_THRESHOLD_MS = 18e5;
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;

// dist/hooks/lib/hook-state.js
var Database = import_node_sqlite.DatabaseSync;
var _db = null;
var _filesystemAvailable = true;
function getDbPath() {
  if (process.env.GRAMATR_STATE_DB)
    return process.env.GRAMATR_STATE_DB;
  const dir = getGramatrDirFromEnv() || (0, import_node_path.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path.join)(dir, "state.db");
}
function getDb() {
  if (_db)
    return _db;
  const path2 = getDbPath();
  if (path2 !== ":memory:") {
    try {
      const dir = (0, import_node_path.dirname)(path2);
      if (!(0, import_node_fs.existsSync)(dir))
        (0, import_node_fs.mkdirSync)(dir, { recursive: true });
    } catch {
      _filesystemAvailable = false;
    }
  }
  try {
    _db = new Database(_filesystemAvailable ? path2 : ":memory:");
    if (_filesystemAvailable && path2 !== ":memory:") {
      try {
        (0, import_node_fs.chmodSync)(path2, 384);
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
function getSessionContextByProject(projectId) {
  const row = getDb().prepare("SELECT * FROM session_context WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1").get(projectId);
  return row ?? null;
}
function getLatestClassification(sessionId) {
  const row = getDb().prepare("SELECT * FROM latest_classification WHERE session_id = ?").get(sessionId);
  if (!row)
    return null;
  return { ...row, pending_feedback: row.pending_feedback === 1 };
}

// dist/hooks/lib/gramatr-hook-utils.js
var import_child_process = require("child_process");
var import_path = require("path");

// dist/hooks/lib/git-remote-parser.js
function parseGitRemote(url) {
  if (!url || typeof url !== "string")
    return null;
  const trimmed = url.trim();
  if (!trimmed)
    return null;
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const scpMatch = !hasProtocol && trimmed.match(/^[^@]+@[^:]+:(.+?)(?:\.git)?\s*$/);
  if (scpMatch) {
    const path2 = scpMatch[1];
    return extractOwnerRepo(path2);
  }
  const protoMatch = trimmed.match(/^(?:https?|ssh|git):\/\//);
  if (protoMatch) {
    try {
      let normalized = trimmed;
      const sshPortMatch = normalized.match(/^ssh:\/\/([^/]+):(\d+)\/(.+)$/);
      if (sshPortMatch) {
        normalized = `ssh://${sshPortMatch[1]}/${sshPortMatch[3]}`;
      }
      const parsed = new URL(normalized);
      let pathname = parsed.pathname;
      if (pathname.startsWith("/")) {
        pathname = pathname.slice(1);
      }
      if (pathname.endsWith(".git")) {
        pathname = pathname.slice(0, -4);
      }
      if (pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1);
      }
      return extractOwnerRepo(pathname);
    } catch {
      return null;
    }
  }
  return null;
}
function extractOwnerRepo(path2) {
  if (!path2)
    return null;
  const slashIndex = path2.indexOf("/");
  if (slashIndex < 1)
    return null;
  const segments = path2.split("/");
  if (segments.some((s) => !s))
    return null;
  return path2;
}

// dist/hooks/lib/git-config-reader.js
var import_fs = require("fs");
var path = __toESM(require("path"), 1);
function readGitRemoteFromConfigSync(cwd) {
  const gitPath = path.join(cwd, ".git");
  if (!(0, import_fs.existsSync)(gitPath))
    return null;
  let configPath = path.join(gitPath, "config");
  if (!(0, import_fs.existsSync)(configPath)) {
    let ptrRaw;
    try {
      ptrRaw = (0, import_fs.readFileSync)(gitPath, "utf8");
    } catch {
      return null;
    }
    const ptr = ptrRaw.match(/gitdir:\s*(.+)/)?.[1]?.trim();
    if (!ptr)
      return null;
    const resolved = path.isAbsolute(ptr) ? ptr : path.resolve(cwd, ptr);
    configPath = path.join(resolved, "config");
  }
  let cfg;
  try {
    cfg = (0, import_fs.readFileSync)(configPath, "utf8");
  } catch {
    return null;
  }
  const origin = cfg.match(/\[remote\s+"origin"\][^[]*?url\s*=\s*(.+)/)?.[1]?.trim();
  if (origin)
    return origin;
  const any = cfg.match(/\[remote\s+"[^"]+"\][^[]*?url\s*=\s*(.+)/)?.[1]?.trim();
  return any ?? null;
}

// dist/hooks/lib/gramatr-hook-utils.js
init_config_runtime();
var HOME = getHomeDir();
function getGitContext() {
  try {
    const isGit = (0, import_child_process.execSync)("git rev-parse --is-inside-work-tree", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (isGit !== "true")
      return null;
    const root = (0, import_child_process.execSync)("git rev-parse --show-toplevel", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const remote = readGitRemoteFromConfigSync(root) ?? "no-remote";
    const branch = (0, import_child_process.execSync)("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const commit = (0, import_child_process.execSync)("git rev-parse --short HEAD", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const projectName = (0, import_path.basename)(root);
    return { root, remote, branch, commit, projectName };
  } catch {
    return null;
  }
}
function deriveProjectId(gitRemote, fallbackName) {
  if (!gitRemote || gitRemote === "no-remote") {
    return fallbackName || "unknown";
  }
  const parsed = parseGitRemote(gitRemote);
  return parsed || fallbackName || "unknown";
}

// dist/hooks/subagent-route.js
function readStdin(timeoutMs) {
  return new Promise((resolve2) => {
    let data = "";
    const timer = setTimeout(() => resolve2(data), timeoutMs);
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve2(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve2(data);
    });
    process.stdin.resume();
  });
}
var FRESHNESS_THRESHOLD_MS = SUBAGENT_ROUTE_FRESHNESS_THRESHOLD_MS;
var STALE_REMINDER = "[gramatr] No fresh route_request classification found for this sub-agent launch. Call route_request with the sub-task prompt, then pass the Quality Gate scaffold from enrichment.data.reasoning.quality_gate_criteria as the sub-agent's acceptance criteria, and orchestration.agents.agent_defs[0] as the sub-agent's system prompt.";
var FRESH_REMINDER = "[gramatr] Sub-agent launch \u2014 remember to pass the Quality Gate scaffold from enrichment.data.reasoning.quality_gate_criteria as the sub-agent's acceptance criteria, and orchestration.agents.agent_defs[0] as its system prompt.";
function buildOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: "SubagentStart", additionalContext } };
}
function checkSubagentClassificationFreshness(sessionId, nowMs = Date.now()) {
  const record = getLatestClassification(sessionId);
  if (!record || !record.recorded_at) {
    return { allow: false, reason: STALE_REMINDER };
  }
  const ageMs = nowMs - record.recorded_at;
  if (ageMs > FRESHNESS_THRESHOLD_MS) {
    return { allow: false, reason: STALE_REMINDER };
  }
  return { allow: true };
}
async function runSubagentRouteHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify({}));
    return 0;
  }
  try {
    JSON.parse(raw);
    const git = getGitContext();
    const projectId = git ? deriveProjectId(git.remote, git.projectName) : null;
    const ctx = projectId ? getSessionContextByProject(projectId) : null;
    const interactionId = ctx?.interaction_id || ctx?.session_id || "unknown";
    const result = checkSubagentClassificationFreshness(interactionId);
    const message = result.allow ? FRESH_REMINDER : result.reason ?? STALE_REMINDER;
    process.stdout.write(JSON.stringify(buildOutput(message)));
  } catch {
    process.stdout.write(JSON.stringify({}));
  }
  return 0;
}

// dist/bin/subagent-route.js
if (process.env.GRAMATR_SUBAGENT_ROUTE_NO_AUTOSTART !== "1") {
  runSubagentRouteHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
