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

// dist/bin/plugin-proxy.js
var plugin_proxy_exports = {};
__export(plugin_proxy_exports, {
  handleMessage: () => handleMessage
});
module.exports = __toCommonJS(plugin_proxy_exports);
var import_node_readline = require("node:readline");
var import_node_child_process3 = require("node:child_process");
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
var import_node_url = require("node:url");

// dist/config-runtime.js
function sanitizeEnvToken(raw) {
  if (!raw)
    return "";
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined")
    return "";
  return raw;
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
function isKeyringFileOnlyFromEnv() {
  const raw = process.env.GRAMATR_KEYRING_FILE_ONLY;
  return raw === "1" || raw === "true";
}

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
function writeActiveSession(projectDir, session) {
  patchRuntime(projectDir, { active_session: session });
}
function writeLegacySessionJson(projectDir, session) {
  const payload = {};
  if (session.session_id)
    payload.session_id = session.session_id;
  if (session.project_id)
    payload.project_id = session.project_id;
  if (!payload.session_id && !payload.project_id)
    return;
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  atomicWriteJson((0, import_node_path.join)(dir, "session.json"), dir, payload);
}

// dist/hooks/lib/session-rest-token.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
var SESSION_FILE = ".session";
var SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
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
function apiV1Base(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/api/v1`;
}
function shouldSkipBootstrap(projectDir, sessionJsonExists, now = Date.now()) {
  if (!sessionJsonExists)
    return false;
  const token = readSessionToken(projectDir);
  return isSessionTokenValid(token, now);
}

// dist/hooks/lib/mint-credential-store.js
var import_node_child_process2 = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");
var spawnImpl = import_node_child_process2.spawnSync;
var platformImpl = null;
function currentPlatform() {
  return platformImpl ?? process.platform;
}
var KEYRING_SERVICE = "gramatr-mint-credential";
var KEYRING_ACCOUNT = "gramatr";
var FILE_BACKEND_NAME = ".mint-credential";
var KEYRING_CMD_TIMEOUT_MS = 3e3;
function getFileBackendPath() {
  return (0, import_node_path3.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME);
}
function fileBackendForced() {
  return isKeyringFileOnlyFromEnv();
}
function runKeyringCmd(cmd, args, input) {
  try {
    const res = spawnImpl(cmd, args, {
      timeout: KEYRING_CMD_TIMEOUT_MS,
      encoding: "utf8",
      input,
      // Never inherit stdio — keep secret bytes off the terminal.
      stdio: ["pipe", "pipe", "pipe"]
    });
    if (!res || res.error || res.status !== 0)
      return null;
    return { stdout: res.stdout ?? "" };
  } catch {
    return null;
  }
}
function macosWrite(secret) {
  const res = runKeyringCmd("security", [
    "add-generic-password",
    "-a",
    KEYRING_ACCOUNT,
    "-s",
    KEYRING_SERVICE,
    "-U",
    "-w",
    secret
  ]);
  return res !== null;
}
function macosRead() {
  const res = runKeyringCmd("security", [
    "find-generic-password",
    "-a",
    KEYRING_ACCOUNT,
    "-s",
    KEYRING_SERVICE,
    "-w"
  ]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function macosDelete() {
  runKeyringCmd("security", [
    "delete-generic-password",
    "-a",
    KEYRING_ACCOUNT,
    "-s",
    KEYRING_SERVICE
  ]);
}
function secretToolWrite(secret) {
  const res = runKeyringCmd("secret-tool", ["store", "--label", KEYRING_SERVICE, "service", KEYRING_SERVICE, "account", KEYRING_ACCOUNT], secret);
  return res !== null;
}
function secretToolRead() {
  const res = runKeyringCmd("secret-tool", [
    "lookup",
    "service",
    KEYRING_SERVICE,
    "account",
    KEYRING_ACCOUNT
  ]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function secretToolDelete() {
  runKeyringCmd("secret-tool", [
    "clear",
    "service",
    KEYRING_SERVICE,
    "account",
    KEYRING_ACCOUNT
  ]);
}
function windowsWrite(secret) {
  const target = `${KEYRING_SERVICE}:${KEYRING_ACCOUNT}`;
  const res = runKeyringCmd("cmdkey", [
    `/generic:${target}`,
    `/user:${KEYRING_ACCOUNT}`,
    `/pass:${secret}`
  ]);
  return res !== null;
}
function windowsRead() {
  const target = `${KEYRING_SERVICE}:${KEYRING_ACCOUNT}`;
  const script = `$ErrorActionPreference='SilentlyContinue';[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime];try{$v=New-Object Windows.Security.Credentials.PasswordVault;$c=$v.Retrieve('${target}','${KEYRING_ACCOUNT}');$c.RetrievePassword();$c.Password}catch{''}`;
  const res = runKeyringCmd("powershell", ["-NoProfile", "-Command", script]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function windowsDelete() {
  const target = `${KEYRING_SERVICE}:${KEYRING_ACCOUNT}`;
  runKeyringCmd("cmdkey", [`/delete:${target}`]);
}
function fileWrite(record) {
  try {
    const dir = (0, import_node_path3.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath();
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs3.writeFileSync)(tmp, record, { encoding: "utf8", mode: 384 });
    (0, import_node_fs3.renameSync)(tmp, dest);
    try {
      (0, import_node_fs3.chmodSync)(dest, 384);
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}
function fileRead() {
  try {
    const dest = getFileBackendPath();
    if (!(0, import_node_fs3.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs3.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function fileDelete() {
  try {
    (0, import_node_fs3.rmSync)(getFileBackendPath(), { force: true });
  } catch {
  }
}
function nativeBackend() {
  if (fileBackendForced())
    return "file";
  switch (currentPlatform()) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    case "linux":
      return "secret-tool";
    default:
      return "file";
  }
}
function writeMintCredential(record) {
  const payload = JSON.stringify(record);
  const backend = nativeBackend();
  if (backend === "macos" && macosWrite(payload))
    return "macos";
  if (backend === "secret-tool" && secretToolWrite(payload))
    return "secret-tool";
  if (backend === "windows" && windowsWrite(payload))
    return "windows";
  return fileWrite(payload) ? "file" : "none";
}
function readMintCredential() {
  const backend = nativeBackend();
  let raw = null;
  if (backend === "macos")
    raw = macosRead();
  else if (backend === "secret-tool")
    raw = secretToolRead();
  else if (backend === "windows")
    raw = windowsRead();
  if (!raw)
    raw = fileRead();
  if (!raw)
    return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.token === "string" && parsed.token.length > 0 && typeof parsed.expires_at === "string" && parsed.expires_at.length > 0 && typeof parsed.device_id === "string" && parsed.device_id.length > 0) {
      return { token: parsed.token, expires_at: parsed.expires_at, device_id: parsed.device_id };
    }
    return null;
  } catch {
    return null;
  }
}
function deleteMintCredential() {
  try {
    macosDelete();
  } catch {
  }
  try {
    secretToolDelete();
  } catch {
  }
  try {
    windowsDelete();
  } catch {
  }
  fileDelete();
}
function isMintCredentialUsable(record, now = Date.now()) {
  if (!record)
    return false;
  const exp = Date.parse(record.expires_at);
  if (Number.isNaN(exp))
    return false;
  return exp - 6e4 > now;
}

// dist/hooks/lib/credential-heal.js
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");
function classifyDeadState(signal) {
  const err = (signal.oauthError ?? "").toLowerCase();
  const desc = (signal.errorDescription ?? "").toLowerCase();
  if (err === "invalid_client" || desc.includes("client is not registered")) {
    return "invalid_client";
  }
  if (signal.httpStatus === 400 && (desc.includes("pkce required") || desc.includes("code_challenge") || err === "invalid_request")) {
    return "pkce_deadlock";
  }
  if (err === "invalid_grant" || err === "revoked" || err === "expired_token" || desc.includes("revoked") || desc.includes("token family")) {
    return "revoked_family";
  }
  return null;
}
function getPluginTokenPath() {
  const pluginDataDir = process.env.CLAUDE_PLUGIN_DATA ?? "";
  if (!pluginDataDir)
    return null;
  return (0, import_node_path4.join)(pluginDataDir, "token.json");
}
function purgePluginToken() {
  const tokenPath = getPluginTokenPath();
  if (!tokenPath)
    return false;
  try {
    if (!(0, import_node_fs4.existsSync)(tokenPath))
      return false;
    (0, import_node_fs4.rmSync)(tokenPath, { force: true });
    return true;
  } catch {
    return false;
  }
}
function reconnectMessage(kind) {
  switch (kind) {
    case "invalid_client":
      return "gr\u0101matr: your cached connection was rotated out (invalid_client). Run /mcp and reconnect gr\u0101matr to re-register cleanly.";
    case "pkce_deadlock":
      return "gr\u0101matr: the cached connection is stuck (PKCE deadlock). Run /mcp and reconnect gr\u0101matr to start a fresh login.";
    case "revoked_family":
      return "gr\u0101matr: your session credential was revoked. Run /mcp and reconnect gr\u0101matr to re-authenticate.";
    case "expired":
      return "gr\u0101matr: your session credential expired. Run /mcp and reconnect gr\u0101matr to re-authenticate.";
  }
}
function healDeadCredential(kind) {
  const purgedPluginToken = purgePluginToken();
  const reauth = getPluginTokenPath() ? "device_flow" : "reconnect_instruction";
  const message = reauth === "device_flow" ? "gr\u0101matr: cached credential was dead \u2014 purged it; re-running a clean device-flow login." : reconnectMessage(kind);
  return { kind, purgedPluginToken, reauth, message };
}

// dist/hooks/lib/proxy-token-ladder.js
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
var TOKEN_FILE = "token.json";
var MINT_TIMEOUT_MS = 3e3;
var PROXY_TOKEN_PROACTIVE_RENEW_FRACTION = 0.8;
function getProxyTokenPath(dataDir) {
  return (0, import_node_path5.join)(dataDir, TOKEN_FILE);
}
function readProxyToken(dataDir) {
  try {
    const raw = (0, import_node_fs5.readFileSync)(getProxyTokenPath(dataDir), "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.token === "string" && parsed.token.length > 0) {
      const rec = { token: parsed.token };
      if (typeof parsed.issued_at === "string" && parsed.issued_at.length > 0) {
        rec.issued_at = parsed.issued_at;
      }
      if (typeof parsed.expires_at === "string" && parsed.expires_at.length > 0) {
        rec.expires_at = parsed.expires_at;
      }
      return rec;
    }
    return null;
  } catch {
    return null;
  }
}
function writeProxyToken(dataDir, record) {
  if (!(0, import_node_fs5.existsSync)(dataDir))
    (0, import_node_fs5.mkdirSync)(dataDir, { recursive: true });
  const dest = getProxyTokenPath(dataDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs5.writeFileSync)(tmp, JSON.stringify(record, null, 2) + "\n", "utf8");
  (0, import_node_fs5.renameSync)(tmp, dest);
}
function shouldProactivelyMint(record, now = Date.now()) {
  if (!record || !record.issued_at || !record.expires_at)
    return false;
  const start = Date.parse(record.issued_at);
  const exp = Date.parse(record.expires_at);
  if (Number.isNaN(start) || Number.isNaN(exp))
    return false;
  const lifetime = exp - start;
  if (lifetime <= 0)
    return false;
  const elapsed = now - start;
  return elapsed >= lifetime * PROXY_TOKEN_PROACTIVE_RENEW_FRACTION;
}
function normalizeRotatedCredential(block) {
  if (!block || typeof block !== "object")
    return null;
  const { token, expires_at, device_id } = block;
  if (typeof token === "string" && token.length > 0 && typeof expires_at === "string" && expires_at.length > 0 && typeof device_id === "string" && device_id.length > 0) {
    return { token, expires_at, device_id };
  }
  return null;
}
function normalizeMintedToken(block) {
  if (!block || typeof block !== "object")
    return null;
  const { token, expires_at, issued_at } = block;
  if (typeof token !== "string" || token.length === 0)
    return null;
  const rec = { token };
  if (typeof issued_at === "string" && issued_at.length > 0)
    rec.issued_at = issued_at;
  if (typeof expires_at === "string" && expires_at.length > 0)
    rec.expires_at = expires_at;
  return rec;
}
async function mintProxyTokenFromKeyring(dataDir, baseUrl, fetchImpl = fetch, now = Date.now()) {
  const record = readMintCredential();
  if (!isMintCredentialUsable(record, now) || !record) {
    return { status: "no_credential" };
  }
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (!trimmed)
    return { status: "no_credential" };
  const url = `${apiV1Base(trimmed)}/session/token/mint`;
  let res;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${record.token}`
      },
      signal: AbortSignal.timeout(MINT_TIMEOUT_MS)
    });
  } catch {
    return { status: "error" };
  }
  if (res.status === 401) {
    await deleteMintCredential();
    return { status: "denied" };
  }
  if (!res.ok) {
    try {
      const body2 = await res.json();
      const rotated2 = normalizeRotatedCredential(body2.mint_credential);
      if (rotated2)
        writeMintCredential(rotated2);
    } catch {
    }
    return { status: "error" };
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return { status: "error" };
  }
  const minted = normalizeMintedToken(body.rest_token);
  if (!minted) {
    return { status: "error" };
  }
  writeProxyToken(dataDir, minted);
  const rotated = normalizeRotatedCredential(body.mint_credential);
  if (rotated)
    writeMintCredential(rotated);
  return { status: "minted", record: minted };
}

