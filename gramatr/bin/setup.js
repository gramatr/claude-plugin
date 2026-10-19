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
  resolveHermesPluginSource: () => resolveHermesPluginSource,
  runSetup: () => runSetup
});
module.exports = __toCommonJS(setup_exports);
var import_node_child_process = require("node:child_process");
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
  if (target === "hermes") {
    return runHermesSetup(args.slice(1));
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
var HERMES_PLUGIN_NAME = "gramatr";
var HERMES_PLUGIN_MANIFEST = "plugin.yaml";
function isHermesCopyExcluded(srcPath) {
  const base = (0, import_node_path2.basename)(srcPath);
  if (base === "__pycache__" || base === ".pytest_cache")
    return true;
  if (base.endsWith(".pyc"))
    return true;
  if (/^test_.*\.py$/.test(base))
    return true;
  if (/_test\.py$/.test(base))
    return true;
  if (/\.test\.ts$/.test(base))
    return true;
  return false;
}
function resolveHermesPluginSource(argv1 = process.argv[1]) {
  const argvBase = resolveRunningScriptDir(argv1, void 0);
  const metaBase = resolveRunningScriptDir(void 0, import_meta.url);
  const candidates = [];
  for (const base of [argvBase, metaBase]) {
    if (!base)
      continue;
    candidates.push((0, import_node_path2.join)(base, "hermes-plugin", "gramatr_plugin"));
    candidates.push((0, import_node_path2.join)(base, "..", "hermes-plugin", "gramatr_plugin"));
    candidates.push((0, import_node_path2.join)(base, "..", "..", "..", "hermes-plugin", "gramatr_plugin"));
  }
  for (const candidate of candidates) {
    if ((0, import_node_fs.existsSync)((0, import_node_path2.join)(candidate, HERMES_PLUGIN_MANIFEST))) {
      return candidate;
    }
  }
  return null;
}
var HERMES_CONFIG_INSTRUCTION = `[gramatr] ACTION REQUIRED \u2014 one manual step to enable per-turn (Tier 2) context.

gr\u0101matr's Hermes plugin is installed and (if the hermes CLI was found) enabled.
Tier 1 session-start context works now. For Tier 2 per-turn gateway injection,
add the following to your Hermes config.yaml (set plugins.enabled to include
"${HERMES_PLUGIN_NAME}" and plugins.entries.${HERMES_PLUGIN_NAME}.allow_gateway_injection: true):

  plugins:
    enabled:
      - ${HERMES_PLUGIN_NAME}
    entries:
      ${HERMES_PLUGIN_NAME}:
        allow_gateway_injection: true

Until that edit is made, gr\u0101matr will NOT inject per-turn context \u2014 the Hermes
harness refuses plugin-initiated turns unless the plugin's own entry allows it.
(The on-disk location of Hermes's config.yaml is not yet confirmed, so gr\u0101matr
does not write this for you \u2014 copy the snippet above into it manually.)
`;
function tryEnableHermesPlugin() {
  const result = (0, import_node_child_process.spawnSync)("hermes", ["plugins", "enable", HERMES_PLUGIN_NAME], {
    encoding: "utf8",
    timeout: 1e4,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error) {
    return false;
  }
  return result.status === 0;
}
async function runHermesSetup(_args) {
  const homeDir = getHomeDir();
  if (!homeDir) {
    process.stderr.write("[gramatr] Cannot resolve home directory for Hermes setup\n");
    return 1;
  }
  const sourceDir = resolveHermesPluginSource();
  if (!sourceDir) {
    process.stderr.write("[gramatr] Cannot resolve the gr\u0101matr Hermes plugin source directory \u2014 is this running from a real plugin install or checkout?\n");
    return 1;
  }
  const destDir = (0, import_node_path2.join)(homeDir, ".hermes", "plugins", HERMES_PLUGIN_NAME);
  (0, import_node_fs.rmSync)(destDir, { recursive: true, force: true });
  (0, import_node_fs.mkdirSync)((0, import_node_path2.dirname)(destDir), { recursive: true, mode: 448 });
  (0, import_node_fs.cpSync)(sourceDir, destDir, {
    recursive: true,
    filter: (src) => !isHermesCopyExcluded(src)
  });
  process.stdout.write(`[gramatr] Installed gr\u0101matr Hermes plugin to ${destDir}
`);
  if (tryEnableHermesPlugin()) {
    process.stdout.write("[gramatr] Enabled the plugin via `hermes plugins enable gramatr`\n");
  } else {
    process.stdout.write("[gramatr] Could not run `hermes plugins enable gramatr` (hermes CLI not found or returned non-zero) \u2014 enable it yourself if needed; this is not a failure\n");
  }
  process.stdout.write(HERMES_CONFIG_INSTRUCTION);
  return 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mergeCursorHooksFile,
  resolveHermesPluginSource,
  runSetup
});
