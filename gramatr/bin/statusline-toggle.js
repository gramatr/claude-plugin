#!/usr/bin/env node
"use strict";

// dist/bin/statusline-toggle-lib.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_os = require("node:os");
function settingsPath(homeDir = (0, import_node_os.homedir)()) {
  return (0, import_node_path.join)(homeDir, ".claude", "settings.json");
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
  (0, import_node_fs.mkdirSync)((0, import_node_path.dirname)(p), { recursive: true });
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
function enable(homeDir = (0, import_node_os.homedir)()) {
  const s = readSettings(homeDir);
  s.statusLine = {
    type: "command",
    // Claude Code's statusLine config runs `command` as ONE shell string and
    // has no `args` array (that split is a hooks-only schema) — a block
    // shaped { command: 'node', args: [...] } makes Claude Code run bare
    // `node`, which reads the render payload on stdin, fails, and renders
    // nothing. This single-command-string form is the only correct shape.
    command: 'node "${CLAUDE_PLUGIN_ROOT}/bin/statusline.js"'
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
