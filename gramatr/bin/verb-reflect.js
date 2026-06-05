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

// dist/bin/verb-reflect.js
var verb_reflect_exports = {};
__export(verb_reflect_exports, {
  runVerbReflect: () => runVerbReflect
});
module.exports = __toCommonJS(verb_reflect_exports);

// dist/hooks/lib/project-state.js
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
  return process.cwd();
}

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

// dist/commands/verb-runtime.js
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
