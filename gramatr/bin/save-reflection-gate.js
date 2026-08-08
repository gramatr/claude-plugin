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
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/bin/save-reflection-gate.js
var save_reflection_gate_exports = {};
__export(save_reflection_gate_exports, {
  runSaveReflectionGateHook: () => runSaveReflectionGateHook
});
module.exports = __toCommonJS(save_reflection_gate_exports);

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
function getGramatrStateDir() {
  const dir = getGramatrDirFromEnv() || (0, import_node_path.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path.join)(dir, ".state");
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

// dist/hooks/lib/turn-exit-verifier.js
var import_node_fs3 = require("node:fs");
var import_node_path2 = require("node:path");

// dist/hooks/lib/transcript-parser.js
var import_node_fs2 = require("node:fs");
function extractLastTurnToolCalls(transcriptPath) {
  const out = /* @__PURE__ */ new Set();
  try {
    const content = (0, import_node_fs2.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type === "user" || entry.type === "human")
          break;
        if (entry.type !== "assistant")
          continue;
        const blocks = entry.message?.content;
        if (!Array.isArray(blocks))
          continue;
        for (const block of blocks) {
          if (block?.type === "tool_use" && typeof block?.name === "string") {
            out.add(block.name);
          }
        }
      } catch {
      }
    }
  } catch {
  }
  return out;
}
var ISC_SUBJECT_PATTERN = /^\s*ISC-[CA]\d+\s*:/i;
var CLOSED_STATUSES = /* @__PURE__ */ new Set(["completed", "done"]);
function extractIscTaskLifecycle(transcriptPath) {
  const createdIscSubjects = [];
  let closedAny = false;
  try {
    const content = (0, import_node_fs2.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type === "user" || entry.type === "human")
          break;
        if (entry.type !== "assistant")
          continue;
        const blocks = entry.message?.content;
        if (!Array.isArray(blocks))
          continue;
        for (const block of blocks) {
          if (block?.type !== "tool_use" || typeof block?.name !== "string")
            continue;
          const short = block.name.split("__").pop();
          const inputObj = block.input ?? {};
          if (short === "TaskCreate") {
            const subject = inputObj.subject;
            if (typeof subject === "string" && ISC_SUBJECT_PATTERN.test(subject)) {
              createdIscSubjects.push(subject.trim());
            }
          } else if (short === "TaskUpdate") {
            const status = inputObj.status;
            if (typeof status === "string" && CLOSED_STATUSES.has(status.toLowerCase())) {
              closedAny = true;
            }
          }
        }
      } catch {
      }
    }
  } catch {
  }
  return { createdIscSubjects, closedAny };
}

