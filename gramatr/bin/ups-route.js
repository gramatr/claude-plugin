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
function isKeyringFileOnlyFromEnv() {
  const raw = process.env.GRAMATR_KEYRING_FILE_ONLY;
  return raw === "1" || raw === "true";
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

// dist/hooks/lib/mint-credential-store.js
function currentPlatform() {
  return platformImpl ?? process.platform;
}
function normalizeMintCredentialBlock(block) {
  if (!block || typeof block !== "object")
    return null;
  const { token, expires_at, device_id } = block;
  if (typeof token === "string" && token.length > 0 && typeof expires_at === "string" && expires_at.length > 0 && typeof device_id === "string" && device_id.length > 0) {
    return { token, expires_at, device_id };
  }
  return null;
}
function persistBootstrapMintCredential(block) {
  const record = normalizeMintCredentialBlock(block);
  if (!record)
    return false;
  writeMintCredential(record);
  return true;
}
function getFileBackendPath() {
  return (0, import_node_path.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME);
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
    const dir = (0, import_node_path.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs.existsSync)(dir))
      (0, import_node_fs.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath();
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs.writeFileSync)(tmp, record, { encoding: "utf8", mode: 384 });
    (0, import_node_fs.renameSync)(tmp, dest);
    try {
      (0, import_node_fs.chmodSync)(dest, 384);
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
    if (!(0, import_node_fs.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function fileDelete() {
  try {
    (0, import_node_fs.rmSync)(getFileBackendPath(), { force: true });
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
var import_node_child_process, import_node_fs, import_node_path, spawnImpl, platformImpl, KEYRING_SERVICE, KEYRING_ACCOUNT, FILE_BACKEND_NAME, KEYRING_CMD_TIMEOUT_MS;
var init_mint_credential_store = __esm({
  "dist/hooks/lib/mint-credential-store.js"() {
    "use strict";
    import_node_child_process = require("node:child_process");
    import_node_fs = require("node:fs");
    import_node_path = require("node:path");
    init_config_runtime();
    spawnImpl = import_node_child_process.spawnSync;
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
    const dir = (0, import_node_path2.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs2.existsSync)(dir))
      (0, import_node_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath2();
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs2.writeFileSync)(tmp, record, { encoding: "utf8", mode: 384 });
    (0, import_node_fs2.renameSync)(tmp, dest);
    try {
      (0, import_node_fs2.chmodSync)(dest, 384);
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
    if (!(0, import_node_fs2.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs2.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function getFileBackendPath2() {
  return (0, import_node_path2.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME2);
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
var import_node_child_process2, import_node_fs2, import_node_path2, import_node_crypto3, spawnImpl2, platformImpl2, KEYRING_SERVICE2, KEYRING_ACCOUNT2, FILE_BACKEND_NAME2, KEYRING_CMD_TIMEOUT_MS2;
var init_device_key_store = __esm({
  "dist/hooks/lib/device-key-store.js"() {
    "use strict";
    import_node_child_process2 = require("node:child_process");
    import_node_fs2 = require("node:fs");
    import_node_path2 = require("node:path");
    import_node_crypto3 = require("node:crypto");
    init_config_runtime();
    init_device_key();
    spawnImpl2 = import_node_child_process2.spawnSync;
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
    function patch(fs) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
      }
      if (!fs.lutimes) {
        patchLutimes(fs);
      }
      fs.chown = chownFix(fs.chown);
      fs.fchown = chownFix(fs.fchown);
      fs.lchown = chownFix(fs.lchown);
      fs.chmod = chmodFix(fs.chmod);
      fs.fchmod = chmodFix(fs.fchmod);
      fs.lchmod = chmodFix(fs.lchmod);
      fs.chownSync = chownFixSync(fs.chownSync);
      fs.fchownSync = chownFixSync(fs.fchownSync);
      fs.lchownSync = chownFixSync(fs.lchownSync);
      fs.chmodSync = chmodFixSync(fs.chmodSync);
      fs.fchmodSync = chmodFixSync(fs.fchmodSync);
      fs.lchmodSync = chmodFixSync(fs.lchmodSync);
      fs.stat = statFix(fs.stat);
      fs.fstat = statFix(fs.fstat);
      fs.lstat = statFix(fs.lstat);
      fs.statSync = statFixSync(fs.statSync);
      fs.fstatSync = statFixSync(fs.fstatSync);
      fs.lstatSync = statFixSync(fs.lstatSync);
      if (fs.chmod && !fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchmodSync = function() {
        };
      }
      if (fs.chown && !fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs.rename = typeof fs.rename !== "function" ? fs.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs.stat(to, function(stater, st) {
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
        })(fs.rename);
      }
      fs.read = typeof fs.read !== "function" ? fs.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs.read);
      fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path, mode, callback) {
          fs2.open(
            path,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs2.lchmodSync = function(path, mode) {
          var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs2.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs2.futimes(fd, at, mt, function(er2) {
                fs2.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs2.lutimesSync = function(path, at, mt) {
            var fd = fs2.openSync(path, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs2.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs2.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs2.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs2.futimes) {
          fs2.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs2.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
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
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
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
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path, options);
        Stream.call(this);
        var self = this;
        this.path = path;
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
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
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
      function WriteStream(path, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
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
          this._open = fs.open;
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
    var fs = require("fs");
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
    if (!fs[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs, queue);
      fs.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs, fd, function(err) {
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
      })(fs.close);
      fs.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs[gracefulQueue]);
          require("assert").equal(fs[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs[gracefulQueue]);
    }
    module2.exports = patch(clone(fs));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
      module2.exports = patch(fs);
      fs.__patched = true;
    }
    function patch(fs2) {
      polyfills(fs2);
      fs2.gracefulify = patch;
      fs2.createReadStream = createReadStream;
      fs2.createWriteStream = createWriteStream;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile;
      function readFile(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path, options, cb);
        function go$readFile(path2, options2, cb2, startTime) {
          return fs$readFile(path2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile;
      function writeFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path, data, options, cb);
        function go$writeFile(path2, data2, options2, cb2, startTime) {
          return fs$writeFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      if (fs$appendFile)
        fs2.appendFile = appendFile;
      function appendFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path, data, options, cb);
        function go$appendFile(path2, data2, options2, cb2, startTime) {
          return fs$appendFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      if (fs$copyFile)
        fs2.copyFile = copyFile;
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
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, options2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path, options, cb);
        function fs$readdirCallback(path2, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path2, options2, cb2],
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
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs2.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs2, "WriteStream", {
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
      Object.defineProperty(fs2, "FileReadStream", {
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
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path, options) {
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
      function WriteStream(path, options) {
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
      function createReadStream(path, options) {
        return new fs2.ReadStream(path, options);
      }
      function createWriteStream(path, options) {
        return new fs2.WriteStream(path, options);
      }
      var fs$open = fs2.open;
      fs2.open = open;
      function open(path, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path, flags, mode, cb);
        function go$open(path2, flags2, mode2, cb2, startTime) {
          return fs$open(path2, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs[gracefulQueue].length; ++i) {
        if (fs[gracefulQueue][i].length > 2) {
          fs[gracefulQueue][i][3] = now;
          fs[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs[gracefulQueue].length === 0)
        return;
      var elem = fs[gracefulQueue].shift();
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
          fs[gracefulQueue].push(elem);
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
    function probe(file, fs, callback) {
      const cachedPrecision = fs[cacheSymbol];
      if (cachedPrecision) {
        return fs.stat(file, (err, stat) => {
          if (err) {
            return callback(err);
          }
          callback(null, stat.mtime, cachedPrecision);
        });
      }
      const mtime = new Date(Math.ceil(Date.now() / 1e3) * 1e3 + 5);
      fs.utimes(file, mtime, mtime, (err) => {
        if (err) {
          return callback(err);
        }
        fs.stat(file, (err2, stat) => {
          if (err2) {
            return callback(err2);
          }
          const precision = stat.mtime.getTime() % 1e3 === 0 ? "s" : "ms";
          Object.defineProperty(fs, cacheSymbol, { value: precision });
          callback(null, stat.mtime, precision);
        });
      });
    }
    function getMtime(precision) {
      let now = Date.now();
      if (precision === "s") {
        now = Math.ceil(now / 1e3) * 1e3;
      }
      return new Date(now);
    }
    module2.exports.probe = probe;
    module2.exports.getMtime = getMtime;
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/lockfile.js
var require_lockfile = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/lockfile.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require_graceful_fs();
    var retry = require_retry2();
    var onExit = require_signal_exit();
    var mtimePrecision = require_mtime_precision();
    var locks = {};
    function getLockFile(file, options) {
      return options.lockfilePath || `${file}.lock`;
    }
    function resolveCanonicalPath(file, options, callback) {
      if (!options.realpath) {
        return callback(null, path.resolve(file));
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
        fs,
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
        fs,
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
        fs,
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
    var fs = require_graceful_fs();
    function createSyncFs(fs2) {
      const methods = ["mkdir", "realpath", "stat", "rmdir", "utimes"];
      const newFs = { ...fs2 };
      methods.forEach((method) => {
        newFs[method] = (...args) => {
          const callback = args.pop();
          let ret;
          try {
            ret = fs2[`${method}Sync`](...args);
          } catch (err) {
            return callback(err);
          }
          callback(null, ret);
        };
      });
      return newFs;
    }
    function toPromise(method) {
      return (...args) => new Promise((resolve3, reject) => {
        args.push((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve3(result);
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
      options.fs = createSyncFs(options.fs || fs);
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
  const dir = (0, import_node_path3.join)(projectDir, ".gramatr");
  try {
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true, mode: 448 });
    const lockPath = (0, import_node_path3.join)(dir, MINT_LOCK_FILE);
    if (!(0, import_node_fs3.existsSync)(lockPath))
      (0, import_node_fs3.writeFileSync)(lockPath, "", { mode: 384 });
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
async function mintSessionRestTokenFromKeyring(projectDir, baseUrl, fetchImpl = fetch, now = Date.now(), knownBadToken) {
  if (!isMintCredentialUsable(readMintCredential(), now)) {
    return { status: "no_credential" };
  }
  return withMintLock(projectDir, async () => {
    const current = readSessionToken(projectDir);
    if (isSessionTokenValid(current, now) && (!knownBadToken || current?.token !== knownBadToken)) {
      return { status: "minted", file: current };
    }
    const record = readMintCredential();
    if (!isMintCredentialUsable(record, now) || !record) {
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
    const wrote = persistBootstrapRestToken(projectDir, body.rest_token);
    if (!wrote) {
      return { status: "error" };
    }
    const rotated = normalizeRotatedCredential(body.mint_credential);
    if (rotated)
      writeMintCredential(rotated);
    const file = readSessionToken(projectDir);
    if (!file)
      return { status: "error" };
    return { status: "minted", file };
  });
}
var import_node_fs3, import_node_path3, MINT_TIMEOUT_MS, MINT_LOCK_FILE, MINT_LOCK_STALE_MS;
var init_mint_session_token = __esm({
  "dist/hooks/lib/mint-session-token.js"() {
    "use strict";
    import_node_fs3 = require("node:fs");
    import_node_path3 = require("node:path");
    init_session_rest_token();
    init_mint_credential_store();
    init_device_key();
    init_device_key_store();
    MINT_TIMEOUT_MS = 3e3;
    MINT_LOCK_FILE = ".session-mint.lock";
    MINT_LOCK_STALE_MS = 5e3;
  }
});

// dist/hooks/lib/session-rest-token.js
function getSessionTokenPath(projectDir) {
  return (0, import_node_path4.join)(projectDir, GRAMATR_DIR, SESSION_FILE);
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
  const dir = (0, import_node_path4.join)(projectDir, GRAMATR_DIR);
  if (!(0, import_node_fs4.existsSync)(dir)) {
    (0, import_node_fs4.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getSessionTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs4.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs4.renameSync)(tmp, dest);
  try {
    (0, import_node_fs4.chmodSync)(dest, 384);
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
    if (!(0, import_node_fs4.existsSync)(dest))
      return null;
    const parsed = JSON.parse((0, import_node_fs4.readFileSync)(dest, "utf8"));
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
    (0, import_node_fs4.rmSync)(getSessionTokenPath(projectDir), { force: true });
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
async function attemptRung3Mint(projectDir, file, fetchImpl, now) {
  const { mintSessionRestTokenFromKeyring: mintSessionRestTokenFromKeyring2 } = await Promise.resolve().then(() => (init_mint_session_token(), mint_session_token_exports));
  return mintSessionRestTokenFromKeyring2(projectDir, file.base_url, fetchImpl, now, file.token);
}
async function handleRenewDenied(projectDir, file, fetchImpl, now) {
  const minted = await attemptRung3Mint(projectDir, file, fetchImpl, now);
  if (minted.status === "minted")
    return minted.file;
  deleteSessionToken(projectDir);
  return null;
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
      if (outcome2.status === "denied") {
        const minted = await attemptRung3Mint(projectDir, file, fetchImpl, now);
        if (minted.status === "minted")
          return minted.file;
      }
      return file;
    }
    return file;
  }
  const outcome = await renewSessionToken(projectDir, file, fetchImpl);
  if (outcome.status === "renewed")
    return outcome.file;
  if (outcome.status === "denied")
    return handleRenewDenied(projectDir, file, fetchImpl, now);
  return file;
}
var import_node_fs4, import_node_path4, GRAMATR_DIR, SESSION_FILE, SESSION_TOKEN_EXPIRY_SKEW_MS, SESSION_TOKEN_PROACTIVE_RENEW_FRACTION, RENEW_TIMEOUT_MS;
var init_session_rest_token = __esm({
  "dist/hooks/lib/session-rest-token.js"() {
    "use strict";
    import_node_fs4 = require("node:fs");
    import_node_path4 = require("node:path");
    init_dpop_key();
    GRAMATR_DIR = ".gramatr";
    SESSION_FILE = ".session";
    SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
    SESSION_TOKEN_PROACTIVE_RENEW_FRACTION = 0.8;
    RENEW_TIMEOUT_MS = 3e3;
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
  return (0, import_node_path12.join)(home, ".gramatr", "debug");
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
    if (!(0, import_node_fs12.existsSync)(dir))
      (0, import_node_fs12.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path12.join)(dir, "turn1-arming.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs12.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs12.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs12.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
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
    if (!(0, import_node_fs12.existsSync)(dir))
      (0, import_node_fs12.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path12.join)(dir, "bootstrap-recovered.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs12.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs12.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs12.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
  } catch {
  }
}
function appendHookPromotionSample(sample) {
  try {
    const dir = debugDir();
    if (!(0, import_node_fs12.existsSync)(dir))
      (0, import_node_fs12.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path12.join)(dir, "hook-promotion.jsonl");
    const lastPath = (0, import_node_path12.join)(dir, "last-sample.json");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs12.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs12.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs12.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
    (0, import_node_fs12.writeFileSync)(lastPath, JSON.stringify(sample, null, 2), "utf8");
  } catch {
  }
}
var import_node_fs12, import_node_path12, MAX_SAMPLES;
var init_hook_promotion_telemetry = __esm({
  "dist/hooks/lib/hook-promotion-telemetry.js"() {
    "use strict";
    import_node_fs12 = require("node:fs");
    import_node_path12 = require("node:path");
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
init_session_rest_token();
init_mint_session_token();

// dist/hooks/lib/bootstrap-recovery.js
var import_node_fs9 = require("node:fs");
var import_node_path9 = require("node:path");
init_config_runtime();

// dist/hooks/lib/gramatr-hook-utils.js
var import_fs = require("fs");
var import_path = require("path");
init_config_runtime();

// dist/hooks/lib/hook-state.js
var import_node_sqlite = require("node:sqlite");
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
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
  const dir = getGramatrDirFromEnv() || (0, import_node_path5.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path5.join)(dir, "state.db");
}
function getDb() {
  if (_db)
    return _db;
  const path = getDbPath();
  if (path !== ":memory:") {
    try {
      const dir = (0, import_node_path5.dirname)(path);
      if (!(0, import_node_fs5.existsSync)(dir))
        (0, import_node_fs5.mkdirSync)(dir, { recursive: true });
    } catch {
      _filesystemAvailable = false;
    }
  }
  try {
    _db = new Database(_filesystemAvailable ? path : ":memory:");
    if (_filesystemAvailable && path !== ":memory:") {
      try {
        (0, import_node_fs5.chmodSync)(path, 384);
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

// dist/hooks/lib/bootstrap-recovery.js
init_session_rest_token();

// dist/user-config.js
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
init_config_runtime();
var DEFAULT_TTL_SECONDS = 3600;
function configPath() {
  return (0, import_node_path6.join)(getHomeDir(), ".gramatr.json");
}
function readGramatrJson() {
  try {
    const raw = (0, import_node_fs6.readFileSync)(configPath(), "utf8");
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
    (0, import_node_fs6.writeFileSync)(configPath(), JSON.stringify(next, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}
function readTelemetryDisabled() {
  const cfg = readGramatrJson();
  return cfg.telemetry?.disabled === true;
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

// dist/hooks/lib/otel-settings.js
var import_node_fs7 = require("node:fs");
var import_node_path7 = require("node:path");
function buildOtelEnvBlock(inputs) {
  return {
    CLAUDE_CODE_ENABLE_TELEMETRY: "1",
    OTEL_METRICS_EXPORTER: "otlp",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_ENDPOINT: inputs.collectorEndpoint,
    OTEL_EXPORTER_OTLP_HEADERS: `Authorization=Bearer ${inputs.token}`,
    OTEL_RESOURCE_ATTRIBUTES: `gramatr.session_id=${inputs.sessionId}`
  };
}
function writeOtelSettings(homeDir, inputs) {
  try {
    const dir = (0, import_node_path7.join)(homeDir, ".claude");
    const target = (0, import_node_path7.join)(dir, "settings.json");
    let settings = {};
    if ((0, import_node_fs7.existsSync)(target)) {
      try {
        settings = JSON.parse((0, import_node_fs7.readFileSync)(target, "utf8"));
      } catch {
        return false;
      }
    }
    const existingEnv = settings.env && typeof settings.env === "object" && !Array.isArray(settings.env) ? settings.env : {};
    settings.env = { ...existingEnv, ...buildOtelEnvBlock(inputs) };
    (0, import_node_fs7.mkdirSync)(dir, { recursive: true });
    const tmp = (0, import_node_path7.join)(dir, `settings.json.tmp.${process.pid}`);
    (0, import_node_fs7.writeFileSync)(tmp, JSON.stringify(settings, null, 2) + "\n", "utf8");
    (0, import_node_fs7.renameSync)(tmp, target);
    return true;
  } catch {
    return false;
  }
}

// dist/hooks/lib/bootstrap-client.js
init_session_rest_token();

// dist/hooks/lib/telemetry-token.js
var import_node_fs8 = require("node:fs");
var import_node_path8 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
var TELEMETRY_TOKEN_FILE = ".telemetry-token";
function getTelemetryTokenPath(projectDir) {
  return (0, import_node_path8.join)(projectDir, GRAMATR_DIR2, TELEMETRY_TOKEN_FILE);
}
function normalizeTelemetryTokenBlock(block) {
  if (!block || typeof block !== "object")
    return null;
  const { token, expires_at, base_url, aud, issued_at, collector_endpoint } = block;
  if (typeof token === "string" && token.length > 0 && typeof expires_at === "string" && expires_at.length > 0 && typeof base_url === "string" && base_url.length > 0 && typeof aud === "string" && aud.length > 0) {
    const file = { token, expires_at, base_url, aud };
    if (typeof issued_at === "string" && issued_at.length > 0)
      file.issued_at = issued_at;
    if (typeof collector_endpoint === "string" && collector_endpoint.length > 0) {
      file.collector_endpoint = collector_endpoint;
    }
    return file;
  }
  return null;
}
function writeTelemetryToken(projectDir, file) {
  const dir = (0, import_node_path8.join)(projectDir, GRAMATR_DIR2);
  if (!(0, import_node_fs8.existsSync)(dir)) {
    (0, import_node_fs8.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getTelemetryTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs8.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs8.renameSync)(tmp, dest);
}
function persistBootstrapTelemetryToken(projectDir, block) {
  const file = normalizeTelemetryTokenBlock(block);
  if (!file)
    return false;
  writeTelemetryToken(projectDir, file);
  return true;
}

// dist/hooks/lib/bootstrap-client.js
init_mint_credential_store();
init_device_key_store();
function persistBootstrapPayload(raw, opts) {
  const result = {
    restTokenWritten: false,
    telemetryTokenWritten: false,
    otelSettingsWritten: false,
    mintCredentialWritten: false,
    deviceKeyBackend: null
  };
  try {
    result.restTokenWritten = persistBootstrapRestToken(opts.projectDir, raw.rest_token);
  } catch {
  }
  try {
    const block = raw.telemetry_token;
    result.telemetryTokenWritten = persistBootstrapTelemetryToken(opts.projectDir, block);
    if (result.telemetryTokenWritten && opts.gramatrSessionId && typeof block?.collector_endpoint === "string" && block.collector_endpoint && typeof block?.token === "string" && !readTelemetryDisabled()) {
      result.otelSettingsWritten = writeOtelSettings(opts.homeDir, {
        sessionId: opts.gramatrSessionId,
        token: block.token,
        collectorEndpoint: block.collector_endpoint
      });
    }
  } catch {
  }
  try {
    result.mintCredentialWritten = persistBootstrapMintCredential(raw.mint_credential);
  } catch {
  }
  try {
    result.deviceKeyBackend = getOrCreateDeviceKeyPair().backend;
  } catch {
  }
  return result;
}

// dist/hooks/lib/bootstrap-recovery.js
function readGitRemoteFromProjectFile(projectDir) {
  try {
    const proj = JSON.parse((0, import_node_fs9.readFileSync)((0, import_node_path9.join)(projectDir, ".gramatr", "project.json"), "utf8"));
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
    const credFile = (0, import_node_path9.resolve)(getHomeDir(), ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs9.readFileSync)(credFile, "utf8"));
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
      const cfg = JSON.parse((0, import_node_fs9.readFileSync)((0, import_node_path9.join)(pluginDataDir, "token.json"), "utf8"));
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
  const persisted = persistBootstrapPayload(parsed, {
    projectDir: opts.projectDir,
    homeDir: getHomeDir()
  });
  if (!persisted.restTokenWritten)
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
var import_node_fs10 = require("node:fs");
var import_node_path10 = require("node:path");
init_config_runtime();
function isCachedMcpOAuthEntryStale(remoteUrl, now = Date.now()) {
  try {
    const credFile = (0, import_node_path10.resolve)(getHomeDir(), ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs10.readFileSync)(credFile, "utf8"));
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
  return (0, import_node_path10.resolve)(getHomeDir(), ".claude", ".credentials.json");
}
var PURGE_CLI_ENV = "GRAMATR_PURGE_STALE_MCP_OAUTH";
function runStaleAuthPurge(remoteUrl) {
  const credFile = credentialsFilePath();
  if (!(0, import_node_fs10.existsSync)(credFile)) {
    return { status: "no-file", removed: [] };
  }
  const parsed = JSON.parse((0, import_node_fs10.readFileSync)(credFile, "utf8"));
  const { creds, removed } = removeStaleMcpOAuthEntry(parsed, remoteUrl);
  if (removed.length === 0) {
    return { status: "nothing-to-remove", removed: [] };
  }
  const backupPath = `${credFile}.gramatr-bak-${Date.now()}`;
  (0, import_node_fs10.copyFileSync)(credFile, backupPath);
  const tmp = `${credFile}.gramatr-tmp-${process.pid}`;
  (0, import_node_fs10.writeFileSync)(tmp, `${JSON.stringify(creds, null, 2)}
`, { encoding: "utf8", mode: 384 });
  try {
    (0, import_node_fs10.renameSync)(tmp, credFile);
  } catch (err) {
    (0, import_node_fs10.rmSync)(tmp, { force: true });
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
var import_node_fs11 = require("node:fs");
var import_node_path11 = require("node:path");
var GRAMATR_DIR3 = ".gramatr";
var SERVER_VERSION_FILE = ".server-version";
function getServerVersionPath(projectDir) {
  return (0, import_node_path11.join)(projectDir, GRAMATR_DIR3, SERVER_VERSION_FILE);
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
    if (!(0, import_node_fs11.existsSync)(path))
      return null;
    const raw = (0, import_node_fs11.readFileSync)(path, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function writeLastSeenServerVersion(projectDir, version) {
  try {
    const dir = (0, import_node_path11.join)(projectDir, GRAMATR_DIR3);
    if (!(0, import_node_fs11.existsSync)(dir))
      (0, import_node_fs11.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getServerVersionPath(projectDir);
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs11.writeFileSync)(tmp, version + "\n", { encoding: "utf8", mode: 384 });
    (0, import_node_fs11.renameSync)(tmp, dest);
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

// dist/hooks/lib/resolve-running-script-dir.js
var import_node_path13 = require("node:path");
var import_node_url = require("node:url");
function resolveRunningScriptDir(argv1, importMetaUrl) {
  if (argv1)
    return (0, import_node_path13.dirname)(argv1);
  if (importMetaUrl) {
    try {
      return (0, import_node_path13.dirname)((0, import_node_url.fileURLToPath)(importMetaUrl));
    } catch {
      return null;
    }
  }
  return null;
}

// dist/hooks/lib/version.js
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
    const here = resolveRunningScriptDir(process.argv[1], import_meta.url);
    if (!here)
      return "0.0.0";
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
var import_node_fs14 = require("node:fs");
var import_node_path15 = require("node:path");
init_config_runtime();

// dist/hooks/lib/project-state.js
var import_node_child_process3 = require("node:child_process");
var import_node_fs13 = require("node:fs");
var import_node_path14 = require("node:path");
var GRAMATR_DIR4 = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs13.existsSync)((0, import_node_path14.join)(dir, GRAMATR_DIR4)))
      return dir;
    const parent = (0, import_node_path14.dirname)(dir);
    if (parent === dir)
      return startDir;
    dir = parent;
  }
}
function canonicalizeProjectRoot(dir) {
  const git = (args) => {
    try {
      return (0, import_node_child_process3.execFileSync)("git", args, {
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
  const abs = (p2) => p2.startsWith("/") ? p2 : (0, import_node_path14.join)(dir, p2);
  const absGitDir = abs(gitDir);
  const absCommonDir = abs(commonDir);
  if (absGitDir === absCommonDir)
    return dir;
  const mainRoot = (0, import_node_path14.dirname)(absCommonDir);
  if ((0, import_node_fs13.existsSync)((0, import_node_path14.join)(mainRoot, GRAMATR_DIR4)))
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
  const dir = (0, import_node_path14.join)(projectDir, GRAMATR_DIR4);
  return {
    core: (0, import_node_path14.join)(dir, CORE_FILE),
    runtime: (0, import_node_path14.join)(dir, RUNTIME_FILE)
  };
}
function atomicWriteJson(filePath, dir, payload) {
  if (!(0, import_node_fs13.existsSync)(dir)) {
    (0, import_node_fs13.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const tmp = `${filePath}.tmp.${process.pid}`;
  (0, import_node_fs13.writeFileSync)(tmp, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs13.renameSync)(tmp, filePath);
  try {
    (0, import_node_fs13.chmodSync)(filePath, 384);
  } catch {
  }
}
function readJson(filePath) {
  try {
    if (!(0, import_node_fs13.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_node_fs13.readFileSync)(filePath, "utf8"));
  } catch {
    return null;
  }
}
function readRuntime(projectDir) {
  return readJson(getStatePaths(projectDir).runtime) ?? {};
}
function patchRuntime(projectDir, patch) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path14.join)(projectDir, GRAMATR_DIR4);
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
  return (0, import_node_path15.join)(getHomeDir(), ".gramatr", "sessions");
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
  return (0, import_node_path15.join)(registryDir(), name);
}
function readRaw(path) {
  try {
    if (!(0, import_node_fs14.existsSync)(path))
      return null;
    return JSON.parse((0, import_node_fs14.readFileSync)(path, "utf8"));
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
        (0, import_node_fs14.rmSync)(path, { force: true });
      } catch {
      }
      return null;
    }
  }
  if (!(0, import_node_fs14.existsSync)(raw.project_root)) {
    try {
      (0, import_node_fs14.rmSync)(path, { force: true });
    } catch {
    }
    return null;
  }
  return raw.project_root;
}
function registryDebugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path15.join)(home, ".gramatr", "debug");
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
    if (!(0, import_node_fs14.existsSync)(dir))
      (0, import_node_fs14.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path15.join)(dir, "registry-resolution.jsonl");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs14.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs14.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > REGISTRY_SAMPLE_CAP) {
      existing = existing.slice(existing.length - REGISTRY_SAMPLE_CAP);
    }
    (0, import_node_fs14.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
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
var RECOVERY_FAILURE_REASONS = {
  no_credential: "no client credential available \u2014 no OAuth token found on disk",
  no_token: "server resolved the session but minted no rest_token",
  error: "network or server error contacting the recovery endpoint"
};
function describeRecoveryFailure(status) {
  return status === "recovered" ? void 0 : RECOVERY_FAILURE_REASONS[status];
}
function loudRecoveryFailureWarning(reason) {
  const detail = reason ? ` (${reason})` : "";
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `gr\u0101matr: session token missing and recovery failed${detail} \u2014 REST surfaces degraded. Run \`/mcp\` in Claude Code to reconnect, or check connectivity to the gr\u0101matr server.`
    }
  };
}
function degradedSurfaceWarning(remoteUrl, now = Date.now(), scriptPath = process.argv[1] ?? "", reason) {
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
  return loudRecoveryFailureWarning(reason);
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
  return {
    file: outcome.status === "recovered" ? outcome.file : null,
    outcome: outcome.status
  };
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
    const restBase = remoteUrl.replace(/\/mcp$/, "");
    const minted = await mintSessionRestTokenFromKeyring(projectDir, restBase, fetchImpl);
    if (minted.status === "minted") {
      token = minted.file;
    } else {
      const healed = await selfHealSessionToken(input, projectDir, fetchImpl);
      token = healed.file;
      selfHealedThisTurn = true;
      if (!token) {
        return degradedSurfaceWarning(remoteUrl, void 0, void 0, describeRecoveryFailure(healed.outcome));
      }
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
          ...bearerHeader(forToken),
          ...sessionHeader(forToken)
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
    const minted = await mintSessionRestTokenFromKeyring(projectDir, token.base_url, fetchImpl, Date.now(), token.token);
    let refreshed;
    if (minted.status === "minted") {
      refreshed = minted.file;
    } else {
      const healed = await selfHealSessionToken(input, projectDir, fetchImpl);
      if (!healed.file) {
        return degradedSurfaceWarning(remoteUrl, void 0, void 0, describeRecoveryFailure(healed.outcome));
      }
      refreshed = healed.file;
    }
    token = refreshed;
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
  await reconcileServerVersion(input, projectDir, attempt.route, fetchImpl, token);
  return attempt.envelope;
}
async function reconcileServerVersion(input, projectDir, route, fetchImpl, currentToken) {
  const observed = extractServerVersion(route);
  if (!observed)
    return;
  const lastSeen = readLastSeenServerVersion(projectDir);
  if (isServerVersionChange(lastSeen, observed)) {
    const minted = await mintSessionRestTokenFromKeyring(projectDir, currentToken.base_url, fetchImpl, Date.now(), currentToken.token);
    if (minted.status !== "minted") {
      await selfHealSessionToken(input, projectDir, fetchImpl);
    }
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
