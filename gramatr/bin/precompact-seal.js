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
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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
function getSessionRegistryTtlDaysFromEnv(defaultDays) {
  const raw = process.env.GRAMATR_SESSION_REGISTRY_TTL_DAYS;
  if (!raw || raw.length === 0)
    return defaultDays;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : defaultDays;
}
function isKeyringFileOnlyFromEnv() {
  const raw = process.env.GRAMATR_KEYRING_FILE_ONLY;
  return raw === "1" || raw === "true";
}
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/hooks/lib/project-state.js
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs2.existsSync)((0, import_node_path2.join)(dir, GRAMATR_DIR2)))
      return dir;
    const parent = (0, import_node_path2.dirname)(dir);
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
  const abs = (p) => p.startsWith("/") ? p : (0, import_node_path2.join)(dir, p);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path2.dirname)(absCommonDir);
  if ((0, import_node_fs2.existsSync)((0, import_node_path2.join)(mainRoot, GRAMATR_DIR2)))
    return mainRoot;
  return dir;
}
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
function getStatePaths(projectDir) {
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR2);
  return {
    core: (0, import_node_path2.join)(dir, CORE_FILE),
    runtime: (0, import_node_path2.join)(dir, RUNTIME_FILE)
  };
}
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
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR2);
  const legacyProject = readJson((0, import_node_path2.join)(dir, "project.json"));
  const legacySettings = readJson((0, import_node_path2.join)(dir, "settings.json"));
  const legacyGit = readJson((0, import_node_path2.join)(dir, "git-context.json"));
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
  const legacySession = readJson((0, import_node_path2.join)(projectDir, GRAMATR_DIR2, "session.json"));
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
var import_node_child_process, import_node_fs2, import_node_path2, GRAMATR_DIR2, CLIENT_PROJECT_DIR_ENV, CORE_FILE, RUNTIME_FILE, SCHEMA_VERSION;
var init_project_state = __esm({
  "dist/hooks/lib/project-state.js"() {
    "use strict";
    import_node_child_process = require("node:child_process");
    import_node_fs2 = require("node:fs");
    import_node_path2 = require("node:path");
    GRAMATR_DIR2 = ".gramatr";
    CLIENT_PROJECT_DIR_ENV = {
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
    CORE_FILE = "project.json";
    RUNTIME_FILE = "runtime.json";
    SCHEMA_VERSION = 1;
  }
});

// ../proof-crypto/dist/index.js
function generateEd25519KeyPair() {
  const { privateKey, publicKey } = (0, import_node_crypto.generateKeyPairSync)("ed25519");
  return { privateKey, publicKey };
}
function toPublicJwk(publicKey) {
  const jwk = publicKey.export({ format: "jwk" });
  if (!jwk.x) {
    throw new Error('proof-crypto: public key JWK export missing required "x" member');
  }
  return { kty: "OKP", crv: "Ed25519", x: jwk.x };
}
function jwkThumbprint(jwk) {
  const canonical = `{"crv":"${jwk.crv}","kty":"${jwk.kty}","x":"${jwk.x}"}`;
  return (0, import_node_crypto.createHash)("sha256").update(canonical).digest("base64url");
}
function b64url(input) {
  return Buffer.from(input).toString("base64url");
}
function buildCompactEnvelope(privateKey, publicJwk, typ, payload) {
  const header = { typ, alg: "EdDSA", jwk: publicJwk };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = (0, import_node_crypto.sign)(null, Buffer.from(signingInput, "ascii"), privateKey);
  return `${signingInput}.${b64url(signature)}`;
}
var import_node_crypto;
var init_dist = __esm({
  "../proof-crypto/dist/index.js"() {
    "use strict";
    import_node_crypto = require("node:crypto");
  }
});

// dist/hooks/lib/dpop-key.js
var init_dpop_key = __esm({
  "dist/hooks/lib/dpop-key.js"() {
    "use strict";
    init_dist();
  }
});

// dist/hooks/lib/mint-credential-store.js
function currentPlatform() {
  return platformImpl ?? process.platform;
}
function scopedKeyringService(projectId) {
  return `${KEYRING_SERVICE}:${projectId}`;
}
function scopedFileBackendName(projectId) {
  return `${FILE_BACKEND_NAME}-${projectId}`;
}
function getFileBackendPath(projectId) {
  return (0, import_node_path4.join)(getHomeDir(), ".gramatr", scopedFileBackendName(projectId));
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
function macosWrite(secret, service) {
  const res = runKeyringCmd("security", [
    "add-generic-password",
    "-a",
    KEYRING_ACCOUNT,
    "-s",
    service,
    "-U",
    "-w",
    secret
  ]);
  return res !== null;
}
function macosRead(service) {
  const res = runKeyringCmd("security", [
    "find-generic-password",
    "-a",
    KEYRING_ACCOUNT,
    "-s",
    service,
    "-w"
  ]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function macosDelete(service) {
  runKeyringCmd("security", [
    "delete-generic-password",
    "-a",
    KEYRING_ACCOUNT,
    "-s",
    service
  ]);
}
function secretToolWrite(secret, service) {
  const res = runKeyringCmd("secret-tool", ["store", "--label", service, "service", service, "account", KEYRING_ACCOUNT], secret);
  return res !== null;
}
function secretToolRead(service) {
  const res = runKeyringCmd("secret-tool", [
    "lookup",
    "service",
    service,
    "account",
    KEYRING_ACCOUNT
  ]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function secretToolDelete(service) {
  runKeyringCmd("secret-tool", [
    "clear",
    "service",
    service,
    "account",
    KEYRING_ACCOUNT
  ]);
}
function windowsWrite(secret, service) {
  const target = `${service}:${KEYRING_ACCOUNT}`;
  const res = runKeyringCmd("cmdkey", [
    `/generic:${target}`,
    `/user:${KEYRING_ACCOUNT}`,
    `/pass:${secret}`
  ]);
  return res !== null;
}
function windowsRead(service) {
  const target = `${service}:${KEYRING_ACCOUNT}`;
  const script = `$ErrorActionPreference='SilentlyContinue';[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime];try{$v=New-Object Windows.Security.Credentials.PasswordVault;$c=$v.Retrieve('${target}','${KEYRING_ACCOUNT}');$c.RetrievePassword();$c.Password}catch{''}`;
  const res = runKeyringCmd("powershell", ["-NoProfile", "-Command", script]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function windowsDelete(service) {
  const target = `${service}:${KEYRING_ACCOUNT}`;
  runKeyringCmd("cmdkey", [`/delete:${target}`]);
}
function fileWrite(record, dest) {
  try {
    const dir = (0, import_node_path4.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs4.existsSync)(dir))
      (0, import_node_fs4.mkdirSync)(dir, { recursive: true, mode: 448 });
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs4.writeFileSync)(tmp, record, { encoding: "utf8", mode: 384 });
    (0, import_node_fs4.renameSync)(tmp, dest);
    try {
      (0, import_node_fs4.chmodSync)(dest, 384);
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}
function fileRead(dest) {
  try {
    if (!(0, import_node_fs4.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs4.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function fileDelete(dest) {
  try {
    (0, import_node_fs4.rmSync)(dest, { force: true });
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
function writeMintCredentialCore(record, service, filePath) {
  const payload = JSON.stringify(record);
  const backend = nativeBackend();
  if (backend === "macos" && macosWrite(payload, service))
    return "macos";
  if (backend === "secret-tool" && secretToolWrite(payload, service))
    return "secret-tool";
  if (backend === "windows" && windowsWrite(payload, service))
    return "windows";
  return fileWrite(payload, filePath) ? "file" : "none";
}
function readMintCredentialCore(service, filePath) {
  const backend = nativeBackend();
  let raw = null;
  if (backend === "macos")
    raw = macosRead(service);
  else if (backend === "secret-tool")
    raw = secretToolRead(service);
  else if (backend === "windows")
    raw = windowsRead(service);
  if (!raw)
    raw = fileRead(filePath);
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
function deleteMintCredentialCore(service, filePath) {
  try {
    macosDelete(service);
  } catch {
  }
  try {
    secretToolDelete(service);
  } catch {
  }
  try {
    windowsDelete(service);
  } catch {
  }
  fileDelete(filePath);
}
function writeMintCredential(record, projectId) {
  return writeMintCredentialCore(record, scopedKeyringService(projectId), getFileBackendPath(projectId));
}
function readMintCredential(projectId) {
  return readMintCredentialCore(scopedKeyringService(projectId), getFileBackendPath(projectId));
}
function deleteMintCredential(projectId) {
  deleteMintCredentialCore(scopedKeyringService(projectId), getFileBackendPath(projectId));
}
function writeDeviceMintCredential(record) {
  return writeMintCredentialCore(record, KEYRING_SERVICE, getDeviceFileBackendPath());
}
function readDeviceMintCredential() {
  return readMintCredentialCore(KEYRING_SERVICE, getDeviceFileBackendPath());
}
function deleteDeviceMintCredential() {
  deleteMintCredentialCore(KEYRING_SERVICE, getDeviceFileBackendPath());
}
function getDeviceFileBackendPath() {
  return (0, import_node_path4.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME);
}
function isMintCredentialUsable(record, now2 = Date.now()) {
  if (!record)
    return false;
  const exp = Date.parse(record.expires_at);
  if (Number.isNaN(exp))
    return false;
  return exp - 6e4 > now2;
}
var import_node_child_process2, import_node_fs4, import_node_path4, spawnImpl, platformImpl, KEYRING_SERVICE, KEYRING_ACCOUNT, FILE_BACKEND_NAME, KEYRING_CMD_TIMEOUT_MS;
var init_mint_credential_store = __esm({
  "dist/hooks/lib/mint-credential-store.js"() {
    "use strict";
    import_node_child_process2 = require("node:child_process");
    import_node_fs4 = require("node:fs");
    import_node_path4 = require("node:path");
    init_config_runtime();
    spawnImpl = import_node_child_process2.spawnSync;
    platformImpl = null;
    KEYRING_SERVICE = "gramatr-mint-credential";
    KEYRING_ACCOUNT = "gramatr";
    FILE_BACKEND_NAME = ".mint-credential";
    KEYRING_CMD_TIMEOUT_MS = 3e3;
  }
});

// dist/hooks/lib/device-key.js
function generateDeviceKeyPair() {
  const { privateKey, publicKey } = generateEd25519KeyPair();
  const publicJwk = toPublicJwk(publicKey);
  const thumbprint = jwkThumbprint(publicJwk);
  return { privateKey, publicKey, publicJwk, thumbprint };
}
function buildDeviceProof(keyPair, params) {
  return buildCompactEnvelope(keyPair.privateKey, keyPair.publicJwk, DEVICE_JWT_TYP, {
    nonce: params.nonce,
    iat: params.iat ?? Math.floor(Date.now() / 1e3),
    jti: params.jti ?? b64url((0, import_node_crypto2.randomBytes)(16)),
    ...params.backend ? { backend: params.backend } : {}
  });
}
var import_node_crypto2, DEVICE_JWT_TYP;
var init_device_key = __esm({
  "dist/hooks/lib/device-key.js"() {
    "use strict";
    init_dist();
    import_node_crypto2 = require("node:crypto");
    DEVICE_JWT_TYP = "device-key+jwt";
  }
});

// dist/hooks/lib/device-key-store.js
function currentPlatform2() {
  return platformImpl2 ?? process.platform;
}
function toBackendKind(backend) {
  return backend === "macos" || backend === "secret-tool" || backend === "windows" ? "keychain" : "file";
}
function runKeyringCmd2(cmd, args, input) {
  try {
    const res = spawnImpl2(cmd, args, {
      timeout: KEYRING_CMD_TIMEOUT_MS2,
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
function macosWrite2(secret) {
  const res = runKeyringCmd2("security", [
    "add-generic-password",
    "-a",
    KEYRING_ACCOUNT2,
    "-s",
    KEYRING_SERVICE2,
    "-U",
    "-w",
    secret
  ]);
  return res !== null;
}
function macosRead2() {
  const res = runKeyringCmd2("security", [
    "find-generic-password",
    "-a",
    KEYRING_ACCOUNT2,
    "-s",
    KEYRING_SERVICE2,
    "-w"
  ]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function secretToolWrite2(secret) {
  const res = runKeyringCmd2("secret-tool", ["store", "--label", KEYRING_SERVICE2, "service", KEYRING_SERVICE2, "account", KEYRING_ACCOUNT2], secret);
  return res !== null;
}
function secretToolRead2() {
  const res = runKeyringCmd2("secret-tool", [
    "lookup",
    "service",
    KEYRING_SERVICE2,
    "account",
    KEYRING_ACCOUNT2
  ]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function windowsWrite2(secret) {
  const target = `${KEYRING_SERVICE2}:${KEYRING_ACCOUNT2}`;
  const res = runKeyringCmd2("cmdkey", [
    `/generic:${target}`,
    `/user:${KEYRING_ACCOUNT2}`,
    `/pass:${secret}`
  ]);
  return res !== null;
}
function windowsRead2() {
  const target = `${KEYRING_SERVICE2}:${KEYRING_ACCOUNT2}`;
  const script = `$ErrorActionPreference='SilentlyContinue';[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime];try{$v=New-Object Windows.Security.Credentials.PasswordVault;$c=$v.Retrieve('${target}','${KEYRING_ACCOUNT2}');$c.RetrievePassword();$c.Password}catch{''}`;
  const res = runKeyringCmd2("powershell", ["-NoProfile", "-Command", script]);
  if (!res)
    return null;
  const out = res.stdout.trim();
  return out.length > 0 ? out : null;
}
function fileWrite2(record) {
  try {
    const dir = (0, import_node_path5.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs5.existsSync)(dir))
      (0, import_node_fs5.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath2();
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs5.writeFileSync)(tmp, record, { encoding: "utf8", mode: 384 });
    (0, import_node_fs5.renameSync)(tmp, dest);
    try {
      (0, import_node_fs5.chmodSync)(dest, 384);
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}
function fileRead2() {
  try {
    const dest = getFileBackendPath2();
    if (!(0, import_node_fs5.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs5.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function getFileBackendPath2() {
  return (0, import_node_path5.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME2);
}
function fileBackendForced2() {
  return isKeyringFileOnlyFromEnv();
}
function nativeBackend2() {
  if (fileBackendForced2())
    return "file";
  switch (currentPlatform2()) {
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
function reconstructDeviceKeyPair(privateJwk) {
  const privateKey = (0, import_node_crypto3.createPrivateKey)({ key: privateJwk, format: "jwk" });
  const publicKey = (0, import_node_crypto3.createPublicKey)(privateKey);
  const publicJwk = toPublicJwk(publicKey);
  const thumbprint = jwkThumbprint(publicJwk);
  return { privateKey, publicKey, publicJwk, thumbprint };
}
function writeDeviceKey(keyPair) {
  const privateJwk = keyPair.privateKey.export({ format: "jwk" });
  const payload = JSON.stringify({ privateJwk });
  const backend = nativeBackend2();
  if (backend === "macos" && macosWrite2(payload))
    return "macos";
  if (backend === "secret-tool" && secretToolWrite2(payload))
    return "secret-tool";
  if (backend === "windows" && windowsWrite2(payload))
    return "windows";
  return fileWrite2(payload) ? "file" : "none";
}
function readDeviceKey() {
  const backend = nativeBackend2();
  let raw = null;
  let servedBy = "none";
  if (backend === "macos") {
    raw = macosRead2();
    if (raw)
      servedBy = "macos";
  } else if (backend === "secret-tool") {
    raw = secretToolRead2();
    if (raw)
      servedBy = "secret-tool";
  } else if (backend === "windows") {
    raw = windowsRead2();
    if (raw)
      servedBy = "windows";
  }
  if (!raw) {
    raw = fileRead2();
    if (raw)
      servedBy = "file";
  }
  if (!raw)
    return null;
  try {
    const parsed = JSON.parse(raw);
    const jwk = parsed.privateJwk;
    if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string" || jwk.x.length === 0 || typeof jwk.d !== "string" || jwk.d.length === 0) {
      return null;
    }
    return { keyPair: reconstructDeviceKeyPair(jwk), backend: toBackendKind(servedBy) };
  } catch {
    return null;
  }
}
function getOrCreateDeviceKeyPair() {
  const existing = readDeviceKey();
  if (existing)
    return existing;
  const keyPair = generateDeviceKeyPair();
  const backend = writeDeviceKey(keyPair);
  return { keyPair, backend: toBackendKind(backend) };
}
var import_node_child_process3, import_node_fs5, import_node_path5, import_node_crypto3, spawnImpl2, platformImpl2, KEYRING_SERVICE2, KEYRING_ACCOUNT2, FILE_BACKEND_NAME2, KEYRING_CMD_TIMEOUT_MS2;
var init_device_key_store = __esm({
  "dist/hooks/lib/device-key-store.js"() {
    "use strict";
    import_node_child_process3 = require("node:child_process");
    import_node_fs5 = require("node:fs");
    import_node_path5 = require("node:path");
    import_node_crypto3 = require("node:crypto");
    init_config_runtime();
    init_device_key();
    spawnImpl2 = import_node_child_process3.spawnSync;
    platformImpl2 = null;
    KEYRING_SERVICE2 = "gramatr-device-key";
    KEYRING_ACCOUNT2 = "gramatr";
    FILE_BACKEND_NAME2 = ".device-key";
    KEYRING_CMD_TIMEOUT_MS2 = 3e3;
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs2) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs2);
      }
      if (!fs2.lutimes) {
        patchLutimes(fs2);
      }
      fs2.chown = chownFix(fs2.chown);
      fs2.fchown = chownFix(fs2.fchown);
      fs2.lchown = chownFix(fs2.lchown);
      fs2.chmod = chmodFix(fs2.chmod);
      fs2.fchmod = chmodFix(fs2.fchmod);
      fs2.lchmod = chmodFix(fs2.lchmod);
      fs2.chownSync = chownFixSync(fs2.chownSync);
      fs2.fchownSync = chownFixSync(fs2.fchownSync);
      fs2.lchownSync = chownFixSync(fs2.lchownSync);
      fs2.chmodSync = chmodFixSync(fs2.chmodSync);
      fs2.fchmodSync = chmodFixSync(fs2.fchmodSync);
      fs2.lchmodSync = chmodFixSync(fs2.lchmodSync);
      fs2.stat = statFix(fs2.stat);
      fs2.fstat = statFix(fs2.fstat);
      fs2.lstat = statFix(fs2.lstat);
      fs2.statSync = statFixSync(fs2.statSync);
      fs2.fstatSync = statFixSync(fs2.fstatSync);
      fs2.lstatSync = statFixSync(fs2.lstatSync);
      if (fs2.chmod && !fs2.lchmod) {
        fs2.lchmod = function(path2, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs2.lchmodSync = function() {
        };
      }
      if (fs2.chown && !fs2.lchown) {
        fs2.lchown = function(path2, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs2.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs2.rename = typeof fs2.rename !== "function" ? fs2.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs2.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs2.rename);
      }
      fs2.read = typeof fs2.read !== "function" ? fs2.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs2.read);
      fs2.readSync = typeof fs2.readSync !== "function" ? fs2.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs2, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs2.readSync);
      function patchLchmod(fs3) {
        fs3.lchmod = function(path2, mode, callback) {
          fs3.open(
            path2,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs3.fchmod(fd, mode, function(err2) {
                fs3.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs3.lchmodSync = function(path2, mode) {
          var fd = fs3.openSync(path2, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs3.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs3.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs3.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs3) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs3.futimes) {
          fs3.lutimes = function(path2, at, mt, cb) {
            fs3.open(path2, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs3.futimes(fd, at, mt, function(er2) {
                fs3.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs3.lutimesSync = function(path2, at, mt) {
            var fd = fs3.openSync(path2, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs3.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs3.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs3.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs3.futimes) {
          fs3.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs3.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs2, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs2, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs2, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs2, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs2, target, options, callback) : orig.call(fs2, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs2, target, options) : orig.call(fs2, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs2) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path2, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
        Stream.call(this);
        var self = this;
        this.path = path2;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs2.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path2, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path2, options);
        Stream.call(this);
        this.path = path2;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs2.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs2 = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = Symbol.for("graceful-fs.queue");
      previousSymbol = Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs2[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs2, queue);
      fs2.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs2, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs2.close);
      fs2.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs2, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs2.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs2[gracefulQueue]);
          require("assert").equal(fs2[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs2[gracefulQueue]);
    }
    module2.exports = patch(clone(fs2));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs2.__patched) {
      module2.exports = patch(fs2);
      fs2.__patched = true;
    }
    function patch(fs3) {
      polyfills(fs3);
      fs3.gracefulify = patch;
      fs3.createReadStream = createReadStream;
      fs3.createWriteStream = createWriteStream;
      var fs$readFile = fs3.readFile;
      fs3.readFile = readFile;
      function readFile(path2, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path2, options, cb);
        function go$readFile(path3, options2, cb2, startTime) {
          return fs$readFile(path3, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path3, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs3.writeFile;
      fs3.writeFile = writeFile;
      function writeFile(path2, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path2, data, options, cb);
        function go$writeFile(path3, data2, options2, cb2, startTime) {
          return fs$writeFile(path3, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path3, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs3.appendFile;
      if (fs$appendFile)
        fs3.appendFile = appendFile;
      function appendFile(path2, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path2, data, options, cb);
        function go$appendFile(path3, data2, options2, cb2, startTime) {
          return fs$appendFile(path3, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path3, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs3.copyFile;
      if (fs$copyFile)
        fs3.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs3.readdir;
      fs3.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path2, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path3, options2, cb2, startTime) {
          return fs$readdir(path3, fs$readdirCallback(
            path3,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path3, options2, cb2, startTime) {
          return fs$readdir(path3, options2, fs$readdirCallback(
            path3,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path2, options, cb);
        function fs$readdirCallback(path3, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path3, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs3);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs3.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs3.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs3, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs3, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs3, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs3, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path2, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path2, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path2, options) {
        return new fs3.ReadStream(path2, options);
      }
      function createWriteStream(path2, options) {
        return new fs3.WriteStream(path2, options);
      }
      var fs$open = fs3.open;
      fs3.open = open;
      function open(path2, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path2, flags, mode, cb);
        function go$open(path3, flags2, mode2, cb2, startTime) {
          return fs$open(path3, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path3, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs3;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs2[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now2 = Date.now();
      for (var i = 0; i < fs2[gracefulQueue].length; ++i) {
        if (fs2[gracefulQueue][i].length > 2) {
          fs2[gracefulQueue][i][3] = now2;
          fs2[gracefulQueue][i][4] = now2;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs2[gracefulQueue].length === 0)
        return;
      var elem = fs2[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs2[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// ../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry_operation.js
var require_retry_operation = __commonJS({
  "../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry_operation.js"(exports2, module2) {
    function RetryOperation(timeouts, options) {
      if (typeof options === "boolean") {
        options = { forever: options };
      }
      this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
      this._timeouts = timeouts;
      this._options = options || {};
      this._maxRetryTime = options && options.maxRetryTime || Infinity;
      this._fn = null;
      this._errors = [];
      this._attempts = 1;
      this._operationTimeout = null;
      this._operationTimeoutCb = null;
      this._timeout = null;
      this._operationStart = null;
      if (this._options.forever) {
        this._cachedTimeouts = this._timeouts.slice(0);
      }
    }
    module2.exports = RetryOperation;
    RetryOperation.prototype.reset = function() {
      this._attempts = 1;
      this._timeouts = this._originalTimeouts;
    };
    RetryOperation.prototype.stop = function() {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      this._timeouts = [];
      this._cachedTimeouts = null;
    };
    RetryOperation.prototype.retry = function(err) {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (!err) {
        return false;
      }
      var currentTime = (/* @__PURE__ */ new Date()).getTime();
      if (err && currentTime - this._operationStart >= this._maxRetryTime) {
        this._errors.unshift(new Error("RetryOperation timeout occurred"));
        return false;
      }
      this._errors.push(err);
      var timeout = this._timeouts.shift();
      if (timeout === void 0) {
        if (this._cachedTimeouts) {
          this._errors.splice(this._errors.length - 1, this._errors.length);
          this._timeouts = this._cachedTimeouts.slice(0);
          timeout = this._timeouts.shift();
        } else {
          return false;
        }
      }
      var self = this;
      var timer = setTimeout(function() {
        self._attempts++;
        if (self._operationTimeoutCb) {
          self._timeout = setTimeout(function() {
            self._operationTimeoutCb(self._attempts);
          }, self._operationTimeout);
          if (self._options.unref) {
            self._timeout.unref();
          }
        }
        self._fn(self._attempts);
      }, timeout);
      if (this._options.unref) {
        timer.unref();
      }
      return true;
    };
    RetryOperation.prototype.attempt = function(fn, timeoutOps) {
      this._fn = fn;
      if (timeoutOps) {
        if (timeoutOps.timeout) {
          this._operationTimeout = timeoutOps.timeout;
        }
        if (timeoutOps.cb) {
          this._operationTimeoutCb = timeoutOps.cb;
        }
      }
      var self = this;
      if (this._operationTimeoutCb) {
        this._timeout = setTimeout(function() {
          self._operationTimeoutCb();
        }, self._operationTimeout);
      }
      this._operationStart = (/* @__PURE__ */ new Date()).getTime();
      this._fn(this._attempts);
    };
    RetryOperation.prototype.try = function(fn) {
      console.log("Using RetryOperation.try() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = function(fn) {
      console.log("Using RetryOperation.start() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = RetryOperation.prototype.try;
    RetryOperation.prototype.errors = function() {
      return this._errors;
    };
    RetryOperation.prototype.attempts = function() {
      return this._attempts;
    };
    RetryOperation.prototype.mainError = function() {
      if (this._errors.length === 0) {
        return null;
      }
      var counts = {};
      var mainError = null;
      var mainErrorCount = 0;
      for (var i = 0; i < this._errors.length; i++) {
        var error = this._errors[i];
        var message = error.message;
        var count = (counts[message] || 0) + 1;
        counts[message] = count;
        if (count >= mainErrorCount) {
          mainError = error;
          mainErrorCount = count;
        }
      }
      return mainError;
    };
  }
});

// ../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry.js
var require_retry = __commonJS({
  "../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry.js"(exports2) {
    var RetryOperation = require_retry_operation();
    exports2.operation = function(options) {
      var timeouts = exports2.timeouts(options);
      return new RetryOperation(timeouts, {
        forever: options && options.forever,
        unref: options && options.unref,
        maxRetryTime: options && options.maxRetryTime
      });
    };
    exports2.timeouts = function(options) {
      if (options instanceof Array) {
        return [].concat(options);
      }
      var opts = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1e3,
        maxTimeout: Infinity,
        randomize: false
      };
      for (var key in options) {
        opts[key] = options[key];
      }
      if (opts.minTimeout > opts.maxTimeout) {
        throw new Error("minTimeout is greater than maxTimeout");
      }
      var timeouts = [];
      for (var i = 0; i < opts.retries; i++) {
        timeouts.push(this.createTimeout(i, opts));
      }
      if (options && options.forever && !timeouts.length) {
        timeouts.push(this.createTimeout(i, opts));
      }
      timeouts.sort(function(a, b) {
        return a - b;
      });
      return timeouts;
    };
    exports2.createTimeout = function(attempt, opts) {
      var random = opts.randomize ? Math.random() + 1 : 1;
      var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
      timeout = Math.min(timeout, opts.maxTimeout);
      return timeout;
    };
    exports2.wrap = function(obj, options, methods) {
      if (options instanceof Array) {
        methods = options;
        options = null;
      }
      if (!methods) {
        methods = [];
        for (var key in obj) {
          if (typeof obj[key] === "function") {
            methods.push(key);
          }
        }
      }
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var original = obj[method];
        obj[method] = function retryWrapper(original2) {
          var op = exports2.operation(options);
          var args = Array.prototype.slice.call(arguments, 1);
          var callback = args.pop();
          args.push(function(err) {
            if (op.retry(err)) {
              return;
            }
            if (err) {
              arguments[0] = op.mainError();
            }
            callback.apply(this, arguments);
          });
          op.attempt(function() {
            original2.apply(obj, args);
          });
        }.bind(obj, original);
        obj[method].options = options;
      }
    };
  }
});

// ../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/index.js
var require_retry2 = __commonJS({
  "../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/index.js"(exports2, module2) {
    module2.exports = require_retry();
  }
});

// ../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/signals.js
var require_signals = __commonJS({
  "../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/signals.js"(exports2, module2) {
    module2.exports = [
      "SIGABRT",
      "SIGALRM",
      "SIGHUP",
      "SIGINT",
      "SIGTERM"
    ];
    if (process.platform !== "win32") {
      module2.exports.push(
        "SIGVTALRM",
        "SIGXCPU",
        "SIGXFSZ",
        "SIGUSR2",
        "SIGTRAP",
        "SIGSYS",
        "SIGQUIT",
        "SIGIOT"
        // should detect profiler and enable/disable accordingly.
        // see #21
        // 'SIGPROF'
      );
    }
    if (process.platform === "linux") {
      module2.exports.push(
        "SIGIO",
        "SIGPOLL",
        "SIGPWR",
        "SIGSTKFLT",
        "SIGUNUSED"
      );
    }
  }
});

// ../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/index.js
var require_signal_exit = __commonJS({
  "../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/index.js"(exports2, module2) {
    var process2 = global.process;
    var processOk = function(process3) {
      return process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
    };
    if (!processOk(process2)) {
      module2.exports = function() {
        return function() {
        };
      };
    } else {
      assert = require("assert");
      signals = require_signals();
      isWin = /^win/i.test(process2.platform);
      EE = require("events");
      if (typeof EE !== "function") {
        EE = EE.EventEmitter;
      }
      if (process2.__signal_exit_emitter__) {
        emitter = process2.__signal_exit_emitter__;
      } else {
        emitter = process2.__signal_exit_emitter__ = new EE();
        emitter.count = 0;
        emitter.emitted = {};
      }
      if (!emitter.infinite) {
        emitter.setMaxListeners(Infinity);
        emitter.infinite = true;
      }
      module2.exports = function(cb, opts) {
        if (!processOk(global.process)) {
          return function() {
          };
        }
        assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
        if (loaded === false) {
          load();
        }
        var ev = "exit";
        if (opts && opts.alwaysLast) {
          ev = "afterexit";
        }
        var remove = function() {
          emitter.removeListener(ev, cb);
          if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) {
            unload();
          }
        };
        emitter.on(ev, cb);
        return remove;
      };
      unload = function unload2() {
        if (!loaded || !processOk(global.process)) {
          return;
        }
        loaded = false;
        signals.forEach(function(sig) {
          try {
            process2.removeListener(sig, sigListeners[sig]);
          } catch (er) {
          }
        });
        process2.emit = originalProcessEmit;
        process2.reallyExit = originalProcessReallyExit;
        emitter.count -= 1;
      };
      module2.exports.unload = unload;
      emit = function emit2(event, code, signal) {
        if (emitter.emitted[event]) {
          return;
        }
        emitter.emitted[event] = true;
        emitter.emit(event, code, signal);
      };
      sigListeners = {};
      signals.forEach(function(sig) {
        sigListeners[sig] = function listener() {
          if (!processOk(global.process)) {
            return;
          }
          var listeners = process2.listeners(sig);
          if (listeners.length === emitter.count) {
            unload();
            emit("exit", null, sig);
            emit("afterexit", null, sig);
            if (isWin && sig === "SIGHUP") {
              sig = "SIGINT";
            }
            process2.kill(process2.pid, sig);
          }
        };
      });
      module2.exports.signals = function() {
        return signals;
      };
      loaded = false;
      load = function load2() {
        if (loaded || !processOk(global.process)) {
          return;
        }
        loaded = true;
        emitter.count += 1;
        signals = signals.filter(function(sig) {
          try {
            process2.on(sig, sigListeners[sig]);
            return true;
          } catch (er) {
            return false;
          }
        });
        process2.emit = processEmit;
        process2.reallyExit = processReallyExit;
      };
      module2.exports.load = load;
      originalProcessReallyExit = process2.reallyExit;
      processReallyExit = function processReallyExit2(code) {
        if (!processOk(global.process)) {
          return;
        }
        process2.exitCode = code || /* istanbul ignore next */
        0;
        emit("exit", process2.exitCode, null);
        emit("afterexit", process2.exitCode, null);
        originalProcessReallyExit.call(process2, process2.exitCode);
      };
      originalProcessEmit = process2.emit;
      processEmit = function processEmit2(ev, arg) {
        if (ev === "exit" && processOk(global.process)) {
          if (arg !== void 0) {
            process2.exitCode = arg;
          }
          var ret = originalProcessEmit.apply(this, arguments);
          emit("exit", process2.exitCode, null);
          emit("afterexit", process2.exitCode, null);
          return ret;
        } else {
          return originalProcessEmit.apply(this, arguments);
        }
      };
    }
    var assert;
    var signals;
    var isWin;
    var EE;
    var emitter;
    var unload;
    var emit;
    var sigListeners;
    var loaded;
    var load;
    var originalProcessReallyExit;
    var processReallyExit;
    var originalProcessEmit;
    var processEmit;
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/mtime-precision.js
var require_mtime_precision = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/mtime-precision.js"(exports2, module2) {
    "use strict";
    var cacheSymbol = Symbol();
    function probe(file, fs2, callback) {
      const cachedPrecision = fs2[cacheSymbol];
      if (cachedPrecision) {
        return fs2.stat(file, (err, stat) => {
          if (err) {
            return callback(err);
          }
          callback(null, stat.mtime, cachedPrecision);
        });
      }
      const mtime = new Date(Math.ceil(Date.now() / 1e3) * 1e3 + 5);
      fs2.utimes(file, mtime, mtime, (err) => {
        if (err) {
          return callback(err);
        }
        fs2.stat(file, (err2, stat) => {
          if (err2) {
            return callback(err2);
          }
          const precision = stat.mtime.getTime() % 1e3 === 0 ? "s" : "ms";
          Object.defineProperty(fs2, cacheSymbol, { value: precision });
          callback(null, stat.mtime, precision);
        });
      });
    }
    function getMtime(precision) {
      let now2 = Date.now();
      if (precision === "s") {
        now2 = Math.ceil(now2 / 1e3) * 1e3;
      }
      return new Date(now2);
    }
    module2.exports.probe = probe;
    module2.exports.getMtime = getMtime;
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/lockfile.js
var require_lockfile = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/lockfile.js"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    var fs2 = require_graceful_fs();
    var retry = require_retry2();
    var onExit = require_signal_exit();
    var mtimePrecision = require_mtime_precision();
    var locks = {};
    function getLockFile(file, options) {
      return options.lockfilePath || `${file}.lock`;
    }
    function resolveCanonicalPath(file, options, callback) {
      if (!options.realpath) {
        return callback(null, path2.resolve(file));
      }
      options.fs.realpath(file, callback);
    }
    function acquireLock(file, options, callback) {
      const lockfilePath = getLockFile(file, options);
      options.fs.mkdir(lockfilePath, (err) => {
        if (!err) {
          return mtimePrecision.probe(lockfilePath, options.fs, (err2, mtime, mtimePrecision2) => {
            if (err2) {
              options.fs.rmdir(lockfilePath, () => {
              });
              return callback(err2);
            }
            callback(null, mtime, mtimePrecision2);
          });
        }
        if (err.code !== "EEXIST") {
          return callback(err);
        }
        if (options.stale <= 0) {
          return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
        }
        options.fs.stat(lockfilePath, (err2, stat) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return acquireLock(file, { ...options, stale: 0 }, callback);
            }
            return callback(err2);
          }
          if (!isLockStale(stat, options)) {
            return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
          }
          removeLock(file, options, (err3) => {
            if (err3) {
              return callback(err3);
            }
            acquireLock(file, { ...options, stale: 0 }, callback);
          });
        });
      });
    }
    function isLockStale(stat, options) {
      return stat.mtime.getTime() < Date.now() - options.stale;
    }
    function removeLock(file, options, callback) {
      options.fs.rmdir(getLockFile(file, options), (err) => {
        if (err && err.code !== "ENOENT") {
          return callback(err);
        }
        callback();
      });
    }
    function updateLock(file, options) {
      const lock2 = locks[file];
      if (lock2.updateTimeout) {
        return;
      }
      lock2.updateDelay = lock2.updateDelay || options.update;
      lock2.updateTimeout = setTimeout(() => {
        lock2.updateTimeout = null;
        options.fs.stat(lock2.lockfilePath, (err, stat) => {
          const isOverThreshold = lock2.lastUpdate + options.stale < Date.now();
          if (err) {
            if (err.code === "ENOENT" || isOverThreshold) {
              return setLockAsCompromised(file, lock2, Object.assign(err, { code: "ECOMPROMISED" }));
            }
            lock2.updateDelay = 1e3;
            return updateLock(file, options);
          }
          const isMtimeOurs = lock2.mtime.getTime() === stat.mtime.getTime();
          if (!isMtimeOurs) {
            return setLockAsCompromised(
              file,
              lock2,
              Object.assign(
                new Error("Unable to update lock within the stale threshold"),
                { code: "ECOMPROMISED" }
              )
            );
          }
          const mtime = mtimePrecision.getMtime(lock2.mtimePrecision);
          options.fs.utimes(lock2.lockfilePath, mtime, mtime, (err2) => {
            const isOverThreshold2 = lock2.lastUpdate + options.stale < Date.now();
            if (lock2.released) {
              return;
            }
            if (err2) {
              if (err2.code === "ENOENT" || isOverThreshold2) {
                return setLockAsCompromised(file, lock2, Object.assign(err2, { code: "ECOMPROMISED" }));
              }
              lock2.updateDelay = 1e3;
              return updateLock(file, options);
            }
            lock2.mtime = mtime;
            lock2.lastUpdate = Date.now();
            lock2.updateDelay = null;
            updateLock(file, options);
          });
        });
      }, lock2.updateDelay);
      if (lock2.updateTimeout.unref) {
        lock2.updateTimeout.unref();
      }
    }
    function setLockAsCompromised(file, lock2, err) {
      lock2.released = true;
      if (lock2.updateTimeout) {
        clearTimeout(lock2.updateTimeout);
      }
      if (locks[file] === lock2) {
        delete locks[file];
      }
      lock2.options.onCompromised(err);
    }
    function lock(file, options, callback) {
      options = {
        stale: 1e4,
        update: null,
        realpath: true,
        retries: 0,
        fs: fs2,
        onCompromised: (err) => {
          throw err;
        },
        ...options
      };
      options.retries = options.retries || 0;
      options.retries = typeof options.retries === "number" ? { retries: options.retries } : options.retries;
      options.stale = Math.max(options.stale || 0, 2e3);
      options.update = options.update == null ? options.stale / 2 : options.update || 0;
      options.update = Math.max(Math.min(options.update, options.stale / 2), 1e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const operation = retry.operation(options.retries);
        operation.attempt(() => {
          acquireLock(file2, options, (err2, mtime, mtimePrecision2) => {
            if (operation.retry(err2)) {
              return;
            }
            if (err2) {
              return callback(operation.mainError());
            }
            const lock2 = locks[file2] = {
              lockfilePath: getLockFile(file2, options),
              mtime,
              mtimePrecision: mtimePrecision2,
              options,
              lastUpdate: Date.now()
            };
            updateLock(file2, options);
            callback(null, (releasedCallback) => {
              if (lock2.released) {
                return releasedCallback && releasedCallback(Object.assign(new Error("Lock is already released"), { code: "ERELEASED" }));
              }
              unlock(file2, { ...options, realpath: false }, releasedCallback);
            });
          });
        });
      });
    }
    function unlock(file, options, callback) {
      options = {
        fs: fs2,
        realpath: true,
        ...options
      };
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const lock2 = locks[file2];
        if (!lock2) {
          return callback(Object.assign(new Error("Lock is not acquired/owned by you"), { code: "ENOTACQUIRED" }));
        }
        lock2.updateTimeout && clearTimeout(lock2.updateTimeout);
        lock2.released = true;
        delete locks[file2];
        removeLock(file2, options, callback);
      });
    }
    function check(file, options, callback) {
      options = {
        stale: 1e4,
        realpath: true,
        fs: fs2,
        ...options
      };
      options.stale = Math.max(options.stale || 0, 2e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        options.fs.stat(getLockFile(file2, options), (err2, stat) => {
          if (err2) {
            return err2.code === "ENOENT" ? callback(null, false) : callback(err2);
          }
          return callback(null, !isLockStale(stat, options));
        });
      });
    }
    function getLocks() {
      return locks;
    }
    onExit(() => {
      for (const file in locks) {
        const options = locks[file].options;
        try {
          options.fs.rmdirSync(getLockFile(file, options));
        } catch (e) {
        }
      }
    });
    module2.exports.lock = lock;
    module2.exports.unlock = unlock;
    module2.exports.check = check;
    module2.exports.getLocks = getLocks;
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/adapter.js
var require_adapter = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/adapter.js"(exports2, module2) {
    "use strict";
    var fs2 = require_graceful_fs();
    function createSyncFs(fs3) {
      const methods = ["mkdir", "realpath", "stat", "rmdir", "utimes"];
      const newFs = { ...fs3 };
      methods.forEach((method) => {
        newFs[method] = (...args) => {
          const callback = args.pop();
          let ret;
          try {
            ret = fs3[`${method}Sync`](...args);
          } catch (err) {
            return callback(err);
          }
          callback(null, ret);
        };
      });
      return newFs;
    }
    function toPromise(method) {
      return (...args) => new Promise((resolve2, reject) => {
        args.push((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve2(result);
          }
        });
        method(...args);
      });
    }
    function toSync(method) {
      return (...args) => {
        let err;
        let result;
        args.push((_err, _result) => {
          err = _err;
          result = _result;
        });
        method(...args);
        if (err) {
          throw err;
        }
        return result;
      };
    }
    function toSyncOptions(options) {
      options = { ...options };
      options.fs = createSyncFs(options.fs || fs2);
      if (typeof options.retries === "number" && options.retries > 0 || options.retries && typeof options.retries.retries === "number" && options.retries.retries > 0) {
        throw Object.assign(new Error("Cannot use retries with the sync api"), { code: "ESYNC" });
      }
      return options;
    }
    module2.exports = {
      toPromise,
      toSync,
      toSyncOptions
    };
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/index.js
var require_proper_lockfile = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/index.js"(exports2, module2) {
    "use strict";
    var lockfile = require_lockfile();
    var { toPromise, toSync, toSyncOptions } = require_adapter();
    async function lock(file, options) {
      const release = await toPromise(lockfile.lock)(file, options);
      return toPromise(release);
    }
    function lockSync(file, options) {
      const release = toSync(lockfile.lock)(file, toSyncOptions(options));
      return toSync(release);
    }
    function unlock(file, options) {
      return toPromise(lockfile.unlock)(file, options);
    }
    function unlockSync(file, options) {
      return toSync(lockfile.unlock)(file, toSyncOptions(options));
    }
    function check(file, options) {
      return toPromise(lockfile.check)(file, options);
    }
    function checkSync(file, options) {
      return toSync(lockfile.check)(file, toSyncOptions(options));
    }
    module2.exports = lock;
    module2.exports.lock = lock;
    module2.exports.unlock = unlock;
    module2.exports.lockSync = lockSync;
    module2.exports.unlockSync = unlockSync;
    module2.exports.check = check;
    module2.exports.checkSync = checkSync;
  }
});

// dist/hooks/lib/mint-session-token.js
var mint_session_token_exports = {};
__export(mint_session_token_exports, {
  mintSessionRestTokenFromKeyring: () => mintSessionRestTokenFromKeyring
});
function buildMintDeviceProofHeader(url) {
  try {
    const { keyPair, backend } = getOrCreateDeviceKeyPair();
    return buildDeviceProof(keyPair, {
      nonce: url,
      backend: backend === "keychain" ? "keychain" : "file"
    });
  } catch {
    return void 0;
  }
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
async function withMintLock(projectDir, fn) {
  const dir = (0, import_node_path6.join)(projectDir, ".gramatr");
  try {
    if (!(0, import_node_fs6.existsSync)(dir))
      (0, import_node_fs6.mkdirSync)(dir, { recursive: true, mode: 448 });
    const lockPath = (0, import_node_path6.join)(dir, MINT_LOCK_FILE);
    if (!(0, import_node_fs6.existsSync)(lockPath))
      (0, import_node_fs6.writeFileSync)(lockPath, "", { mode: 384 });
    const lockfile = await Promise.resolve().then(() => __toESM(require_proper_lockfile(), 1));
    let release = null;
    try {
      release = await lockfile.default.lock(lockPath, {
        retries: { retries: 10, minTimeout: 10, maxTimeout: 200 },
        stale: MINT_LOCK_STALE_MS
      });
    } catch {
      return await fn();
    }
    try {
      return await fn();
    } finally {
      await release();
    }
  } catch {
    return await fn();
  }
}
function resolveProjectIdForMint(projectDir) {
  try {
    return readProjectState(projectDir)?.project?.project_id ?? null;
  } catch {
    return null;
  }
}
async function mintSessionRestTokenFromKeyring(projectDir, baseUrl, fetchImpl = fetch, now2 = Date.now(), knownBadToken, clientSessionId) {
  const projectId = resolveProjectIdForMint(projectDir);
  if (!projectId) {
    return { status: "no_credential" };
  }
  if (!isMintCredentialUsable(readMintCredential(projectId), now2)) {
    return { status: "no_credential" };
  }
  return withMintLock(projectDir, async () => {
    const current = readSessionToken(projectDir, clientSessionId);
    if (isSessionTokenValid(current, now2) && (!knownBadToken || current?.token !== knownBadToken)) {
      return { status: "minted", file: current };
    }
    const record = readMintCredential(projectId);
    if (!isMintCredentialUsable(record, now2) || !record) {
      return { status: "no_credential" };
    }
    const trimmed = baseUrl.replace(/\/+$/, "");
    if (!trimmed)
      return { status: "no_credential" };
    const url = `${apiV1Base(trimmed)}/session/token/mint`;
    const deviceProof = buildMintDeviceProofHeader(url);
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${record.token}`,
          ...deviceProof ? { "X-Gramatr-Device-Proof": deviceProof } : {}
        },
        signal: AbortSignal.timeout(MINT_TIMEOUT_MS)
      });
    } catch {
      return { status: "error" };
    }
    if (res.status === 401) {
      await deleteMintCredential(projectId);
      return { status: "denied" };
    }
    if (!res.ok) {
      try {
        const body2 = await res.json();
        const rotated2 = normalizeRotatedCredential(body2.mint_credential);
        if (rotated2)
          writeMintCredential(rotated2, projectId);
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
    const wrote = persistBootstrapRestToken(projectDir, body.rest_token, clientSessionId);
    if (!wrote) {
      return { status: "error" };
    }
    const rotated = normalizeRotatedCredential(body.mint_credential);
    if (rotated)
      writeMintCredential(rotated, projectId);
    const file = readSessionToken(projectDir, clientSessionId);
    if (!file)
      return { status: "error" };
    return { status: "minted", file };
  });
}
var import_node_fs6, import_node_path6, MINT_TIMEOUT_MS, MINT_LOCK_FILE, MINT_LOCK_STALE_MS;
var init_mint_session_token = __esm({
  "dist/hooks/lib/mint-session-token.js"() {
    "use strict";
    import_node_fs6 = require("node:fs");
    import_node_path6 = require("node:path");
    init_session_rest_token();
    init_mint_credential_store();
    init_project_state();
    init_device_key();
    init_device_key_store();
    MINT_TIMEOUT_MS = 3e3;
    MINT_LOCK_FILE = ".session-mint.lock";
    MINT_LOCK_STALE_MS = 5e3;
  }
});

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
var init_git_remote_parser = __esm({
  "dist/hooks/lib/git-remote-parser.js"() {
    "use strict";
  }
});

// dist/hooks/lib/git-config-reader.js
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
var import_fs, path;
var init_git_config_reader = __esm({
  "dist/hooks/lib/git-config-reader.js"() {
    "use strict";
    import_fs = require("fs");
    path = __toESM(require("path"), 1);
  }
});

// dist/hooks/generated/hook-timeouts.js
var HOOK_INPUT_READ_TIMEOUT_MS, HEALTH_CHECK_TIMEOUT_MS;
var init_hook_timeouts = __esm({
  "dist/hooks/generated/hook-timeouts.js"() {
    "use strict";
    HOOK_INPUT_READ_TIMEOUT_MS = 500;
    HEALTH_CHECK_TIMEOUT_MS = 5e3;
  }
});

// dist/hooks/lib/gramatr-hook-utils.js
var gramatr_hook_utils_exports = {};
__export(gramatr_hook_utils_exports, {
  appendLine: () => appendLine,
  checkServerHealth: () => checkServerHealth,
  createDefaultConfig: () => createDefaultConfig,
  deriveProjectId: () => deriveProjectId,
  getCommitCountSince: () => getCommitCountSince,
  getCommitLogSince: () => getCommitLogSince,
  getCommitsSince: () => getCommitsSince,
  getConfigPath: () => getConfigPath,
  getFilesChanged: () => getFilesChanged,
  getGitContext: () => getGitContext,
  getGitStatusShort: () => getGitStatusShort,
  getRecentCommits: () => getRecentCommits,
  log: () => log,
  migrateConfig: () => migrateConfig,
  migrateSettingsJson: () => migrateSettingsJson,
  now: () => now,
  readGmtrConfig: () => readGmtrConfig,
  readHookInput: () => readHookInput,
  readJsonFile: () => readJsonFile,
  resolveAuthToken: () => resolveAuthToken,
  resolveMcpUrl: () => resolveMcpUrl,
  resolveUserId: () => resolveUserId,
  resolveUserName: () => resolveUserName,
  writeGmtrConfig: () => writeGmtrConfig,
  writeJsonFile: () => writeJsonFile
});
function log(msg) {
  process.stderr.write(msg + "\n");
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
}
async function readHookInput() {
  const chunks = [];
  await new Promise((resolve2) => {
    const timeout = setTimeout(() => {
      process.stdin.destroy();
      resolve2();
    }, HOOK_INPUT_READ_TIMEOUT_MS);
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      clearTimeout(timeout);
      resolve2();
    });
    process.stdin.on("error", () => {
      clearTimeout(timeout);
      resolve2();
    });
    process.stdin.resume();
  });
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim())
    return { session_id: "unknown" };
  return JSON.parse(raw);
}
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
function getConfigPath(rootDir) {
  return (0, import_path.join)(rootDir, ".gramatr", "settings.json");
}
function readGmtrConfig(rootDir) {
  try {
    const configPath = getConfigPath(rootDir);
    if (!(0, import_fs2.existsSync)(configPath))
      return null;
    const raw = (0, import_fs2.readFileSync)(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeGmtrConfig(rootDir, config) {
  const configPath = getConfigPath(rootDir);
  const tmpPath = configPath + ".tmp";
  const dir = (0, import_path.join)(rootDir, ".gramatr");
  if (!(0, import_fs2.existsSync)(dir)) {
    (0, import_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  (0, import_fs2.writeFileSync)(tmpPath, JSON.stringify(config, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_fs2.renameSync)(tmpPath, configPath);
  try {
    (0, import_fs2.chmodSync)(configPath, 384);
  } catch {
  }
}
function migrateConfig(config, projectId) {
  const version = config.config_version || "0";
  if (version !== "0" && version !== "null") {
    config.project_id = projectId;
    return config;
  }
  log("  Migrating settings.json to v2.1...");
  const oldProjectId = config.project_id || config.project_name || "";
  const oldProjectName = config.project_name || "";
  const knownAs = new Set(config.previously_known_as || []);
  if (oldProjectId && oldProjectId !== projectId) {
    knownAs.add(oldProjectId);
  }
  if (oldProjectName && oldProjectName !== projectId && oldProjectName !== oldProjectId) {
    knownAs.add(oldProjectName);
  }
  config.config_version = "2.1";
  config.project_id = projectId;
  config.previously_known_as = Array.from(knownAs);
  config.migrated_at = now();
  log(`  Done migrating to v2.1 (project_id: ${projectId}, aliases: [${Array.from(knownAs).join(", ")}])`);
  return config;
}
function createDefaultConfig(options) {
  const ts = now();
  return {
    version: "2.0",
    config_version: "2.1",
    project_entity_id: null,
    project_id: options.projectId,
    project_name: options.projectName,
    previously_known_as: [],
    git_remote: options.gitRemote,
    related_entities: {
      databases: [],
      people: [],
      services: [],
      concepts: [],
      projects: []
    },
    metadata: {
      created: ts
    }
  };
}
function resolveAuthToken() {
  try {
    const configPath = (0, import_path.join)(HOME, ".gramatr.json");
    const config = JSON.parse((0, import_fs2.readFileSync)(configPath, "utf8"));
    if (config.token)
      return config.token;
  } catch {
  }
  const envToken = getGramatrTokenFromEnv();
  if (envToken)
    return envToken;
  try {
    const gmtrDir = getGramatrDirFromEnv() || (0, import_path.join)(HOME, ".gramatr");
    const settingsPath = (0, import_path.join)(gmtrDir, "settings.json");
    const settings = JSON.parse((0, import_fs2.readFileSync)(settingsPath, "utf8"));
    if (settings.auth?.api_key && settings.auth.api_key !== "REPLACE_WITH_YOUR_API_KEY") {
      return settings.auth.api_key;
    }
  } catch {
  }
  return null;
}
function resolveUserId() {
  try {
    const configPath = (0, import_path.join)(HOME, ".gramatr.json");
    const config = JSON.parse((0, import_fs2.readFileSync)(configPath, "utf8"));
    if (typeof config.user_id === "string" && config.user_id.length > 0)
      return config.user_id;
  } catch {
  }
  try {
    const gramatrDir = getGramatrDirFromEnv() || (0, import_path.join)(HOME, ".gramatr");
    const settings = JSON.parse((0, import_fs2.readFileSync)((0, import_path.join)(gramatrDir, "settings.json"), "utf8"));
    if (typeof settings?.auth?.user_id === "string" && settings.auth.user_id.length > 0)
      return settings.auth.user_id;
  } catch {
  }
  return null;
}
function resolveUserName() {
  try {
    const configPath = (0, import_path.join)(HOME, ".gramatr.json");
    const config = JSON.parse((0, import_fs2.readFileSync)(configPath, "utf8"));
    if (typeof config.user?.name === "string" && config.user.name.length > 0) {
      return config.user.name;
    }
  } catch {
  }
  return void 0;
}
function migrateSettingsJson() {
  const gramatrDir = getGramatrDirFromEnv() || (0, import_path.join)(HOME, ".gramatr");
  const settingsPath = (0, import_path.join)(gramatrDir, "settings.json");
  if (!(0, import_fs2.existsSync)(settingsPath))
    return;
  let settings;
  try {
    settings = JSON.parse((0, import_fs2.readFileSync)(settingsPath, "utf8"));
  } catch {
    return;
  }
  const configPath = (0, import_path.join)(HOME, ".gramatr.json");
  let config = {};
  try {
    config = JSON.parse((0, import_fs2.readFileSync)(configPath, "utf8"));
  } catch {
  }
  let changed = false;
  const token = settings?.auth?.api_key;
  if (token && token !== "REPLACE_WITH_YOUR_API_KEY" && !config.token) {
    config.token = token;
    changed = true;
  }
  const userId = settings?.auth?.user_id;
  if (userId && !config.user_id) {
    config.user_id = userId;
    changed = true;
  }
  const serverUrl = settings?.auth?.server_url;
  if (serverUrl && !config.server_url) {
    config.server_url = serverUrl;
    changed = true;
  }
  const autoCompact = settings?.auto_compact;
  if (autoCompact && !config.auto_compact) {
    config.auto_compact = autoCompact;
    changed = true;
  }
  const principalName = settings?.principal?.name;
  if (principalName && !config.user?.name) {
    if (!config.user)
      config.user = {};
    config.user.name = principalName;
    changed = true;
  }
  const principalTimezone = settings?.principal?.timezone;
  if (principalTimezone && !config.user?.timezone) {
    if (!config.user)
      config.user = {};
    config.user.timezone = principalTimezone;
    changed = true;
  }
  if (changed) {
    try {
      (0, import_fs2.writeFileSync)(configPath, JSON.stringify(config, null, 2) + "\n");
    } catch {
      return;
    }
  }
  try {
    (0, import_fs2.unlinkSync)(settingsPath);
  } catch {
  }
}
function resolveMcpUrl() {
  try {
    const configPath = (0, import_path.join)(HOME, ".gramatr.json");
    const config = JSON.parse((0, import_fs2.readFileSync)(configPath, "utf8"));
    if (config.server_url)
      return config.server_url;
  } catch {
  }
  try {
    const gmtrDir = getGramatrDirFromEnv() || (0, import_path.join)(HOME, ".gramatr");
    const settingsPath = (0, import_path.join)(gmtrDir, "settings.json");
    const settings = JSON.parse((0, import_fs2.readFileSync)(settingsPath, "utf8"));
    if (settings.auth?.server_url)
      return settings.auth.server_url;
  } catch {
  }
  const envUrl = getGramatrUrlFromEnv();
  if (envUrl)
    return envUrl;
  return "https://api.gramatr.com/mcp";
}
async function checkServerHealth(timeoutMs = HEALTH_CHECK_TIMEOUT_MS) {
  const mcpUrl = resolveMcpUrl();
  const baseUrl = mcpUrl.replace(/\/mcp$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: controller.signal
    });
    if (response.ok) {
      const body = await response.text();
      return { healthy: true, detail: body };
    } else if (response.status === 404 || response.status === 405) {
      return { healthy: true, detail: "REACHABLE (no /health endpoint)" };
    } else {
      return { healthy: false, detail: `HTTP ${response.status}` };
    }
  } catch {
    return { healthy: false, detail: `Cannot reach ${baseUrl}` };
  } finally {
    clearTimeout(timeout);
  }
}
function readJsonFile(filePath) {
  try {
    if (!(0, import_fs2.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_fs2.readFileSync)(filePath, "utf8"));
  } catch {
    return null;
  }
}
function writeJsonFile(filePath, data) {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (dir && !(0, import_fs2.existsSync)(dir)) {
    (0, import_fs2.mkdirSync)(dir, { recursive: true });
  }
  (0, import_fs2.writeFileSync)(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}
function appendLine(filePath, line) {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (dir && !(0, import_fs2.existsSync)(dir)) {
    (0, import_fs2.mkdirSync)(dir, { recursive: true });
  }
  (0, import_fs2.appendFileSync)(filePath, line + "\n", "utf8");
}
function getCommitCountSince(since) {
  try {
    const output = (0, import_child_process.execSync)(`git log --since="${since}" --oneline`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output)
      return 0;
    return output.split("\n").length;
  } catch {
    return 0;
  }
}
function getCommitLogSince(since, maxCount = 5) {
  try {
    const output = (0, import_child_process.execSync)(`git log --since="${since}" --pretty=format:"%h - %s (%ar)" -${maxCount}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    if (!output)
      return [];
    return output.split("\n");
  } catch {
    return [];
  }
}
function getCommitsSince(since, maxCount = 5) {
  try {
    const output = (0, import_child_process.execSync)(`git log --since="${since}" --pretty=format:"%h %s" -${maxCount}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    if (!output)
      return [];
    return output.split("\n");
  } catch {
    return [];
  }
}
function getGitStatusShort(maxLines = 10) {
  try {
    const output = (0, import_child_process.execSync)("git status --short", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output)
      return [];
    return output.split("\n").slice(0, maxLines);
  } catch {
    return [];
  }
}
function getFilesChanged(fromRef, toRef = "HEAD", maxCount = 10) {
  try {
    const output = (0, import_child_process.execSync)(`git diff --name-only ${fromRef}..${toRef}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output)
      return [];
    return output.split("\n").slice(0, maxCount);
  } catch {
    return [];
  }
}
function getRecentCommits(count = 3) {
  try {
    const output = (0, import_child_process.execSync)(`git log --oneline -${count}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output)
      return [];
    return output.split("\n");
  } catch {
    return [];
  }
}
var import_child_process, import_fs2, import_path, HOME;
var init_gramatr_hook_utils = __esm({
  "dist/hooks/lib/gramatr-hook-utils.js"() {
    "use strict";
    import_child_process = require("child_process");
    import_fs2 = require("fs");
    import_path = require("path");
    init_git_remote_parser();
    init_git_config_reader();
    init_config_runtime();
    init_hook_timeouts();
    HOME = getHomeDir();
  }
});

// dist/hooks/lib/proxy-token-ladder.js
var proxy_token_ladder_exports = {};
__export(proxy_token_ladder_exports, {
  PROXY_TOKEN_PROACTIVE_RENEW_FRACTION: () => PROXY_TOKEN_PROACTIVE_RENEW_FRACTION,
  ensureFreshProxyToken: () => ensureFreshProxyToken,
  getProxyTokenPath: () => getProxyTokenPath,
  mintProxyTokenFromKeyring: () => mintProxyTokenFromKeyring,
  readProxyToken: () => readProxyToken,
  shouldProactivelyMint: () => shouldProactivelyMint,
  writeProxyToken: () => writeProxyToken
});
function getProxyTokenPath(dataDir) {
  return (0, import_node_path7.join)(dataDir, TOKEN_FILE);
}
function readProxyToken(dataDir) {
  try {
    const raw = (0, import_node_fs7.readFileSync)(getProxyTokenPath(dataDir), "utf8");
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
  if (!(0, import_node_fs7.existsSync)(dataDir))
    (0, import_node_fs7.mkdirSync)(dataDir, { recursive: true });
  const dest = getProxyTokenPath(dataDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs7.writeFileSync)(tmp, JSON.stringify(record, null, 2) + "\n", "utf8");
  (0, import_node_fs7.renameSync)(tmp, dest);
}
function shouldProactivelyMint(record, now2 = Date.now()) {
  if (!record || !record.issued_at || !record.expires_at)
    return false;
  const start = Date.parse(record.issued_at);
  const exp = Date.parse(record.expires_at);
  if (Number.isNaN(start) || Number.isNaN(exp))
    return false;
  const lifetime = exp - start;
  if (lifetime <= 0)
    return false;
  const elapsed = now2 - start;
  return elapsed >= lifetime * PROXY_TOKEN_PROACTIVE_RENEW_FRACTION;
}
function buildMintDeviceProofHeader2(url) {
  try {
    const { keyPair, backend } = getOrCreateDeviceKeyPair();
    return buildDeviceProof(keyPair, {
      nonce: url,
      backend: backend === "keychain" ? "keychain" : "file"
    });
  } catch {
    return void 0;
  }
}
function normalizeRotatedCredential2(block) {
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
  if (token.startsWith(SESSION_REST_TOKEN_PREFIX))
    return null;
  const rec = { token };
  if (typeof issued_at === "string" && issued_at.length > 0)
    rec.issued_at = issued_at;
  if (typeof expires_at === "string" && expires_at.length > 0)
    rec.expires_at = expires_at;
  return rec;
}
async function withMintLock2(dataDir, fn) {
  try {
    if (!(0, import_node_fs7.existsSync)(dataDir))
      (0, import_node_fs7.mkdirSync)(dataDir, { recursive: true });
    const lockPath = (0, import_node_path7.join)(dataDir, MINT_LOCK_FILE2);
    if (!(0, import_node_fs7.existsSync)(lockPath))
      (0, import_node_fs7.writeFileSync)(lockPath, "", { mode: 384 });
    const lockfile = await Promise.resolve().then(() => __toESM(require_proper_lockfile(), 1));
    let release = null;
    try {
      release = await lockfile.default.lock(lockPath, {
        retries: { retries: 10, minTimeout: 10, maxTimeout: 200 },
        stale: MINT_LOCK_STALE_MS2
      });
    } catch {
      return await fn();
    }
    try {
      return await fn();
    } finally {
      await release();
    }
  } catch {
    return await fn();
  }
}
async function mintProxyTokenFromKeyring(dataDir, baseUrl, fetchImpl = fetch, now2 = Date.now(), knownStaleToken) {
  if (!isMintCredentialUsable(readDeviceMintCredential(), now2)) {
    return { status: "no_credential" };
  }
  return withMintLock2(dataDir, async () => {
    const current = readProxyToken(dataDir);
    if (current && knownStaleToken && current.token !== knownStaleToken) {
      return { status: "minted", record: current };
    }
    const record = readDeviceMintCredential();
    if (!isMintCredentialUsable(record, now2) || !record) {
      return { status: "no_credential" };
    }
    const trimmed = baseUrl.replace(/\/+$/, "");
    if (!trimmed)
      return { status: "no_credential" };
    const url = `${apiV1Base(trimmed)}/session/token/mint`;
    const deviceProof = buildMintDeviceProofHeader2(url);
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${record.token}`,
          ...deviceProof ? { "X-Gramatr-Device-Proof": deviceProof } : {}
        },
        signal: AbortSignal.timeout(MINT_TIMEOUT_MS2)
      });
    } catch {
      return { status: "error" };
    }
    if (res.status === 401) {
      await deleteDeviceMintCredential();
      return { status: "denied" };
    }
    if (!res.ok) {
      try {
        const body2 = await res.json();
        const rotated2 = normalizeRotatedCredential2(body2.mint_credential);
        if (rotated2)
          writeDeviceMintCredential(rotated2);
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
      const rotated2 = normalizeRotatedCredential2(body.mint_credential);
      if (rotated2)
        writeDeviceMintCredential(rotated2);
      return { status: "error" };
    }
    writeProxyToken(dataDir, minted);
    const rotated = normalizeRotatedCredential2(body.mint_credential);
    if (rotated)
      writeDeviceMintCredential(rotated);
    return { status: "minted", record: minted };
  });
}
async function ensureFreshProxyToken(dataDir, baseUrl, fetchImpl = fetch, now2 = Date.now()) {
  const current = readProxyToken(dataDir);
  if (current && !shouldProactivelyMint(current, now2)) {
    return current;
  }
  const outcome = await mintProxyTokenFromKeyring(dataDir, baseUrl, fetchImpl, now2, current?.token);
  if (outcome.status === "minted")
    return outcome.record;
  return current;
}
var import_node_fs7, import_node_path7, SESSION_REST_TOKEN_PREFIX, TOKEN_FILE, MINT_TIMEOUT_MS2, PROXY_TOKEN_PROACTIVE_RENEW_FRACTION, MINT_LOCK_FILE2, MINT_LOCK_STALE_MS2;
var init_proxy_token_ladder = __esm({
  "dist/hooks/lib/proxy-token-ladder.js"() {
    "use strict";
    import_node_fs7 = require("node:fs");
    import_node_path7 = require("node:path");
    init_session_rest_token();
    init_mint_credential_store();
    init_device_key();
    init_device_key_store();
    SESSION_REST_TOKEN_PREFIX = "gmtr_sess_";
    TOKEN_FILE = "token.json";
    MINT_TIMEOUT_MS2 = 3e3;
    PROXY_TOKEN_PROACTIVE_RENEW_FRACTION = 0.5;
    MINT_LOCK_FILE2 = "token-mint.lock";
    MINT_LOCK_STALE_MS2 = 5e3;
  }
});

// dist/hooks/lib/session-rest-token.js
function sanitizeClientSessionIdForFilename(clientSessionId) {
  return clientSessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
}
function getSessionTokenPath(projectDir, clientSessionId) {
  if (clientSessionId) {
    return (0, import_node_path8.join)(projectDir, GRAMATR_DIR3, SESSION_TOKEN_SIDECAR_DIR, `${sanitizeClientSessionIdForFilename(clientSessionId)}.session`);
  }
  return (0, import_node_path8.join)(projectDir, GRAMATR_DIR3, SESSION_FILE);
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
function writeSessionToken(projectDir, file, clientSessionId) {
  const dest = getSessionTokenPath(projectDir, clientSessionId);
  const dir = (0, import_node_path8.dirname)(dest);
  if (!(0, import_node_fs8.existsSync)(dir)) {
    (0, import_node_fs8.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs8.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs8.renameSync)(tmp, dest);
  try {
    (0, import_node_fs8.chmodSync)(dest, 384);
  } catch {
  }
}
function persistBootstrapRestToken(projectDir, block, clientSessionId) {
  const file = normalizeRestTokenBlock(block);
  if (!file)
    return false;
  writeSessionToken(projectDir, file, clientSessionId);
  return true;
}
function readSessionToken(projectDir, clientSessionId) {
  const dest = getSessionTokenPath(projectDir, clientSessionId);
  try {
    if (!(0, import_node_fs8.existsSync)(dest))
      return null;
    const parsed = JSON.parse((0, import_node_fs8.readFileSync)(dest, "utf8"));
    return normalizeRestTokenBlock(parsed);
  } catch {
    return null;
  }
}
function isSessionTokenValid(file, now2 = Date.now()) {
  if (!file)
    return false;
  const exp = Date.parse(file.expires_at);
  if (Number.isNaN(exp))
    return false;
  return exp - SESSION_TOKEN_EXPIRY_SKEW_MS > now2;
}
function shouldProactivelyRenew(file, now2 = Date.now()) {
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
  const elapsed = now2 - start;
  return elapsed >= lifetime * SESSION_TOKEN_PROACTIVE_RENEW_FRACTION;
}
function deleteSessionToken(projectDir, clientSessionId) {
  try {
    (0, import_node_fs8.rmSync)(getSessionTokenPath(projectDir, clientSessionId), { force: true });
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
async function renewSessionToken(projectDir, file, fetchImpl = fetch, clientSessionId) {
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
  writeSessionToken(projectDir, fresh, clientSessionId);
  return { status: "renewed", file: fresh };
}
async function attemptRung3Mint(projectDir, file, fetchImpl, now2, clientSessionId) {
  const { mintSessionRestTokenFromKeyring: mintSessionRestTokenFromKeyring2 } = await Promise.resolve().then(() => (init_mint_session_token(), mint_session_token_exports));
  return mintSessionRestTokenFromKeyring2(projectDir, file.base_url, fetchImpl, now2, file.token, clientSessionId);
}
async function handleRenewDenied(projectDir, file, fetchImpl, now2, clientSessionId) {
  const minted = await attemptRung3Mint(projectDir, file, fetchImpl, now2, clientSessionId);
  if (minted.status === "minted")
    return minted.file;
  deleteSessionToken(projectDir, clientSessionId);
  return null;
}
async function attemptColdStartRung3Mint(projectDir, fetchImpl, now2, clientSessionId) {
  const [{ mintSessionRestTokenFromKeyring: mintSessionRestTokenFromKeyring2 }, { resolveMcpUrl: resolveMcpUrl2 }] = await Promise.all([
    Promise.resolve().then(() => (init_mint_session_token(), mint_session_token_exports)),
    Promise.resolve().then(() => (init_gramatr_hook_utils(), gramatr_hook_utils_exports))
  ]);
  const baseUrl = resolveMcpUrl2().replace(/\/mcp\/?$/, "");
  const outcome = await mintSessionRestTokenFromKeyring2(projectDir, baseUrl, fetchImpl, now2, void 0, clientSessionId);
  return outcome.status === "minted" ? outcome.file : null;
}
async function resolveUsableSessionToken(projectDir, fetchImpl = fetch, now2 = Date.now(), clientSessionId) {
  const file = readSessionToken(projectDir, clientSessionId);
  if (!file)
    return attemptColdStartRung3Mint(projectDir, fetchImpl, now2, clientSessionId);
  if (isSessionTokenValid(file, now2)) {
    if (shouldProactivelyRenew(file, now2)) {
      const outcome2 = await renewSessionToken(projectDir, file, fetchImpl, clientSessionId);
      if (outcome2.status === "renewed")
        return outcome2.file;
      if (outcome2.status === "denied") {
        const minted = await attemptRung3Mint(projectDir, file, fetchImpl, now2, clientSessionId);
        if (minted.status === "minted")
          return minted.file;
      }
      return file;
    }
    return file;
  }
  const outcome = await renewSessionToken(projectDir, file, fetchImpl, clientSessionId);
  if (outcome.status === "renewed")
    return outcome.file;
  if (outcome.status === "denied")
    return handleRenewDenied(projectDir, file, fetchImpl, now2, clientSessionId);
  return file;
}
function defaultApiBaseUrl() {
  const remoteUrl = process.env.GRAMATR_URL ?? "https://api.gramatr.com/mcp";
  return remoteUrl.replace(/\/mcp\/?$/, "");
}
async function resolveUsableRestCredential(projectDir, fetchImpl = fetch, now2 = Date.now(), clientSessionId) {
  const pluginDataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (pluginDataDir) {
    const { ensureFreshProxyToken: ensureFreshProxyToken2 } = await Promise.resolve().then(() => (init_proxy_token_ladder(), proxy_token_ladder_exports));
    const record = await ensureFreshProxyToken2(pluginDataDir, defaultApiBaseUrl(), fetchImpl, now2);
    if (record) {
      return {
        token: record.token,
        // See this function's doc comment: no client-side skew check is
        // meaningful on a synthesized file once `ensureFreshProxyToken`
        // already owns the real freshness decision — a non-expiring-looking
        // token here is intentional, not a bug.
        expires_at: record.expires_at ?? (/* @__PURE__ */ new Date(864e13)).toISOString(),
        base_url: defaultApiBaseUrl(),
        aud: ""
      };
    }
  }
  return resolveUsableSessionToken(projectDir, fetchImpl, now2, clientSessionId);
}
var import_node_fs8, import_node_path8, GRAMATR_DIR3, SESSION_FILE, SESSION_TOKEN_EXPIRY_SKEW_MS, SESSION_TOKEN_PROACTIVE_RENEW_FRACTION, RENEW_TIMEOUT_MS, SESSION_TOKEN_SIDECAR_DIR;
var init_session_rest_token = __esm({
  "dist/hooks/lib/session-rest-token.js"() {
    "use strict";
    import_node_fs8 = require("node:fs");
    import_node_path8 = require("node:path");
    init_dpop_key();
    GRAMATR_DIR3 = ".gramatr";
    SESSION_FILE = ".session";
    SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
    SESSION_TOKEN_PROACTIVE_RENEW_FRACTION = 0.8;
    RENEW_TIMEOUT_MS = 3e3;
    SESSION_TOKEN_SIDECAR_DIR = "sessions";
  }
});

// dist/bin/precompact-seal.js
var precompact_seal_exports = {};
__export(precompact_seal_exports, {
  main: () => main,
  runPrecompactSeal: () => runPrecompactSeal
});
module.exports = __toCommonJS(precompact_seal_exports);

// dist/hooks/lib/turn-buffer.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var GRAMATR_DIR = ".gramatr";
var TURNS_FILE = "pending-turns.json";
function getTurnBufferPath(projectDir, clientSessionId) {
  const file = clientSessionId ? `pending-turns-${clientSessionId}.json` : TURNS_FILE;
  return (0, import_node_path.join)(projectDir, GRAMATR_DIR, file);
}
function readBufferedTurns(projectDir, clientSessionId) {
  const dest = getTurnBufferPath(projectDir, clientSessionId);
  try {
    if (!(0, import_node_fs.existsSync)(dest))
      return [];
    const parsed = JSON.parse((0, import_node_fs.readFileSync)(dest, "utf8"));
    if (!Array.isArray(parsed))
      return [];
    return parsed.filter((t) => t != null && typeof t === "object" && typeof t.prompt === "string");
  } catch {
    return [];
  }
}
function clearBufferedTurns(projectDir, clientSessionId) {
  try {
    (0, import_node_fs.rmSync)(getTurnBufferPath(projectDir, clientSessionId), { force: true });
  } catch {
  }
}

// dist/hooks/lib/session-root-registry.js
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");
init_config_runtime();
init_project_state();
var DEFAULT_REGISTRY_TTL_DAYS = 14;
function registryTtlMs() {
  const days = getSessionRegistryTtlDaysFromEnv(DEFAULT_REGISTRY_TTL_DAYS);
  return days * 24 * 60 * 60 * 1e3;
}
function registryDir() {
  return (0, import_node_path3.join)(getHomeDir(), ".gramatr", "sessions");
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
  return (0, import_node_path3.join)(registryDir(), name);
}
function readRaw(path2) {
  try {
    if (!(0, import_node_fs3.existsSync)(path2))
      return null;
    return JSON.parse((0, import_node_fs3.readFileSync)(path2, "utf8"));
  } catch {
    return null;
  }
}
function readSessionRoot(sessionId) {
  const path2 = sessionRootPath(sessionId);
  if (!path2)
    return null;
  const raw = readRaw(path2);
  if (!raw || typeof raw.project_root !== "string" || raw.project_root.length === 0) {
    return null;
  }
  const ttlMs = registryTtlMs();
  if (ttlMs > 0 && typeof raw.last_seen_at === "string" && raw.last_seen_at.length > 0) {
    const lastSeen = Date.parse(raw.last_seen_at);
    if (Number.isFinite(lastSeen) && Date.now() - lastSeen > ttlMs) {
      try {
        (0, import_node_fs3.rmSync)(path2, { force: true });
      } catch {
      }
      return null;
    }
  }
  if (!(0, import_node_fs3.existsSync)(raw.project_root)) {
    try {
      (0, import_node_fs3.rmSync)(path2, { force: true });
    } catch {
    }
    return null;
  }
  return raw.project_root;
}
function peekSessionRootProjectId(sessionId) {
  const path2 = sessionRootPath(sessionId);
  if (!path2)
    return null;
  const raw = readRaw(path2);
  if (!raw || typeof raw.gramatr_project_id !== "string" || raw.gramatr_project_id.length === 0) {
    return null;
  }
  return raw.gramatr_project_id;
}
function registryDebugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path3.join)(home, ".gramatr", "debug");
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
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path3.join)(dir, "registry-resolution.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs3.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs3.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > REGISTRY_SAMPLE_CAP) {
      existing = existing.slice(existing.length - REGISTRY_SAMPLE_CAP);
    }
    (0, import_node_fs3.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
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

// dist/hooks/lib/hook-stdin.js
async function readHookStdin() {
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

// dist/hooks/lib/handoff-seal.js
init_session_rest_token();
init_project_state();

// dist/hooks/lib/process-pin.js
var import_node_crypto4 = require("node:crypto");
var import_node_child_process4 = require("node:child_process");
var import_node_fs9 = require("node:fs");
var import_node_os = require("node:os");
var CLIENT_SESSION_ID_PREFIX = "pin2-";
var CLIENT_SESSION_ID_AGENT_PREFIX = "pin3-";
var SHELL_NAME_RE = /^(sh|bash|zsh|dash|fish|ksh|csh|tcsh|cmd(\.exe)?|powershell(\.exe)?|pwsh(\.exe)?)$/i;
function defaultReadProcStat(pid) {
  return (0, import_node_fs9.readFileSync)(`/proc/${pid}/stat`, "utf8");
}
function defaultReadProcComm(pid) {
  return (0, import_node_fs9.readFileSync)(`/proc/${pid}/comm`, "utf8");
}
function defaultHasProc() {
  return (0, import_node_fs9.existsSync)("/proc/self/stat");
}
function defaultRunPs(args) {
  return (0, import_node_child_process4.execFileSync)("ps", args, { encoding: "utf8", timeout: 2e3 });
}
function defaultReadMachineId() {
  return (0, import_node_fs9.readFileSync)("/etc/machine-id", "utf8");
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
    const value = `${prefix}${(0, import_node_crypto4.createHash)("sha256").update(raw).digest("hex").slice(0, 32)}`;
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

// dist/hooks/lib/turn-flush.js
init_session_rest_token();
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

// dist/hooks/lib/handoff-seal.js
var SEAL_TIMEOUT_MS = 8e3;
async function sealHandoff(projectDir, input, fetchImpl = fetch) {
  let clientSessionId;
  try {
    const ownPinValue = getProcessPin()?.value;
    clientSessionId = ownPinValue ?? readProjectState(projectDir)?.active_session?.client_session_id;
  } catch {
  }
  const token = await resolveUsableRestCredential(projectDir, fetchImpl, Date.now(), clientSessionId);
  if (!token)
    return { status: "no_token" };
  const turns = readBufferedTurns(projectDir, input.session_id);
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
    ...input.reason ? { reason: input.reason } : {},
    ...clientSessionId ? { client_session_id: clientSessionId } : {}
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

// dist/bin/precompact-seal.js
function resolveProjectDir2(sessionId) {
  return resolveSessionRoot({ sessionId, clientType: "claude-code" });
}
async function runPrecompactSeal(input, fetchImpl = fetch, projectDir = resolveProjectDir2(input.session_id)) {
  const outcome = await sealHandoff(projectDir, { session_id: input.session_id, reason: input.trigger }, fetchImpl);
  if (outcome.status === "sealed") {
    clearBufferedTurns(projectDir, input.session_id);
  }
  return outcome;
}
async function readStdinJson() {
  return readHookStdin();
}
async function main() {
  const input = await readStdinJson();
  await runPrecompactSeal(input);
  process.stdout.write("{}");
}
if (process.env.GRAMATR_PRECOMPACT_SEAL_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main,
  runPrecompactSeal
});
