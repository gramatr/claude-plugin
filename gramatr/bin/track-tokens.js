#!/usr/bin/env node
"use strict";

// dist/bin/track-tokens.js
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

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

// dist/bin/track-tokens.js
var PROJECT_DIR = findProjectRoot();
async function main() {
  const chunks = [];
  await new Promise((resolve) => {
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", resolve);
    process.stdin.on("error", resolve);
    process.stdin.resume();
  });
  let transcriptPath = null;
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    transcriptPath = input.transcript_path ?? null;
  } catch {
    process.stdout.write("{}");
    return;
  }
  if (!transcriptPath) {
    process.stdout.write("{}");
    return;
  }
  try {
    const content = (0, import_node_fs2.readFileSync)(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    let lastInputTokens = null;
    for (const line of lines) {
      if (!line.trim())
        continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type === "assistant") {
          const tokens = entry.message?.usage?.input_tokens;
          if (typeof tokens === "number" && tokens > 0)
            lastInputTokens = tokens;
        }
      } catch {
      }
    }
    if (lastInputTokens !== null) {
      const outDir = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr");
      (0, import_node_fs2.mkdirSync)(outDir, { recursive: true });
      (0, import_node_fs2.writeFileSync)((0, import_node_path2.join)(outDir, "ctx-tokens.json"), JSON.stringify({ ctx_tokens_used: lastInputTokens, updated_at: (/* @__PURE__ */ new Date()).toISOString() }) + "\n", "utf8");
      (0, import_node_fs2.writeFileSync)((0, import_node_path2.join)(outDir, "reflection-due.json"), JSON.stringify({ written_at: (/* @__PURE__ */ new Date()).toISOString() }) + "\n", "utf8");
    }
  } catch {
  }
  process.stdout.write("{}");
}
main().catch(() => process.stdout.write("{}"));
