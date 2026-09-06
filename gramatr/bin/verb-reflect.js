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
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/hooks/lib/mint-credential-store.js
function currentPlatform() {
  return platformImpl ?? process.platform;
}
function getFileBackendPath() {
  return (0, import_node_path2.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME);
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
    const dir = (0, import_node_path2.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs2.existsSync)(dir))
      (0, import_node_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath();
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
function fileRead() {
  try {
    const dest = getFileBackendPath();
    if (!(0, import_node_fs2.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs2.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function fileDelete() {
  try {
    (0, import_node_fs2.rmSync)(getFileBackendPath(), { force: true });
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
var import_node_child_process2, import_node_fs2, import_node_path2, spawnImpl, platformImpl, KEYRING_SERVICE, KEYRING_ACCOUNT, FILE_BACKEND_NAME, KEYRING_CMD_TIMEOUT_MS;
var init_mint_credential_store = __esm({
  "dist/hooks/lib/mint-credential-store.js"() {
    "use strict";
    import_node_child_process2 = require("node:child_process");
    import_node_fs2 = require("node:fs");
    import_node_path2 = require("node:path");
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
    const dir = (0, import_node_path3.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs3.existsSync)(dir))
      (0, import_node_fs3.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath2();
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
function fileRead2() {
  try {
    const dest = getFileBackendPath2();
    if (!(0, import_node_fs3.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs3.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function getFileBackendPath2() {
  return (0, import_node_path3.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME2);
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
var import_node_child_process3, import_node_fs3, import_node_path3, import_node_crypto3, spawnImpl2, platformImpl2, KEYRING_SERVICE2, KEYRING_ACCOUNT2, FILE_BACKEND_NAME2, KEYRING_CMD_TIMEOUT_MS2;
var init_device_key_store = __esm({
  "dist/hooks/lib/device-key-store.js"() {
    "use strict";
    import_node_child_process3 = require("node:child_process");
    import_node_fs3 = require("node:fs");
    import_node_path3 = require("node:path");
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
      emit2 = function emit3(event, code, signal) {
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
            emit2("exit", null, sig);
            emit2("afterexit", null, sig);
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
        emit2("exit", process2.exitCode, null);
        emit2("afterexit", process2.exitCode, null);
        originalProcessReallyExit.call(process2, process2.exitCode);
      };
      originalProcessEmit = process2.emit;
      processEmit = function processEmit2(ev, arg) {
        if (ev === "exit" && processOk(global.process)) {
          if (arg !== void 0) {
            process2.exitCode = arg;
          }
          var ret = originalProcessEmit.apply(this, arguments);
          emit2("exit", process2.exitCode, null);
          emit2("afterexit", process2.exitCode, null);
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
    var emit2;
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
      return (...args) => new Promise((resolve, reject) => {
        args.push((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
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
  const dir = (0, import_node_path4.join)(projectDir, ".gramatr");
  try {
    if (!(0, import_node_fs4.existsSync)(dir))
      (0, import_node_fs4.mkdirSync)(dir, { recursive: true, mode: 448 });
    const lockPath = (0, import_node_path4.join)(dir, MINT_LOCK_FILE);
    if (!(0, import_node_fs4.existsSync)(lockPath))
      (0, import_node_fs4.writeFileSync)(lockPath, "", { mode: 384 });
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
var import_node_fs4, import_node_path4, MINT_TIMEOUT_MS, MINT_LOCK_FILE, MINT_LOCK_STALE_MS;
var init_mint_session_token = __esm({
  "dist/hooks/lib/mint-session-token.js"() {
    "use strict";
    import_node_fs4 = require("node:fs");
    import_node_path4 = require("node:path");
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
  return (0, import_node_path5.join)(projectDir, GRAMATR_DIR2, SESSION_FILE);
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
  const dir = (0, import_node_path5.join)(projectDir, GRAMATR_DIR2);
  if (!(0, import_node_fs5.existsSync)(dir)) {
    (0, import_node_fs5.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getSessionTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs5.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs5.renameSync)(tmp, dest);
  try {
    (0, import_node_fs5.chmodSync)(dest, 384);
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
    if (!(0, import_node_fs5.existsSync)(dest))
      return null;
    const parsed = JSON.parse((0, import_node_fs5.readFileSync)(dest, "utf8"));
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
    (0, import_node_fs5.rmSync)(getSessionTokenPath(projectDir), { force: true });
  } catch {
  }
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
var import_node_fs5, import_node_path5, GRAMATR_DIR2, SESSION_FILE, SESSION_TOKEN_EXPIRY_SKEW_MS, SESSION_TOKEN_PROACTIVE_RENEW_FRACTION, RENEW_TIMEOUT_MS;
var init_session_rest_token = __esm({
  "dist/hooks/lib/session-rest-token.js"() {
    "use strict";
    import_node_fs5 = require("node:fs");
    import_node_path5 = require("node:path");
    init_dpop_key();
    GRAMATR_DIR2 = ".gramatr";
    SESSION_FILE = ".session";
    SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
    SESSION_TOKEN_PROACTIVE_RENEW_FRACTION = 0.8;
    RENEW_TIMEOUT_MS = 3e3;
  }
});

// dist/bin/verb-reflect.js
var verb_reflect_exports = {};
__export(verb_reflect_exports, {
  runVerbReflect: () => runVerbReflect
});
module.exports = __toCommonJS(verb_reflect_exports);

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

// dist/commands/verb-runtime.js
init_session_rest_token();
function verbProjectDir() {
  return resolveProjectDir({ clientType: "claude-code" });
}
async function resolveVerbToken(projectDir, fetchImpl = fetch) {
  try {
    return await resolveUsableSessionToken(projectDir, fetchImpl);
  } catch {
    return null;
  }
}
var NO_SESSION_NOTE = [
  "gr\u0101matr: no active session token (.gramatr/.session) on this project.",
  "Send any prompt first \u2014 gr\u0101matr mints a short-lived REST token at session",
  "bootstrap, after which this verb works. (On a hookless client, run the verb",
  "as an MCP prompt instead.)"
].join("\n");
function emit(line) {
  process.stdout.write(line.endsWith("\n") ? line : `${line}
`);
}

// dist/bin/verb-reflect.js
async function runVerbReflect(argv = process.argv.slice(2)) {
  const topic = argv.join(" ").trim() || "this session";
  const projectDir = verbProjectDir();
  const token = await resolveVerbToken(projectDir);
  const lines = ["gr\u0101matr reflect \u2014 envelope brief", "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"];
  lines.push(`Topic: ${topic}`);
  if (token) {
    lines.push(`Stamp to project: ${token.aud}`);
    lines.push(`Session token: present (expires ${token.expires_at})`);
  } else {
    lines.push("Session token: ABSENT \u2014 cannot envelope-stamp yet.");
    lines.push("Send any prompt first so gr\u0101matr mints a session token, then retry.");
  }
  lines.push("", "How to ship (hybrid):", "1. Author the reflection now \u2014 three answers:", "   Q1 (self): what I would do differently next time;", "   Q2 (algorithm): what a smarter classifier/router would do;", "   Q3 (AI): what a fundamentally smarter AI would do.", "2. There is NO REST endpoint for reflections today. So ship via the PUBLIC", "   `save_reflection` MCP tool: call it with the three answers above.", "3. Identity (user / project / session) is taken from the session envelope \u2014", "   do NOT pass a user_id/project_id.");
  emit(lines.join("\n"));
}
if (process.argv[1] && /verb-reflect(\.js|\.ts)?$/.test(process.argv[1])) {
  runVerbReflect().catch(() => {
    emit("gr\u0101matr reflect: unexpected error preparing the reflection brief.");
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runVerbReflect
});
