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

// dist/bin/setup.js
var setup_exports = {};
__export(setup_exports, {
  mergeCursorHooksFile: () => mergeCursorHooksFile,
  runSetup: () => runSetup
});
module.exports = __toCommonJS(setup_exports);
var import_node_fs = require("node:fs");
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

// dist/hooks/lib/resolve-running-script-dir.js
var import_node_path = require("node:path");
var import_node_url = require("node:url");
function resolveRunningScriptDir(argv1, importMetaUrl) {
  if (argv1)
    return (0, import_node_path.dirname)(argv1);
  if (importMetaUrl) {
    try {
      return (0, import_node_path.dirname)((0, import_node_url.fileURLToPath)(importMetaUrl));
    } catch {
      return null;
    }
  }
  return null;
}

// dist/setup/generated/platform-hooks.js
var CLAUDE_ADDON_HOOKS = {
  "name": "claude-addon",
  "display_name": "gramatr for Claude",
  "description": "Claude.ai official MCP add-on \u2014 Anthropic partner program, sandbox environment",
  "client_flag": "none",
  "config_file": "none",
  "hooks": {
    "UserPromptSubmit": [
      {
        "hook": "user-prompt-submit",
        "statusMessage": "Routing through gramatr intelligence layer",
        "timeout": 10
      }
    ],
    "SessionStart": [
      {
        "hook": "session-start",
        "statusMessage": "Loading gramatr session context",
        "timeout": 10
      }
    ],
    "SessionEnd": [
      {
        "hook": "session-end",
        "statusMessage": "Saving gramatr session",
        "timeout": 10
      }
    ],
    "Stop": [
      {
        "hook": "stop",
        "statusMessage": "Submitting gramatr classification feedback",
        "timeout": 8
      }
    ]
  },
  "mcp_server": {
    "command": "npx",
    "args": [
      "@gramatr/mcp"
    ],
    "env": {
      "GRAMATR_DIR": "~/.gramatr",
      "GRAMATR_LOCAL_ONLY": "1"
    }
  },
  "instruction_blocks": [
    "CONTRACT_RULES",
    "MEMORY_RULES",
    "ENTITY_TYPES",
    "REQUIRED_FIELDS",
    "FEEDBACK_RULES",
    "SUBAGENT_RULES",
    "EFFORT_PHASES",
    "QUALITY_GATE_REQUIREMENT",
    "CLASSIFICATION_SUMMARY",
    "IDENTITY",
    "DEGRADED_MODE"
  ]
};

// dist/setup/integrations.js
function platformToHookSpecs(platform) {
  const specs = [];
  const clientFlag = platform.client_flag !== "none" ? platform.client_flag : void 0;
  for (const [event, entries] of Object.entries(platform.hooks)) {
    for (const entry of entries) {
      const spec = {
        event,
        mcpHookName: entry.hook,
        hookArgs: clientFlag ? [clientFlag] : void 0
      };
      if (entry.matcher)
        spec.matcher = entry.matcher;
      if (entry.statusMessage)
        spec.statusMessage = entry.statusMessage;
      if (entry.timeout)
        spec.timeout = entry.timeout;
      specs.push(spec);
    }
  }
  return specs;
}
var CLAUDE_ADDON_HOOKS2 = platformToHookSpecs(CLAUDE_ADDON_HOOKS);
function ensureCodexHooksFeature(configToml) {
  const text = configToml.replace(/\r\n/g, "\n").trimEnd();
  if (!text) {
    return "[features]\nhooks = true\n";
  }
  const lines = text.split("\n");
  const featuresStart = lines.findIndex((line) => /^\s*\[features\]\s*$/.test(line));
  if (featuresStart === -1) {
    return `${text}

[features]
hooks = true
`;
  }
  let featuresEnd = lines.length;
  for (let i = featuresStart + 1; i < lines.length; i += 1) {
    if (/^\s*\[.*\]\s*$/.test(lines[i])) {
      featuresEnd = i;
      break;
    }
  }
  const featuresLines = lines.slice(featuresStart + 1, featuresEnd);
  const hasHooks = featuresLines.some((line) => /^\s*hooks\s*=\s*true\s*$/.test(line));
  const normalizedFeaturesLines = featuresLines.filter((line) => !/^\s*codex_hooks\s*=/.test(line));
  if (!hasHooks) {
    normalizedFeaturesLines.unshift("hooks = true");
  }
  const nextLines = [
    ...lines.slice(0, featuresStart + 1),
    ...normalizedFeaturesLines,
    ...lines.slice(featuresEnd)
  ];
  return `${nextLines.join("\n")}
`;
}

