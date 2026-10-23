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
var import_node_fs3 = require("node:fs");
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
  const content = (0, import_node_fs3.readFileSync)(transcriptPath, "utf8");
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
function writeCtxTokens(projectDir, sessionId, ctxTokensUsed, agentId) {
  const outDir = (0, import_node_path3.join)(projectDir, ".gramatr");
  (0, import_node_fs3.mkdirSync)(outDir, { recursive: true });
  let stateKey = sessionId;
  try {
    stateKey = getProcessPin({ agentId })?.value ?? sessionId;
  } catch {
    stateKey = sessionId;
  }
  const ctxPath = ctxTokensPath(projectDir, stateKey);
  if (ctxPath) {
    (0, import_node_fs3.writeFileSync)(ctxPath, JSON.stringify({ ctx_tokens_used: ctxTokensUsed, updated_at: (/* @__PURE__ */ new Date()).toISOString() }) + "\n", "utf8");
  }
}
async function runTrackTokens(transcriptPath, projectDir, sessionId, agentId) {
  if (!transcriptPath)
    return;
  try {
    const ctxTokensUsed = extractCtxTokensUsed(transcriptPath);
    if (ctxTokensUsed !== null) {
      writeCtxTokens(projectDir, sessionId, ctxTokensUsed, agentId);
    }
  } catch {
  }
}
async function main() {
  let transcriptPath = null;
  let sessionId = null;
  let agentId;
  try {
    const input = await readHookStdin();
    transcriptPath = input.transcript_path ?? null;
    sessionId = typeof input.session_id === "string" && input.session_id ? input.session_id : null;
    agentId = typeof input.agent_id === "string" ? input.agent_id : void 0;
  } catch {
    process.stdout.write("{}");
    return;
  }
  await runTrackTokens(transcriptPath, PROJECT_DIR, sessionId, agentId);
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
