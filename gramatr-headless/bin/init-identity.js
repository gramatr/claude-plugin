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
function getGramatrTokenFromEnv() {
  const current = process.env.GRAMATR_TOKEN;
  if (current && current.length > 0)
    return current;
  const legacy = process.env.AIOS_MCP_TOKEN;
  if (legacy && legacy.length > 0)
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
function getGramatrDaemonSocketFromEnv() {
  const s = process.env.GRAMATR_DAEMON_SOCKET;
  return s && s.length > 0 ? s : null;
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
    return (0, import_node_path3.join)((0, import_node_path3.dirname)(gramatrDir), ".gramatr.json");
  }
  return (0, import_node_path3.join)(getHomeDir(), ".gramatr.json");
}
function readConfig() {
  try {
    const raw = (0, import_node_fs3.readFileSync)(getConfigPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeConfig(config) {
  try {
    (0, import_node_fs3.writeFileSync)(getConfigPath(), JSON.stringify(config, null, 2), { mode: 384 });
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
  const envKey = process.env.GRAMATR_API_KEY;
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
var import_node_fs3, import_node_path3, WARNED_EXPIRY, RENEWAL_WINDOW_MS, cachedToken, cachedExpiresAt, renewalInProgress;
var init_auth = __esm({
  "dist/server/auth.js"() {
    "use strict";
    import_node_fs3 = require("node:fs");
    import_node_path3 = require("node:path");
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

// dist/daemon/startup.js
function getGramatrDir() {
  return getGramatrDirFromEnv() ?? (0, import_node_path4.join)(getHomeDir(), ".gramatr");
}
function getDaemonSocketPath() {
  const envOverride = getGramatrDaemonSocketFromEnv();
  if (envOverride)
    return envOverride;
  if (process.platform === "win32")
    return "\\\\.\\pipe\\gramatr-daemon";
  return (0, import_node_path4.join)(getGramatrDir(), "daemon.sock");
}
function getDaemonHttpPortPath() {
  return (0, import_node_path4.join)(getGramatrDir(), "daemon.port");
}
function getDaemonTokenPath() {
  return (0, import_node_path4.join)(getGramatrDir(), "daemon.token");
}
function readDaemonToken() {
  try {
    const token = (0, import_node_fs4.readFileSync)(getDaemonTokenPath(), "utf8").trim();
    return token || null;
  } catch {
    return null;
  }
}
function readHttpCredentials() {
  try {
    const port = parseInt((0, import_node_fs4.readFileSync)(getDaemonHttpPortPath(), "utf8").trim(), 10);
    const token = (0, import_node_fs4.readFileSync)(getDaemonTokenPath(), "utf8").trim();
    if (!Number.isFinite(port) || port <= 0 || !token)
      return null;
    return { port, token };
  } catch {
    return null;
  }
}
var import_node_fs4, import_node_path4;
var init_startup = __esm({
  "dist/daemon/startup.js"() {
    "use strict";
    import_node_fs4 = require("node:fs");
    import_node_path4 = require("node:path");
    init_config_runtime();
  }
});

// dist/daemon/ipc-protocol.js
var DAEMON_UNAVAILABLE;
var init_ipc_protocol = __esm({
  "dist/daemon/ipc-protocol.js"() {
    "use strict";
    DAEMON_UNAVAILABLE = Symbol("DAEMON_UNAVAILABLE");
  }
});

// dist/proxy/local-client.js
var local_client_exports = {};
__export(local_client_exports, {
  _resetClientForTest: () => _resetClientForTest,
  callTool: () => callTool,
  callViaDaemon: () => callViaDaemon,
  dbWriteViaDaemon: () => dbWriteViaDaemon,
  getComposedAgent: () => getComposedAgent,
  isLocalHooksServerAvailable: () => isLocalHooksServerAvailable,
  listComposedAgents: () => listComposedAgents,
  pullSessionContextFromLocal: () => pullSessionContextFromLocal,
  pushSessionContextToLocal: () => pushSessionContextToLocal,
  storeComposedAgent: () => storeComposedAgent,
  sweepExpiredAgents: () => sweepExpiredAgents,
  wasDaemonAvailable: () => wasDaemonAvailable
});
async function retryDaemonTier(tier) {
  try {
    return await withBackoff(async () => {
      const result = await tier();
      if (result === DAEMON_UNAVAILABLE)
        throw DAEMON_RETRY;
      return result;
    }, { ...DAEMON_BACKOFF, isRetryable: (err) => err === DAEMON_RETRY });
  } catch (err) {
    if (err === DAEMON_RETRY)
      return DAEMON_UNAVAILABLE;
    throw err;
  }
}
function wasDaemonAvailable() {
  return _lastCallUsedDaemon;
}
async function openSocketWithTimeout(path2, timeoutMs) {
  return new Promise((resolve3, reject) => {
    const socket = (0, import_node_net.createConnection)(path2);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("connect timeout"));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve3(socket);
    });
    socket.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
async function readOneLine(socket, timeoutMs) {
  return new Promise((resolve3, reject) => {
    const rl = (0, import_node_readline.createInterface)({ input: socket, crlfDelay: Infinity });
    const timer = setTimeout(() => {
      rl.close();
      reject(new Error("read timeout"));
    }, timeoutMs);
    rl.once("line", (line) => {
      clearTimeout(timer);
      rl.close();
      resolve3(line);
    });
    rl.once("close", () => {
      clearTimeout(timer);
      reject(new Error("socket closed"));
    });
    rl.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
async function callViaDaemon(method, params) {
  const sockPath = getDaemonSocketPath();
  let socket;
  try {
    socket = await openSocketWithTimeout(sockPath, 8);
    const socketToken = readDaemonToken();
    if (!socketToken)
      return DAEMON_UNAVAILABLE;
    socket.write(`AUTH ${socketToken}
`);
    const req = {
      jsonrpc: "2.0",
      id: ++_requestId,
      method,
      params
    };
    socket.write(JSON.stringify(req) + "\n");
    const line = await readOneLine(socket, 8e3);
    const resp = JSON.parse(line);
    if (resp.error) {
      throw new Error(resp.error.message);
    }
    return resp.result;
  } catch {
    return DAEMON_UNAVAILABLE;
  } finally {
    try {
      socket?.destroy();
    } catch {
    }
  }
}
async function callViaLocalHttp(method, params) {
  const creds = readHttpCredentials();
  if (!creds)
    return DAEMON_UNAVAILABLE;
  try {
    const req = {
      jsonrpc: "2.0",
      id: ++_requestId,
      method,
      params
    };
    const response = await fetch(`http://127.0.0.1:${creds.port}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${creds.token}`
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(9e3)
    });
    if (!response.ok)
      return DAEMON_UNAVAILABLE;
    const resp = await response.json();
    if (resp.error) {
      throw new Error(resp.error.message);
    }
    return resp.result;
  } catch {
    return DAEMON_UNAVAILABLE;
  }
}
function spawnDaemon() {
  try {
    let binaryPath;
    try {
      const home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "";
      const configPath2 = (0, import_node_path5.join)(home, ".gramatr.json");
      const config = JSON.parse((0, import_node_fs5.readFileSync)(configPath2, "utf8"));
      if (typeof config["gramatr_binary"] === "string" && config["gramatr_binary"]) {
        binaryPath = config["gramatr_binary"];
      }
    } catch {
    }
    if (!binaryPath) {
      try {
        const result = (0, import_node_child_process.spawnSync)(process.platform === "win32" ? "where" : "which", ["gramatr"], { encoding: "utf8", timeout: 1e3 });
        const found = result.stdout?.trim();
        if (found)
          binaryPath = found;
      } catch {
      }
    }
    const [cmd, ...args] = binaryPath ? [binaryPath, "daemon", "start"] : ["npx", "--yes", "@gramatr/mcp", "daemon", "start"];
    const child = (0, import_node_child_process.spawn)(cmd, args, {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
async function waitForDaemonSocket(timeoutMs) {
  const socketPath = getDaemonSocketPath();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((0, import_node_fs5.existsSync)(socketPath))
      return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
async function tryRestartDaemon() {
  if (_restartAttempted)
    return false;
  _restartAttempted = true;
  const spawned = spawnDaemon();
  if (!spawned)
    return false;
  return waitForDaemonSocket(3e3);
}
function isLocalHooksServerAvailable() {
  return (0, import_node_fs5.existsSync)(getDaemonSocketPath());
}
async function callTool(name, args, hookSessionId) {
  _lastCallUsedDaemon = true;
  const sessionId = hookSessionId ?? process.env["GRAMATR_HOOK_SESSION_ID"];
  const ipcParams = { name, arguments: args };
  if (sessionId)
    ipcParams["session_id"] = sessionId;
  const socketResult = await retryDaemonTier(() => callViaDaemon("tool/call", ipcParams));
  if (socketResult !== DAEMON_UNAVAILABLE) {
    return socketResult;
  }
  const httpResult = await retryDaemonTier(() => callViaLocalHttp("tool/call", ipcParams));
  if (httpResult !== DAEMON_UNAVAILABLE) {
    return httpResult;
  }
  const restarted = await tryRestartDaemon();
  if (restarted) {
    const retryResult = await callViaDaemon("tool/call", ipcParams);
    if (retryResult !== DAEMON_UNAVAILABLE) {
      return retryResult;
    }
  }
  _lastCallUsedDaemon = false;
  try {
    const result = await callRemoteTool(name, args);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `gramatr hook: tool call failed \u2014 ${message}` }],
      isError: true
    };
  }
}
async function pushSessionContextToLocal(ctx) {
  if (ctx === null || typeof ctx !== "object")
    return false;
  const sessionId = ctx.session_id;
  if (!sessionId)
    return false;
  const result = await callViaDaemon("session/context/set", {
    session_id: sessionId,
    context: ctx
  });
  return result !== DAEMON_UNAVAILABLE;
}
async function dbWriteViaDaemon(table, operation, record) {
  const result = await callViaDaemon("db/write", { table, operation, record });
  return result !== DAEMON_UNAVAILABLE;
}
async function pullSessionContextFromLocal(sessionId) {
  const result = await callViaDaemon("session/context/get", { session_id: sessionId });
  if (result === DAEMON_UNAVAILABLE)
    return null;
  const typed = result;
  if (typed.value === null || typed.value === void 0)
    return null;
  return typed.value;
}
async function storeComposedAgent(uuid, ownerId, name, definition, expiresAt) {
  const result = await callViaDaemon("agent/store", {
    uuid,
    owner_id: ownerId,
    name,
    definition: JSON.stringify(definition),
    expires_at: expiresAt ?? null
  });
  if (result !== DAEMON_UNAVAILABLE) {
    const r = result;
    return r?.ok ? uuid : null;
  }
  return uuid;
}
async function getComposedAgent(uuid) {
  const daemonResult = await callViaDaemon("agent/get", { uuid });
  if (daemonResult !== DAEMON_UNAVAILABLE && daemonResult !== null) {
    return daemonResult;
  }
  try {
    const result = await callRemoteTool("get_composed_agent", { composition_id: uuid });
    const r = result;
    if (r?.content?.[0]?.text) {
      const parsed = JSON.parse(r.content[0].text);
      if (parsed && !parsed.error)
        return parsed;
    }
  } catch {
  }
  return null;
}
async function listComposedAgents(ownerId) {
  const result = await callViaDaemon("agent/list", { owner_id: ownerId });
  if (result === DAEMON_UNAVAILABLE)
    return [];
  return result ?? [];
}
async function sweepExpiredAgents() {
  await callViaDaemon("agent/expire", {});
}
function _resetClientForTest() {
  _requestId = 0;
}
var import_node_net, import_node_readline, import_node_fs5, import_node_path5, import_node_child_process, DAEMON_BACKOFF, DAEMON_RETRY, _requestId, _lastCallUsedDaemon, _restartAttempted;
var init_local_client = __esm({
  "dist/proxy/local-client.js"() {
    "use strict";
    import_node_net = require("node:net");
    import_node_readline = require("node:readline");
    import_node_fs5 = require("node:fs");
    import_node_path5 = require("node:path");
    import_node_child_process = require("node:child_process");
    init_remote_client();
    init_retry();
    init_startup();
    init_ipc_protocol();
    DAEMON_BACKOFF = { attempts: 3, baseMs: 30, capMs: 120 };
    DAEMON_RETRY = Symbol("DAEMON_RETRY");
    _requestId = 0;
    _lastCallUsedDaemon = true;
    _restartAttempted = false;
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

// dist/bin/init-identity.js
var import_node_fs7 = require("node:fs");
var import_node_path7 = require("node:path");

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
function isUserIdentityStale(identity) {
  if (!identity || !identity.cached_at)
    return true;
  const cachedMs = Date.parse(identity.cached_at);
  if (!Number.isFinite(cachedMs))
    return true;
  const ttl = (identity.cache_ttl_seconds ?? DEFAULT_TTL_SECONDS) * 1e3;
  return Date.now() - cachedMs > ttl;
}

// dist/hooks/lib/project-state.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var GRAMATR_DIR = ".gramatr";
var CORE_FILE = "project.json";
var RUNTIME_FILE = "runtime.json";
function getStatePaths(projectDir) {
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR);
  return {
    core: (0, import_node_path2.join)(dir, CORE_FILE),
    runtime: (0, import_node_path2.join)(dir, RUNTIME_FILE)
  };
}
var SCHEMA_VERSION = 1;
function atomicWriteJson(filePath, dir, payload) {
  if (!(0, import_node_fs2.existsSync)(dir)) {
    (0, import_node_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const tmp = `${filePath}.tmp.${process.pid}`;
  (0, import_node_fs2.writeFileSync)(tmp, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs2.renameSync)(tmp, filePath);
  try {
    (0, import_node_fs2.chmodSync)(filePath, 384);
  } catch {
  }
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
function synthesizeFromLegacy(projectDir) {
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR);
  const legacyProject = readJson((0, import_node_path2.join)(dir, "project.json"));
  const legacySettings = readJson((0, import_node_path2.join)(dir, "settings.json"));
  const legacyGit = readJson((0, import_node_path2.join)(dir, "git-context.json"));
  const legacySession = readJson((0, import_node_path2.join)(dir, "session.json"));
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
  const state = {
    schema_version: SCHEMA_VERSION,
    project,
    drift,
    recent_sessions: []
  };
  if (legacySession?.session_id) {
    const active = { session_id: legacySession.session_id };
    if (legacySession.client_session_id)
      active.client_session_id = legacySession.client_session_id;
    if (legacySession.interaction_id)
      active.interaction_id = legacySession.interaction_id;
    if (legacySession.client_type)
      active.client_type = legacySession.client_type;
    if (legacySession.written_at)
      active.written_at = legacySession.written_at;
    state.active_session = active;
  }
  return state;
}
function readProjectState(projectDir) {
  const paths = getStatePaths(projectDir);
  const rawCore = readJson(paths.core);
  const isNewShape = rawCore !== null && typeof rawCore.schema_version === "number" && rawCore.project !== void 0 && typeof rawCore.project.project_id === "string";
  if (!isNewShape) {
    return synthesizeFromLegacy(projectDir);
  }
  const core = migrateCore(rawCore);
  const runtime = readJson(paths.runtime) ?? {};
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
function confirmProject(projectDir, args) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR);
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
  const dir = (0, import_node_path2.join)(projectDir, GRAMATR_DIR);
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

// dist/hooks/lib/resolve-home.js
var import_node_child_process2 = require("node:child_process");

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
    const out = (0, import_node_child_process2.spawnSync)("git", ["remote", "get-url", "origin"], {
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
    const { callTool: callTool2 } = await Promise.resolve().then(() => (init_local_client(), local_client_exports));
    const { extractToolPayload: extractToolPayload2 } = await Promise.resolve().then(() => (init_tool_envelope(), tool_envelope_exports));
    const raw = await callTool2("resolve_project", {
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

// dist/hooks/lib/session-rest-token.js
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
var SESSION_FILE = ".session";
var SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
function getSessionTokenPath(projectDir) {
  return (0, import_node_path6.join)(projectDir, GRAMATR_DIR2, SESSION_FILE);
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
  const dir = (0, import_node_path6.join)(projectDir, GRAMATR_DIR2);
  if (!(0, import_node_fs6.existsSync)(dir)) {
    (0, import_node_fs6.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const stamped = { ...file, written_at: (/* @__PURE__ */ new Date()).toISOString() };
  const dest = getSessionTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs6.writeFileSync)(tmp, JSON.stringify(stamped, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs6.renameSync)(tmp, dest);
  try {
    (0, import_node_fs6.chmodSync)(dest, 384);
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

// dist/bin/init-identity.js
init_config_runtime();
var REMOTE_URL = process.env.GRAMATR_URL ?? "https://api.gramatr.com/mcp";
var PLUGIN_DATA_DIR = process.env.CLAUDE_PLUGIN_DATA ?? "";
var ENV_API_KEY = process.env.GRAMATR_API_KEY ?? "";
var ENV_TOKEN = process.env.GRAMATR_TOKEN ?? "";
var HOME_DIR = getHomeDir();
var PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
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
  const envToken = (ENV_API_KEY !== "null" ? ENV_API_KEY : "") || (ENV_TOKEN !== "null" ? ENV_TOKEN : "");
  if (envToken)
    return envToken;
  if (PLUGIN_DATA_DIR) {
    try {
      const cfg = JSON.parse((0, import_node_fs7.readFileSync)((0, import_node_path7.join)(PLUGIN_DATA_DIR, "token.json"), "utf8"));
      if (typeof cfg.token === "string" && cfg.token)
        return cfg.token;
    } catch {
    }
  }
  try {
    const credFile = (0, import_node_path7.resolve)(HOME_DIR, ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs7.readFileSync)(credFile, "utf8"));
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
async function fetchBootstrapPayload(token, clientSessionId) {
  let gitRemote;
  try {
    const proj = JSON.parse((0, import_node_fs7.readFileSync)((0, import_node_path7.join)(PROJECT_DIR, ".gramatr", "project.json"), "utf8"));
    if (typeof proj.git_remote === "string" && proj.git_remote)
      gitRemote = proj.git_remote;
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
        cwd: PROJECT_DIR,
        client_type: "claude-code",
        ...gitRemote ? { git_remote: gitRemote } : {},
        ...clientSessionId ? { client_session_id: clientSessionId } : {}
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
    const sessionPayload = {
      user,
      gramatr_session_id: typeof parsed.gramatr_session_id === "string" ? parsed.gramatr_session_id : void 0,
      gramatr_project_id: typeof parsed.gramatr_project_id === "string" ? parsed.gramatr_project_id : void 0,
      resolved: typeof parsed.resolved === "boolean" ? parsed.resolved : void 0,
      project_slug: typeof parsed.project_slug === "string" ? parsed.project_slug : null,
      rest_token: restToken
    };
    if (user && (user.id || user.email) || sessionPayload.gramatr_session_id) {
      return sessionPayload;
    }
  } catch {
    return null;
  }
  return null;
}
function writeSessionJson(payload, clientSessionId) {
  const sessionId = payload.gramatr_session_id;
  const projectId = payload.gramatr_project_id ?? "";
  if (!sessionId) {
    warnSkip("no_session_id", { session_id_source: "bootstrap_payload" });
    return;
  }
  const next = {
    session_id: sessionId,
    project_id: projectId,
    client_session_id: clientSessionId || null,
    client_type: "claude-code",
    written_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const dir = (0, import_node_path7.join)(PROJECT_DIR, ".gramatr");
  const target = (0, import_node_path7.join)(dir, "session.json");
  try {
    const prev = JSON.parse((0, import_node_fs7.readFileSync)(target, "utf8"));
    if (prev.session_id === next.session_id && prev.project_id === next.project_id && prev.client_session_id === next.client_session_id && prev.client_type === next.client_type) {
      return;
    }
  } catch {
  }
  try {
    (0, import_node_fs7.mkdirSync)(dir, { recursive: true });
    const tmp = (0, import_node_path7.join)(dir, `session.json.tmp.${process.pid}`);
    (0, import_node_fs7.writeFileSync)(tmp, JSON.stringify(next, null, 2) + "\n", "utf8");
    (0, import_node_fs7.renameSync)(tmp, target);
  } catch {
  }
  try {
    writeActiveSession(PROJECT_DIR, {
      session_id: sessionId,
      client_session_id: clientSessionId || void 0,
      client_type: "claude-code",
      written_at: next.written_at
    });
  } catch {
  }
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
async function readClientSessionIdFromStdin() {
  if (process.stdin.isTTY) {
    warnSkip("tty_stdin", { session_id_source: "none" });
    return "";
  }
  try {
    const chunks = [];
    for await (const chunk of process.stdin)
      chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw)
      return "";
    const parsed = JSON.parse(raw);
    return typeof parsed.session_id === "string" ? parsed.session_id : "";
  } catch {
    return "";
  }
}
async function main() {
  const clientSessionId = await readClientSessionIdFromStdin();
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
  const payload = await fetchBootstrapPayload(token, clientSessionId);
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
  writeSessionJson(effectivePayload, clientSessionId);
  if (payload.rest_token) {
    try {
      persistBootstrapRestToken(PROJECT_DIR, payload.rest_token);
    } catch {
    }
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
    team_memberships: user.team_memberships ?? []
  });
  process.stderr.write(`gr\u0101matr: identity cache refreshed (${user.email ?? user.id ?? "unknown"})
`);
}
main().catch(() => {
  process.exit(0);
});
