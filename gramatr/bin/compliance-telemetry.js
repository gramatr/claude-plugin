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
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/bin/compliance-telemetry.js
var compliance_telemetry_exports = {};
__export(compliance_telemetry_exports, {
  runComplianceTelemetryHook: () => runComplianceTelemetryHook
});
module.exports = __toCommonJS(compliance_telemetry_exports);

// dist/hooks/lib/hook-state.js
var import_node_sqlite = require("node:sqlite");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
init_config_runtime();
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
  const path = getDbPath();
  if (path !== ":memory:") {
    try {
      const dir = (0, import_node_path.dirname)(path);
      if (!(0, import_node_fs.existsSync)(dir))
        (0, import_node_fs.mkdirSync)(dir, { recursive: true });
    } catch {
      _filesystemAvailable = false;
    }
  }
  try {
    _db = new Database(_filesystemAvailable ? path : ":memory:");
    if (_filesystemAvailable && path !== ":memory:") {
      try {
        (0, import_node_fs.chmodSync)(path, 384);
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

// dist/hooks/lib/compliance-telemetry.js
var import_node_fs3 = require("node:fs");
var import_node_path2 = require("node:path");
init_config_runtime();

// dist/hooks/lib/transcript-parser.js
var import_node_fs2 = require("node:fs");
function extractAssistantText(content) {
  if (typeof content === "string")
    return content.trim();
  if (!Array.isArray(content))
    return "";
  return content.filter((block) => block?.type === "text" && typeof block?.text === "string").map((block) => block.text.trim()).filter(Boolean).join("\n").trim();
}
function extractHandoffFromToolUse(content) {
  if (!Array.isArray(content))
    return null;
  for (const block of content) {
    if (block?.type === "tool_use" && (block?.name === "save_handoff" || block?.name === "saveHandoff") && block?.input != null) {
      const input = block.input;
      const result = {};
      if (typeof input.where_we_are === "string" && input.where_we_are.trim())
        result.where_we_are = input.where_we_are.trim();
      if (typeof input.whats_next === "string" && input.whats_next.trim())
        result.whats_next = input.whats_next.trim();
      if (typeof input.key_context === "string" && input.key_context.trim())
        result.key_context = input.key_context.trim();
      if (typeof input.dont_forget === "string" && input.dont_forget.trim())
        result.dont_forget = input.dont_forget.trim();
      if (Object.keys(result).length > 0)
        return result;
    }
  }
  return null;
}
function extractHandoffFromMarkdown(text) {
  const fieldMap = {
    where_we_are: "where_we_are",
    whats_next: "whats_next",
    "what's_next": "whats_next",
    key_context: "key_context",
    dont_forget: "dont_forget"
  };
  const headerPattern = /^##\s+(where_we_are|whats_next|what's_next|key_context|dont_forget)\s*$/im;
  if (!headerPattern.test(text))
    return null;
  const result = {};
  const sections = text.split(/^##\s+/m);
  for (const section of sections) {
    const newline = section.indexOf("\n");
    if (newline === -1)
      continue;
    const headerRaw = section.slice(0, newline).trim().toLowerCase();
    const body = section.slice(newline + 1).trim();
    if (!body)
      continue;
    const field = fieldMap[headerRaw];
    if (field) {
      result[field] = body;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
var BUILD_PHASE_TOOLS = /* @__PURE__ */ new Set(["Write", "Edit", "MultiEdit", "NotebookEdit", "TaskCreate"]);
function extractPlanThenStopSignal(transcriptPath) {
  try {
    const content = (0, import_node_fs2.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    let boundary = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type === "user" || entry.type === "human") {
          boundary = i;
          break;
        }
      } catch {
      }
    }
    let sawPlanTransition = false;
    let sawBuildAfterPlan = false;
    for (let i = boundary + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (entry.type !== "assistant")
        continue;
      const blocks = entry.message?.content;
      if (!Array.isArray(blocks))
        continue;
      for (const block of blocks) {
        if (block?.type !== "tool_use" || typeof block?.name !== "string")
          continue;
        const short = block.name.split("__").pop();
        if (short === "phase_transition") {
          const phase = block.input?.phase;
          if (typeof phase === "string" && phase.toLowerCase() === "plan") {
            sawPlanTransition = true;
          }
        } else if (sawPlanTransition && BUILD_PHASE_TOOLS.has(short)) {
          sawBuildAfterPlan = true;
        }
      }
    }
    if (!sawPlanTransition)
      return "not_applicable";
    return sawBuildAfterPlan ? "continued" : "stopped";
  } catch {
    return "not_applicable";
  }
}
function parseTranscript(transcriptPath) {
  try {
    const transcriptContent = (0, import_node_fs2.readFileSync)(transcriptPath, "utf8");
    const lines = transcriptContent.trim().split("\n");
    let lastUserPrompt = "";
    let lastAssistantText = "";
    let structured;
    for (const line of lines) {
      if (!line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type === "human" || entry.type === "user") {
          const content = entry.message?.content;
          if (typeof content === "string" && content.trim()) {
            lastUserPrompt = content.trim();
            lastAssistantText = "";
            continue;
          }
          if (Array.isArray(content)) {
            const isToolResultOnly = content.every((block) => block?.type === "tool_result");
            const text = content.filter((block) => block?.type === "text" && typeof block?.text === "string").map((block) => block.text.trim()).filter(Boolean).join("\n").trim();
            if (text) {
              lastUserPrompt = text;
              if (!isToolResultOnly)
                lastAssistantText = "";
            }
          }
          continue;
        }
        if (entry.type === "assistant") {
          const content = entry.message?.content;
          const toolUseResult = extractHandoffFromToolUse(content);
          if (toolUseResult) {
            structured = toolUseResult;
          }
          const assistantText = extractAssistantText(content);
          if (assistantText)
            lastAssistantText = lastAssistantText ? lastAssistantText + "\n" + assistantText : assistantText;
        }
      } catch {
      }
    }
    if (!structured && lastAssistantText) {
      const markdownResult = extractHandoffFromMarkdown(lastAssistantText);
      if (markdownResult)
        structured = markdownResult;
    }
    return { lastUserPrompt, lastAssistantText, structured };
  } catch {
    return null;
  }
}

// dist/hooks/lib/compliance-telemetry.js
var MAX_SAMPLES = 200;
var CHECKPOINT_PATTERN = /gr[āa]matr\s*✓\s*understood:/i;
var UPDATE_CUE_PATTERN = /⚠\s*update\s*→/;
function readUpdateCueExpected(projectDir) {
  try {
    const path = (0, import_node_path2.join)(projectDir, ".gramatr", "statusline.txt");
    if (!(0, import_node_fs3.existsSync)(path))
      return false;
    const text = (0, import_node_fs3.readFileSync)(path, "utf8");
    return UPDATE_CUE_PATTERN.test(text);
  } catch {
    return false;
  }
}
function evaluateCompliance(args) {
  let lastAssistantText = "";
  try {
    lastAssistantText = parseTranscript(args.transcriptPath)?.lastAssistantText ?? "";
  } catch {
    lastAssistantText = "";
  }
  const checkpointPresent = CHECKPOINT_PATTERN.test(lastAssistantText);
  const updateCueExpected = readUpdateCueExpected(args.projectDir);
  const updateCuePresent = updateCueExpected ? UPDATE_CUE_PATTERN.test(lastAssistantText) : null;
  const planThenStop = extractPlanThenStopSignal(args.transcriptPath);
  return {
    effort: args.effort,
    checkpoint_present: checkpointPresent,
    update_cue_expected: updateCueExpected,
    update_cue_present: updateCuePresent,
    plan_then_stop: planThenStop
  };
}
function debugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path2.join)(home, ".gramatr", "debug");
}
function recordComplianceSample(args) {
  const sample = {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    session_id: args.session_id,
    effort: args.effort,
    checkpoint_present: args.checkpoint_present,
    update_cue_expected: args.update_cue_expected,
    update_cue_present: args.update_cue_present,
    plan_then_stop: args.plan_then_stop
  };
  try {
    const dir = debugDir();
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path2.join)(dir, "compliance-telemetry.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs3.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs3.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs3.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
  } catch {
  }
}

// dist/hooks/lib/session-root-registry.js
var import_node_fs5 = require("node:fs");
var import_node_path4 = require("node:path");
init_config_runtime();

// dist/hooks/lib/project-state.js
var import_node_child_process = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_path3 = require("node:path");
var GRAMATR_DIR = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs4.existsSync)((0, import_node_path3.join)(dir, GRAMATR_DIR)))
      return dir;
    const parent = (0, import_node_path3.dirname)(dir);
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
  const abs = (p) => p.startsWith("/") ? p : (0, import_node_path3.join)(dir, p);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path3.dirname)(absCommonDir);
  if ((0, import_node_fs4.existsSync)((0, import_node_path3.join)(mainRoot, GRAMATR_DIR)))
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

