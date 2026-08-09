#!/usr/bin/env node
"use strict";

// dist/bin/project-init.js
var import_node_child_process = require("node:child_process");
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
var CORE_FILE = "project.json";
var RUNTIME_FILE = "runtime.json";
function getStatePaths(projectDir) {
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  return {
    core: (0, import_node_path.join)(dir, CORE_FILE),
    runtime: (0, import_node_path.join)(dir, RUNTIME_FILE)
  };
}
function atomicWriteJson(filePath, dir, payload) {
  if (!(0, import_node_fs.existsSync)(dir)) {
    (0, import_node_fs.mkdirSync)(dir, { recursive: true, mode: 448 });
  }
  const tmp = `${filePath}.tmp.${process.pid}`;
  (0, import_node_fs.writeFileSync)(tmp, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf8", mode: 384 });
  (0, import_node_fs.renameSync)(tmp, filePath);
  try {
    (0, import_node_fs.chmodSync)(filePath, 384);
  } catch {
  }
}
function readJson(filePath) {
  try {
    if (!(0, import_node_fs.existsSync)(filePath))
      return null;
    return JSON.parse((0, import_node_fs.readFileSync)(filePath, "utf8"));
  } catch {
    return null;
  }
}
function readRuntime(projectDir) {
  return readJson(getStatePaths(projectDir).runtime) ?? {};
}
function patchRuntime(projectDir, patch) {
  const paths = getStatePaths(projectDir);
  const dir = (0, import_node_path.join)(projectDir, GRAMATR_DIR);
  const prev = readRuntime(projectDir);
  const next = { ...prev, ...patch };
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return;
  }
  atomicWriteJson(paths.runtime, dir, next);
}
function writeGitContext(projectDir, ctx) {
  patchRuntime(projectDir, { git_context: ctx });
}
function buildGitContextPayload(input) {
  const payload = {
    remote_url: input.remoteUrl,
    branch: input.branch,
    cwd: input.cwd,
    updated_at: input.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.projectId)
    payload.project_id = input.projectId;
  if (input.slug)
    payload.slug = input.slug;
  return payload;
}

// dist/config-runtime.js
function isRuntimeGitContextEnabledFromEnv() {
  return process.env.GRAMATR_RUNTIME_GIT_CONTEXT_ENABLED === "true";
}

// dist/bin/project-init.js
var PROJECT_DIR = findProjectRoot();
var savedProject = {};
try {
  const projectFile = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr", "project.json");
  if ((0, import_node_fs2.existsSync)(projectFile)) {
    savedProject = JSON.parse((0, import_node_fs2.readFileSync)(projectFile, "utf8"));
  }
} catch {
}
var remote_url = (0, import_node_child_process.spawnSync)("git", ["remote", "get-url", "origin"], { cwd: PROJECT_DIR, encoding: "utf8" }).stdout?.trim() ?? "";
var branch = (0, import_node_child_process.spawnSync)("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: PROJECT_DIR, encoding: "utf8" }).stdout?.trim() ?? "";
var outDir = (0, import_node_path2.join)(PROJECT_DIR, ".gramatr");
(0, import_node_fs2.mkdirSync)(outDir, { recursive: true });
var gitContextPayload = buildGitContextPayload({
  projectId: savedProject.project_id,
  slug: savedProject.slug,
  remoteUrl: remote_url || savedProject.git_remote || "",
  branch,
  cwd: PROJECT_DIR
});
(0, import_node_fs2.writeFileSync)((0, import_node_path2.join)(outDir, "git-context.json"), JSON.stringify(gitContextPayload, null, 2) + "\n", "utf8");
if (isRuntimeGitContextEnabledFromEnv()) {
  try {
    writeGitContext(PROJECT_DIR, {
      remote_url: gitContextPayload.remote_url,
      branch: gitContextPayload.branch,
      cwd: gitContextPayload.cwd,
      updated_at: gitContextPayload.updated_at
    });
  } catch {
  }
}
process.stderr.write(`gr\u0101matr: project context written (branch: ${branch}, project_id: ${savedProject.project_id ?? "unresolved"})
`);
