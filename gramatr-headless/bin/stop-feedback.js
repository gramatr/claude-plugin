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

// dist/bin/stop-feedback.js
var stop_feedback_exports = {};
__export(stop_feedback_exports, {
  captureBothSidesTurn: () => captureBothSidesTurn,
  flushBufferedTurns: () => flushBufferedTurns,
  main: () => main,
  postTurnFeedback: () => postTurnFeedback,
  runStopFeedback: () => runStopFeedback
});
module.exports = __toCommonJS(stop_feedback_exports);

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

// dist/hooks/lib/turn-buffer.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
var TURNS_FILE = "pending-turns.json";
var MAX_BUFFERED_TURNS = 200;
function getTurnBufferPath(projectDir) {
  return (0, import_node_path2.join)(projectDir, GRAMATR_DIR2, TURNS_FILE);
}
function readBufferedTurns(projectDir) {
  const dest = getTurnBufferPath(projectDir);
  try {
    if (!(0, import_node_fs2.existsSync)(dest))
      return [];
    const parsed = JSON.parse((0, import_node_fs2.readFileSync)(dest, "utf8"));
    if (!Array.isArray(parsed))
      return [];
    return parsed.filter((t) => t != null && typeof t === "object" && typeof t.prompt === "string");
  } catch {
    return [];
  }
}
function writeBufferedTurns(projectDir, turns) {
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR2);
  if (!(0, import_node_fs2.existsSync)(dir)) {
    (0, import_node_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const dest = getTurnBufferPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs2.writeFileSync)(tmp, JSON.stringify(turns, null, 2) + "\n", "utf8");
  (0, import_node_fs2.renameSync)(tmp, dest);
}
function appendBufferedTurn(projectDir, turn) {
  if (!turn || typeof turn.prompt !== "string" || turn.prompt.length === 0)
    return;
  try {
    const turns = readBufferedTurns(projectDir);
    turns.push(turn);
    const capped = turns.length > MAX_BUFFERED_TURNS ? turns.slice(-MAX_BUFFERED_TURNS) : turns;
    writeBufferedTurns(projectDir, capped);
  } catch {
  }
}
function clearBufferedTurns(projectDir) {
  try {
    (0, import_node_fs2.rmSync)(getTurnBufferPath(projectDir), { force: true });
  } catch {
  }
}

