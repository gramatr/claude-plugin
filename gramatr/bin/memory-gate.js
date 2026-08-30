#!/usr/bin/env node
"use strict";

// dist/hooks/generated/hook-timeouts.js
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;

// dist/user-config.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

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

// dist/user-config.js
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
function readMemoryGateDisabled() {
  const cfg = readGramatrJson();
  return cfg.memoryGate?.disabled === true;
}

// dist/hooks/memory-gate.js
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
var ALLOW_OUTPUT = {
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" }
};
var DENY_REASON = "gr\u0101matr memory-gate: local Claude Code memory files (~/.claude/projects/*/memory/*.md, including MEMORY.md) are session/machine-local and not durable the way gr\u0101matr's memory is \u2014 they don't persist across sessions, machines, or team members the way the gr\u0101matr knowledge graph does. Writes to them are not allowed in a gr\u0101matr session. Use mcp__gramatr__create_entity to record a new memory, or mcp__gramatr__add_observation to append to an existing one.";
function denyOutput(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  };
}
function isAutoMemoryPath(filePath) {
  if (!filePath)
    return false;
  const normalized = filePath.replace(/\\/g, "/");
  return /(^|\/)\.claude\/projects\/[^/]+\/memory\/.+\.md$/i.test(normalized);
}
async function runMemoryGateHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify(ALLOW_OUTPUT));
    return 0;
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify(ALLOW_OUTPUT));
    return 0;
  }
  const toolName = input.tool_name;
  if (toolName !== "Write" && toolName !== "Edit") {
    process.stdout.write(JSON.stringify(ALLOW_OUTPUT));
    return 0;
  }
  const filePath = input.tool_input?.file_path || input.tool_input?.path || "";
  if (isAutoMemoryPath(filePath)) {
    if (readMemoryGateDisabled()) {
      process.stdout.write(JSON.stringify(ALLOW_OUTPUT));
      return 0;
    }
    process.stdout.write(JSON.stringify(denyOutput(DENY_REASON)));
    return 0;
  }
  process.stdout.write(JSON.stringify(ALLOW_OUTPUT));
  return 0;
}

// dist/bin/memory-gate.js
if (process.env.GRAMATR_MEMORY_GATE_NO_AUTOSTART !== "1") {
  runMemoryGateHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
