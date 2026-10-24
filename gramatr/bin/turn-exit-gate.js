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

// dist/bin/turn-exit-gate.js
var turn_exit_gate_exports = {};
__export(turn_exit_gate_exports, {
  runTurnExitGateHook: () => runTurnExitGateHook
});
module.exports = __toCommonJS(turn_exit_gate_exports);

// dist/hooks/lib/packet-cache.js
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");

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

// dist/hooks/lib/hook-state.js
var import_node_path = require("node:path");
function getGramatrStateDir() {
  const dir = getGramatrDirFromEnv() || (0, import_node_path.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path.join)(dir, ".state");
}

// dist/hooks/lib/project-state.js
function activeSessionKeyFileName(clientSessionId, ext = "json") {
  const safe = clientSessionId.replace(/[^A-Za-z0-9._-]/g, "");
  if (!safe || safe === "." || safe === "..")
    return null;
  return `${safe}.${ext}`;
}

// dist/hooks/lib/packet-cache.js
var PACKET_SUBDIR = "packets";
function packetCacheKeyPath(sessionId) {
  const name = activeSessionKeyFileName(sessionId);
  if (!name)
    return null;
  return (0, import_node_path2.join)(getGramatrStateDir(), PACKET_SUBDIR, name);
}
function getLatestPacketForSession(sessionId) {
  const path = packetCacheKeyPath(sessionId);
  if (!path)
    return null;
  try {
    const raw = (0, import_node_fs.readFileSync)(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// dist/server/auth.js
var import_node_fs2 = require("node:fs");
var import_node_path3 = require("node:path");

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
    return (0, import_node_path3.join)((0, import_node_path3.dirname)(gramatrDir), ".gramatr.json");
  }
  return (0, import_node_path3.join)(getHomeDir(), ".gramatr.json");
}
function readConfig() {
  try {
    const raw = (0, import_node_fs2.readFileSync)(getConfigPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeConfig(config) {
  try {
    const path = getConfigPath();
    (0, import_node_fs2.writeFileSync)(path, JSON.stringify(config, null, 2), { mode: 384 });
    (0, import_node_fs2.chmodSync)(path, 384);
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

// dist/hooks/lib/packet-remote.js
async function fetchRemotePacketSnapshot(clientSessionId) {
  if (!clientSessionId)
    return null;
  try {
    const result = await callRemoteResource("gramatr://session/packet", {
      clientSessionId
    });
    const text = result?.contents?.[0]?.text;
    if (typeof text !== "string" || !text)
      return null;
    const parsed = JSON.parse(text);
    const effort = typeof parsed.effort === "string" ? parsed.effort : null;
    const intent = typeof parsed.intent === "string" ? parsed.intent : null;
    const createdAt = typeof parsed.created_at === "number" ? parsed.created_at : null;
    const rawRequiredActions = Array.isArray(parsed.required_actions) ? parsed.required_actions : [];
    const requiredActions = rawRequiredActions.map((r) => r && typeof r === "object" ? r : null).filter((r) => r !== null);
    return { effort, intent, required_actions: requiredActions, created_at: createdAt };
  } catch {
    return null;
  }
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

// dist/hooks/lib/turn-exit-verifier.js
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");

// dist/hooks/lib/required-actions.js
function readRequiredActions(payload) {
  try {
    const parsed = JSON.parse(payload);
    const unified = parsed.unified_packet;
    const directives = parsed.directives ?? unified?.directives;
    const raw = directives?.required_actions;
    if (!Array.isArray(raw))
      return [];
    return raw.map((r) => r && typeof r === "object" ? r : null).filter((r) => r !== null);
  } catch {
    return [];
  }
}
function isResourceAction(action) {
  return action.kind === "resource" || Boolean(action.uri) && !action.name && !action.call && !action.tool;
}
function requiredActionIdentifier(action) {
  if (isResourceAction(action))
    return action.uri ?? null;
  return action.name ?? action.call ?? action.tool ?? null;
}

// dist/hooks/lib/transcript-parser.js
var import_node_fs3 = require("node:fs");
function isGenuineUserTurnBoundary(entry) {
  if (entry.type !== "user" && entry.type !== "human")
    return false;
  const content = entry.message?.content;
  if (typeof content === "string")
    return true;
  if (!Array.isArray(content))
    return true;
  return !content.every((block) => block?.type === "tool_result");
}
function extractLastTurnToolCalls(transcriptPath) {
  const out = /* @__PURE__ */ new Set();
  try {
    const content = (0, import_node_fs3.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (isGenuineUserTurnBoundary(entry))
          break;
        if (entry.type !== "assistant")
          continue;
        const blocks = entry.message?.content;
        if (!Array.isArray(blocks))
          continue;
        for (const block of blocks) {
          if (block?.type === "tool_use" && typeof block?.name === "string") {
            out.add(block.name);
          }
        }
      } catch {
      }
    }
  } catch {
  }
  return out;
}
function extractLastTurnReadResourceUris(transcriptPath) {
  const out = /* @__PURE__ */ new Set();
  try {
    const content = (0, import_node_fs3.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (isGenuineUserTurnBoundary(entry))
          break;
        if (entry.type !== "assistant")
          continue;
        const blocks = entry.message?.content;
        if (!Array.isArray(blocks))
          continue;
        for (const block of blocks) {
          if (block?.type === "tool_use" && (block?.name === "ReadMcpResourceTool" || block?.name === "ReadMcpResource") && typeof block?.input?.uri === "string") {
            out.add(block.input.uri);
          }
        }
      } catch {
      }
    }
  } catch {
  }
  return out;
}
var ISC_SUBJECT_PATTERN = /^\s*ISC-[CA]\d+\s*:/i;
var CLOSED_STATUSES = /* @__PURE__ */ new Set(["completed", "done"]);
function extractIscTaskLifecycle(transcriptPath) {
  const createdIscSubjects = [];
  let closedAny = false;
  try {
    const content = (0, import_node_fs3.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (isGenuineUserTurnBoundary(entry))
          break;
        if (entry.type !== "assistant")
          continue;
        const blocks = entry.message?.content;
        if (!Array.isArray(blocks))
          continue;
        for (const block of blocks) {
          if (block?.type !== "tool_use" || typeof block?.name !== "string")
            continue;
          const short = block.name.split("__").pop();
          const inputObj = block.input ?? {};
          if (short === "TaskCreate") {
            const subject = inputObj.subject;
            if (typeof subject === "string" && ISC_SUBJECT_PATTERN.test(subject)) {
              createdIscSubjects.push(subject.trim());
            }
          } else if (short === "TaskUpdate") {
            const status = inputObj.status;
            if (typeof status === "string" && CLOSED_STATUSES.has(status.toLowerCase())) {
              closedAny = true;
            }
          }
        }
      } catch {
      }
    }
  } catch {
  }
  return { createdIscSubjects, closedAny };
}

// dist/hooks/lib/turn-exit-verifier.js
var MAX_BLOCKS_PER_TURN = 2;
var HARD_GATE_EFFORT_LEVELS = /* @__PURE__ */ new Set([
  "standard",
  "extended",
  "deep",
  "comprehensive"
]);
var BLOCKABLE_GATES = [
  {
    id: "classification_feedback",
    tool: "classification_feedback",
    remediation: "Call mcp__plugin_gramatr_gramatr__classification_feedback with the original prompt verbatim (was_correct + original_prompt at minimum), then finish.",
    appliesTo: (effort) => effort !== null && HARD_GATE_EFFORT_LEVELS.has(effort)
  },
  {
    id: "save_reflection",
    tool: "save_reflection",
    remediation: "Call mcp__plugin_gramatr_gramatr__save_reflection with the Q1/Q2/Q3 LEARN-phase reflection, then finish.",
    appliesTo: (effort) => effort !== null && HARD_GATE_EFFORT_LEVELS.has(effort)
  }
];
var ISC_CLOSURE_GATE_ID = "isc_task_closure";
function iscClosureRemediation(subjects) {
  const preview = subjects.slice(0, 3).map((s) => `"${s}"`).join(", ");
  const more = subjects.length > 3 ? ` (+${subjects.length - 3} more)` : "";
  return `You created ${subjects.length} ISC task(s) this turn \u2014 e.g. ${preview}${more} \u2014 but closed none of them. Call TaskUpdate with status "completed" for each ISC task whose work has demonstrably landed (every linked Quality Gate criterion adjudicated), then finish. Leaving created ISC tasks open is rubber-stamping by omission \u2014 creation is enforced, so is completion.`;
}
function evaluateIscClosureGate(lifecycle) {
  if (!lifecycle || lifecycle.createdIscSubjects.length === 0)
    return null;
  if (lifecycle.closedAny)
    return null;
  return {
    id: ISC_CLOSURE_GATE_ID,
    remediation: iscClosureRemediation(lifecycle.createdIscSubjects)
  };
}
var REQUIRED_ACTIONS_GATE_ID = "required_actions";
function requiredActionsRemediation(missed) {
  const lines = missed.map((m) => {
    const phaseSuffix = m.phase ? ` (${m.phase} phase)` : "";
    return m.kind === "resource" ? `  \u2022 fetch the resource ${m.identifier} via ReadMcpResourceTool${phaseSuffix}` : `  \u2022 call the tool ${m.identifier}${phaseSuffix}`;
  });
  return `This turn's packet declared ${missed.length} required_actions that never happened:
` + lines.join("\n");
}
function evaluateRequiredActionsGate(opts) {
  const required = opts.requiredActions ?? [];
  if (required.length === 0)
    return null;
  const missed = [];
  for (const action of required) {
    if (action.optional === true)
      continue;
    const identifier = requiredActionIdentifier(action);
    if (!identifier)
      continue;
    const isResource = isResourceAction(action);
    const satisfied = isResource ? opts.fetchedResourceUris.has(identifier) : opts.calledTools.has(identifier);
    if (!satisfied) {
      missed.push({ identifier, kind: isResource ? "resource" : "tool", phase: action.phase ?? null });
    }
  }
  if (missed.length === 0)
    return null;
  return {
    id: REQUIRED_ACTIONS_GATE_ID,
    remediation: requiredActionsRemediation(missed)
  };
}
function isVerifierEnabled(env = process.env) {
  const v = env.GRAMATR_TURN_EXIT_VERIFIER;
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}
var ALL_GATE_IDS = [
  ...BLOCKABLE_GATES.map((g) => g.id),
  ISC_CLOSURE_GATE_ID,
  REQUIRED_ACTIONS_GATE_ID
];
function isRequiredActionsGateEnabled(env = process.env) {
  const v = env.GRAMATR_REQUIRED_ACTIONS_GATE;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
function normaliseCalledTools(called) {
  const out = /* @__PURE__ */ new Set();
  for (const name of called) {
    out.add(name);
    const parts = name.split("__");
    out.add(parts[parts.length - 1] ?? name);
  }
  return out;
}
function capStashDir() {
  return (0, import_node_path4.join)(getGramatrStateDir(), "turn-exit-gates");
}
function capStashPath(sessionId) {
  const safe = sessionId.replace(/[^A-Za-z0-9_-]/g, "_");
  return (0, import_node_path4.join)(capStashDir(), `${safe}.json`);
}
function readCapStash(sessionId) {
  try {
    const path = capStashPath(sessionId);
    if (!(0, import_node_fs4.existsSync)(path))
      return null;
    const parsed = JSON.parse((0, import_node_fs4.readFileSync)(path, "utf8"));
    if (typeof parsed?.block_count !== "number")
      return null;
    return parsed;
  } catch {
    return null;
  }
}
function writeCapStash(stash) {
  try {
    const dir = capStashDir();
    if (!(0, import_node_fs4.existsSync)(dir))
      (0, import_node_fs4.mkdirSync)(dir, { recursive: true });
    (0, import_node_fs4.writeFileSync)(capStashPath(stash.session_id), JSON.stringify(stash, null, 2));
  } catch {
  }
}
function deriveTurnKey(transcriptPath) {
  try {
    const content = (0, import_node_fs4.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (isGenuineUserTurnBoundary(entry)) {
          return `u${i}`;
        }
      } catch {
      }
    }
    return `n${lines.length}`;
  } catch {
    return "unknown";
  }
}
function verifyTurnGates(opts) {
  const allow = (extra) => ({
    block: false,
    stderr: "",
    unmetGates: [],
    capReached: false,
    blockCount: 0,
    ...extra
  });
  try {
    const called = normaliseCalledTools(opts.calledTools);
    const gateFilter = opts.gateIds ? new Set(opts.gateIds) : null;
    const unmet = BLOCKABLE_GATES.filter((gate) => (!gateFilter || gateFilter.has(gate.id)) && gate.appliesTo(opts.effort) && !called.has(gate.tool)).map((g) => ({ id: g.id, remediation: g.remediation }));
    if (!gateFilter || gateFilter.has(ISC_CLOSURE_GATE_ID)) {
      const iscUnmet = evaluateIscClosureGate(opts.iscLifecycle);
      if (iscUnmet)
        unmet.push(iscUnmet);
    }
    if (!gateFilter || gateFilter.has(REQUIRED_ACTIONS_GATE_ID)) {
      const raUnmet = evaluateRequiredActionsGate({
        requiredActions: opts.requiredActions,
        calledTools: called,
        fetchedResourceUris: opts.fetchedResourceUris ?? /* @__PURE__ */ new Set()
      });
      if (raUnmet)
        unmet.push(raUnmet);
    }
    if (unmet.length === 0) {
      return allow();
    }
    const prior = readCapStash(opts.sessionId);
    const sameTurn = prior !== null && prior.turn_key === opts.turnKey;
    const priorCount = sameTurn ? prior.block_count : 0;
    if (priorCount >= MAX_BLOCKS_PER_TURN) {
      return allow({
        unmetGates: unmet.map((g) => g.id),
        capReached: true,
        blockCount: priorCount
      });
    }
    const newCount = priorCount + 1;
    writeCapStash({
      session_id: opts.sessionId,
      turn_key: opts.turnKey,
      block_count: newCount,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    const lines = unmet.map((g) => `  \u2022 HARD gate unmet: ${g.id} not satisfied this turn.
    \u2192 ${g.remediation}`);
    const stderr = `gr\u0101matr turn-exit verifier \u2014 ${unmet.length} HARD gate(s) unmet (block ${newCount}/${MAX_BLOCKS_PER_TURN}). You may not finish yet:
` + lines.join("\n") + `

Complete the action(s) above, then stop.`;
    return {
      block: true,
      stderr,
      unmetGates: unmet.map((g) => g.id),
      capReached: false,
      blockCount: newCount
    };
  } catch {
    return allow();
  }
}
function runTurnExitVerifier(opts) {
  try {
    const calledTools = extractLastTurnToolCalls(opts.transcriptPath);
    const turnKey = deriveTurnKey(opts.transcriptPath);
    const iscLifecycle = extractIscTaskLifecycle(opts.transcriptPath);
    const fetchedResourceUris = extractLastTurnReadResourceUris(opts.transcriptPath);
    return verifyTurnGates({
      effort: opts.effort,
      calledTools,
      sessionId: opts.sessionId,
      turnKey,
      iscLifecycle,
      requiredActions: opts.requiredActions,
      fetchedResourceUris,
      gateIds: opts.gateIds
    });
  } catch {
    return {
      block: false,
      stderr: "",
      unmetGates: [],
      capReached: false,
      blockCount: 0
    };
  }
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

// dist/hooks/lib/process-pin.js
var import_node_crypto = require("node:crypto");
var import_node_child_process = require("node:child_process");
var import_node_fs5 = require("node:fs");
var import_node_os = require("node:os");
var CLIENT_SESSION_ID_PREFIX = "pin2-";
var CLIENT_SESSION_ID_AGENT_PREFIX = "pin3-";
var SHELL_NAME_RE = /^(sh|bash|zsh|dash|fish|ksh|csh|tcsh|cmd(\.exe)?|powershell(\.exe)?|pwsh(\.exe)?)$/i;
function defaultReadProcStat(pid) {
  return (0, import_node_fs5.readFileSync)(`/proc/${pid}/stat`, "utf8");
}
function defaultReadProcComm(pid) {
  return (0, import_node_fs5.readFileSync)(`/proc/${pid}/comm`, "utf8");
}
function defaultHasProc() {
  return (0, import_node_fs5.existsSync)("/proc/self/stat");
}
function defaultRunPs(args) {
  return (0, import_node_child_process.execFileSync)("ps", args, { encoding: "utf8", timeout: 2e3 });
}
function defaultReadMachineId() {
  return (0, import_node_fs5.readFileSync)("/etc/machine-id", "utf8");
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

// dist/bin/turn-exit-gate.js
async function runTurnExitGateHook(input) {
  if (input.stop_hook_active === true) {
    return { block: false, stderr: "" };
  }
  const sessionId = typeof input.session_id === "string" ? input.session_id : null;
  const transcriptPath = typeof input.transcript_path === "string" ? input.transcript_path : null;
  if (!sessionId || !transcriptPath || !isVerifierEnabled()) {
    return { block: false, stderr: "" };
  }
  try {
    const agentId = typeof input.agent_id === "string" ? input.agent_id : void 0;
    let stateKey = sessionId;
    try {
      stateKey = getProcessPin({ agentId })?.value ?? sessionId;
    } catch {
      stateKey = sessionId;
    }
    const effort = (await fetchRemoteClassificationSnapshot(stateKey))?.effort ?? null;
    const remote = await fetchRemotePacketSnapshot(stateKey);
    let requiredActions;
    if (remote && (remote.effort !== null || remote.intent !== null || remote.required_actions.length > 0)) {
      requiredActions = remote.required_actions;
    } else {
      const packet = getLatestPacketForSession(stateKey);
      requiredActions = packet ? readRequiredActions(packet.payload) : null;
    }
    const verdict = runTurnExitVerifier({
      effort,
      transcriptPath,
      sessionId: stateKey,
      requiredActions,
      // #4839-followup-2 — dark-launch: ups-route.ts just started actually
      // writing packets (savePacket() previously had zero production
      // callers, making this gate a structural no-op since it was built).
      // Exclude required_actions from the evaluated set by default so it
      // can't block anyone's Stop on its very first exposure to real
      // required_actions payloads — every OTHER gate still runs with no
      // filter, exactly as before. Set GRAMATR_REQUIRED_ACTIONS_GATE=1 once
      // real payloads have been observed via the now-populated packet-cache
      // store (hooks/lib/packet-cache.ts, #6979 final unit) to let this gate
      // actually block. The key itself is OMITTED
      // (not set to `gateIds: undefined`) when the flag is on, so this
      // matches #6973's original "no gateIds filter" shape exactly rather
      // than an object carrying an explicit-undefined key.
      ...isRequiredActionsGateEnabled() ? {} : { gateIds: ALL_GATE_IDS.filter((id) => id !== REQUIRED_ACTIONS_GATE_ID) }
    });
    if (verdict.block && verdict.stderr) {
      return { block: true, stderr: verdict.stderr };
    }
    if (verdict.capReached) {
      process.stderr.write("[gramatr] turn-exit gate \u2014 remediation cap reached; allowing stop with the gate(s) unmet\n");
    }
    return { block: false, stderr: "" };
  } catch {
    return { block: false, stderr: "" };
  }
}
async function main() {
  const input = await readHookStdin();
  const result = await runTurnExitGateHook(input);
  if (result.block) {
    process.stderr.write(result.stderr + "\n");
    process.exit(2);
  }
  process.stdout.write("{}");
}
if (process.env.GRAMATR_TURN_EXIT_GATE_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runTurnExitGateHook
});
