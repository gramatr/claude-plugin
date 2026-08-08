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

// dist/bin/compact-advisor.js
var compact_advisor_exports = {};
__export(compact_advisor_exports, {
  computeCompactAdvisory: () => computeCompactAdvisory,
  getModelLimit: () => getModelLimit,
  getSessionModel: () => getSessionModel
});
module.exports = __toCommonJS(compact_advisor_exports);
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var import_node_os = require("node:os");

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

// dist/bin/compact-advisor.js
var PROJECT_DIR = findProjectRoot();
var HOME = (0, import_node_os.homedir)();
function getModelLimit(model) {
  const m = model.toLowerCase();
  if (!m)
    return 2e5;
  if (m.includes("haiku"))
    return 2e5;
  if (m.includes("sonnet-4-5") || m.includes("sonnet-4.5") || m.includes("opus-4-5") || m.includes("opus-4.5")) {
    return 2e5;
  }
  return 1e6;
}
function getSessionModel() {
  try {
    const data = JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "session.json"), "utf8"));
    return typeof data.model === "string" ? data.model : "";
  } catch {
    return "";
  }
}
function readConfig() {
  try {
    return JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(HOME, ".gramatr.json"), "utf8"));
  } catch {
    return {};
  }
}
function computeCompactAdvisory(ctxTokensUsed, limit, warnPct, compactPct, auto) {
  if (ctxTokensUsed <= 0)
    return "";
  const pct = Math.round(ctxTokensUsed / limit * 100);
  const usedK = Math.round(ctxTokensUsed / 1e3);
  const limitK = Math.round(limit / 1e3);
  if (pct >= compactPct) {
    if (auto) {
      return `[gr\u0101matr: context ${pct}% full (${usedK}K/${limitK}K) \u2014 CRITICAL]
MANDATORY, ACT NOW: Your context window is critically full. Run /gramatr:continue right now \u2014 it atomically saves a full handoff, clears, and rehydrates in one step, so nothing is lost. If a slash command isn't available in this context, call save_handoff yourself FIRST and confirm it returned success \u2014 ONLY THEN tell the user "Handoff saved \u2014 it is safe to run /clear now." Never tell the user it is safe to clear before the save has actually succeeded.`;
    }
    return `[gr\u0101matr: context ${pct}% full (${usedK}K/${limitK}K) \u2014 CRITICAL]
MANDATORY, ACT NOW: Tell the user their context window is ${pct}% full and recommend they run /gramatr:continue now \u2014 it atomically saves a full handoff, clears, and rehydrates in one step. If they'd rather do it manually: call save_handoff yourself FIRST and confirm it returned success \u2014 ONLY THEN tell the user "Handoff saved \u2014 it is safe to run /clear now." Never tell the user it is safe to clear before the save has actually succeeded.`;
  }
  if (pct >= warnPct) {
    return `[gr\u0101matr: context ~${pct}% full (${usedK}K/${limitK}K)]
Context is filling up. Recommend the user run /gramatr:continue soon (atomic save + clear + rehydrate), or plan to call save_handoff yourself and confirm it succeeds before things get critical.`;
  }
  return "";
}
async function main() {
  const chunks = [];
  await new Promise((resolve) => {
    const t = setTimeout(resolve, 500);
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
  const cfg = readConfig();
  const warnPct = cfg.context_window?.warn_pct ?? 70;
  const compactPct = cfg.context_window?.compact_pct ?? 80;
  const auto = cfg.auto_compact?.auto ?? false;
  const model = getSessionModel();
  const limit = getModelLimit(model);
  const ctxFile = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "ctx-tokens.json");
  let advisory = "";
  if ((0, import_node_fs2.existsSync)(ctxFile)) {
    let ctxTokensUsed = 0;
    try {
      const data = JSON.parse((0, import_node_fs2.readFileSync)(ctxFile, "utf8"));
      ctxTokensUsed = data.ctx_tokens_used ?? 0;
    } catch {
    }
    advisory = computeCompactAdvisory(ctxTokensUsed, limit, warnPct, compactPct, auto);
  }
  const reflectionFile = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "reflection-due.json");
  if ((0, import_node_fs2.existsSync)(reflectionFile)) {
    let stale = false;
    try {
      const flag = JSON.parse((0, import_node_fs2.readFileSync)(reflectionFile, "utf8"));
      const age = flag.written_at ? Date.now() - new Date(flag.written_at).getTime() : Infinity;
      stale = age > 5 * 60 * 1e3;
    } catch {
      stale = true;
    }
    if (!stale) {
      try {
        (0, import_node_fs2.unlinkSync)(reflectionFile);
      } catch {
      }
      const reflectionAdvisory = `[gr\u0101matr: MANDATORY END-OF-TURN \u2014 Before completing your response, call mcp__plugin_gramatr_gramatr__classification_feedback and mcp__plugin_gramatr_gramatr__save_reflection. These feed the classifier flywheel. The directives.required_actions in this packet specify the exact arguments needed.]`;
      if (advisory) {
        advisory = advisory + "\n" + reflectionAdvisory;
      } else {
        advisory = reflectionAdvisory;
      }
    } else {
      try {
        (0, import_node_fs2.unlinkSync)(reflectionFile);
      } catch {
      }
    }
  }
  if (!advisory) {
    process.stdout.write("{}");
    return;
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: advisory
    }
  }));
}
if (process.env.GRAMATR_COMPACT_ADVISOR_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeCompactAdvisory,
  getModelLimit,
  getSessionModel
});
