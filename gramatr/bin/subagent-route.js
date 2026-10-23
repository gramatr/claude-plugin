#!/usr/bin/env node
"use strict";

// dist/server/auth.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

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

// dist/hooks/lib/token-stale.js
function createSingleFlight() {
  let inFlight = null;
  return (fn) => {
    if (inFlight)
      return inFlight;
    const run = fn();
    inFlight = run;
    void run.then(() => {
      if (inFlight === run)
        inFlight = null;
    }, () => {
      if (inFlight === run)
        inFlight = null;
    });
    return run;
  };
}

// dist/server/auth.js
var WARNED_EXPIRY = /* @__PURE__ */ new Set();
var RENEWAL_WINDOW_MS = 6 * 60 * 60 * 1e3;
var cachedToken = null;
var cachedExpiresAt = null;
var renewalInProgress = false;
function getConfigPath() {
  const gramatrDir = getGramatrDirFromEnv();
  if (gramatrDir) {
    return (0, import_node_path.join)((0, import_node_path.dirname)(gramatrDir), ".gramatr.json");
  }
  return (0, import_node_path.join)(getHomeDir(), ".gramatr.json");
}
function readConfig() {
  try {
    const raw = (0, import_node_fs.readFileSync)(getConfigPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeConfig(config) {
  try {
    const path = getConfigPath();
    (0, import_node_fs.writeFileSync)(path, JSON.stringify(config, null, 2), { mode: 384 });
    (0, import_node_fs.chmodSync)(path, 384);
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
var renewSingleFlight = createSingleFlight();
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

// dist/hooks/generated/hook-timeouts.js
var SUBAGENT_ROUTE_FRESHNESS_THRESHOLD_MS = 18e5;
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;
var REMOTE_TOOL_CALL_TIMEOUT_MS = 3e4;

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
function debugLog(label, data) {
  if (!DEBUG)
    return;
  const json = JSON.stringify(data, null, 2);
  process.stderr.write(`[gramatr-debug] ${label}:
${json}

`);
}
var requestId = 0;
async function callRemoteResource(uri, sessionContext) {
  const payload = {
    jsonrpc: "2.0",
    id: ++requestId,
    method: "resources/read",
    params: { uri }
  };
  const response = await postToRemote(payload, sessionContext);
  if (!response.ok) {
    throw new Error(`Failed to read remote resource: HTTP ${response.status} ${response.statusText}`);
  }
  const body = await parseSSEResponse(response);
  if (body.error) {
    throw new Error(`Remote resource error: ${body.error.message}`);
  }
  return body.result;
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

// dist/hooks/lib/classification-remote.js
async function fetchRemoteClassificationSnapshot(clientSessionId) {
  if (!clientSessionId)
    return null;
  try {
    const result = await callRemoteResource("gramatr://session/classification", {
      clientSessionId
    });
    const text = result?.contents?.[0]?.text;
    if (typeof text !== "string" || !text)
      return null;
    const parsed = JSON.parse(text);
    const effort = typeof parsed.effort === "string" ? parsed.effort : null;
    const intent = typeof parsed.intent === "string" ? parsed.intent : null;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;
    const createdAt = typeof parsed.created_at === "number" ? parsed.created_at : null;
    return { effort, intent, confidence, created_at: createdAt };
  } catch {
    return null;
  }
}

// dist/hooks/lib/process-pin.js
var import_node_crypto = require("node:crypto");
var import_node_child_process = require("node:child_process");
var import_node_fs2 = require("node:fs");
var import_node_os = require("node:os");
var CLIENT_SESSION_ID_PREFIX = "pin2-";
var CLIENT_SESSION_ID_AGENT_PREFIX = "pin3-";
var SHELL_NAME_RE = /^(sh|bash|zsh|dash|fish|ksh|csh|tcsh|cmd(\.exe)?|powershell(\.exe)?|pwsh(\.exe)?)$/i;
function defaultReadProcStat(pid) {
  return (0, import_node_fs2.readFileSync)(`/proc/${pid}/stat`, "utf8");
}
function defaultReadProcComm(pid) {
  return (0, import_node_fs2.readFileSync)(`/proc/${pid}/comm`, "utf8");
}
function defaultHasProc() {
  return (0, import_node_fs2.existsSync)("/proc/self/stat");
}
function defaultRunPs(args) {
  return (0, import_node_child_process.execFileSync)("ps", args, { encoding: "utf8", timeout: 2e3 });
}
function defaultReadMachineId() {
  return (0, import_node_fs2.readFileSync)("/etc/machine-id", "utf8");
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
    const value = `${prefix}${(0, import_node_crypto.createHash)("sha256").update(raw).digest("hex").slice(0, 32)}`;
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

// dist/hooks/subagent-route.js
function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.resume();
  });
}
var FRESHNESS_THRESHOLD_MS = SUBAGENT_ROUTE_FRESHNESS_THRESHOLD_MS;
var STALE_REMINDER = "[gramatr] No fresh route_request classification found for this sub-agent launch. Call route_request with the sub-task prompt, then pass the Quality Gate scaffold from enrichment.data.reasoning.quality_gate_criteria as the sub-agent's acceptance criteria, and orchestration.agents.agent_defs[0] as the sub-agent's system prompt.";
var FRESH_REMINDER = "[gramatr] Sub-agent launch \u2014 remember to pass the Quality Gate scaffold from enrichment.data.reasoning.quality_gate_criteria as the sub-agent's acceptance criteria, and orchestration.agents.agent_defs[0] as its system prompt.";
function buildOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: "SubagentStart", additionalContext } };
}
async function checkSubagentClassificationFreshness(clientSessionId, nowMs = Date.now()) {
  const record = await fetchRemoteClassificationSnapshot(clientSessionId);
  if (!record || !record.created_at) {
    return { allow: false, reason: STALE_REMINDER };
  }
  const ageMs = nowMs - record.created_at;
  if (ageMs > FRESHNESS_THRESHOLD_MS) {
    return { allow: false, reason: STALE_REMINDER };
  }
  return { allow: true };
}
async function runSubagentRouteHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify({}));
    return 0;
  }
  try {
    const input = JSON.parse(raw);
    const rawSessionId = typeof input.session_id === "string" ? input.session_id : "unknown";
    const agentId = typeof input.agent_id === "string" ? input.agent_id : void 0;
    let stateKey = rawSessionId;
    try {
      stateKey = getProcessPin({ agentId })?.value ?? rawSessionId;
    } catch {
      stateKey = rawSessionId;
    }
    const result = await checkSubagentClassificationFreshness(stateKey);
    const message = result.allow ? FRESH_REMINDER : result.reason ?? STALE_REMINDER;
    process.stdout.write(JSON.stringify(buildOutput(message)));
  } catch {
    process.stdout.write(JSON.stringify({}));
  }
  return 0;
}

// dist/bin/subagent-route.js
if (process.env.GRAMATR_SUBAGENT_ROUTE_NO_AUTOSTART !== "1") {
  runSubagentRouteHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
