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

// dist/bin/verb-whoami.js
var verb_whoami_exports = {};
__export(verb_whoami_exports, {
  runVerbWhoami: () => runVerbWhoami
});
module.exports = __toCommonJS(verb_whoami_exports);

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

// dist/commands/verb-runtime.js
var VERB_FETCH_TIMEOUT_MS = 5e3;
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
async function verbFetch(token, method, path, body, fetchImpl = fetch) {
  const url = `${apiV1Base(token.base_url)}/${path.replace(/^\/+/, "")}`;
  try {
    const res = await fetchImpl(url, {
      method,
      headers: {
        ...bearerHeader(token),
        ...body !== void 0 ? { "Content-Type": "application/json" } : {}
      },
      ...body !== void 0 ? { body: JSON.stringify(body) } : {},
      // AbortSignal.timeout (not a setTimeout-abort callback) — no dangling timer.
      signal: AbortSignal.timeout(VERB_FETCH_TIMEOUT_MS)
    });
    let parsed = null;
    const text = await res.text();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, body: parsed };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message ?? "network error" };
  }
}
function emit(line) {
  process.stdout.write(line.endsWith("\n") ? line : `${line}
`);
}

// dist/bin/verb-whoami.js
async function runVerbWhoami() {
  const projectDir = verbProjectDir();
  const token = await resolveVerbToken(projectDir);
  if (!token) {
    emit(NO_SESSION_NOTE);
    return;
  }
  const me = await verbFetch(token, "GET", "users/me");
  if (!me.ok) {
    emit(`gr\u0101matr whoami: identity lookup failed (${me.error}).`);
    emit("Your session token may have expired \u2014 send a prompt to re-mint, then retry.");
    return;
  }
  const meBody = me.body ?? {};
  const lines = ["gr\u0101matr identity", "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"];
  lines.push(`User ID         ${meBody.user_id ?? "(unknown)"}`);
  if (meBody.actor_role)
    lines.push(`Actor role      ${meBody.actor_role}`);
  if (meBody.entitlement_level)
    lines.push(`Entitlement     ${meBody.entitlement_level}`);
  lines.push(`Active project  ${token.aud}`);
  lines.push(`API host        ${token.base_url}`);
  lines.push(`Session token   present (expires ${token.expires_at})`);
  const memberships = await verbFetch(token, "GET", "users/me/memberships");
  if (memberships.ok) {
    const body = memberships.body ?? {};
    const rows = Array.isArray(body.memberships) ? body.memberships : [];
    if (rows.length > 0) {
      lines.push("", "Memberships");
      for (const r of rows) {
        const scope = r.team_slug ? `team:${r.team_slug}` : r.org_slug ? `org:${r.org_slug}` : "(scope)";
        lines.push(`  ${scope.padEnd(28)} ${r.role ?? ""}`.trimEnd());
      }
    }
  }
  emit(lines.join("\n"));
}
if (process.argv[1] && /verb-whoami(\.js|\.ts)?$/.test(process.argv[1])) {
  runVerbWhoami().catch(() => {
    emit("gr\u0101matr whoami: unexpected error resolving identity.");
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runVerbWhoami
});