// dist/bin/setup.js
var import_meta = {};
function writeAtomicText(targetPath, content) {
  const targetDir = (0, import_node_path2.dirname)(targetPath);
  (0, import_node_fs.mkdirSync)(targetDir, { recursive: true, mode: 448 });
  const tmpPath = `${targetPath}.tmp`;
  (0, import_node_fs.writeFileSync)(tmpPath, content, { encoding: "utf8", mode: 384 });
  (0, import_node_fs.renameSync)(tmpPath, targetPath);
  try {
    (0, import_node_fs.chmodSync)(targetPath, 384);
  } catch {
  }
}
async function runSetup(args = []) {
  const target = args[0] ?? "codex";
  if (target === "cursor") {
    return runCursorSetup(args.slice(1));
  }
  if (target !== "codex") {
    process.stderr.write(`[gramatr] Unknown setup target: ${target}
`);
    return 1;
  }
  const homeDir = getHomeDir();
  if (!homeDir) {
    process.stderr.write("[gramatr] Cannot resolve home directory for Codex setup\n");
    return 1;
  }
  const configPath = (0, import_node_path2.join)(homeDir, ".codex", "config.toml");
  const existing = (0, import_node_fs.existsSync)(configPath) ? (0, import_node_fs.readFileSync)(configPath, "utf8") : "";
  const next = ensureCodexHooksFeature(existing);
  if (next === existing) {
    process.stdout.write(`[gramatr] Codex hooks feature already enabled in ${configPath}
`);
    return 0;
  }
  writeAtomicText(configPath, next);
  process.stdout.write(`[gramatr] Updated ${configPath} to enable Codex hooks
`);
  return 0;
}
var CURSOR_HOOK_MARKER = "cursor-session-contract.js";
function mergeCursorHooksFile(existingRaw, hookCommand) {
  let parsed = {};
  if (existingRaw) {
    try {
      const candidate = JSON.parse(existingRaw);
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        parsed = candidate;
      }
    } catch {
      parsed = {};
    }
  }
  const hooks = { ...parsed.hooks ?? {} };
  const existingSessionStart = Array.isArray(hooks.sessionStart) ? hooks.sessionStart : [];
  const withoutOurs = existingSessionStart.filter((entry) => typeof entry?.command !== "string" || !entry.command.includes(CURSOR_HOOK_MARKER));
  hooks.sessionStart = [...withoutOurs, { command: hookCommand }];
  return {
    ...parsed,
    version: parsed.version ?? 1,
    hooks
  };
}
function resolveCursorHookCommand(argv1 = process.argv[1]) {
  const here = resolveRunningScriptDir(argv1, import_meta.url);
  if (!here)
    return null;
  const scriptPath = (0, import_node_path2.join)(here, CURSOR_HOOK_MARKER);
  return `node "${scriptPath}"`;
}
async function runCursorSetup(_args) {
  const homeDir = getHomeDir();
  if (!homeDir) {
    process.stderr.write("[gramatr] Cannot resolve home directory for Cursor setup\n");
    return 1;
  }
  const hookCommand = resolveCursorHookCommand();
  if (!hookCommand) {
    process.stderr.write("[gramatr] Cannot resolve the installed cursor-session-contract.js path \u2014 is this running from a real plugin install?\n");
    return 1;
  }
  const hooksPath = (0, import_node_path2.join)(homeDir, ".cursor", "hooks.json");
  const existingRaw = (0, import_node_fs.existsSync)(hooksPath) ? (0, import_node_fs.readFileSync)(hooksPath, "utf8") : null;
  const merged = mergeCursorHooksFile(existingRaw, hookCommand);
  const nextRaw = `${JSON.stringify(merged, null, 2)}
`;
  if (existingRaw === nextRaw) {
    process.stdout.write(`[gramatr] Cursor sessionStart hook already configured in ${hooksPath}
`);
    return 0;
  }
  writeAtomicText(hooksPath, nextRaw);
  process.stdout.write(`[gramatr] Updated ${hooksPath} \u2014 gr\u0101matr now delivers live context on every Cursor session
`);
  return 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mergeCursorHooksFile,
  runSetup
});
