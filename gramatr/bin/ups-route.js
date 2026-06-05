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

// dist/bin/ups-route.js
var ups_route_exports = {};
__export(ups_route_exports, {
  computeUpsRoute: () => computeUpsRoute,
  main: () => main
});
module.exports = __toCommonJS(ups_route_exports);

// dist/hooks/lib/session-rest-token.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var GRAMATR_DIR = ".gramatr";
var SESSION_FILE = ".session";
var SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
var RENEW_TIMEOUT_MS = 3e3;
function getSessionTokenPath(projectDir) {
  return (0, import_node_path.join)(projectDir, GRAMATR_DIR, SESSION_FILE);
}
function normalizeRestTokenBlock(block) {
  if (!block || typeof block !== "object")
    return null;
  const { token, expires_at, base_url, aud } = block;
  if (typeof token === "string" && token.length > 0 && typeof expires_at === "string" && expires_at.length > 0 && typeof base_url === "string" && base_url.length > 0 && typeof aud === "string" && aud.length > 0) {
    return { token, expires_at, base_url, aud };
  }
  return null;
}
function writeSessionToken(projectDir, file) {
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  if (!(0, import_node_fs.existsSync)(dir)) {
    (0, import_node_fs.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const dest = getSessionTokenPath(projectDir);
  const tmp = `${dest}.tmp.${process.pid}`;
  (0, import_node_fs.writeFileSync)(tmp, JSON.stringify(file, null, 2) + "\n", { encoding: "utf8", mode: 384 });
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
    // The renew response carries only token + expires_at; the audience and host
    // are unchanged, so we preserve them from the presenting file.
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
  if (isSessionTokenValid(file, now))
    return file;
  const outcome = await renewSessionToken(projectDir, file, fetchImpl);
  if (outcome.status === "renewed")
    return outcome.file;
  if (outcome.status === "denied")
    return null;
  return file;
}

// dist/hooks/lib/hook-promotion-telemetry.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

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

// dist/hooks/lib/hook-promotion-telemetry.js
var MAX_SAMPLES = 200;
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
  return (0, import_node_path2.join)(home, ".gramatr", "debug");
}
function appendHookPromotionSample(sample) {
  try {
    const dir = debugDir();
    if (!(0, import_node_fs2.existsSync)(dir))
      (0, import_node_fs2.mkdirSync)(dir, { recursive: true });
    const jsonlPath = (0, import_node_path2.join)(dir, "hook-promotion.jsonl");
    const lastPath = (0, import_node_path2.join)(dir, "last-sample.json");
    const line = JSON.stringify(sample);
    let existing = [];
    if ((0, import_node_fs2.existsSync)(jsonlPath)) {
      existing = (0, import_node_fs2.readFileSync)(jsonlPath, "utf8").split("\n").filter((l) => l.trim().length > 0);
    }
    existing.push(line);
    if (existing.length > MAX_SAMPLES) {
      existing = existing.slice(existing.length - MAX_SAMPLES);
    }
    (0, import_node_fs2.writeFileSync)(jsonlPath, existing.join("\n") + "\n", "utf8");
    (0, import_node_fs2.writeFileSync)(lastPath, JSON.stringify(sample, null, 2), "utf8");
  } catch {
  }
}

// dist/hooks/lib/version.js
var import_fs = require("fs");
var import_path = require("path");
var import_url = require("url");
var import_meta = {};
function findPackageJson(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = (0, import_path.join)(dir, "package.json");
    if ((0, import_fs.existsSync)(candidate))
      return candidate;
    const parent = (0, import_path.dirname)(dir);
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
    const here = (0, import_path.dirname)((0, import_url.fileURLToPath)(import_meta.url));
    const pkgPath = findPackageJson(here);
    if (!pkgPath)
      return "0.0.0";
    const pkg = JSON.parse((0, import_fs.readFileSync)(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
var VERSION = resolveVersion();

// dist/bin/ups-route.js
var ROUTE_TIMEOUT_MS = 8e3;
function resolveProjectDir() {
  return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
}
async function computeUpsRoute(input, fetchImpl = fetch, projectDir = resolveProjectDir()) {
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (!prompt)
    return {};
  const token = await resolveUsableSessionToken(projectDir, fetchImpl);
  if (!token)
    return {};
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
  main
});
