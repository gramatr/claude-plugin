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

// dist/bin/track-tokens.js
var track_tokens_exports = {};
__export(track_tokens_exports, {
  extractCtxTokensUsed: () => extractCtxTokensUsed,
  runTrackTokens: () => runTrackTokens,
  totalContextTokens: () => totalContextTokens,
  writeCtxTokens: () => writeCtxTokens
});
module.exports = __toCommonJS(track_tokens_exports);
var import_node_fs2 = require("node:fs");
var import_node_path3 = require("node:path");

// dist/hooks/lib/project-state.js
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

// dist/hooks/lib/context-usage.js
var import_node_path2 = require("node:path");
function ctxTokensFileName(sessionId) {
  if (typeof sessionId !== "string")
    return null;
  const safe = sessionId.replace(/[^A-Za-z0-9._-]/g, "");
  if (!safe || safe === "." || safe === "..")
    return null;
  return `ctx-tokens-${safe}.json`;
}
function ctxTokensPath(projectDir, sessionId) {
  const name = ctxTokensFileName(sessionId);
  if (!name)
    return null;
  return (0, import_node_path2.join)(projectDir, ".gramatr", name);
}

// dist/bin/track-tokens.js
var PROJECT_DIR = findProjectRoot();
function numOrZero(n) {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}
function totalContextTokens(usage) {
  if (!usage)
    return 0;
  return numOrZero(usage.input_tokens) + numOrZero(usage.cache_read_input_tokens) + numOrZero(usage.cache_creation_input_tokens);
}
function extractCtxTokensUsed(transcriptPath) {
  let lastCtxTokens = null;
  const content = (0, import_node_fs2.readFileSync)(transcriptPath, "utf8");
  const lines = content.trim().split("\n");
  for (const line of lines) {
    if (!line.trim())
      continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type === "assistant") {
        const total = totalContextTokens(entry.message?.usage);
        if (total > 0)
          lastCtxTokens = total;
      }
    } catch {
    }
  }
  return lastCtxTokens;
}
function writeCtxTokens(projectDir, sessionId, ctxTokensUsed) {
  const outDir = (0, import_node_path3.join)(projectDir, ".gramatr");
  (0, import_node_fs2.mkdirSync)(outDir, { recursive: true });
  const ctxPath = ctxTokensPath(projectDir, sessionId);
  if (ctxPath) {
    (0, import_node_fs2.writeFileSync)(ctxPath, JSON.stringify({ ctx_tokens_used: ctxTokensUsed, updated_at: (/* @__PURE__ */ new Date()).toISOString() }) + "\n", "utf8");
  }
  (0, import_node_fs2.writeFileSync)((0, import_node_path3.join)(outDir, "reflection-due.json"), JSON.stringify({ written_at: (/* @__PURE__ */ new Date()).toISOString() }) + "\n", "utf8");
}
async function runTrackTokens(transcriptPath, projectDir, sessionId) {
  if (!transcriptPath)
    return;
  try {
    const ctxTokensUsed = extractCtxTokensUsed(transcriptPath);
    if (ctxTokensUsed !== null) {
      writeCtxTokens(projectDir, sessionId, ctxTokensUsed);
    }
  } catch {
  }
}
async function main() {
  let transcriptPath = null;
  let sessionId = null;
  try {
    const input = await readHookStdin();
    transcriptPath = input.transcript_path ?? null;
    sessionId = typeof input.session_id === "string" && input.session_id ? input.session_id : null;
  } catch {
    process.stdout.write("{}");
    return;
  }
  await runTrackTokens(transcriptPath, PROJECT_DIR, sessionId);
  process.stdout.write("{}");
}
if (process.env.GRAMATR_TRACK_TOKENS_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractCtxTokensUsed,
  runTrackTokens,
  totalContextTokens,
  writeCtxTokens
});