// dist/hooks/lib/transcript-parser.js
var import_node_fs3 = require("node:fs");
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
function parseTranscript(transcriptPath) {
  try {
    const transcriptContent = (0, import_node_fs3.readFileSync)(transcriptPath, "utf8");
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
            continue;
          }
          if (Array.isArray(content)) {
            const text = content.filter((block) => block?.type === "text" && typeof block?.text === "string").map((block) => block.text.trim()).filter(Boolean).join("\n").trim();
            if (text)
              lastUserPrompt = text;
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
            lastAssistantText = assistantText;
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

// dist/hooks/lib/movement-capture.js
var import_node_child_process = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_path3 = require("node:path");
var GRAMATR_DIR3 = ".gramatr";
var SNAPSHOT_FILE = "movement-snapshot.json";
var MOVEMENT_GIT_TIMEOUT_MS = 250;
var MOVEMENT_MAX_FILES = 100;
var MOVEMENT_MAX_COMMITS = 50;
var defaultGitRunner = (args, cwd) => {
  try {
    const res = (0, import_node_child_process.spawnSync)("git", args, {
      cwd,
      timeout: MOVEMENT_GIT_TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    });
    if (res.error || res.status !== 0 || res.signal)
      return null;
    return (res.stdout ?? "").trim();
  } catch {
    return null;
  }
};
function snapshotPath(projectDir) {
  return (0, import_node_path3.join)(projectDir, GRAMATR_DIR3, SNAPSHOT_FILE);
}
function readSnapshot(projectDir) {
  try {
    const dest = snapshotPath(projectDir);
    if (!(0, import_node_fs4.existsSync)(dest))
      return null;
    const parsed = JSON.parse((0, import_node_fs4.readFileSync)(dest, "utf8"));
    if (parsed == null || typeof parsed !== "object")
      return null;
    const head = parsed.head;
    return { head: typeof head === "string" ? head : null };
  } catch {
    return null;
  }
}
function writeSnapshot(projectDir, snap) {
  try {
    const dir = (0, import_node_path3.join)(projectDir, GRAMATR_DIR3);
    if (!(0, import_node_fs4.existsSync)(dir))
      (0, import_node_fs4.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = snapshotPath(projectDir);
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs4.writeFileSync)(tmp, JSON.stringify(snap) + "\n", "utf8");
    (0, import_node_fs4.renameSync)(tmp, dest);
  } catch {
  }
}
function classifyPorcelain(xy) {
  if (xy === "??")
    return "untracked";
  const codes = xy.replace(/\s/g, "");
  if (codes.includes("R"))
    return "renamed";
  if (codes.includes("D"))
    return "deleted";
  if (codes.includes("A"))
    return "added";
  return "modified";
}
function parsePorcelain(stdout) {
  const files = [];
  for (const rawLine of stdout.split("\n")) {
    if (!rawLine)
      continue;
    const xy = rawLine.slice(0, 2);
    let rest = rawLine.slice(3);
    if (!rest)
      continue;
    const status = classifyPorcelain(xy);
    const arrow = rest.indexOf(" -> ");
    if (arrow !== -1)
      rest = rest.slice(arrow + 4);
    const path = rest.trim().replace(/^"(.*)"$/, "$1");
    if (!path)
      continue;
    if (path === GRAMATR_DIR3 || path.startsWith(`${GRAMATR_DIR3}/`))
      continue;
    files.push({ path, status });
  }
  return files;
}
var COMMIT_FIELD_SEP = "";
function parseCommits(stdout) {
  const commits = [];
  for (const line of stdout.split("\n")) {
    if (!line || line.startsWith("commit "))
      continue;
    const sep = line.indexOf(COMMIT_FIELD_SEP);
    if (sep === -1)
      continue;
    const sha = line.slice(0, sep).trim();
    const msg = line.slice(sep + 1).trim();
    if (sha)
      commits.push({ sha, msg });
  }
  return commits;
}
function captureMovement(projectDir, run = defaultGitRunner) {
  try {
    const head = run(["rev-parse", "HEAD"], projectDir);
    const isRepo = head !== null || run(["rev-parse", "--is-inside-work-tree"], projectDir) === "true";
    if (!isRepo)
      return null;
    const prev = readSnapshot(projectDir);
    const porcelain = run(["status", "--porcelain"], projectDir);
    const files = porcelain ? parsePorcelain(porcelain) : [];
    let commits = [];
    if (prev?.head && head && prev.head !== head) {
      const range = `${prev.head}..${head}`;
      const log = run(["rev-list", `--pretty=format:%h${COMMIT_FIELD_SEP}%s`, range], projectDir);
      if (log)
        commits = parseCommits(log);
    }
    writeSnapshot(projectDir, { head: head && head.length > 0 ? head : null });
    const cappedFiles = files.length > MOVEMENT_MAX_FILES ? files.slice(0, MOVEMENT_MAX_FILES) : files;
    const cappedCommits = commits.length > MOVEMENT_MAX_COMMITS ? commits.slice(0, MOVEMENT_MAX_COMMITS) : commits;
    if (cappedFiles.length === 0 && cappedCommits.length === 0)
      return null;
    return { files: cappedFiles, commits: cappedCommits };
  } catch {
    return null;
  }
}

// dist/hooks/lib/project-state.js
var import_node_child_process2 = require("node:child_process");
var import_node_fs5 = require("node:fs");
var import_node_path4 = require("node:path");
var GRAMATR_DIR4 = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs5.existsSync)((0, import_node_path4.join)(dir, GRAMATR_DIR4)))
      return dir;
    const parent = (0, import_node_path4.dirname)(dir);
    if (parent === dir)
      return startDir;
    dir = parent;
  }
}
function canonicalizeProjectRoot(dir) {
  const git = (args) => {
    try {
      return (0, import_node_child_process2.execFileSync)("git", args, {
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
  const abs = (p) => p.startsWith("/") ? p : (0, import_node_path4.join)(dir, p);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path4.dirname)(absCommonDir);
  if ((0, import_node_fs5.existsSync)((0, import_node_path4.join)(mainRoot, GRAMATR_DIR4)))
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
  const dir = (0, import_node_path4.join)(projectDir, GRAMATR_DIR4);
  return {
    core: (0, import_node_path4.join)(dir, CORE_FILE),
    runtime: (0, import_node_path4.join)(dir, RUNTIME_FILE)
  };
}
function readJson(filePath) {
  try {
    if (!(0, import_node_fs5.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_node_fs5.readFileSync)(filePath, "utf8"));
  } catch {
    return null;
  }
}
function readRuntime(projectDir) {
  return readJson(getStatePaths(projectDir).runtime) ?? {};
}
function readCurrentTurnId(projectDir) {
  return readRuntime(projectDir).current_turn_id ?? null;
}

// dist/hooks/lib/session-root-registry.js
var import_node_fs6 = require("node:fs");
var import_node_path5 = require("node:path");

// dist/config-runtime.js
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

// dist/hooks/lib/session-root-registry.js
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
    if (!(0, import_node_fs6.existsSync)(path))
      return null;
    return JSON.parse((0, import_node_fs6.readFileSync)(path, "utf8"));
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
        (0, import_node_fs6.rmSync)(path, { force: true });
      } catch {
      }
      return null;
    }
  }
  if (!(0, import_node_fs6.existsSync)(raw.project_root)) {
    try {
      (0, import_node_fs6.rmSync)(path, { force: true });
    } catch {
    }
    return null;
  }
  return raw.project_root;
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
    if (!(0, import_node_fs6.existsSync)(dir))
      (0, import_node_fs6.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path5.join)(dir, "registry-resolution.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs6.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs6.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > REGISTRY_SAMPLE_CAP) {
      existing = existing.slice(existing.length - REGISTRY_SAMPLE_CAP);
    }
    (0, import_node_fs6.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
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

// dist/bin/stop-feedback.js
var FEEDBACK_TIMEOUT_MS = 4e3;
var FLUSH_TIMEOUT_MS = 12e3;
function resolveProjectDir2(sessionId) {
  return resolveSessionRoot({
    sessionId,
    clientType: "claude-code"
  });
}
function captureBothSidesTurn(projectDir, input, parse = parseTranscript, capture = captureMovement) {
  if (!input.transcript_path)
    return null;
  const parsed = parse(input.transcript_path);
  if (!parsed)
    return null;
  const prompt = parsed.lastUserPrompt ?? "";
  if (!prompt)
    return null;
  const response = parsed.lastAssistantText ?? "";
  const movement = capture(projectDir);
  const turnId = readCurrentTurnId(projectDir);
  const turn = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    prompt,
    // full — no truncation
    ...response ? { response } : {},
    // full — no truncation
    ...input.reason ? { stop_reason: input.reason } : {},
    ...movement ? { movement } : {},
    // #3436 — absent when nothing moved
    ...turnId ? { turn_id: turnId } : {}
    // #4040 — absent on pre-#4040 runtimes
  };
  appendBufferedTurn(projectDir, turn);
  return turn;
}
async function postTurnFeedback(projectDir, input, fetchImpl = fetch) {
  const token = await resolveUsableSessionToken(projectDir, fetchImpl);
  if (!token)
    return false;
  const url = `${apiV1Base(token.base_url)}/turn-feedback`;
  const body = JSON.stringify({
    client_type: "claude-code",
    ...input.reason ? { stop_reason: input.reason } : {}
  });
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...bearerHeader(token)
      },
      body,
      signal: AbortSignal.timeout(FEEDBACK_TIMEOUT_MS)
    });
    return res.ok;
  } catch {
    return false;
  }
}
async function flushBufferedTurns(projectDir, fetchImpl = fetch) {
  const turns = readBufferedTurns(projectDir);
  if (turns.length === 0)
    return true;
  const token = await resolveUsableSessionToken(projectDir, fetchImpl);
  if (!token)
    return false;
  const url = `${apiV1Base(token.base_url)}/auto-save-handoff`;
  const body = JSON.stringify({ client_type: "claude-code", turns });
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...bearerHeader(token)
      },
      body,
      signal: AbortSignal.timeout(FLUSH_TIMEOUT_MS)
    });
    if (res.ok) {
      clearBufferedTurns(projectDir);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
async function runStopFeedback(input, fetchImpl = fetch, projectDir = resolveProjectDir2(typeof input.session_id === "string" ? input.session_id : void 0), parse = parseTranscript) {
  try {
    captureBothSidesTurn(projectDir, input, parse);
  } catch {
  }
  try {
    await postTurnFeedback(projectDir, input, fetchImpl);
  } catch {
  }
  try {
    await flushBufferedTurns(projectDir, fetchImpl);
  } catch {
  }
}
async function readStdinJson() {
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
async function main() {
  const input = await readStdinJson();
  await runStopFeedback(input);
  process.stdout.write("{}");
}
if (process.env.GRAMATR_STOP_FEEDBACK_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  captureBothSidesTurn,
  flushBufferedTurns,
  main,
  postTurnFeedback,
  runStopFeedback
});
