#!/usr/bin/env node
"use strict";

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
function check(homeDir = (0, import_node_os.homedir)()) {
  const s = readSettings(homeDir);
  if (s.statusLine) {
    console.log("STATUS: statusLine already registered:");
    console.log(JSON.stringify(s.statusLine, null, 2));
    if (s.statusLine.args) {
      console.log("NOTE: this block uses the unsupported command+args split \u2014 it will be normalized to the single-command form on enable.");
    }
  } else {
    console.log("STATUS: no statusLine currently set.");
  }
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
function enable(homeDir = (0, import_node_os.homedir)(), argv1 = process.argv[1]) {
  const s = readSettings(homeDir);
  const scriptPath = resolveStatuslineScriptPath(argv1);
  s.statusLine = {
    type: "command",
    // Claude Code's statusLine config runs `command` as ONE shell string and
    // has no `args` array (that split is a hooks-only schema) — a block
    // shaped { command: 'node', args: [...] } makes Claude Code run bare
    // `node`, which reads the render payload on stdin, fails, and renders
    // nothing. This single-command-string form is the only correct shape.
    command: `node "${scriptPath}"`
  };
  writeSettings(s, homeDir);
  console.log(`OK: statusLine registered in ${settingsPath(homeDir)}`);
  console.log("Restart Claude Code for the statusline to appear.");
}
function disable(homeDir = (0, import_node_os.homedir)()) {
  const s = readSettings(homeDir);
  if (!s.statusLine) {
    console.log("STATUS: statusLine is not set \u2014 nothing to remove.");
    return;
  }
  delete s.statusLine;
  writeSettings(s, homeDir);
  console.log(`OK: statusLine removed from ${settingsPath(homeDir)}`);
  console.log("Restart Claude Code for the change to take effect.");
}

// dist/bin/statusline-toggle.js
var action = process.argv[2];
if (action === "check")
  check();
else if (action === "enable")
  enable();
else if (action === "disable")
  disable();
else {
  console.error("Usage: statusline-toggle.js check|enable|disable");
  process.exit(1);
}
