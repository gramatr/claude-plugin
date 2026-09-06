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
function isRuntimeGitContextEnabledFromEnv() {
  return process.env.GRAMATR_RUNTIME_GIT_CONTEXT_ENABLED === "true";
}
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// dist/server/auth.js
function getConfigPath() {
  const gramatrDir = getGramatrDirFromEnv();
  if (gramatrDir) {
    return (0, import_node_path7.join)((0, import_node_path7.dirname)(gramatrDir), ".gramatr.json");
  }
  return (0, import_node_path7.join)(getHomeDir(), ".gramatr.json");
}
function readConfig() {
  try {
    const raw = (0, import_node_fs7.readFileSync)(getConfigPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeConfig(config) {
  try {
    (0, import_node_fs7.writeFileSync)(getConfigPath(), JSON.stringify(config, null, 2), { mode: 384 });
  } catch {
  }
}
function isExpired(expiresAt) {
  if (expiresAt === null)
    return false;
  return Date.now() >= expiresAt;
}
function isNearExpiry(expiresAt) {
  if (expiresAt === null)
    return false;
  return Date.now() >= expiresAt - RENEWAL_WINDOW_MS;
}
function getToken() {
  const envKey = sanitizeEnvToken(process.env.GRAMATR_API_KEY);
  if (envKey)
    return envKey;
  const envToken = getGramatrTokenFromEnv();
  if (envToken)
    return envToken;
  if (cachedToken && isExpired(cachedExpiresAt)) {
    cachedToken = null;
    cachedExpiresAt = null;
  }
  if (!cachedToken) {
    refreshToken();
  }
  if (cachedToken && isNearExpiry(cachedExpiresAt) && !renewalInProgress) {
    const tokenSnap = cachedToken;
    if (!WARNED_EXPIRY.has(tokenSnap.slice(-8))) {
      WARNED_EXPIRY.add(tokenSnap.slice(-8));
      process.stderr.write("[gramatr] Token nearing expiry \u2014 renewing in background\n");
    }
    void renewTokenBackground();
  }
  return cachedToken;
}
function refreshToken() {
  const config = readConfig();
  if (!config?.token) {
    cachedToken = null;
    cachedExpiresAt = null;
    return null;
  }
  const expiresAt = config.token_expires_at ? Date.parse(config.token_expires_at) : null;
  if (isExpired(expiresAt)) {
    cachedToken = null;
    cachedExpiresAt = null;
    process.stderr.write("[gramatr] Stored token is expired \u2014 run `npx @gramatr/mcp login` to re-authenticate\n");
    return null;
  }
  cachedToken = config.token;
  cachedExpiresAt = expiresAt;
  return cachedToken;
}
async function renewToken() {
  const currentToken = cachedToken ?? readConfig()?.token;
  if (!currentToken)
    return null;
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/auth/token/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok)
      return null;
    const body = await response.json();
    if (!body.access_token)
      return null;
    const expiresIn = body.expires_in ?? 31536e3;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
    const config = readConfig() ?? {};
    config.token = body.access_token;
    config.token_expires_at = newExpiresAt;
    writeConfig(config);
    cachedToken = body.access_token;
    cachedExpiresAt = Date.parse(newExpiresAt);
    renewalInProgress = false;
    return cachedToken;
  } catch {
    return null;
  }
}
async function renewTokenBackground() {
  if (renewalInProgress || !cachedToken)
    return;
  renewalInProgress = true;
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/auth/token/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cachedToken}` },
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) {
      process.stderr.write(`[gramatr] Token renewal failed (HTTP ${response.status}) \u2014 re-login may be required
`);
      return;
    }
    const body = await response.json();
    if (!body.access_token)
      return;
    const expiresIn = body.expires_in ?? 31536e3;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
    const config = readConfig() ?? {};
    config.token = body.access_token;
    config.token_expires_at = newExpiresAt;
    writeConfig(config);
    cachedToken = body.access_token;
    cachedExpiresAt = Date.parse(newExpiresAt);
    process.stderr.write("[gramatr] Token renewed successfully\n");
  } catch {
  } finally {
    renewalInProgress = false;
  }
}
function getServerUrl() {
  const envUrl = getGramatrUrlFromEnv();
  if (envUrl) {
    return envUrl.replace(/\/mcp\/?$/, "");
  }
  const config = readConfig();
  return (config?.server_url || "https://api.gramatr.com").replace(/\/mcp\/?$/, "");
}
var import_node_fs7, import_node_path7, WARNED_EXPIRY, RENEWAL_WINDOW_MS, cachedToken, cachedExpiresAt, renewalInProgress;
var init_auth = __esm({
  "dist/server/auth.js"() {
    "use strict";
    import_node_fs7 = require("node:fs");
    import_node_path7 = require("node:path");
    init_config_runtime();
    WARNED_EXPIRY = /* @__PURE__ */ new Set();
    RENEWAL_WINDOW_MS = 6 * 60 * 60 * 1e3;
    cachedToken = null;
    cachedExpiresAt = null;
    renewalInProgress = false;
  }
});

// dist/hooks/generated/hook-timeouts.js
var REMOTE_TOOL_CALL_TIMEOUT_MS;
var init_hook_timeouts = __esm({
  "dist/hooks/generated/hook-timeouts.js"() {
    "use strict";
    REMOTE_TOOL_CALL_TIMEOUT_MS = 3e4;
  }
});

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
function defaultSleep(ms) {
  return new Promise((resolve3) => setTimeout(resolve3, ms));
}
function computeDelayMs(n, baseMs, capMs, random, retryAfterMs) {
  const exp = Math.min(capMs, baseMs * Math.pow(2, n));
  const ceiling = retryAfterMs !== void 0 ? Math.min(capMs, Math.max(exp, retryAfterMs)) : exp;
  return Math.floor(random() * ceiling);
}
async function withBackoff(fn, opts = {}) {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 200;
  const capMs = opts.capMs ?? 2e3;
  const retryable = opts.isRetryable ?? isRetryable;
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === attempts - 1;
      if (isLast || !retryable(err))
        throw err;
      const retryAfterMs = opts.getRetryAfterMs?.(err);
      const delay = computeDelayMs(attempt, baseMs, capMs, random, retryAfterMs);
      if (delay > 0)
        await sleep(delay);
    }
  }
  throw lastErr;
}
var init_retry = __esm({
  "dist/proxy/lib/retry.js"() {
    "use strict";
  }
});

// dist/proxy/remote-client.js
var remote_client_exports = {};
__export(remote_client_exports, {
  callRemoteTool: () => callRemoteTool,
  fetchCurrentUser: () => fetchCurrentUser,
  fetchRemotePrompt: () => fetchRemotePrompt,
  fetchRemotePromptList: () => fetchRemotePromptList,
  fetchRemoteResource: () => fetchRemoteResource,
  fetchRemoteResourceList: () => fetchRemoteResourceList,
  fetchRemoteToolList: () => fetchRemoteToolList
});
function parseRetryAfterMs(headerValue) {
  if (!headerValue)
    return void 0;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds))
    return Math.max(0, seconds * 1e3);
  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs))
    return Math.max(0, dateMs - Date.now());
  return void 0;
}
function debugLog(label, data) {
  if (!DEBUG)
    return;
  const json = JSON.stringify(data, null, 2);
  process.stderr.write(`[gramatr-debug] ${label}:
${json}

`);
}
async function callRemoteTool(toolName, args, sessionContext) {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "tools/call",
    params: { name: toolName, arguments: args }
  };
  const attempt = async () => {
    let response = await postToRemote(payload, sessionContext);
    if (response.status === 401) {
      const refreshed = refreshToken();
      if (refreshed) {
        response = await postToRemote(payload);
      }
      if (response.status === 401) {
        const renewed = await renewToken();
        if (renewed) {
          response = await postToRemote(payload);
        }
      }
    }
    if (!response.ok) {
      if (response.status === 401) {
        const body2 = await response.json().catch(() => ({}));
        const code = body2.code ?? "";
        throw new Error(`Remote server error: HTTP 401 \u2014 ${code || response.statusText}`);
      }
      if (response.status === 502 || response.status === 503 || response.status === 504 || response.status === 429) {
        throw new TransientHttpError(response.status, response.statusText, parseRetryAfterMs(response.headers.get("retry-after")));
      }
      throw new Error(`Remote server error: HTTP ${response.status} ${response.statusText}`);
    }
    const body = await parseSSEResponse(response);
    if (body.error) {
      throw new Error(`Remote tool error: ${body.error.message}`);
    }
    return body.result;
  };
  return withBackoff(attempt, remoteBackoffOpts);
}
async function fetchRemoteToolList() {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "tools/list",
    params: {}
  };
  const response = await postToRemote(payload);
  if (!response.ok) {
    throw new Error(`Failed to fetch tool list: HTTP ${response.status}`);
  }
  const body = await parseSSEResponse(response);
  if (body.error) {
    throw new Error(`Tool list error: ${body.error.message}`);
  }
  return body.result;
}
async function fetchRemotePromptList() {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "prompts/list",
    params: {}
  };
  const response = await postToRemote(payload);
  if (!response.ok) {
    throw new Error(`Failed to fetch prompt list: HTTP ${response.status}`);
  }
  const body = await parseSSEResponse(response);
  if (body.error) {
    throw new Error(`Prompt list error: ${body.error.message}`);
  }
  return body.result;
}
async function fetchRemotePrompt(name, args) {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "prompts/get",
    params: { name, arguments: args }
  };
  const response = await postToRemote(payload);
  if (!response.ok) {
    throw new Error(`Failed to fetch prompt: HTTP ${response.status}`);
  }
  const body = await parseSSEResponse(response);
  if (body.error) {
    throw new Error(`Prompt error: ${body.error.message}`);
  }
  return body.result;
}
async function fetchRemoteResourceList() {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "resources/list",
    params: {}
  };
  const response = await postToRemote(payload);
  if (!response.ok) {
    throw new Error(`Failed to fetch resource list: HTTP ${response.status}`);
  }
  const body = await parseSSEResponse(response);
  if (body.error) {
    throw new Error(`Resource list error: ${body.error.message}`);
  }
  return body.result;
}
async function fetchRemoteResource(uri, sessionContext) {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "resources/read",
    params: { uri }
  };
  const response = await postToRemote(payload, sessionContext);
  if (!response.ok) {
    throw new Error(`Failed to read resource: HTTP ${response.status}`);
  }
  const body = await parseSSEResponse(response);
  if (body.error) {
    throw new Error(`Resource read error: ${body.error.message}`);
  }
  return body.result;
}
async function fetchCurrentUser() {
  const serverUrl = getServerUrl();
  const token = getToken();
  if (!token)
    return null;
  const baseUrl = serverUrl.replace(/\/mcp\/?$/, "");
  const url = `${baseUrl}/api/v1/users/me`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(5e3)
    });
    if (!response.ok)
      return null;
    const body = await response.json();
    if (body !== null && typeof body === "object" && "user_id" in body && "actor_role" in body && "entitlement_level" in body) {
      return body;
    }
    return null;
  } catch {
    return null;
  }
}
async function postToRemote(payload, sessionContext) {
  const serverUrl = getServerUrl();
  const token = getToken();
  const url = `${serverUrl}/mcp`;
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (sessionContext?.sessionId) {
    headers["Mcp-Session-Id"] = sessionContext.sessionId;
  }
  if (sessionContext?.projectId) {
    headers["X-Gramatr-Project-Id"] = sessionContext.projectId;
  }
  if (sessionContext?.clientSessionId) {
    headers["X-Gramatr-Client-Session"] = sessionContext.clientSessionId;
  }
  debugLog(`\u2192 POST ${url} [${payload.method}]`, {
    ...payload,
    // Redact large argument values in debug output
    params: payload.params && typeof payload.params === "object" ? Object.fromEntries(Object.entries(payload.params).map(([k, v]) => [
      k,
      typeof v === "string" && v.length > 500 ? `${v.slice(0, 200)}... [${v.length} chars]` : v
    ])) : payload.params
  });
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REMOTE_TOOL_CALL_TIMEOUT_MS)
  });
  debugLog(`\u2190 ${response.status} ${response.statusText} [${payload.method}]`, {
    status: response.status,
    headers: Object.fromEntries([...response.headers.entries()].filter(([k]) => !k.toLowerCase().includes("authorization")))
  });
  return response;
}
async function parseSSEResponse(response) {
  const text = await response.text();
  if (DEBUG) {
    const preview = text.length > 2e3 ? `${text.slice(0, 2e3)}... [${text.length} chars]` : text;
    debugLog("\u2190 response body", preview);
  }
  try {
    return JSON.parse(text);
  } catch {
  }
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      try {
        return JSON.parse(data);
      } catch {
      }
    }
  }
  throw new Error(`Could not parse remote response: ${text.substring(0, 200)}`);
}
var DEBUG, HOT_PATH_BACKOFF, TransientHttpError, remoteBackoffOpts, requestId;
var init_remote_client = __esm({
  "dist/proxy/remote-client.js"() {
    "use strict";
    init_auth();
    init_hook_timeouts();
    init_retry();
    DEBUG = !!process.env.GRAMATR_DEBUG;
    HOT_PATH_BACKOFF = { attempts: 3, baseMs: 200, capMs: 2e3 };
    TransientHttpError = class extends Error {
      status;
      retryAfterMs;
      constructor(status, statusText, retryAfterMs) {
        super(`Remote server error: HTTP ${status} ${statusText}`);
        this.name = "TransientHttpError";
        this.status = status;
        this.retryAfterMs = retryAfterMs;
      }
    };
    remoteBackoffOpts = {
      ...HOT_PATH_BACKOFF,
      isRetryable,
      getRetryAfterMs: (err) => err instanceof TransientHttpError ? err.retryAfterMs : void 0
    };
    requestId = 0;
  }
});

// dist/hooks/lib/tool-envelope.js
var tool_envelope_exports = {};
__export(tool_envelope_exports, {
  extractToolPayload: () => extractToolPayload
});
function extractToolPayload(raw) {
  const text = raw?.content?.[0]?.text;
  if (!text)
    return null;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const envelope = parsed;
  if (envelope.schema === "gmtr.tool.result.v1") {
    if (envelope.data && typeof envelope.data === "object") {
      return envelope.data;
    }
    return null;
  }
  return parsed;
}
var init_tool_envelope = __esm({
  "dist/hooks/lib/tool-envelope.js"() {
    "use strict";
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

// dist/hooks/lib/session-rest-token.js
function getSessionTokenPath(projectDir) {
  return (0, import_node_path8.join)(projectDir, GRAMATR_DIR2, SESSION_FILE);
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
  const dir = (0, import_node_path8.join)(projectDir, GRAMATR_DIR2);
  if (!(0, import_node_fs8.existsSync)(dir)) {
    (0, import_node_fs8.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getSessionTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs8.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs8.renameSync)(tmp, dest);
  try {
    (0, import_node_fs8.chmodSync)(dest, 384);
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
var import_node_fs8, import_node_path8, GRAMATR_DIR2, SESSION_FILE, SESSION_TOKEN_EXPIRY_SKEW_MS;
var init_session_rest_token = __esm({
  "dist/hooks/lib/session-rest-token.js"() {
    "use strict";
    import_node_fs8 = require("node:fs");
    import_node_path8 = require("node:path");
    init_dpop_key();
    GRAMATR_DIR2 = ".gramatr";
    SESSION_FILE = ".session";
    SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
  }
});

// dist/hooks/lib/mint-credential-store.js
function currentPlatform() {
  return platformImpl ?? process.platform;
}
function getFileBackendPath() {
  return (0, import_node_path10.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME);
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
function secretToolWrite(secret) {
  const res = runKeyringCmd("secret-tool", ["store", "--label", KEYRING_SERVICE, "service", KEYRING_SERVICE, "account", KEYRING_ACCOUNT], secret);
  return res !== null;
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
function fileWrite(record) {
  try {
    const dir = (0, import_node_path10.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs10.existsSync)(dir))
      (0, import_node_fs10.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath();
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs10.writeFileSync)(tmp, record, { encoding: "utf8", mode: 384 });
    (0, import_node_fs10.renameSync)(tmp, dest);
    try {
      (0, import_node_fs10.chmodSync)(dest, 384);
    } catch {
    }
    return true;
  } catch {
    return false;
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
var import_node_child_process4, import_node_fs10, import_node_path10, spawnImpl, platformImpl, KEYRING_SERVICE, KEYRING_ACCOUNT, FILE_BACKEND_NAME, KEYRING_CMD_TIMEOUT_MS;
var init_mint_credential_store = __esm({
  "dist/hooks/lib/mint-credential-store.js"() {
    "use strict";
    import_node_child_process4 = require("node:child_process");
    import_node_fs10 = require("node:fs");
    import_node_path10 = require("node:path");
    init_config_runtime();
    spawnImpl = import_node_child_process4.spawnSync;
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
var init_device_key = __esm({
  "dist/hooks/lib/device-key.js"() {
    "use strict";
    init_dist();
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
function macosRead() {
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
function secretToolRead() {
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
function windowsRead() {
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
    const dir = (0, import_node_path11.join)(getHomeDir(), ".gramatr");
    if (!(0, import_node_fs11.existsSync)(dir))
      (0, import_node_fs11.mkdirSync)(dir, { recursive: true, mode: 448 });
    const dest = getFileBackendPath2();
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs11.writeFileSync)(tmp, record, { encoding: "utf8", mode: 384 });
    (0, import_node_fs11.renameSync)(tmp, dest);
    try {
      (0, import_node_fs11.chmodSync)(dest, 384);
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}
function fileRead() {
  try {
    const dest = getFileBackendPath2();
    if (!(0, import_node_fs11.existsSync)(dest))
      return null;
    const raw = (0, import_node_fs11.readFileSync)(dest, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
function getFileBackendPath2() {
  return (0, import_node_path11.join)(getHomeDir(), ".gramatr", FILE_BACKEND_NAME2);
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
  const privateKey = (0, import_node_crypto2.createPrivateKey)({ key: privateJwk, format: "jwk" });
  const publicKey = (0, import_node_crypto2.createPublicKey)(privateKey);
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
    raw = macosRead();
    if (raw)
      servedBy = "macos";
  } else if (backend === "secret-tool") {
    raw = secretToolRead();
    if (raw)
      servedBy = "secret-tool";
  } else if (backend === "windows") {
    raw = windowsRead();
    if (raw)
      servedBy = "windows";
  }
  if (!raw) {
    raw = fileRead();
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
var import_node_child_process5, import_node_fs11, import_node_path11, import_node_crypto2, spawnImpl2, platformImpl2, KEYRING_SERVICE2, KEYRING_ACCOUNT2, FILE_BACKEND_NAME2, KEYRING_CMD_TIMEOUT_MS2;
var init_device_key_store = __esm({
  "dist/hooks/lib/device-key-store.js"() {
    "use strict";
    import_node_child_process5 = require("node:child_process");
    import_node_fs11 = require("node:fs");
    import_node_path11 = require("node:path");
    import_node_crypto2 = require("node:crypto");
    init_config_runtime();
    init_device_key();
    spawnImpl2 = import_node_child_process5.spawnSync;
    platformImpl2 = null;
    KEYRING_SERVICE2 = "gramatr-device-key";
    KEYRING_ACCOUNT2 = "gramatr";
    FILE_BACKEND_NAME2 = ".device-key";
    KEYRING_CMD_TIMEOUT_MS2 = 3e3;
  }
});

// dist/bin/init-identity.js
var import_node_fs12 = require("node:fs");
var import_node_path12 = require("node:path");

// dist/user-config.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
init_config_runtime();
var DEFAULT_TTL_SECONDS = 3600;
function configPath() {
  return (0, import_node_path.join)(getHomeDir(), ".gramatr.json");
}
function readGramatrJson() {
  try {
    const raw = (0, import_node_fs.readFileSync)(configPath(), "utf8");
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
    (0, import_node_fs.writeFileSync)(configPath(), JSON.stringify(next, null, 2) + "\n");
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
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
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
    const dir = (0, import_node_path2.join)(homeDir, ".claude");
    const target = (0, import_node_path2.join)(dir, "settings.json");
    let settings = {};
    if ((0, import_node_fs2.existsSync)(target)) {
      try {
        settings = JSON.parse((0, import_node_fs2.readFileSync)(target, "utf8"));
      } catch {
        return false;
      }
    }
    const existingEnv = settings.env && typeof settings.env === "object" && !Array.isArray(settings.env) ? settings.env : {};
    settings.env = { ...existingEnv, ...buildOtelEnvBlock(inputs) };
    (0, import_node_fs2.mkdirSync)(dir, { recursive: true });
    const tmp = (0, import_node_path2.join)(dir, `settings.json.tmp.${process.pid}`);
    (0, import_node_fs2.writeFileSync)(tmp, JSON.stringify(settings, null, 2) + "\n", "utf8");
    (0, import_node_fs2.renameSync)(tmp, target);
    return true;
  } catch {
    return false;
  }
}

// dist/hooks/lib/codex-otel-settings.js
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/date.js
var DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;
var TomlDate = class _TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    if (typeof date === "string") {
      let match = date.match(DATE_TIME_RE);
      if (match) {
        if (!match[1]) {
          hasDate = false;
          date = `0000-01-01T${date}`;
        }
        hasTime = !!match[2];
        hasTime && date[10] === " " && (date = date.replace(" ", "T"));
        if (match[2] && +match[2] > 23) {
          date = "";
        } else {
          offset = match[3] || null;
          date = date.toUpperCase();
          if (!offset && hasTime)
            date += "Z";
        }
      } else {
        date = "";
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 6e4);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new _TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
};

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/error.js
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r\n|\n|\r/g);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r\n|\n|\r/g);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
var TomlError = class extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
};

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/util.js
function indexOfNewline(str, start = 0) {
  let idx = str.indexOf("\n", start);
  if (str.charCodeAt(idx - 1) === 13)
    idx--;
  return idx;
}
function skipComment(ctx) {
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 10)
      break;
    if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10) {
      ctx.p++;
      break;
    }
    if (c < 32 && c !== 9 || c === 127) {
      throw new TomlError("control characters are not allowed in comments", {
        toml: ctx.s,
        ptr: ctx.p
      });
    }
  }
}
function skipVoid(ctx, banNewLines, banComments) {
  let c;
  while (1) {
    while ((c = ctx.s.charCodeAt(ctx.p)) === 32 || c === 9 || !banNewLines && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10))
      ctx.p++;
    if (banComments || c !== 35)
      break;
    skipComment(ctx);
  }
}
function skipUntil(ctx, sep, end) {
  let ptr = ctx.p;
  if (!end) {
    ptr = indexOfNewline(ctx.s, ptr);
    ctx.p = ptr < 0 ? ctx.s.length : ptr;
    return;
  }
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 35) {
      skipComment(ctx);
    } else if (c === end || c === sep) {
      return;
    }
  }
  throw new TomlError("cannot find end of structure", {
    toml: ctx.s,
    ptr
  });
}

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/primitive.js
var INT_REGEX = /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/;
var FLOAT_REGEX = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/;
var LEADING_ZERO = /^[+-]?0[0-9_]/;
function parseString(ctx) {
  let start = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p++);
  let first = c;
  let isLiteral = c === 39;
  let isMultiline = c === ctx.s.charCodeAt(ctx.p) && c === ctx.s.charCodeAt(ctx.p + 1);
  if (isMultiline) {
    if ((c = ctx.s.charCodeAt(ctx.p += 2)) === 10)
      ctx.p++;
    else if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)
      ctx.p += 2;
  }
  let parsed = "";
  let sliceStart = ctx.p;
  let state = 0;
  for (; ctx.p < ctx.s.length; ctx.p++) {
    c = ctx.s.charCodeAt(ctx.p);
    if (isMultiline && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)) {
      state = state && 3;
    } else if (c < 32 && c !== 9 || c === 127) {
      throw new TomlError("control characters are not allowed in strings", {
        toml: ctx.s,
        ptr: ctx.p
      });
    } else if ((!state || state === 3) && c === first && (!isMultiline || ctx.s.charCodeAt(ctx.p + 1) === first && ctx.s.charCodeAt(ctx.p + 2) === first)) {
      if (isMultiline) {
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
      }
      if (!state)
        parsed += ctx.s.slice(sliceStart, ctx.p);
      ctx.p += isMultiline ? 3 : 1;
      return parsed;
    } else if (!state) {
      if (!isLiteral && c === 92) {
        parsed += ctx.s.slice(sliceStart, sliceStart = ctx.p);
        state = 1;
      }
    } else if (state === 1) {
      if (c === 120 || c === 117 || c === 85) {
        let value = 0;
        let len = c === 120 ? 2 : c === 117 ? 4 : 8;
        for (let j = 0; j < len; j++, ctx.p++) {
          let hex = ctx.s.charCodeAt(ctx.p + 1);
          let digit = (
            /* 0-9 */
            hex >= 48 && hex <= 57 ? hex - 48 : (
              /* A-F */
              hex >= 65 && hex <= 70 ? hex - 65 + 10 : (
                /* a-f */
                hex >= 97 && hex <= 102 ? hex - 97 + 10 : -1
              )
            )
          );
          if (digit < 0)
            throw new TomlError("invalid non-hex character in unicode escape", { toml: ctx.s, ptr: ctx.p + 1 });
          value = value << 4 | digit;
        }
        if (value < 0 || value > 1114111 || value >= 55296 && value <= 57343) {
          throw new TomlError("invalid unicode escape", { toml: ctx.s, ptr: ctx.p });
        }
        parsed += String.fromCodePoint(value);
        sliceStart = ctx.p + 1;
        state = 0;
      } else if (c === 32 || c === 9) {
        state = 2;
      } else {
        if (c === 98)
          parsed += "\b";
        else if (c === 116)
          parsed += "	";
        else if (c === 110)
          parsed += "\n";
        else if (c === 102)
          parsed += "\f";
        else if (c === 114)
          parsed += "\r";
        else if (c === 101)
          parsed += "\x1B";
        else if (c === 34)
          parsed += '"';
        else if (c === 92)
          parsed += "\\";
        else
          throw new TomlError("unrecognized escape sequence", { toml: ctx.s, ptr: ctx.p });
        sliceStart = ctx.p + 1;
        state = 0;
      }
    } else if (c !== 32 && c !== 9) {
      if (state === 2) {
        throw new TomlError("invalid escape: only line-ending whitespace may be escaped", {
          toml: ctx.s,
          ptr: sliceStart
        });
      }
      state = !isLiteral && c === 92 ? 1 : 0;
      sliceStart = ctx.p;
    }
  }
  throw new TomlError("unfinished string", { toml: ctx.s, ptr: start });
}
function sliceAndTrimEndOf(ctx, start, end) {
  let value = ctx.s.slice(start, end);
  let commentIdx = value.indexOf("#");
  if (commentIdx > 0) {
    skipComment({ s: value, p: commentIdx, d: 0 });
    value = value.slice(0, commentIdx);
  }
  return value.trimEnd();
}
function parseValue(ctx, integersAsBigInt, end) {
  let ptr = ctx.p;
  let err = { toml: ctx.s, ptr };
  skipUntil(ctx, 44, end);
  let value = sliceAndTrimEndOf(ctx, ptr, ctx.p);
  if (!value)
    throw new TomlError("incomplete declaration: value expected", err);
  if (value === "-inf")
    return -Infinity;
  if (value === "inf" || value === "+inf")
    return Infinity;
  if (value === "nan" || value === "+nan" || value === "-nan")
    return NaN;
  if (value === "-0")
    return integersAsBigInt ? 0n : 0;
  let isInt = INT_REGEX.test(value);
  if (isInt || FLOAT_REGEX.test(value)) {
    if (LEADING_ZERO.test(value)) {
      throw new TomlError("leading zeroes are not allowed", err);
    }
    value = value.replace(/_/g, "");
    let numeric = +value;
    if (isNaN(numeric)) {
      throw new TomlError("invalid number", err);
    }
    if (isInt) {
      if ((isInt = !Number.isSafeInteger(numeric)) && !integersAsBigInt) {
        throw new TomlError("integer value cannot be represented losslessly", err);
      }
      if (isInt || integersAsBigInt === true)
        numeric = BigInt(value);
    }
    return numeric;
  }
  const date = new TomlDate(value);
  if (!date.isValid())
    throw new TomlError("invalid value", err);
  return date;
}

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/extract.js
function extractValue(ctx, end, integersAsBigInt) {
  let ptr = ctx.p;
  let c = ctx.s.charCodeAt(ptr);
  if (c === 91 || c === 123) {
    if (!ctx.d--) {
      throw new TomlError("document contains excessively nested structures. aborting.", {
        toml: ctx.s,
        ptr
      });
    }
    let value = c === 91 ? parseArray(ctx, integersAsBigInt) : parseInlineTable(ctx, integersAsBigInt);
    ctx.d++;
    return value;
  }
  if (c === 34 || c === 39) {
    return parseString(ctx);
  }
  if (c === 116) {
    if (ctx.s.charCodeAt(++ctx.p) !== 114 || ctx.s.charCodeAt(++ctx.p) !== 117 || ctx.s.charCodeAt(++ctx.p) !== 101)
      throw new TomlError("invalid value", { toml: ctx.s, ptr });
    ctx.p++;
    return true;
  }
  if (c === 102) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 108 || ctx.s.charCodeAt(++ctx.p) !== 115 || ctx.s.charCodeAt(++ctx.p) !== 101)
      throw new TomlError("invalid value", { toml: ctx.s, ptr });
    ctx.p++;
    return false;
  }
  return parseValue(ctx, integersAsBigInt, end);
}

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/struct.js
var KEY_PART_RE = /^[a-zA-Z0-9-_]+[ \t]*$/;
function parseKey(ctx, end = "=") {
  let start = ctx.p;
  let dot = start - 1;
  let parsed = [];
  let endPtr = ctx.s.indexOf(end, start);
  if (endPtr < 0) {
    throw new TomlError("incomplete key-value: cannot find end of key", {
      toml: ctx.s,
      ptr: start
    });
  }
  do {
    let c = ctx.s.charCodeAt(ctx.p = ++dot);
    if (c !== 32 && c !== 9) {
      if (c === 34 || c === 39) {
        if (c === ctx.s.charCodeAt(ctx.p + 1) && c === ctx.s.charCodeAt(ctx.p + 2)) {
          throw new TomlError("multiline strings are not allowed in keys", {
            toml: ctx.s,
            ptr: ctx.p
          });
        }
        let part = parseString(ctx);
        dot = ctx.s.indexOf(".", ctx.p);
        let strEnd = ctx.s.slice(ctx.p, dot < 0 || dot > endPtr ? endPtr : dot);
        let newLine = indexOfNewline(strEnd);
        if (newLine > -1) {
          throw new TomlError("newlines are not allowed in keys", {
            toml: ctx.s,
            ptr: newLine
          });
        }
        if (strEnd.trimStart()) {
          throw new TomlError("found extra tokens after the string part", {
            toml: ctx.s,
            ptr: ctx.p
          });
        }
        if (endPtr < ctx.p) {
          endPtr = ctx.s.indexOf(end, ctx.p);
          if (endPtr < 0) {
            throw new TomlError("incomplete key-value: cannot find end of key", {
              toml: ctx.s,
              ptr: start
            });
          }
        }
        parsed.push(part);
      } else {
        dot = ctx.s.indexOf(".", ctx.p);
        let part = ctx.s.slice(ctx.p, dot < 0 || dot > endPtr ? endPtr : dot);
        if (!KEY_PART_RE.test(part)) {
          throw new TomlError("only letter, numbers, dashes and underscores are allowed in keys", {
            toml: ctx.s,
            ptr: ctx.p
          });
        }
        parsed.push(part.trimEnd());
      }
    }
  } while (dot + 1 && dot < endPtr);
  ctx.p = endPtr + 1;
  skipVoid(ctx, true, true);
  return parsed;
}
function parseInlineTable(ctx, integersAsBigInt) {
  let res = {};
  let seen = /* @__PURE__ */ new Set();
  let c;
  ctx.p++;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 125) {
      ctx.p++;
      return res;
    }
    let k;
    let t = res;
    let hasOwn = false;
    let p = ctx.p;
    let key = parseKey(ctx);
    for (let i = 0; i < key.length; i++) {
      if (i)
        t = hasOwn ? t[k] : t[k] = {};
      k = key[i];
      if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
        throw new TomlError("trying to redefine an already defined value", {
          toml: ctx.s,
          ptr: p
        });
      }
      if (!hasOwn && k === "__proto__") {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
      }
    }
    if (hasOwn) {
      throw new TomlError("trying to redefine an already defined value", {
        toml: ctx.s,
        ptr: ctx.p
      });
    }
    let value = extractValue(ctx, 125, integersAsBigInt);
    seen.add(t[k] = value);
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 125) {
      return res;
    }
    if (c !== 44) {
      throw new TomlError("expected comma or end of structure", { toml: ctx.s, ptr: ctx.p - 1 });
    }
  }
  throw new TomlError("unfinished table encountered", {
    toml: ctx.s,
    ptr: ctx.p
  });
}
function parseArray(ctx, integersAsBigInt) {
  let res = [];
  let c;
  ctx.p++;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 93) {
      ctx.p++;
      return res;
    }
    res.push(extractValue(ctx, 93, integersAsBigInt));
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 93) {
      return res;
    }
    if (c !== 44) {
      throw new TomlError("expected comma or end of structure", { toml: ctx.s, ptr: ctx.p - 1 });
    }
  }
  throw new TomlError("unfinished array encountered", {
    toml: ctx.s,
    ptr: ctx.p
  });
}

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/parse.js
function peekTable(key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = {};
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      if (k === "__proto__") {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: {}
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = {});
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: {} };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = {};
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function parse(toml, { maxDepth = 1e3, integersAsBigInt } = {}) {
  let ctx = { s: toml, p: 0, d: maxDepth };
  let res = {};
  let meta = {};
  let tmp;
  let tbl = res;
  let m = meta;
  skipVoid(ctx);
  while (ctx.p < toml.length) {
    if (toml.charCodeAt(ctx.p) === 91) {
      let isTableArray = toml.charCodeAt(++ctx.p) === 91;
      tmp = ctx.p += +isTableArray;
      let k = parseKey(ctx, "]");
      if (isTableArray) {
        if (toml.charCodeAt(ctx.p - 1) !== 93) {
          throw new TomlError("expected end of table declaration", {
            toml,
            ptr: ctx.p - 1
          });
        }
        ctx.p++;
      }
      let p = peekTable(
        k,
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr: tmp
        });
      }
      m = p[2];
      tbl = p[1];
    } else {
      tmp = ctx.p;
      let k = parseKey(ctx);
      let p = peekTable(
        k,
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr: tmp
        });
      }
      p[1][p[0]] = extractValue(ctx, void 0, integersAsBigInt);
    }
    skipVoid(ctx, true);
    if (ctx.p < toml.length && (tmp = toml.charCodeAt(ctx.p)) !== 10 && tmp !== 13) {
      throw new TomlError("each key-value declaration must be followed by an end-of-line", {
        toml,
        ptr: ctx.p
      });
    }
    skipVoid(ctx);
  }
  return res;
}

// ../../node_modules/.pnpm/smol-toml@1.8.0/node_modules/smol-toml/dist/stringify.js
var BARE_KEY = /^[a-z0-9-_]+$/i;
function extendedTypeOf(obj) {
  let type = typeof obj;
  if (type === "object") {
    if (Array.isArray(obj))
      return "array";
    if (typeof obj?.getUTCDate === "function" && obj instanceof Date)
      return "date";
    if (globalThis.Temporal && // check for the 'since' property as an early bailout that avoids running all 5 instanceof checks
    typeof obj?.since === "function" && (obj instanceof Temporal.Instant || obj instanceof Temporal.PlainDate || obj instanceof Temporal.PlainDateTime || obj instanceof Temporal.PlainTime || obj instanceof Temporal.ZonedDateTime)) {
      return "temporal";
    }
  }
  return type;
}
function isArrayOfTables(obj) {
  for (let i = 0; i < obj.length; i++) {
    if (extendedTypeOf(obj[i]) !== "object")
      return false;
  }
  return obj.length != 0;
}
function formatString(s) {
  return JSON.stringify(s).replace(/\x7f/g, "\\u007f");
}
function stringifyTemporal(temporal) {
  return temporal.toString({
    calendarName: "never",
    timeZoneName: "never"
  });
}
function stringifyValue(val, type, depth, numberAsFloat) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  switch (type) {
    // @ts-expect-error -- intentional fallthrough case
    case "number":
      if (isNaN(val))
        return "nan";
      if (val === Infinity)
        return "inf";
      if (val === -Infinity)
        return "-inf";
      if (Number.isInteger(val) && (numberAsFloat || !Number.isSafeInteger(val)))
        return val.toFixed(1);
    case "bigint":
    case "boolean":
      return val.toString();
    case "string":
      return formatString(val);
    case "date":
      if (isNaN(val.getTime()))
        throw new TypeError("cannot serialize invalid date");
      return val.toISOString();
    case "object":
      return stringifyInlineTable(val, depth, numberAsFloat);
    case "array":
      return stringifyArray(val, depth, numberAsFloat);
    case "temporal":
      return stringifyTemporal(val);
  }
}
function stringifyInlineTable(obj, depth, numberAsFloat) {
  let keys = Object.keys(obj);
  if (keys.length === 0)
    return "{}";
  let res = "{ ";
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i];
    if (i)
      res += ", ";
    res += BARE_KEY.test(k) ? k : formatString(k);
    res += " = ";
    res += stringifyValue(obj[k], extendedTypeOf(obj[k]), depth - 1, numberAsFloat);
  }
  return res + " }";
}
function stringifyArray(array, depth, numberAsFloat) {
  if (array.length === 0)
    return "[]";
  let res = "[ ";
  for (let i = 0; i < array.length; i++) {
    if (i)
      res += ", ";
    if (array[i] === null || array[i] === void 0) {
      throw new TypeError("arrays cannot contain null or undefined values");
    }
    res += stringifyValue(array[i], extendedTypeOf(array[i]), depth - 1, numberAsFloat);
  }
  return res + " ]";
}
function stringifyArrayTable(array, key, depth, numberAsFloat) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  let res = "";
  for (let i = 0; i < array.length; i++) {
    res += `${res && "\n"}[[${key}]]
`;
    res += stringifyTable(0, array[i], key, depth, numberAsFloat);
  }
  return res;
}
function stringifyTable(tableKey, obj, prefix, depth, numberAsFloat) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  let preamble = "";
  let tables = "";
  let keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i];
    if (obj[k] !== null && obj[k] !== void 0) {
      let type = extendedTypeOf(obj[k]);
      if (type === "symbol" || type === "function") {
        throw new TypeError(`cannot serialize values of type '${type}'`);
      }
      let key = BARE_KEY.test(k) ? k : formatString(k);
      if (type === "array" && isArrayOfTables(obj[k])) {
        tables += (tables && "\n") + stringifyArrayTable(obj[k], prefix ? `${prefix}.${key}` : key, depth - 1, numberAsFloat);
      } else if (type === "object") {
        let tblKey = prefix ? `${prefix}.${key}` : key;
        tables += (tables && "\n") + stringifyTable(tblKey, obj[k], tblKey, depth - 1, numberAsFloat);
      } else {
        preamble += key;
        preamble += " = ";
        preamble += stringifyValue(obj[k], type, depth, numberAsFloat);
        preamble += "\n";
      }
    }
  }
  if (tableKey && (preamble || !tables))
    preamble = preamble ? `[${tableKey}]
${preamble}` : `[${tableKey}]`;
  return preamble && tables ? `${preamble}
${tables}` : preamble || tables;
}
function stringify(obj, { maxDepth = 1e3, numbersAsFloat = false } = {}) {
  if (extendedTypeOf(obj) !== "object") {
    throw new TypeError("stringify can only be called with an object");
  }
  let str = stringifyTable(0, obj, "", maxDepth, numbersAsFloat);
  if (str[str.length - 1] !== "\n")
    return str + "\n";
  return str;
}

// dist/hooks/lib/codex-otel-settings.js
var CODEX_OTEL_TABLES = ["analytics", "otel"];
function markerPath(homeDir) {
  return (0, import_node_path3.join)(homeDir, ".gramatr", "codex-otel-managed");
}
var OTLP_SIGNAL_PATHS = {
  logs: "v1/logs",
  traces: "v1/traces",
  metrics: "v1/metrics"
};
function otlpEndpoint(collectorEndpoint, signalPath) {
  return `${collectorEndpoint.replace(/\/+$/, "")}/${signalPath}`;
}
function otlpHttpExporter(endpoint, token) {
  return {
    // Matches `OtelExporterKind::OtlpHttp` (serde kebab-case → `otlp-http`).
    // `protocol = "json"` matches the sole upstream TOML fixture. CONFIRMED
    // against the live collector (Unit 3, epic #5297 open question #1):
    // `kubectl -n cc-telemetry get cm cc-otel-config -o yaml` shows a bare
    // `receivers.otlp.protocols.http: { endpoint: 0.0.0.0:4318 }` stanza — the
    // standard OTel Collector `otlphttpreceiver`, which accepts both
    // `application/json` and `application/x-protobuf` via content-negotiation
    // on the same endpoint; there is no encoding restriction configured. This
    // confirms the RECEIVER accepts both Claude Code's `http/protobuf`
    // (otel-settings.ts) and this module's `json` with no config change needed.
    // Downstream parity (ClickHouse/Tempo/Prometheus treating JSON-sourced and
    // protobuf-sourced telemetry identically) is inferred from standard OTel
    // Collector architecture — both encodings decode to the same internal pdata
    // model before any exporter sees them — not independently observed.
    "otlp-http": {
      endpoint,
      protocol: "json",
      headers: { Authorization: `Bearer ${token}` }
    }
  };
}
function buildCodexOtelConfig(inputs) {
  const { collectorEndpoint, token, sessionId } = inputs;
  return {
    analytics: { enabled: true },
    otel: {
      exporter: otlpHttpExporter(otlpEndpoint(collectorEndpoint, OTLP_SIGNAL_PATHS.logs), token),
      trace_exporter: otlpHttpExporter(otlpEndpoint(collectorEndpoint, OTLP_SIGNAL_PATHS.traces), token),
      metrics_exporter: otlpHttpExporter(otlpEndpoint(collectorEndpoint, OTLP_SIGNAL_PATHS.metrics), token),
      // Codex has no dedicated "resource attributes" TOML field; `span_attributes`
      // (BTreeMap<String,String> in OtelConfigToml) is the closest equivalent and
      // is attached to every exported trace span. Verified against the full
      // OtelConfigToml field list (codex-rs/config/src/types.rs) that no better
      // cross-signal field exists — `environment` is a fixed dev/staging/prod
      // slot, not a place for an arbitrary session id. CAVEAT: unlike Claude
      // Code's `OTEL_RESOURCE_ATTRIBUTES` (which applies to all signals),
      // span_attributes attach to trace spans only — gramatr.session_id will
      // not appear on Codex-originated metrics/logs, only traces. Accepted gap;
      // the collector-side verification query (see docs/scope/codex-otel-
      // telemetry-parity-2026-08-27.md's Verification plan) should account for
      // this when checking Codex-originated telemetry.
      span_attributes: { "gramatr.session_id": sessionId }
    }
  };
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function writeCodexOtelSettings(homeDir, inputs) {
  try {
    const dir = (0, import_node_path3.join)(homeDir, ".codex");
    const target = (0, import_node_path3.join)(dir, "config.toml");
    let existingRaw = "";
    let parsed = {};
    if ((0, import_node_fs3.existsSync)(target)) {
      existingRaw = (0, import_node_fs3.readFileSync)(target, "utf8");
      try {
        parsed = parse(existingRaw);
      } catch {
        return false;
      }
    }
    const config = buildCodexOtelConfig(inputs);
    let output;
    const hasOurTables = CODEX_OTEL_TABLES.some((table) => table in parsed);
    if (!hasOurTables) {
      const block = stringify(config);
      const base = existingRaw.replace(/\s+$/, "");
      output = base.length > 0 ? `${base}

${block}
` : `${block}
`;
    } else {
      const existingAnalytics = isPlainObject(parsed.analytics) ? parsed.analytics : {};
      const existingOtel = isPlainObject(parsed.otel) ? parsed.otel : {};
      const merged = {
        ...parsed,
        analytics: { ...existingAnalytics, ...config.analytics },
        otel: { ...existingOtel, ...config.otel }
      };
      output = `${stringify(merged)}
`;
    }
    (0, import_node_fs3.mkdirSync)(dir, { recursive: true });
    const tmp = (0, import_node_path3.join)(dir, `config.toml.tmp.${process.pid}`);
    (0, import_node_fs3.writeFileSync)(tmp, output, "utf8");
    (0, import_node_fs3.renameSync)(tmp, target);
    try {
      const markerDir = (0, import_node_path3.join)(homeDir, ".gramatr");
      (0, import_node_fs3.mkdirSync)(markerDir, { recursive: true });
      (0, import_node_fs3.writeFileSync)(markerPath(homeDir), "", "utf8");
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}

// dist/hooks/lib/project-state.js
var import_node_child_process = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");
var GRAMATR_DIR = ".gramatr";
function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  for (; ; ) {
    if ((0, import_node_fs4.existsSync)((0, import_node_path4.join)(dir, GRAMATR_DIR)))
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
  if ((0, import_node_fs4.existsSync)((0, import_node_path4.join)(mainRoot, GRAMATR_DIR)))
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
  const dir = (0, import_node_path4.join)(projectDir, GRAMATR_DIR);
  return {
    core: (0, import_node_path4.join)(dir, CORE_FILE),
    runtime: (0, import_node_path4.join)(dir, RUNTIME_FILE)
  };
}
var SCHEMA_VERSION = 1;
function atomicWriteJson(filePath, dir, payload) {
  if (!(0, import_node_fs4.existsSync)(dir)) {
    (0, import_node_fs4.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const tmp = `${filePath}.tmp.${process.pid}`;
  (0, import_node_fs4.writeFileSync)(tmp, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs4.renameSync)(tmp, filePath);
  try {
    (0, import_node_fs4.chmodSync)(filePath, 384);
  } catch {
  }
}
function readJson(filePath) {
  try {
    if (!(0, import_node_fs4.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_node_fs4.readFileSync)(filePath, "utf8"));
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
  const dir = (0, import_node_path4.join)(projectDir, GRAMATR_DIR);
  const legacyProject = readJson((0, import_node_path4.join)(dir, "project.json"));
  const legacySettings = readJson((0, import_node_path4.join)(dir, "settings.json"));
  const legacyGit = readJson((0, import_node_path4.join)(dir, "git-context.json"));
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
  const legacySession = readJson((0, import_node_path4.join)(projectDir, GRAMATR_DIR, "session.json"));
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
      last_handoff: runtime.last_handoff,
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
    last_handoff: runtime.last_handoff ?? legacy.last_handoff,
    statusline_cache: runtime.statusline_cache ?? legacy.statusline_cache
  };
}
function confirmProject(projectDir, args) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path4.join)(projectDir, GRAMATR_DIR);
  const next = {
    schema_version: SCHEMA_VERSION,
    project: args.project,
    drift: args.drift ?? {}
  };
  const prev = readJson(paths.core);
  if (prev && JSON.stringify(prev) === JSON.stringify(next)) {
    return;
  }
  atomicWriteJson(paths.core, dir, next);
}
function readRuntime(projectDir) {
  return readJson(getStatePaths(projectDir).runtime) ?? {};
}
function patchRuntime(projectDir, patch) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path4.join)(projectDir, GRAMATR_DIR);
  const prev = readRuntime(projectDir);
  const next = { ...prev, ...patch };
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return;
  }
  atomicWriteJson(paths.runtime, dir, next);
}
function mergeActiveSession(projectDir, patch) {
  const prev = readRuntime(projectDir).active_session;
  const defined = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== void 0)
      defined[k] = v;
  }
  const next = {
    session_id: prev?.session_id ?? "",
    ...prev,
    ...defined
  };
  patchRuntime(projectDir, { active_session: next });
}
function readGitContext(projectDir) {
  return readRuntime(projectDir).git_context ?? null;
}
function persistBootstrapSessionState(projectDir, input) {
  const sessionId = input.sessionId;
  if (!sessionId)
    return;
  const projectId = input.projectId ?? "";
  const clientType = input.clientType ?? "claude-code";
  const next = {
    session_id: sessionId,
    project_id: projectId,
    client_session_id: input.clientSessionId || null,
    client_type: clientType,
    written_at: (/* @__PURE__ */ new Date()).toISOString(),
    ...input.model ? { model: input.model } : {}
  };
  const dir = (0, import_node_path4.join)(projectDir, GRAMATR_DIR);
  const target = (0, import_node_path4.join)(dir, "session.json");
  let unchanged = false;
  try {
    const prev = JSON.parse((0, import_node_fs4.readFileSync)(target, "utf8"));
    unchanged = prev.session_id === next.session_id && prev.project_id === next.project_id && (prev.client_session_id ?? null) === (next.client_session_id ?? null) && prev.client_type === next.client_type && (prev.model ?? "") === (next.model ?? "");
  } catch {
  }
  if (!unchanged) {
    try {
      atomicWriteJson(target, dir, next);
    } catch {
    }
  }
  try {
    mergeActiveSession(projectDir, {
      session_id: sessionId,
      client_session_id: input.clientSessionId || void 0,
      client_type: clientType,
      written_at: next.written_at,
      ...next.model ? { model: next.model } : {}
    });
  } catch {
  }
}

// dist/hooks/lib/bootstrap-git-remote.js
var import_node_child_process2 = require("node:child_process");
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
init_config_runtime();
function resolveBootstrapGitRemote(projectDir) {
  try {
    const proj = JSON.parse((0, import_node_fs5.readFileSync)((0, import_node_path5.join)(projectDir, ".gramatr", "project.json"), "utf8"));
    if (typeof proj.git_remote === "string" && proj.git_remote)
      return proj.git_remote;
  } catch {
  }
  if (isRuntimeGitContextEnabledFromEnv()) {
    try {
      const ctx = readGitContext(projectDir);
      if (ctx?.remote_url)
        return ctx.remote_url;
    } catch {
    }
  }
  try {
    const ctx = JSON.parse((0, import_node_fs5.readFileSync)((0, import_node_path5.join)(projectDir, ".gramatr", "git-context.json"), "utf8"));
    if (typeof ctx.remote_url === "string" && ctx.remote_url)
      return ctx.remote_url;
  } catch {
  }
  try {
    const out = (0, import_node_child_process2.execFileSync)("git", ["remote", "get-url", "origin"], {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    if (out)
      return out;
  } catch {
  }
  return void 0;
}

// dist/hooks/lib/session-root-registry.js
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
init_config_runtime();
var DEFAULT_REGISTRY_TTL_DAYS = 14;
function registryTtlMs() {
  const days = getSessionRegistryTtlDaysFromEnv(DEFAULT_REGISTRY_TTL_DAYS);
  return days * 24 * 60 * 60 * 1e3;
}
function registryDir() {
  return (0, import_node_path6.join)(getHomeDir(), ".gramatr", "sessions");
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
  return (0, import_node_path6.join)(registryDir(), name);
}
function writeSessionRoot(sessionId, entry) {
  const dest = sessionRootPath(sessionId);
  if (!dest)
    return false;
  if (!entry.project_root || entry.project_root.length === 0)
    return false;
  try {
    const dir = registryDir();
    if (!(0, import_node_fs6.existsSync)(dir))
      (0, import_node_fs6.mkdirSync)(dir, { recursive: true, mode: 448 });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const prev = readRaw(dest);
    const createdAt = prev && typeof prev.created_at === "string" && prev.created_at ? prev.created_at : now;
    const payload = {
      project_root: entry.project_root,
      created_at: createdAt,
      last_seen_at: now
    };
    if (entry.gramatr_project_id)
      payload.gramatr_project_id = entry.gramatr_project_id;
    if (entry.client_type)
      payload.client_type = entry.client_type;
    const tmp = `${dest}.tmp.${process.pid}`;
    (0, import_node_fs6.writeFileSync)(tmp, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", mode: 384 });
    (0, import_node_fs6.renameSync)(tmp, dest);
    try {
      (0, import_node_fs6.chmodSync)(dest, 384);
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}
function readRaw(path2) {
  try {
    if (!(0, import_node_fs6.existsSync)(path2))
      return null;
    return JSON.parse((0, import_node_fs6.readFileSync)(path2, "utf8"));
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
        (0, import_node_fs6.rmSync)(path2, { force: true });
      } catch {
      }
      return null;
    }
  }
  if (!(0, import_node_fs6.existsSync)(raw.project_root)) {
    try {
      (0, import_node_fs6.rmSync)(path2, { force: true });
    } catch {
    }
    return null;
  }
  return raw.project_root;
}
function registryDebugDir() {
  const home = getHomeDir() || "/tmp";
  return (0, import_node_path6.join)(home, ".gramatr", "debug");
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
    const jsonlPath = (0, import_node_path6.join)(dir, "registry-resolution.jsonl");
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

// dist/hooks/lib/resolve-home.js
var import_node_child_process3 = require("node:child_process");

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
  let configPath2 = path.join(gitPath, "config");
  if (!(0, import_fs.existsSync)(configPath2)) {
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
    configPath2 = path.join(resolved, "config");
  }
  let cfg;
  try {
    cfg = (0, import_fs.readFileSync)(configPath2, "utf8");
  } catch {
    return null;
  }
  const origin = cfg.match(/\[remote\s+"origin"\][^[]*?url\s*=\s*(.+)/)?.[1]?.trim();
  if (origin)
    return origin;
  const any = cfg.match(/\[remote\s+"[^"]+"\][^[]*?url\s*=\s*(.+)/)?.[1]?.trim();
  return any ?? null;
}

// dist/hooks/lib/resolve-home.js
var SCRATCH_SLUG = "scratch";
function defaultGetGitRemote(projectDir) {
  const fromConfig = readGitRemoteFromConfigSync(projectDir);
  if (fromConfig)
    return fromConfig;
  try {
    const out = (0, import_node_child_process3.spawnSync)("git", ["remote", "get-url", "origin"], {
      cwd: projectDir,
      encoding: "utf8"
    }).stdout?.trim();
    return out && out.length > 0 ? out : null;
  } catch {
    return null;
  }
}
async function resolveProjectHoming(args) {
  const { projectDir } = args;
  const ports = args.ports ?? {};
  const readState = ports.readState ?? readProjectState;
  const getGitRemote = ports.getGitRemote ?? defaultGetGitRemote;
  const persist = ports.persist ?? confirmProject;
  const rawDirRemote = args.gitRemote && args.gitRemote.length > 0 ? args.gitRemote : getGitRemote(projectDir);
  const dirSlug = rawDirRemote ? parseGitRemote(rawDirRemote) : null;
  const dirSlugCanon = dirSlug ? dirSlug.toLowerCase() : null;
  let phantomRejected = false;
  let state = null;
  try {
    state = readState(projectDir);
  } catch {
    state = null;
  }
  if (state?.project?.project_id) {
    const fileRemote = state.drift?.git_remote ?? null;
    const fileSlug = (fileRemote ? parseGitRemote(fileRemote) : null) ?? (state.project.slug && state.project.slug !== SCRATCH_SLUG ? state.project.slug : null);
    const fileSlugCanon = fileSlug ? fileSlug.toLowerCase() : null;
    if (dirSlugCanon === null && fileSlugCanon === null) {
      return {
        source: "project_file",
        projectId: state.project.project_id,
        slug: state.project.slug || null,
        gitRemote: fileRemote,
        resolutionNeeded: false,
        phantomRejected: false,
        reason: "project.json present; no remote on either side to contradict it"
      };
    }
    if (dirSlugCanon !== null && fileSlugCanon !== null && dirSlugCanon === fileSlugCanon) {
      return {
        source: "project_file",
        projectId: state.project.project_id,
        slug: state.project.slug || dirSlug,
        gitRemote: rawDirRemote ?? fileRemote,
        resolutionNeeded: false,
        phantomRejected: false,
        reason: "project.json present and its remote matches the dir (phantom guard passed)"
      };
    }
    phantomRejected = true;
  }
  if (dirSlugCanon !== null && rawDirRemote) {
    const resolveProject = ports.resolveProject ?? defaultResolveProject;
    let resolved = null;
    try {
      resolved = await resolveProject({ slug: dirSlugCanon, gitRemote: rawDirRemote });
    } catch {
      resolved = null;
    }
    if (resolved?.project_id) {
      const slug = resolved.slug || dirSlugCanon;
      try {
        persist(projectDir, {
          project: { project_id: resolved.project_id, slug },
          drift: { git_remote: rawDirRemote }
        });
      } catch {
      }
      return {
        source: "git_remote",
        projectId: resolved.project_id,
        slug,
        gitRemote: rawDirRemote,
        resolutionNeeded: false,
        phantomRejected,
        reason: phantomRejected ? "phantom project.json rejected; re-homed from citable git remote" : "resolved + confirmed from citable git remote"
      };
    }
    return {
      source: "scratch",
      projectId: null,
      slug: dirSlugCanon,
      gitRemote: rawDirRemote,
      resolutionNeeded: true,
      phantomRejected,
      reason: "citable git remote present but unresolved \u2014 scratch + cue (no uuid guess)"
    };
  }
  return {
    source: "scratch",
    projectId: null,
    slug: SCRATCH_SLUG,
    gitRemote: null,
    resolutionNeeded: true,
    phantomRejected,
    reason: phantomRejected ? "phantom project.json rejected and no citable remote \u2014 scratch + cue" : "no citable git/slug signal \u2014 scratch + cue (never silent stale inherit)"
  };
}
async function defaultResolveProject(args) {
  try {
    const { callRemoteTool: callTool } = await Promise.resolve().then(() => (init_remote_client(), remote_client_exports));
    const { extractToolPayload: extractToolPayload2 } = await Promise.resolve().then(() => (init_tool_envelope(), tool_envelope_exports));
    const raw = await callTool("resolve_project", {
      action: "resolve",
      slug: args.slug
    });
    const payload = extractToolPayload2(raw);
    if (payload?.project_id) {
      return { project_id: payload.project_id, slug: payload.slug ?? args.slug };
    }
    return null;
  } catch {
    return null;
  }
}

// dist/bin/init-identity.js
init_session_rest_token();

// dist/hooks/lib/telemetry-token.js
var import_node_fs9 = require("node:fs");
var import_node_path9 = require("node:path");
var GRAMATR_DIR3 = ".gramatr";
var TELEMETRY_TOKEN_FILE = ".telemetry-token";
function getTelemetryTokenPath(projectDir) {
  return (0, import_node_path9.join)(projectDir, GRAMATR_DIR3, TELEMETRY_TOKEN_FILE);
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
  const dir = (0, import_node_path9.join)(projectDir, GRAMATR_DIR3);
  if (!(0, import_node_fs9.existsSync)(dir)) {
    (0, import_node_fs9.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getTelemetryTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs9.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs9.renameSync)(tmp, dest);
}
function persistBootstrapTelemetryToken(projectDir, block) {
  const file = normalizeTelemetryTokenBlock(block);
  if (!file)
    return false;
  writeTelemetryToken(projectDir, file);
  return true;
}

// dist/bin/init-identity.js
init_mint_credential_store();
init_device_key_store();
init_config_runtime();

// dist/hooks/lib/client-runtime.js
function resolveHookClientRuntime(args = []) {
  if (args.includes("--codex")) {
    return {
      clientType: "codex",
      agentName: "Codex",
      modeFlag: "--codex",
      clearCommand: "/clear",
      supportsHookedClear: true
    };
  }
  if (args.includes("--gemini")) {
    return {
      clientType: "gemini_cli",
      agentName: "Gemini CLI",
      modeFlag: "--gemini",
      clearCommand: null,
      supportsHookedClear: false
    };
  }
  if (args.includes("--claude-code")) {
    return {
      clientType: "claude_code",
      agentName: "Claude Code",
      modeFlag: "--claude-code",
      clearCommand: "/clear",
      supportsHookedClear: true
    };
  }
  if (args.includes("--opencode")) {
    return {
      clientType: "opencode",
      agentName: "OpenCode",
      modeFlag: "--opencode",
      clearCommand: null,
      supportsHookedClear: false
    };
  }
  throw new Error("Missing client runtime flag. Pass --claude-code, --codex, --gemini, or --opencode to identify the calling agent.");
}
function resolveClientTypeArg(args = []) {
  let clientType;
  try {
    clientType = resolveHookClientRuntime(args).clientType;
  } catch {
    return "claude-code";
  }
  switch (clientType) {
    case "codex":
      return "codex";
    case "gemini_cli":
      return "gemini-cli";
    case "opencode":
      return "opencode";
    case "claude_code":
    default:
      return "claude-code";
  }
}

// dist/bin/init-identity.js
var CLIENT_TYPE = resolveClientTypeArg(process.argv.slice(2));
var REMOTE_URL = process.env.GRAMATR_URL ?? "https://api.gramatr.com/mcp";
var PLUGIN_DATA_DIR = process.env.CLAUDE_PLUGIN_DATA ?? "";
var ENV_API_KEY = process.env.GRAMATR_API_KEY ?? "";
var ENV_TOKEN = process.env.GRAMATR_TOKEN ?? "";
var HOME_DIR = getHomeDir();
var PROJECT_DIR = resolveProjectDir({ clientType: CLIENT_TYPE });
var NETWORK_TIMEOUT_MS = 5e3;
function warnSkip(reason, extra) {
  process.stderr.write(JSON.stringify({
    level: "warn",
    operation: "init_identity_skip",
    reason,
    ...extra
  }) + "\n");
}
function getToken2() {
  const envToken = sanitizeEnvToken(ENV_API_KEY) || sanitizeEnvToken(ENV_TOKEN);
  if (envToken)
    return envToken;
  if (PLUGIN_DATA_DIR) {
    try {
      const cfg = JSON.parse((0, import_node_fs12.readFileSync)((0, import_node_path12.join)(PLUGIN_DATA_DIR, "token.json"), "utf8"));
      if (typeof cfg.token === "string" && cfg.token)
        return cfg.token;
    } catch {
    }
  }
  try {
    const credFile = (0, import_node_path12.resolve)(HOME_DIR, ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs12.readFileSync)(credFile, "utf8"));
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
async function fetchBootstrapPayload(token, clientSessionId, projectDir) {
  const gitRemote = resolveBootstrapGitRemote(projectDir) ?? "";
  let localTimezone = null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    localTimezone = typeof tz === "string" && tz.length > 0 ? tz : null;
  } catch {
  }
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "session_bootstrap",
      arguments: {
        // Intentionally omit `hook_response: true` — that flag shapes the
        // response into a Claude-Code-hook-compatible envelope that drops
        // the top-level `user` block we need to cache here. The structured
        // (non-hook) payload also exposes the resolved gramatr_session_id /
        // gramatr_project_id we need for the per-project session.json write
        // (#2942 — fixes statusline.js having no session_id source).
        cwd: projectDir,
        client_type: CLIENT_TYPE,
        // ALWAYS present — '' is the load-bearing "no remote, resolve anyway"
        // signal that keeps persistence decoupled from remote resolution.
        git_remote: gitRemote,
        ...clientSessionId ? { client_session_id: clientSessionId } : {},
        ...localTimezone ? { timezone: localTimezone, timezone_source: "os" } : {}
      }
    }
  };
  let res;
  try {
    res = await fetch(REMOTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS)
    });
  } catch {
    return null;
  }
  if (!res.ok)
    return null;
  const contentType = res.headers.get("content-type") ?? "";
  let payload = null;
  try {
    if (contentType.includes("text/event-stream")) {
      const text2 = await res.text();
      const lines = text2.split("\n");
      let lastData = null;
      for (const line of lines) {
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
      payload = await res.json();
    }
  } catch {
    return null;
  }
  if (!payload)
    return null;
  const result = payload.result;
  if (!result)
    return null;
  const content = result.content;
  const text = typeof content?.[0]?.text === "string" ? content[0].text : "";
  if (!text)
    return null;
  try {
    const parsed = JSON.parse(text);
    const user = parsed.user;
    const rt = parsed.rest_token;
    const restToken = rt && typeof rt.token === "string" && rt.token && typeof rt.expires_at === "string" && typeof rt.base_url === "string" && typeof rt.aud === "string" ? {
      token: rt.token,
      expires_at: rt.expires_at,
      base_url: rt.base_url,
      aud: rt.aud,
      // #3536 follow-up — carry issued_at through to .session when present.
      ...typeof rt.issued_at === "string" && rt.issued_at ? { issued_at: rt.issued_at } : {}
    } : void 0;
    const tt = parsed.telemetry_token;
    const telemetryToken = tt && typeof tt.token === "string" && tt.token && typeof tt.expires_at === "string" && typeof tt.base_url === "string" && typeof tt.aud === "string" ? {
      token: tt.token,
      expires_at: tt.expires_at,
      base_url: tt.base_url,
      aud: tt.aud,
      ...typeof tt.issued_at === "string" && tt.issued_at ? { issued_at: tt.issued_at } : {},
      // #4718 — server-authoritative OTLP collector endpoint.
      ...typeof tt.collector_endpoint === "string" && tt.collector_endpoint ? { collector_endpoint: tt.collector_endpoint } : {}
    } : void 0;
    const mc = parsed.mint_credential;
    const mintCredential = mc && typeof mc.token === "string" && mc.token && typeof mc.expires_at === "string" && mc.expires_at && typeof mc.device_id === "string" && mc.device_id ? { token: mc.token, expires_at: mc.expires_at, device_id: mc.device_id } : void 0;
    const sessionPayload = {
      user,
      gramatr_session_id: typeof parsed.gramatr_session_id === "string" ? parsed.gramatr_session_id : void 0,
      gramatr_project_id: typeof parsed.gramatr_project_id === "string" ? parsed.gramatr_project_id : void 0,
      resolved: typeof parsed.resolved === "boolean" ? parsed.resolved : void 0,
      project_slug: typeof parsed.project_slug === "string" ? parsed.project_slug : null,
      rest_token: restToken,
      telemetry_token: telemetryToken,
      mint_credential: mintCredential
    };
    if (user && (user.id || user.email) || sessionPayload.gramatr_session_id) {
      return sessionPayload;
    }
  } catch {
    return null;
  }
  return null;
}
function writeSessionJson(payload, clientSessionId, model) {
  if (!payload.gramatr_session_id) {
    warnSkip("no_session_id", { session_id_source: "bootstrap_payload" });
    return;
  }
  persistBootstrapSessionState(PROJECT_DIR, {
    sessionId: payload.gramatr_session_id,
    projectId: payload.gramatr_project_id,
    clientSessionId,
    model
  });
}
async function resolveHomingFallback(reason, _clientSessionId, _payload) {
  let outcome;
  try {
    outcome = await resolveProjectHoming({ projectDir: PROJECT_DIR });
  } catch {
    warnSkip(reason, { homing: "resolver_error" });
    return null;
  }
  if (outcome.source === "scratch") {
    warnSkip(reason, {
      homing: "scratch",
      project_resolution_needed: true,
      homing_slug: outcome.slug,
      homing_git_remote: outcome.gitRemote,
      phantom_rejected: outcome.phantomRejected,
      homing_reason: outcome.reason
    });
    return null;
  }
  warnSkip(reason, {
    homing: outcome.source,
    project_id: outcome.projectId,
    homing_slug: outcome.slug,
    phantom_rejected: outcome.phantomRejected,
    homing_reason: outcome.reason
  });
  return outcome.projectId;
}
async function readHookInputFromStdin() {
  if (process.stdin.isTTY) {
    warnSkip("tty_stdin", { session_id_source: "none" });
    return { sessionId: "", cwd: "", model: "" };
  }
  try {
    const chunks = [];
    for await (const chunk of process.stdin)
      chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw)
      return { sessionId: "", cwd: "", model: "" };
    const parsed = JSON.parse(raw);
    return {
      sessionId: typeof parsed.session_id === "string" ? parsed.session_id : "",
      cwd: typeof parsed.cwd === "string" ? parsed.cwd : "",
      model: typeof parsed.model === "string" ? parsed.model : ""
    };
  } catch {
    return { sessionId: "", cwd: "", model: "" };
  }
}
async function main() {
  const { sessionId: clientSessionId, cwd: hookCwd, model: hookModel } = await readHookInputFromStdin();
  PROJECT_DIR = resolveSessionRoot({
    sessionId: clientSessionId || void 0,
    cwd: hookCwd || void 0,
    clientType: CLIENT_TYPE
  });
  if (clientSessionId) {
    writeSessionRoot(clientSessionId, { project_root: PROJECT_DIR, client_type: CLIENT_TYPE });
  }
  try {
    (0, import_node_fs12.unlinkSync)((0, import_node_path12.join)(PROJECT_DIR, ".gramatr", "ctx-tokens.json"));
  } catch {
  }
  const cached = readCachedUserIdentity();
  const identityFresh = cached && !isUserIdentityStale(cached);
  if (identityFresh) {
    process.stderr.write("gr\u0101matr: identity cache fresh \u2014 skipping bootstrap\n");
  }
  const token = getToken2();
  if (!token) {
    warnSkip("no_token", { session_id_source: clientSessionId ? "stdin" : "none" });
    process.stderr.write("gr\u0101matr: no auth token \u2014 identity cache will refresh on a later session\n");
    return;
  }
  if (identityFresh) {
  }
  const payload = await fetchBootstrapPayload(token, clientSessionId, PROJECT_DIR);
  if (!payload) {
    await resolveHomingFallback("no_payload", clientSessionId, null);
    process.stderr.write("gr\u0101matr: session_bootstrap did not return a usable payload \u2014 ran homing fallback\n");
    return;
  }
  let effectivePayload = payload;
  if (!payload.gramatr_project_id) {
    const homed = await resolveHomingFallback("no_project_id", clientSessionId, payload);
    if (homed)
      effectivePayload = { ...payload, gramatr_project_id: homed };
  }
  writeSessionJson(effectivePayload, clientSessionId, hookModel);
  if (clientSessionId && effectivePayload.gramatr_project_id) {
    writeSessionRoot(clientSessionId, {
      project_root: PROJECT_DIR,
      gramatr_project_id: effectivePayload.gramatr_project_id,
      client_type: CLIENT_TYPE
    });
  }
  if (payload.rest_token) {
    try {
      persistBootstrapRestToken(PROJECT_DIR, payload.rest_token);
    } catch {
    }
  }
  if (payload.telemetry_token) {
    try {
      persistBootstrapTelemetryToken(PROJECT_DIR, payload.telemetry_token);
    } catch {
    }
    if (effectivePayload.gramatr_session_id && payload.telemetry_token.collector_endpoint && !readTelemetryDisabled()) {
      try {
        const otelInputs = {
          sessionId: effectivePayload.gramatr_session_id,
          token: payload.telemetry_token.token,
          collectorEndpoint: payload.telemetry_token.collector_endpoint
        };
        if (CLIENT_TYPE === "codex") {
          writeCodexOtelSettings(HOME_DIR, otelInputs);
        } else if (CLIENT_TYPE === "claude-code") {
          writeOtelSettings(HOME_DIR, otelInputs);
        }
      } catch {
      }
    }
  }
  if (payload.mint_credential) {
    try {
      writeMintCredential(payload.mint_credential);
    } catch {
    }
  }
  try {
    getOrCreateDeviceKeyPair();
  } catch {
  }
  const user = payload.user;
  if (!user || !(user.id || user.email)) {
    process.stderr.write("gr\u0101matr: session_bootstrap returned no user block \u2014 skipping identity cache write\n");
    return;
  }
  writeCachedUserIdentity({
    id: user.id ?? null,
    email: user.email ?? null,
    display_name: user.display_name ?? null,
    system_roles: user.system_roles ?? [],
    org_memberships: user.org_memberships ?? [],
    team_memberships: user.team_memberships ?? [],
    timezone: user.timezone ?? null
  });
  process.stderr.write(`gr\u0101matr: identity cache refreshed (${user.email ?? user.id ?? "unknown"})
`);
}
if (process.env.GRAMATR_INIT_IDENTITY_NO_AUTOSTART !== "1") {
  main().catch(() => {
    process.exit(0);
  });
}
/*! Bundled license information:

smol-toml/dist/date.js:
smol-toml/dist/error.js:
smol-toml/dist/util.js:
smol-toml/dist/primitive.js:
smol-toml/dist/extract.js:
smol-toml/dist/struct.js:
smol-toml/dist/parse.js:
smol-toml/dist/stringify.js:
smol-toml/dist/index.js:
  (*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *)
*/