// dist/hooks/lib/turn-exit-verifier.js
var MAX_BLOCKS_PER_TURN = 2;
var REFLECTION_EFFORT_LEVELS = /* @__PURE__ */ new Set([
  "standard",
  "extended",
  "deep",
  "comprehensive"
]);
var BLOCKABLE_GATES = [
  {
    id: "classification_feedback",
    tool: "classification_feedback",
    remediation: "Call mcp__plugin_gramatr_gramatr__classification_feedback with the original prompt verbatim (was_correct + original_prompt at minimum), then finish.",
    appliesTo: () => true
  },
  {
    id: "save_reflection",
    tool: "save_reflection",
    remediation: "Call mcp__plugin_gramatr_gramatr__save_reflection with the Q1/Q2/Q3 LEARN-phase reflection, then finish.",
    appliesTo: (effort) => effort !== null && REFLECTION_EFFORT_LEVELS.has(effort)
  }
];
var ISC_CLOSURE_GATE_ID = "isc_task_closure";
function iscClosureRemediation(subjects) {
  const preview = subjects.slice(0, 3).map((s) => `"${s}"`).join(", ");
  const more = subjects.length > 3 ? ` (+${subjects.length - 3} more)` : "";
  return `You created ${subjects.length} ISC task(s) this turn \u2014 e.g. ${preview}${more} \u2014 but closed none of them. Call TaskUpdate with status "completed" for each ISC task whose work has demonstrably landed (every linked Quality Gate criterion adjudicated), then finish. Leaving created ISC tasks open is rubber-stamping by omission \u2014 creation is enforced, so is completion.`;
}
function evaluateIscClosureGate(lifecycle) {
  if (!lifecycle || lifecycle.createdIscSubjects.length === 0)
    return null;
  if (lifecycle.closedAny)
    return null;
  return {
    id: ISC_CLOSURE_GATE_ID,
    remediation: iscClosureRemediation(lifecycle.createdIscSubjects)
  };
}
function isVerifierEnabled(env = process.env) {
  const v = env.GRAMATR_TURN_EXIT_VERIFIER;
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}
function normaliseCalledTools(called) {
  const out = /* @__PURE__ */ new Set();
  for (const name of called) {
    out.add(name);
    const parts = name.split("__");
    out.add(parts[parts.length - 1] ?? name);
  }
  return out;
}
function capStashDir() {
  return (0, import_node_path2.join)(getGramatrStateDir(), "turn-exit-gates");
}
function capStashPath(sessionId) {
  const safe = sessionId.replace(/[^A-Za-z0-9_-]/g, "_");
  return (0, import_node_path2.join)(capStashDir(), `${safe}.json`);
}
function readCapStash(sessionId) {
  try {
    const path = capStashPath(sessionId);
    if (!(0, import_node_fs3.existsSync)(path))
      return null;
    const parsed = JSON.parse((0, import_node_fs3.readFileSync)(path, "utf8"));
    if (typeof parsed?.block_count !== "number")
      return null;
    return parsed;
  } catch {
    return null;
  }
}
function writeCapStash(stash) {
  try {
    const dir = capStashDir();
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true });
    (0, import_node_fs3.writeFileSync)(capStashPath(stash.session_id), JSON.stringify(stash, null, 2));
  } catch {
  }
}
function deriveTurnKey(transcriptPath) {
  try {
    const content = (0, import_node_fs3.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type === "user" || entry.type === "human") {
          return `u${i}`;
        }
      } catch {
      }
    }
    return `n${lines.length}`;
  } catch {
    return "unknown";
  }
}
function verifyTurnGates(opts) {
  const allow = (extra) => ({
    block: false,
    stderr: "",
    unmetGates: [],
    capReached: false,
    blockCount: 0,
    ...extra
  });
  try {
    const called = normaliseCalledTools(opts.calledTools);
    const gateFilter = opts.gateIds ? new Set(opts.gateIds) : null;
    const unmet = BLOCKABLE_GATES.filter((gate) => (!gateFilter || gateFilter.has(gate.id)) && gate.appliesTo(opts.effort) && !called.has(gate.tool)).map((g) => ({ id: g.id, remediation: g.remediation }));
    if (!gateFilter || gateFilter.has(ISC_CLOSURE_GATE_ID)) {
      const iscUnmet = evaluateIscClosureGate(opts.iscLifecycle);
      if (iscUnmet)
        unmet.push(iscUnmet);
    }
    if (unmet.length === 0) {
      return allow();
    }
    const prior = readCapStash(opts.sessionId);
    const sameTurn = prior !== null && prior.turn_key === opts.turnKey;
    const priorCount = sameTurn ? prior.block_count : 0;
    if (priorCount >= MAX_BLOCKS_PER_TURN) {
      return allow({
        unmetGates: unmet.map((g) => g.id),
        capReached: true,
        blockCount: priorCount
      });
    }
    const newCount = priorCount + 1;
    writeCapStash({
      session_id: opts.sessionId,
      turn_key: opts.turnKey,
      block_count: newCount,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    const lines = unmet.map((g) => `  \u2022 HARD gate unmet: ${g.id} not satisfied this turn.
    \u2192 ${g.remediation}`);
    const stderr = `gr\u0101matr turn-exit verifier \u2014 ${unmet.length} HARD gate(s) unmet (block ${newCount}/${MAX_BLOCKS_PER_TURN}). You may not finish yet:
` + lines.join("\n") + `

Complete the action(s) above, then stop.`;
    return {
      block: true,
      stderr,
      unmetGates: unmet.map((g) => g.id),
      capReached: false,
      blockCount: newCount
    };
  } catch {
    return allow();
  }
}
function runTurnExitVerifier(opts) {
  try {
    const calledTools = extractLastTurnToolCalls(opts.transcriptPath);
    const turnKey = deriveTurnKey(opts.transcriptPath);
    const iscLifecycle = extractIscTaskLifecycle(opts.transcriptPath);
    return verifyTurnGates({
      effort: opts.effort,
      calledTools,
      sessionId: opts.sessionId,
      turnKey,
      iscLifecycle,
      gateIds: opts.gateIds
    });
  } catch {
    return {
      block: false,
      stderr: "",
      unmetGates: [],
      capReached: false,
      blockCount: 0
    };
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

// dist/bin/save-reflection-gate.js
var SAVE_REFLECTION_GATE_IDS = ["save_reflection"];
function runSaveReflectionGateHook(input) {
  const sessionId = typeof input.session_id === "string" ? input.session_id : null;
  const transcriptPath = typeof input.transcript_path === "string" ? input.transcript_path : null;
  if (!sessionId || !transcriptPath || !isVerifierEnabled()) {
    return { block: false, stderr: "" };
  }
  try {
    const effort = getLatestClassification(sessionId)?.effort ?? null;
    const verdict = runTurnExitVerifier({
      effort,
      transcriptPath,
      sessionId,
      gateIds: SAVE_REFLECTION_GATE_IDS
    });
    if (verdict.block && verdict.stderr) {
      return { block: true, stderr: verdict.stderr };
    }
    if (verdict.capReached) {
      process.stderr.write("[gramatr] save_reflection gate \u2014 remediation cap reached; allowing stop with the gate unmet\n");
    }
    return { block: false, stderr: "" };
  } catch {
    return { block: false, stderr: "" };
  }
}
async function main() {
  const input = await readHookStdin();
  const result = runSaveReflectionGateHook(input);
  if (result.block) {
    process.stderr.write(result.stderr + "\n");
    process.exit(2);
  }
  process.stdout.write("{}");
}
if (process.env.GRAMATR_SAVE_REFLECTION_GATE_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runSaveReflectionGateHook
});