// dist/hooks/lib/session-root-registry.js
var DEFAULT_REGISTRY_TTL_DAYS = 14;
function registryTtlMs() {
  const days = getSessionRegistryTtlDaysFromEnv(DEFAULT_REGISTRY_TTL_DAYS);
  return days * 24 * 60 * 60 * 1e3;
}
function registryDir() {
  return (0, import_node_path4.join)(getHomeDir(), ".gramatr", "sessions");
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
  return (0, import_node_path4.join)(registryDir(), name);
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
function registryDebugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path4.join)(home, ".gramatr", "debug");
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
    const jsonlPath = (0, import_node_path4.join)(dir, "registry-resolution.jsonl");
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

// dist/bin/compliance-telemetry.js
function runComplianceTelemetryHook(input) {
  const sessionId = typeof input.session_id === "string" ? input.session_id : null;
  const transcriptPath = typeof input.transcript_path === "string" ? input.transcript_path : null;
  if (!sessionId || !transcriptPath)
    return;
  try {
    const projectDir = resolveSessionRoot({
      sessionId,
      cwd: input.cwd,
      clientType: "claude-code"
    });
    const effort = getLatestClassification(sessionId)?.effort ?? null;
    const evaluation = evaluateCompliance({ transcriptPath, projectDir, effort });
    recordComplianceSample({ session_id: sessionId, ...evaluation });
  } catch {
  }
}
async function main() {
  const input = await readHookStdin();
  runComplianceTelemetryHook(input);
  process.stdout.write("{}");
}
if (process.env.GRAMATR_COMPLIANCE_TELEMETRY_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runComplianceTelemetryHook
});
