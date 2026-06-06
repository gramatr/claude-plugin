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

// dist/bin/session-end-seal.js
var session_end_seal_exports = {};
__export(session_end_seal_exports, {
  main: () => main,
  runSessionEndSeal: () => runSessionEndSeal,
  sealHandoff: () => sealHandoff
});
module.exports = __toCommonJS(session_end_seal_exports);

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

// dist/hooks/lib/turn-buffer.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var GRAMATR_DIR2 = ".gramatr";
var TURNS_FILE = "pending-turns.json";
function getTurnBufferPath(projectDir) {
  return (0, import_node_path2.join)(projectDir, GRAMATR_DIR2, TURNS_FILE);
}
function readBufferedTurns(projectDir) {
  const dest = getTurnBufferPath(projectDir);
  try {
    if (!(0, import_node_fs2.existsSync)(dest))
      return [];
    const parsed = JSON.parse((0, import_node_fs2.readFileSync)(dest, "utf8"));
    if (!Array.isArray(parsed))
      return [];
    return parsed.filter((t) => t != null && typeof t === "object" && typeof t.prompt === "string");
  } catch {
    return [];
  }
}
function clearBufferedTurns(projectDir) {
  try {
    (0, import_node_fs2.rmSync)(getTurnBufferPath(projectDir), { force: true });
  } catch {
  }
}

// dist/bin/session-end-seal.js
var SEAL_TIMEOUT_MS = 8e3;
function resolveProjectDir() {
  return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
}
async function sealHandoff(projectDir, input, fetchImpl = fetch) {
  const token = await resolveUsableSessionToken(projectDir, fetchImpl);
  if (!token)
    return { status: "no_token" };
  const turns = readBufferedTurns(projectDir);
  const url = `${apiV1Base(token.base_url)}/auto-save-handoff`;
  const body = JSON.stringify({
    client_type: "claude-code",
    ...input.reason ? { reason: input.reason } : {},
    ...turns.length > 0 ? { turns } : {}
  });
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...bearerHeader(token)
      },
      body,
      signal: AbortSignal.timeout(SEAL_TIMEOUT_MS)
    });
    return res.ok ? { status: "sealed" } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
async function runSessionEndSeal(input, fetchImpl = fetch, projectDir = resolveProjectDir(), onStep) {
  const outcome = await sealHandoff(projectDir, input, fetchImpl);
  onStep?.("seal");
  if (outcome.status === "sealed") {
    deleteSessionToken(projectDir);
    clearBufferedTurns(projectDir);
    onStep?.("revoke");
  } else if (outcome.status === "no_token") {
  }
  return outcome;
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
  await runSessionEndSeal(input);
  process.stdout.write("{}");
}
if (process.env.GRAMATR_SESSION_END_SEAL_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main,
  runSessionEndSeal,
  sealHandoff
});
