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
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/hooks/generated/hook-timeouts.js
var init_hook_timeouts = __esm({
  "dist/hooks/generated/hook-timeouts.js"() {
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
  return (0, import_node_path3.join)(home, ".gramatr", "debug");
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
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path3.join)(dir, "turn1-arming.jsonl");
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
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path3.join)(dir, "bootstrap-recovered.jsonl");
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
function appendHookPromotionSample(sample) {
  try {
    const dir = debugDir();
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path3.join)(dir, "hook-promotion.jsonl");
    const lastPath = (0, import_node_path3.join)(dir, "last-sample.json");
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
    (0, import_node_fs3.writeFileSync)(lastPath, JSON.stringify(sample, null, 2), "utf8");
  } catch {
  }
}
var import_node_fs3, import_node_path3, MAX_SAMPLES;
var init_hook_promotion_telemetry = __esm({
  "dist/hooks/lib/hook-promotion-telemetry.js"() {
    "use strict";
    import_node_fs3 = require("node:fs");
    import_node_path3 = require("node:path");
    init_config_runtime();
    MAX_SAMPLES = 200;
  }
});

// dist/bin/ups-route.js
var ups_route_exports = {};
__export(ups_route_exports, {
  computeUpsRoute: () => computeUpsRoute,
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
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
init_config_runtime();

// dist/hooks/lib/gramatr-hook-utils.js
var import_fs = require("fs");
var import_path = require("path");
init_config_runtime();
init_hook_timeouts();

// dist/hooks/lib/hook-state.js
var import_node_sqlite = require("node:sqlite");
init_config_runtime();
init_hook_timeouts();

// dist/hooks/lib/gramatr-hook-utils.js
var HOME = getHomeDir();
function resolveMcpUrl() {
  try {
    const configPath = (0, import_path.join)(HOME, ".gramatr.json");
    const config = JSON.parse((0, import_fs.readFileSync)(configPath, "utf8"));
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

// dist/hooks/lib/bootstrap-recovery.js
function readGitRemoteFromProjectFile(projectDir) {
  try {
    const proj = JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(projectDir, ".gramatr", "project.json"), "utf8"));
    const drift = proj.drift;
    const remote = typeof proj.git_remote === "string" && proj.git_remote || drift && typeof drift.git_remote === "string" && drift.git_remote || null;
    return remote || null;
  } catch {
    return null;
  }
}
var RECOVERY_TIMEOUT_MS = 3e3;
var RECOVERY_RETRY_JITTER_MS = 250;
function resolveClientBearerToken(remoteUrl) {
  const envApiKey = process.env.GRAMATR_API_KEY ?? "";
  const envToken = process.env.GRAMATR_TOKEN ?? "";
  const env = sanitizeEnvToken(envApiKey) || sanitizeEnvToken(envToken);
  if (env)
    return env;
  const pluginDataDir = process.env.CLAUDE_PLUGIN_DATA ?? "";
  if (pluginDataDir) {
    try {
      const cfg = JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(pluginDataDir, "token.json"), "utf8"));
      if (typeof cfg.token === "string" && cfg.token)
        return cfg.token;
    } catch {
    }
  }
  try {
    const credFile = (0, import_node_path2.resolve)(getHomeDir(), ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs2.readFileSync)(credFile, "utf8"));
    const mcpOAuth = creds.mcpOAuth;
    if (mcpOAuth) {
      for (const entry of Object.values(mcpOAuth)) {
        if (entry.serverUrl === remoteUrl && entry.accessToken && (!entry.expiresAt || Date.now() < Number(entry.expiresAt))) {
          return entry.accessToken;
        }
      }
    }
  } catch {
  }
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
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
init_config_runtime();

// dist/hooks/lib/project-state.js
var import_node_child_process = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs4.existsSync)((0, import_node_path4.join)(dir, GRAMATR_DIR2)))
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
  const abs = (p) => p.startsWith("/") ? p : (0, import_node_path4.join)(dir, p);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path4.dirname)(absCommonDir);
  if ((0, import_node_fs4.existsSync)((0, import_node_path4.join)(mainRoot, GRAMATR_DIR2)))
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

// dist/bin/ups-route.js
var ROUTE_TIMEOUT_MS = 8e3;
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
async function computeUpsRoute(input, fetchImpl = fetch, projectDirOverride) {
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (!prompt)
    return {};
  const projectDir = projectDirOverride ?? resolveUpsRouteProjectDir(input);
  let token = await resolveUsableSessionToken(projectDir, fetchImpl);
  if (!token) {
    token = await selfHealSessionToken(input, projectDir, fetchImpl);
    if (!token) {
      return loudRecoveryFailureWarning();
    }
  }
  const url = `${apiV1Base(token.base_url)}/route`;
  const reqBody = JSON.stringify({
    prompt,
    client_type: "claude-code",
    client_version: VERSION
  });
  const expectedProjectId = projectIdFromAud(token.aud);
  const t0 = Date.now();
  const record = (status, additionalContext2, route) => {
    appendHookPromotionSample(buildPromotionSample({
      path: "rest",
      session_id: typeof input.session_id === "string" ? input.session_id : "",
      client_type: "claude-code",
      expected_project_id: expectedProjectId,
      status,
      latency_ms: Date.now() - t0,
      route,
      packet_bytes: additionalContext2 != null ? Buffer.byteLength(additionalContext2, "utf8") : null
    }));
  };
  let res;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...bearerHeader(token)
      },
      body: reqBody,
      signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS)
    });
  } catch {
    record("error", null, null);
    return {};
  }
  if (!res.ok) {
    record("error", null, null);
    return {};
  }
  let envelope;
  try {
    envelope = await res.json();
  } catch {
    record("error", null, null);
    return {};
  }
  const hookSpecificOutput = envelope?.hookSpecificOutput;
  if (!hookSpecificOutput || typeof hookSpecificOutput.additionalContext !== "string" || hookSpecificOutput.additionalContext.length === 0) {
    record("skipped", null, null);
    return {};
  }
  const additionalContext = hookSpecificOutput.additionalContext;
  let parsedRoute = null;
  try {
    parsedRoute = JSON.parse(additionalContext);
  } catch {
    parsedRoute = null;
  }
  record("ok", additionalContext, parsedRoute);
  return envelope;
}
async function readStdinJson() {
  const chunks = [];
  await new Promise((resolve2) => {
    const t = setTimeout(resolve2, 1e3);
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => {
      clearTimeout(t);
      resolve2();
    });
    process.stdin.on("error", () => {
      clearTimeout(t);
      resolve2();
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
if (process.env.GRAMATR_UPS_ROUTE_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeUpsRoute,
  loudRecoveryFailureWarning,
  main
});
