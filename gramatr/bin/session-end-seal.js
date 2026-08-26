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

// dist/bin/session-end-seal.js
var session_end_seal_exports = {};
__export(session_end_seal_exports, {
  main: () => main,
  runSessionEndSeal: () => runSessionEndSeal,
  sealHandoff: () => sealHandoff,
  sealHandoffAnonymous: () => sealHandoffAnonymous
});
module.exports = __toCommonJS(session_end_seal_exports);

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
  const { token, expires_at, base_url, aud, issued_at, written_at, session_id } = block;
  if (typeof token === "string" && token.length > 0 && typeof expires_at === "string" && expires_at.length > 0 && typeof base_url === "string" && base_url.length > 0 && typeof aud === "string" && aud.length > 0) {
    const file = { token, expires_at, base_url, aud };
    if (typeof issued_at === "string" && issued_at.length > 0)
      file.issued_at = issued_at;
    if (typeof written_at === "string" && written_at.length > 0)
      file.written_at = written_at;
    if (typeof session_id === "string" && session_id.length > 0)
      file.session_id = session_id;
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
function sessionHeader(file) {
  if (!file || !file.session_id)
    return {};
  return { "X-Gramatr-Session": file.session_id };
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
        Authorization: `Bearer ${file.token}`,
        // The presenting (soon-to-expire) token already carries a resolvable
        // session_id server-side, so the renew call is NOT exempt from the
        // binding header (#5258 Unit 3 / #3538, scope doc Open Question 2) —
        // `sessionHeader` degrades to `{}` on an old file with no `session_id`.
        ...sessionHeader(file)
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
    aud: file.aud,
    // session_id (#5258 Unit 2 / #3538): the renew response may not re-send it,
    // so preserve it from the presenting file — same treatment as aud/base_url.
    session_id: file.session_id
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
function clearBufferedTurns(projectDir) {
  try {
    (0, import_node_fs2.rmSync)(getTurnBufferPath(projectDir), { force: true });
  } catch {
  }
}

// dist/hooks/lib/session-root-registry.js
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");

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

// dist/hooks/lib/project-state.js
var import_node_child_process = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");
var GRAMATR_DIR3 = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs3.existsSync)((0, import_node_path3.join)(dir, GRAMATR_DIR3)))
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
  if ((0, import_node_fs3.existsSync)((0, import_node_path3.join)(mainRoot, GRAMATR_DIR3)))
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
    if (!(0, import_node_fs4.existsSync)(path))
      return null;
    return JSON.parse((0, import_node_fs4.readFileSync)(path, "utf8"));
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
        (0, import_node_fs4.rmSync)(path, { force: true });
      } catch {
      }
      return null;
    }
  }
  if (!(0, import_node_fs4.existsSync)(raw.project_root)) {
    try {
      (0, import_node_fs4.rmSync)(path, { force: true });
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
    if (!(0, import_node_fs4.existsSync)(dir))
      (0, import_node_fs4.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path4.join)(dir, "registry-resolution.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs4.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs4.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > REGISTRY_SAMPLE_CAP) {
      existing = existing.slice(existing.length - REGISTRY_SAMPLE_CAP);
    }
    (0, import_node_fs4.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
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

// dist/hooks/lib/turn-flush.js
var TURN_FLUSH_CHUNK_SIZE = 25;
async function chunkFlushTurns(turns, url, token, opts) {
  if (turns.length === 0)
    return "empty";
  for (let i = 0; i < turns.length; i += opts.chunkSize) {
    const chunk = turns.slice(i, i + opts.chunkSize);
    try {
      const res = await opts.fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...bearerHeader(token), ...sessionHeader(token) },
        body: JSON.stringify({ client_type: "claude-code", turns: chunk }),
        signal: AbortSignal.timeout(opts.timeoutMs)
      });
      if (!res.ok)
        return "error";
    } catch {
      return "error";
    }
  }
  return "ok";
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

// dist/bin/session-end-seal.js
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
var SEAL_TIMEOUT_MS = 8e3;
function resolveProjectDir2(sessionId) {
  return resolveSessionRoot({ sessionId, clientType: "claude-code" });
}
function readClientSessionId(projectDir) {
  const gramatrDir = (0, import_node_path5.join)(projectDir, ".gramatr");
  const runtimePath = (0, import_node_path5.join)(gramatrDir, "runtime.json");
  try {
    if ((0, import_node_fs5.existsSync)(runtimePath)) {
      const raw = JSON.parse((0, import_node_fs5.readFileSync)(runtimePath, "utf8"));
      const id = raw?.active_session?.client_session_id;
      if (typeof id === "string" && id.length > 0)
        return id;
    }
  } catch {
  }
  const sessionPath = (0, import_node_path5.join)(gramatrDir, "session.json");
  try {
    if ((0, import_node_fs5.existsSync)(sessionPath)) {
      const raw = JSON.parse((0, import_node_fs5.readFileSync)(sessionPath, "utf8"));
      const id = raw?.client_session_id;
      if (typeof id === "string" && id.length > 0)
        return id;
    }
  } catch {
  }
  return null;
}
async function sealHandoffAnonymous(projectDir, input, fetchImpl = fetch) {
  const clientSessionId = readClientSessionId(projectDir);
  if (!clientSessionId)
    return { status: "no_session_id" };
  const baseUrl = (process.env["GRAMATR_URL"] ?? "https://api.gramatr.com").replace(/\/mcp\/?$/, "").replace(/\/+$/, "");
  const url = `${baseUrl}/api/v1/session/seal`;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_session_id: clientSessionId,
        ...input.reason ? { reason: input.reason } : {}
      }),
      signal: AbortSignal.timeout(SEAL_TIMEOUT_MS)
    });
    return res.ok ? { status: "sealed_anonymous" } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
async function sealHandoff(projectDir, input, fetchImpl = fetch) {
  const token = await resolveUsableSessionToken(projectDir, fetchImpl);
  if (!token)
    return { status: "no_token" };
  const turns = readBufferedTurns(projectDir);
  const url = `${apiV1Base(token.base_url)}/auto-save-handoff`;
  const flushResult = await chunkFlushTurns(turns, url, token, {
    chunkSize: TURN_FLUSH_CHUNK_SIZE,
    timeoutMs: SEAL_TIMEOUT_MS,
    fetchImpl
  });
  if (flushResult === "error")
    return { status: "error" };
  const body = JSON.stringify({
    client_type: "claude-code",
    ...input.reason ? { reason: input.reason } : {}
  });
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...bearerHeader(token),
        ...sessionHeader(token)
      },
      body,
      signal: AbortSignal.timeout(SEAL_TIMEOUT_MS)
    });
    return res.ok ? { status: "sealed" } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
async function runSessionEndSeal(input, fetchImpl = fetch, projectDir = resolveProjectDir2(input.session_id), onStep) {
  const outcome = await sealHandoff(projectDir, input, fetchImpl);
  onStep?.("seal");
  if (outcome.status === "sealed") {
    deleteSessionToken(projectDir);
    clearBufferedTurns(projectDir);
    onStep?.("revoke");
  } else if (outcome.status === "no_token") {
    await sealHandoffAnonymous(projectDir, input, fetchImpl);
  }
  return outcome;
}
async function readStdinJson() {
  return readHookStdin();
}
async function main() {
  const input = await readStdinJson();
  await runSessionEndSeal(input);
  process.stdout.write("{}");
}
if (process.env.GRAMATR_SESSION_END_SEAL_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main,
  runSessionEndSeal,
  sealHandoff,
  sealHandoffAnonymous
});