// dist/bin/plugin-proxy.js
var import_meta = {};
function resolveProxyVersion() {
  try {
    if ("0.31.1") {
      return "0.31.1";
    }
  } catch {
  }
  try {
    const here = (0, import_node_path6.dirname)((0, import_node_url.fileURLToPath)(import_meta.url));
    for (const candidate of [
      (0, import_node_path6.join)(here, "..", "..", "package.json"),
      (0, import_node_path6.join)(here, "..", "package.json"),
      (0, import_node_path6.join)(here, "..", "..", "..", "package.json")
    ]) {
      if ((0, import_node_fs6.existsSync)(candidate)) {
        const pkg = JSON.parse((0, import_node_fs6.readFileSync)(candidate, "utf8"));
        if (typeof pkg.version === "string" && pkg.version)
          return pkg.version;
      }
    }
  } catch {
  }
  return "0.0.0-dev";
}
var PROXY_VERSION = resolveProxyVersion();
function resolveProxyChannel() {
  try {
    if ("claude-code") {
      return "claude-code";
    }
  } catch {
  }
  return void 0;
}
var PROXY_CHANNEL = resolveProxyChannel();
var REMOTE_URL = process.env.GRAMATR_URL ?? "https://api.gramatr.com/mcp";
var PLUGIN_DATA_DIR = process.env.CLAUDE_PLUGIN_DATA ?? "";
var ENV_API_KEY = process.env.GRAMATR_API_KEY ?? "";
var ENV_TOKEN = process.env.GRAMATR_TOKEN ?? "";
var HOME_DIR = getHomeDir();
var REMOTE_BASE = REMOTE_URL.replace(/\/mcp\/?$/, "");
var ProxyAuthError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProxyAuthError";
  }
};
function getToken() {
  const envToken = sanitizeEnvToken(ENV_API_KEY) || sanitizeEnvToken(ENV_TOKEN);
  if (envToken)
    return envToken;
  if (PLUGIN_DATA_DIR) {
    try {
      const cfg = JSON.parse((0, import_node_fs6.readFileSync)((0, import_node_path6.join)(PLUGIN_DATA_DIR, "token.json"), "utf8"));
      if (typeof cfg.token === "string" && cfg.token)
        return cfg.token;
    } catch {
    }
  }
  try {
    const credFile = (0, import_node_path6.resolve)(HOME_DIR, ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs6.readFileSync)(credFile, "utf8"));
    const mcpOAuth = creds.mcpOAuth;
    if (mcpOAuth) {
      for (const entry of Object.values(mcpOAuth)) {
        if (entry.serverUrl === REMOTE_URL && entry.accessToken && (!entry.expiresAt || Date.now() < Number(entry.expiresAt))) {
          return entry.accessToken;
        }
      }
    }
  } catch {
  }
  return "";
}
async function runDeviceFlow() {
  if (purgePluginToken()) {
    process.stderr.write("gr\u0101matr-proxy: purged stale plugin token before clean re-auth\n");
  }
  const startRes = await fetch(`${REMOTE_BASE}/device/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_name: "gramatr-local-extras" }),
    signal: AbortSignal.timeout(1e4)
  });
  if (!startRes.ok) {
    const text = await startRes.text().catch(() => "");
    throw new ProxyAuthError(`Device flow start failed: HTTP ${startRes.status} ${text}`);
  }
  const startPayload = await startRes.json();
  const deviceCode = startPayload.device_code;
  const userCode = startPayload.user_code;
  const verificationUriComplete = startPayload.verification_uri_complete;
  const interval = typeof startPayload.interval === "number" ? startPayload.interval : 5;
  process.stderr.write("gr\u0101matr: Authentication required\n");
  if (verificationUriComplete) {
    process.stderr.write(`Open this URL to authorize: ${verificationUriComplete}
`);
  }
  process.stderr.write(`Or visit https://app.gramatr.com/device and enter code: ${userCode}
`);
  process.stderr.write("Waiting for authorization...\n");
  let accessToken;
  while (!accessToken) {
    await new Promise((res) => setTimeout(res, interval * 1e3));
    const pollRes = await fetch(`${REMOTE_BASE}/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: deviceCode }),
      signal: AbortSignal.timeout(1e4)
    });
    let pollPayload = {};
    try {
      pollPayload = await pollRes.json();
    } catch {
    }
    if (pollRes.ok && typeof pollPayload.access_token === "string") {
      accessToken = pollPayload.access_token;
      break;
    }
    if (pollRes.status === 428 || pollPayload.error === "authorization_pending") {
      continue;
    }
    const errMsg = pollPayload.error_description ?? pollPayload.error ?? `HTTP ${pollRes.status}`;
    throw new ProxyAuthError(`Device flow polling failed: ${errMsg}`);
  }
  if (PLUGIN_DATA_DIR) {
    (0, import_node_fs6.mkdirSync)(PLUGIN_DATA_DIR, { recursive: true });
    (0, import_node_fs6.writeFileSync)((0, import_node_path6.join)(PLUGIN_DATA_DIR, "token.json"), JSON.stringify({ token: accessToken }, null, 2) + "\n", "utf8");
  }
  process.stderr.write("gr\u0101matr: Authenticated successfully.\n");
  return accessToken;
}
function extractDeadStateSignal(response, httpStatus) {
  let oauthError = null;
  let errorDescription = null;
  try {
    const err = response.error;
    if (err) {
      if (typeof err.message === "string")
        errorDescription = err.message;
      const data = err.data;
      if (data) {
        if (typeof data.error === "string")
          oauthError = data.error;
        if (typeof data.error_description === "string")
          errorDescription = data.error_description;
      }
    }
  } catch {
  }
  return { oauthError, errorDescription, httpStatus };
}
function maybeHealDeadCredential(response, httpStatus) {
  if (httpStatus !== 400 && httpStatus !== 401)
    return null;
  const signal = extractDeadStateSignal(response, httpStatus);
  const kind = classifyDeadState(signal);
  if (!kind)
    return null;
  const result = healDeadCredential(kind);
  process.stderr.write(`gr\u0101matr-proxy: dead credential (${kind}) \u2014 purged=${result.purgedPluginToken}, reauth=${result.reauth}
`);
  return result.message;
}
var lastToolsListWas401 = false;
function emitListChangedNotifications() {
  const methods = [
    "notifications/tools/list_changed",
    "notifications/prompts/list_changed",
    "notifications/resources/list_changed"
  ];
  for (const method of methods) {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
  }
}
var SYNTHETIC_AUTH_TOOL = {
  name: "gramatr_authenticate",
  description: "Authenticate the gr\u0101matr local proxy via device flow. Call this once if gr\u0101matr tools are returning auth errors.",
  inputSchema: { type: "object", properties: {}, required: [] }
};
function writeSessionFile(responseText, projectDir) {
  const dir = resolveProjectDir({ cwd: projectDir, clientType: "claude-code" });
  try {
    const parsed = JSON.parse(responseText);
    const manifest = parsed.manifest ?? {};
    const sessionRaw = parsed.session_id ?? parsed.gramatr_session_id ?? manifest.session_id;
    const projectRaw = parsed.project_id ?? manifest.project_id;
    const sessionId = typeof sessionRaw === "string" ? sessionRaw : void 0;
    const projectId = typeof projectRaw === "string" ? projectRaw : void 0;
    if (sessionId || projectId) {
      writeLegacySessionJson(dir, { session_id: sessionId, project_id: projectId });
      if (sessionId) {
        writeActiveSession(dir, {
          session_id: sessionId,
          client_type: "claude-code",
          written_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
  } catch {
  }
}
function buildBootstrapNoOpResult(projectDir) {
  try {
    const raw = (0, import_node_fs6.readFileSync)((0, import_node_path6.join)(projectDir, ".gramatr", "session.json"), "utf8");
    const parsed = JSON.parse(raw);
    const sessionId = typeof parsed.session_id === "string" ? parsed.session_id : void 0;
    if (!sessionId)
      return null;
    const projectId = typeof parsed.project_id === "string" ? parsed.project_id : void 0;
    const text = JSON.stringify({
      source: "bootstrap_noop",
      session_id: sessionId,
      ...projectId ? { project_id: projectId } : {}
    });
    return { content: [{ type: "text", text }] };
  } catch {
    return null;
  }
}
async function forwardToRemote(message) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
  };
  if (token)
    headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(REMOTE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(message)
  });
  const httpStatus = res.status;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    const lines = text.split("\n");
    let lastData = null;
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (payload && payload !== "[DONE]")
          lastData = payload;
      }
    }
    if (lastData) {
      try {
        return { response: JSON.parse(lastData), httpStatus };
      } catch {
      }
    }
    return { response: { jsonrpc: "2.0", error: { code: -32603, message: "Empty SSE response from remote" } }, httpStatus };
  }
  try {
    return { response: await res.json(), httpStatus };
  } catch {
    return { response: { jsonrpc: "2.0", error: { code: -32603, message: `Non-JSON response from remote: ${res.status}` } }, httpStatus };
  }
}
async function reMintProxyBearer() {
  if (!PLUGIN_DATA_DIR)
    return false;
  const outcome = await mintProxyTokenFromKeyring(PLUGIN_DATA_DIR, REMOTE_BASE);
  process.stderr.write(`gr\u0101matr-proxy: re-mint from keyring \u2192 ${outcome.status}
`);
  return outcome.status === "minted";
}
async function maybeProactivelyMint() {
  if (!PLUGIN_DATA_DIR)
    return;
  const record = readProxyToken(PLUGIN_DATA_DIR);
  if (!shouldProactivelyMint(record))
    return;
  process.stderr.write("gr\u0101matr-proxy: proactive re-mint (token \u226580% of life)\n");
  await reMintProxyBearer();
}
async function forwardWithLadder(message) {
  await maybeProactivelyMint();
  const first = await forwardToRemote(message);
  if (first.httpStatus !== 401)
    return first;
  const reMinted = await reMintProxyBearer();
  if (!reMinted) {
    return first;
  }
  const second = await forwardToRemote(message);
  process.stderr.write(`gr\u0101matr-proxy: reactive re-mint retry \u2192 HTTP ${second.httpStatus}
`);
  return second;
}
function getGitRemote(cwd) {
  try {
    const result = (0, import_node_child_process3.spawnSync)("git", ["-C", cwd, "remote", "get-url", "origin"], {
      timeout: 2e3,
      encoding: "utf8"
    });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
  } catch {
  }
  return "";
}
function getProjectId(cwd) {
  try {
    const projectFile = (0, import_node_path6.join)(cwd, ".gramatr", "project.json");
    if ((0, import_node_fs6.existsSync)(projectFile)) {
      const data = JSON.parse((0, import_node_fs6.readFileSync)(projectFile, "utf8"));
      if (typeof data.project_id === "string" && data.project_id) {
        return data.project_id;
      }
    }
  } catch {
  }
  return void 0;
}
async function handleMessage(msg) {
  const method = msg.method;
  const msgId = msg.id ?? null;
  if (method === "initialize") {
    const params = msg.params ?? {};
    const requestedProtocolVersion = typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-11-25";
    return {
      jsonrpc: "2.0",
      id: msgId,
      result: {
        protocolVersion: requestedProtocolVersion,
        capabilities: {
          // listChanged: true so Claude Desktop refetches tools/prompts/resources
          // after the synthetic gramatr_authenticate flow completes. Without this,
          // a freshly installed MCPB stays stuck on the single auth tool because
          // the client honors our (formerly false) capability advertisement and
          // never re-queries tools/list.
          tools: { listChanged: true },
          prompts: { listChanged: true },
          resources: { listChanged: true }
        },
        serverInfo: {
          name: "gramatr",
          version: PROXY_VERSION
        }
      }
    };
  }
  if (method === "tools/call" && msg.params !== null && typeof msg.params === "object") {
    const params = msg.params;
    if (params.name === "gramatr_authenticate") {
      try {
        await runDeviceFlow();
        emitListChangedNotifications();
        lastToolsListWas401 = false;
        return {
          jsonrpc: "2.0",
          id: msgId,
          result: {
            content: [{ type: "text", text: "Authenticated successfully. gr\u0101matr proxy is now connected." }]
          }
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          jsonrpc: "2.0",
          id: msgId,
          error: { code: -32001, message: `gr\u0101matr: authentication failed \u2014 ${errMsg}` }
        };
      }
    }
    if (params.name === "session_bootstrap") {
      const args = params.arguments ?? {};
      const cwd = typeof args.cwd === "string" ? args.cwd : process.cwd();
      const bootstrapProjectDir = resolveProjectDir({ cwd, clientType: "claude-code" });
      const sessionJsonExists = (0, import_node_fs6.existsSync)((0, import_node_path6.join)(bootstrapProjectDir, ".gramatr", "session.json"));
      if (shouldSkipBootstrap(bootstrapProjectDir, sessionJsonExists)) {
        const noOpResult = buildBootstrapNoOpResult(bootstrapProjectDir);
        if (noOpResult) {
          process.stderr.write("gr\u0101matr-proxy: tools/call session_bootstrap \u2192 no-op (live token + session)\n");
          return { jsonrpc: "2.0", id: msgId, result: noOpResult };
        }
      }
      if (!args.git_remote) {
        const gitRemote = getGitRemote(cwd);
        if (gitRemote)
          args.git_remote = gitRemote;
      }
      if (!args.project_id) {
        const projectId = getProjectId(cwd);
        if (projectId)
          args.project_id = projectId;
      }
      const enriched = {
        ...msg,
        params: { ...params, arguments: args }
      };
      const { response: response2, httpStatus: httpStatus2 } = await forwardWithLadder(enriched);
      process.stderr.write(`gr\u0101matr-proxy: tools/call session_bootstrap \u2192 HTTP ${httpStatus2}
`);
      if (httpStatus2 === 401) {
        const healMessage = maybeHealDeadCredential(response2, httpStatus2);
        return {
          jsonrpc: "2.0",
          id: msgId,
          error: {
            code: -32001,
            message: healMessage ?? "gr\u0101matr: not authenticated \u2014 call gramatr_authenticate to connect"
          }
        };
      }
      try {
        const r = response2;
        const contentArr = r.result?.content;
        const text = typeof contentArr?.[0]?.text === "string" ? contentArr[0].text : "";
        if (text)
          writeSessionFile(text, cwd);
        if (text) {
          try {
            const parsed = JSON.parse(text);
            persistBootstrapRestToken(resolveProjectDir({ cwd, clientType: "claude-code" }), parsed.rest_token);
            const mc = parsed.mint_credential;
            if (mc && typeof mc.token === "string" && mc.token.length > 0 && typeof mc.expires_at === "string" && mc.expires_at.length > 0 && typeof mc.device_id === "string" && mc.device_id.length > 0) {
              writeMintCredential(mc);
            }
          } catch {
          }
        }
      } catch {
      }
      return response2;
    }
    if (params.name === "session_start") {
      const startArgs = params.arguments ?? {};
      const startCwd = typeof startArgs.cwd === "string" ? startArgs.cwd : void 0;
      const { response: response2, httpStatus: httpStatus2 } = await forwardToRemote(msg);
      process.stderr.write(`gr\u0101matr-proxy: tools/call session_start \u2192 HTTP ${httpStatus2}
`);
      try {
        const r = response2;
        const contentArr = r.result?.content;
        const text = typeof contentArr?.[0]?.text === "string" ? contentArr[0].text : "";
        if (text)
          writeSessionFile(text, startCwd);
      } catch {
      }
      return response2;
    }
    if (params.name === "route_request") {
      const routeArgs = params.arguments ?? {};
      const routeCwd = typeof routeArgs.cwd === "string" ? routeArgs.cwd : void 0;
      const routeGitCwd = routeCwd ?? process.cwd();
      if (routeArgs.git_remote === void 0) {
        const gitRemote = getGitRemote(routeGitCwd);
        if (gitRemote)
          routeArgs.git_remote = gitRemote;
      }
      if (routeArgs.project_id === void 0) {
        const projectId = getProjectId(routeGitCwd);
        if (projectId)
          routeArgs.project_id = projectId;
      }
      if (routeArgs.client_version === void 0 && PROXY_VERSION && PROXY_VERSION !== "0.0.0-dev") {
        routeArgs.client_version = PROXY_VERSION;
      }
      if (routeArgs.client_type === void 0 && PROXY_CHANNEL) {
        routeArgs.client_type = PROXY_CHANNEL;
      }
      const enriched = {
        ...msg,
        params: { ...params, arguments: routeArgs }
      };
      const { response: response2, httpStatus: httpStatus2 } = await forwardWithLadder(enriched);
      process.stderr.write(`gr\u0101matr-proxy: tools/call route_request \u2192 HTTP ${httpStatus2}
`);
      try {
        const r = response2;
        const contentArr = r.result?.content;
        const text = typeof contentArr?.[0]?.text === "string" ? contentArr[0].text : "";
        if (text)
          writeSessionFile(text, routeCwd);
      } catch {
      }
      return response2;
    }
  }
  if (method === "tools/list") {
    if (msgId === void 0 || msgId === null) {
      forwardToRemote(msg).catch(() => void 0);
      return null;
    }
    const { response: response2, httpStatus: httpStatus2 } = await forwardToRemote(msg);
    process.stderr.write(`gr\u0101matr-proxy: tools/list \u2192 HTTP ${httpStatus2}
`);
    if (httpStatus2 === 401) {
      lastToolsListWas401 = true;
      return {
        jsonrpc: "2.0",
        id: msgId,
        result: { tools: [SYNTHETIC_AUTH_TOOL] }
      };
    }
    try {
      const r = response2;
      const result = r.result;
      if (result && Array.isArray(result.tools)) {
        result.tools = [...result.tools, SYNTHETIC_AUTH_TOOL];
      }
    } catch {
    }
    if (lastToolsListWas401) {
      lastToolsListWas401 = false;
      emitListChangedNotifications();
    }
    return response2;
  }
  if (msgId === void 0 || msgId === null) {
    forwardToRemote(msg).catch(() => void 0);
    return null;
  }
  const { response, httpStatus } = await forwardWithLadder(msg);
  process.stderr.write(`gr\u0101matr-proxy: ${method ?? "(unknown)"} \u2192 HTTP ${httpStatus}
`);
  if (httpStatus === 401) {
    if (method === "prompts/list") {
      return { jsonrpc: "2.0", id: msgId, result: { prompts: [] } };
    }
    if (method === "resources/list") {
      return { jsonrpc: "2.0", id: msgId, result: { resources: [] } };
    }
    if (method === "resources/templates/list") {
      return { jsonrpc: "2.0", id: msgId, result: { resourceTemplates: [] } };
    }
    const healMessage = maybeHealDeadCredential(response, httpStatus);
    return {
      jsonrpc: "2.0",
      id: msgId,
      error: {
        code: -32001,
        message: healMessage ?? "gr\u0101matr: not authenticated \u2014 call gramatr_authenticate to connect"
      }
    };
  }
  return response;
}
function writeResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}
async function main() {
  const rl = (0, import_node_readline.createInterface)({ input: process.stdin, terminal: false });
  process.stderr.write(`gr\u0101matr-proxy: starting \u2014 token ${getToken() ? "found" : "not found (call gramatr_authenticate)"}
`);
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed)
      return;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return;
    }
    handleMessage(msg).then((response) => {
      if (response !== null) {
        writeResponse(response);
      }
    }).catch((err) => {
      const id = msg.id ?? null;
      const errMsg = err instanceof Error ? err.message : String(err);
      writeResponse({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: `Proxy error: ${errMsg}` }
      });
    });
  });
  rl.on("close", () => {
    process.exit(0);
  });
}
if (!process.env.GRAMATR_PROXY_NO_AUTOSTART) {
  main().catch((err) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`gr\u0101matr: Fatal proxy error: ${errMsg}
`);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleMessage
});
