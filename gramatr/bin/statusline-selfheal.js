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

// dist/bin/statusline-selfheal.js
var statusline_selfheal_exports = {};
__export(statusline_selfheal_exports, {
  main: () => main,
  shouldAutoStart: () => shouldAutoStart
});
module.exports = __toCommonJS(statusline_selfheal_exports);
var import_node_os2 = require("node:os");

// dist/bin/statusline-toggle-lib.js
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");
var import_node_os = require("node:os");

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

// dist/bin/statusline-toggle-lib.js
var import_meta = {};
function settingsPath(homeDir = (0, import_node_os.homedir)()) {
  return (0, import_node_path2.join)(homeDir, ".claude", "settings.json");
}
function readSettings(homeDir = (0, import_node_os.homedir)()) {
  const p = settingsPath(homeDir);
  if (!(0, import_node_fs.existsSync)(p))
    return {};
  try {
    return JSON.parse((0, import_node_fs.readFileSync)(p, "utf8"));
  } catch (err) {
    console.error(`WARN: could not parse ${p}: ${err.message}`);
    return {};
  }
}
function writeSettings(settings, homeDir = (0, import_node_os.homedir)()) {
  const p = settingsPath(homeDir);
  (0, import_node_fs.mkdirSync)((0, import_node_path2.dirname)(p), { recursive: true });
  (0, import_node_fs.writeFileSync)(p, JSON.stringify(settings, null, 2) + "\n");
}
function resolveStatuslineScriptPath(argv1 = process.argv[1]) {
  const here = resolveRunningScriptDir(argv1, import_meta.url);
  if (here)
    return (0, import_node_path2.join)(here, "statusline.js");
  const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
  if (pluginRoot)
    return (0, import_node_path2.join)(pluginRoot, "bin", "statusline.js");
  return "statusline.js";
}
var OWNED_STATUSLINE_PATH_RE = /(^|[\\/])statusline\.js("|$)/;
function isPluginOwnedStatuslineEntry(entry) {
  const candidates = [entry.command, ...entry.args ?? []];
  return candidates.some((c) => typeof c === "string" && OWNED_STATUSLINE_PATH_RE.test(c));
}
function selfHealIfStale(homeDir = (0, import_node_os.homedir)(), argv1 = process.argv[1]) {
  const s = readSettings(homeDir);
  const current = s.statusLine;
  if (!current)
    return "not_set";
  if (typeof current.command !== "string" || !isPluginOwnedStatuslineEntry(current)) {
    return "not_ours";
  }
  const expectedCommand = `node "${resolveStatuslineScriptPath(argv1)}"`;
  if (current.command === expectedCommand && !current.args) {
    return "unchanged";
  }
  s.statusLine = { type: "command", command: expectedCommand };
  writeSettings(s, homeDir);
  return "healed";
}

// dist/bin/statusline-selfheal.js
function warn(reason) {
  process.stderr.write(JSON.stringify({ level: "info", operation: "statusline_selfheal", reason }) + "\n");
}
function main(homeDir = (0, import_node_os2.homedir)(), argv1 = process.argv[1]) {
  try {
    const result = selfHealIfStale(homeDir, argv1);
    if (result === "healed") {
      warn("healed \u2014 statusline command path was stale, rewrote it to the current install path");
    }
  } catch (err) {
    warn(`unexpected_error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
function shouldAutoStart(env = process.env) {
  return env.GRAMATR_STATUSLINE_SELFHEAL_NO_AUTOSTART !== "1" && !env.VITEST;
}
if (shouldAutoStart()) {
  main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main,
  shouldAutoStart
});
