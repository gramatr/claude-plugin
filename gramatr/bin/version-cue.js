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

// dist/bin/version-cue.js
var version_cue_exports = {};
__export(version_cue_exports, {
  computeVersionCue: () => computeVersionCue,
  main: () => main
});
module.exports = __toCommonJS(version_cue_exports);

// dist/hooks/lib/version-check.js
var import_fs = require("fs");
var import_os = require("os");
var import_path = require("path");

// dist/hooks/generated/hook-timeouts.js
var VERSION_FETCH_TIMEOUT_MS = 3e3;
var VERSION_CACHE_TTL_MS = 36e5;

// dist/hooks/lib/version-check.js
var REGISTRY_URL = "https://registry.npmjs.org/@gramatr%2fmcp/latest";
function compareVersions(a, b) {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av < bv)
      return -1;
    if (av > bv)
      return 1;
  }
  return 0;
}
function getCachePath(home = (0, import_os.homedir)()) {
  return (0, import_path.join)(home, ".gramatr", ".cache", "version-check.json");
}
function readCache(path) {
  try {
    if (!(0, import_fs.existsSync)(path))
      return null;
    const raw = (0, import_fs.readFileSync)(path, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.latestVersion !== "string" || typeof parsed.fetchedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function writeCache(path, data) {
  try {
    (0, import_fs.mkdirSync)((0, import_path.dirname)(path), { recursive: true });
    (0, import_fs.writeFileSync)(path, JSON.stringify(data, null, 2) + "\n", "utf8");
  } catch {
  }
}
async function fetchLatestVersion() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERSION_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(REGISTRY_URL, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!res.ok)
        return null;
      const body = await res.json();
      if (typeof body?.version !== "string")
        return null;
      return body.version;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
async function checkLatestVersion(installedVersion, options = {}) {
  try {
    const cachePath = options.cachePath ?? getCachePath();
    const now = options.now ?? Date.now();
    const cached = readCache(cachePath);
    if (cached && now - cached.fetchedAt < VERSION_CACHE_TTL_MS) {
      return {
        latestVersion: cached.latestVersion,
        installedVersion,
        isOutdated: compareVersions(cached.latestVersion, installedVersion) > 0,
        cached: true
      };
    }
    const latestVersion = await fetchLatestVersion();
    if (!latestVersion)
      return null;
    writeCache(cachePath, {
      latestVersion,
      fetchedAt: now,
      lastNotifiedVersion: cached?.lastNotifiedVersion
    });
    return {
      latestVersion,
      installedVersion,
      isOutdated: compareVersions(latestVersion, installedVersion) > 0,
      cached: false
    };
  } catch {
    return null;
  }
}
function markNotified(latestVersion, cachePath = getCachePath()) {
  try {
    const current = readCache(cachePath);
    if (!current)
      return;
    writeCache(cachePath, { ...current, lastNotifiedVersion: latestVersion });
  } catch {
  }
}
function shouldNotify(result, cachePath = getCachePath()) {
  if (!result.isOutdated)
    return false;
  const cached = readCache(cachePath);
  if (cached?.lastNotifiedVersion === result.latestVersion)
    return false;
  return true;
}
var UPGRADE_LOCK_TTL_MS = 10 * 60 * 1e3;
function formatUpgradeHint(installed, latest) {
  return `gramatr update available: v${installed} \u2192 v${latest}
To upgrade: npm i -g @gramatr/mcp@latest`;
}

// dist/hooks/lib/version.js
var import_fs2 = require("fs");
var import_path2 = require("path");
var import_url = require("url");
var import_meta = {};
function findPackageJson(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = (0, import_path2.join)(dir, "package.json");
    if ((0, import_fs2.existsSync)(candidate))
      return candidate;
    const parent = (0, import_path2.dirname)(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  return null;
}
function resolveVersion() {
  try {
    if (typeof __GRAMATR_VERSION__ === "string" && __GRAMATR_VERSION__.length > 0) {
      return __GRAMATR_VERSION__;
    }
    const here = (0, import_path2.dirname)((0, import_url.fileURLToPath)(import_meta.url));
    const pkgPath = findPackageJson(here);
    if (!pkgPath)
      return "0.0.0";
    const pkg = JSON.parse((0, import_fs2.readFileSync)(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
var VERSION = resolveVersion();

// dist/bin/version-cue.js
async function computeVersionCue(installedVersion = VERSION) {
  const result = await checkLatestVersion(installedVersion);
  if (!result || !shouldNotify(result)) {
    return {};
  }
  markNotified(result.latestVersion);
  return {
    // Top-level systemMessage is rendered DIRECTLY to the user by Claude Code
    // (#3283) — the cue is never silent.
    systemMessage: formatUpgradeHint(result.installedVersion, result.latestVersion),
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit"
    }
  };
}
async function drainStdin() {
  await new Promise((resolve) => {
    const t = setTimeout(resolve, 500);
    process.stdin.on("data", () => {
    });
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
}
async function main() {
  await drainStdin();
  const payload = await computeVersionCue();
  process.stdout.write(JSON.stringify(payload));
}
if (process.env.GRAMATR_VERSION_CUE_NO_AUTOSTART !== "1") {
  main().catch(() => process.stdout.write("{}"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeVersionCue,
  main
});
