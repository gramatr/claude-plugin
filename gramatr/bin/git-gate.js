#!/usr/bin/env node
"use strict";

// dist/hooks/git-gate.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// dist/hooks/generated/hook-timeouts.js
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;

// dist/hooks/git-gate.js
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
function buildPreToolUseOutput(allow, reason) {
  if (allow) {
    return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } };
  }
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason || "Bash command blocked by gramatr git gate."
    }
  };
}
function isMonorepo(workDir) {
  if ((0, import_node_fs.existsSync)((0, import_node_path.join)(workDir, "pnpm-workspace.yaml")))
    return true;
  try {
    const pkg = JSON.parse((0, import_node_fs.readFileSync)((0, import_node_path.join)(workDir, "package.json"), "utf8"));
    if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0)
      return true;
    if (pkg.workspaces && typeof pkg.workspaces === "object" && Array.isArray(pkg.workspaces.packages) && (pkg.workspaces.packages.length ?? 0) > 0) {
      return true;
    }
  } catch {
  }
  return false;
}
function readPnpmWorkspacePatterns(workDir) {
  const yamlPath = (0, import_node_path.join)(workDir, "pnpm-workspace.yaml");
  if (!(0, import_node_fs.existsSync)(yamlPath))
    return null;
  let body;
  try {
    body = (0, import_node_fs.readFileSync)(yamlPath, "utf8");
  } catch {
    return null;
  }
  const lines = body.split(/\r?\n/);
  const patterns = [];
  let inPackages = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trimEnd();
    if (!line.trim())
      continue;
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      if (/^[A-Za-z0-9_-]+\s*:/.test(line)) {
        inPackages = false;
        continue;
      }
      const m = line.match(/^\s*-\s*(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/);
      if (m) {
        patterns.push(m[1] ?? m[2] ?? m[3] ?? "");
      } else {
        return null;
      }
    }
  }
  return patterns;
}
function expandSimpleGlob(workDir, pattern) {
  if (pattern.includes("**") || /[\[\]{}]/.test(pattern))
    return null;
  const segments = pattern.split("/").filter((s) => s.length > 0);
  let current = [workDir];
  for (const seg of segments) {
    const next = [];
    if (seg === "*") {
      for (const dir of current) {
        let entries;
        try {
          entries = (0, import_node_fs.readdirSync)(dir);
        } catch {
          continue;
        }
        for (const entry of entries) {
          const full = (0, import_node_path.join)(dir, entry);
          try {
            if ((0, import_node_fs.statSync)(full).isDirectory())
              next.push(full);
          } catch {
          }
        }
      }
    } else if (seg.includes("*")) {
      return null;
    } else {
      for (const dir of current) {
        const full = (0, import_node_path.join)(dir, seg);
        try {
          if ((0, import_node_fs.statSync)(full).isDirectory())
            next.push(full);
        } catch {
        }
      }
    }
    current = next;
  }
  return current;
}
function listWorkspacePackages(workDir) {
  let patterns = readPnpmWorkspacePatterns(workDir);
  if (!patterns) {
    try {
      const pkg = JSON.parse((0, import_node_fs.readFileSync)((0, import_node_path.join)(workDir, "package.json"), "utf8"));
      if (Array.isArray(pkg.workspaces)) {
        patterns = pkg.workspaces.filter((p) => typeof p === "string");
      } else if (pkg.workspaces && typeof pkg.workspaces === "object" && Array.isArray(pkg.workspaces.packages)) {
        patterns = pkg.workspaces.packages.filter((p) => typeof p === "string");
      }
    } catch {
      patterns = null;
    }
  }
  if (!patterns || patterns.length === 0)
    return [];
  const out = /* @__PURE__ */ new Set();
  for (const pat of patterns) {
    const expanded = expandSimpleGlob(workDir, pat);
    if (expanded === null) {
      process.stderr.write(`[git-gate] complex glob "${pat}" \u2014 falling back to single-package check
`);
      return [];
    }
    for (const dir of expanded) {
      if ((0, import_node_fs.existsSync)((0, import_node_path.join)(dir, "package.json")))
        out.add(dir);
    }
  }
  return Array.from(out);
}
function exportsReferenceDist(value) {
  if (typeof value === "string") {
    return /(^|\/)dist\//.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(exportsReferenceDist);
  }
  if (value && typeof value === "object") {
    return Object.values(value).some(exportsReferenceDist);
  }
  return false;
}
function packageDeclaresDistEntry(pkgJson) {
  for (const field of ["main", "module", "types", "typings"]) {
    const v = pkgJson[field];
    if (typeof v === "string" && /(^|\/)dist\//.test(v))
      return true;
  }
  if (exportsReferenceDist(pkgJson.exports))
    return true;
  if (exportsReferenceDist(pkgJson.bin))
    return true;
  return false;
}
function newestMtimeUnder(dir, predicate, acc = { mtime: 0, path: "" }) {
  let entries;
  try {
    entries = (0, import_node_fs.readdirSync)(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = (0, import_node_path.join)(dir, entry);
    let s;
    try {
      s = (0, import_node_fs.statSync)(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      if (entry === "node_modules")
        continue;
      newestMtimeUnder(full, predicate, acc);
    } else if (s.isFile() && predicate(full)) {
      const m = s.mtimeMs;
      if (m > acc.mtime) {
        acc.mtime = m;
        acc.path = full;
      }
    }
  }
  return acc;
}
function verifyPackageBuilt(pkgPath) {
  const pkgJsonPath = (0, import_node_path.join)(pkgPath, "package.json");
  let pkgJson;
  try {
    pkgJson = JSON.parse((0, import_node_fs.readFileSync)(pkgJsonPath, "utf8"));
  } catch {
    return { ok: true };
  }
  if (!packageDeclaresDistEntry(pkgJson))
    return { ok: true };
  const pkgName = typeof pkgJson.name === "string" && pkgJson.name.length > 0 ? pkgJson.name : pkgPath;
  const distDir = (0, import_node_path.join)(pkgPath, "dist");
  if (!(0, import_node_fs.existsSync)(distDir)) {
    return {
      ok: false,
      reason: `Run pnpm build before tagging. No dist/ directory in ${pkgName}.`
    };
  }
  const newestDist = newestMtimeUnder(distDir, (p) => p.endsWith(".js"));
  if (newestDist.mtime === 0) {
    return {
      ok: false,
      reason: `Run pnpm build before tagging. No .js files in dist/ for ${pkgName}.`
    };
  }
  const srcDir = (0, import_node_path.join)(pkgPath, "src");
  if ((0, import_node_fs.existsSync)(srcDir)) {
    const newestSrc = newestMtimeUnder(srcDir, (p) => (p.endsWith(".ts") || p.endsWith(".tsx")) && !p.endsWith(".d.ts") && !p.endsWith(".test.ts") && !p.endsWith(".test.tsx") && !p.endsWith(".spec.ts") && !p.endsWith(".spec.tsx") && !p.includes("/__tests__/") && !p.includes("/test/"));
    if (newestSrc.mtime > newestDist.mtime) {
      return {
        ok: false,
        reason: `Stale build for ${pkgName}: ${newestSrc.path} newer than dist/. Re-run pnpm build.`
      };
    }
  }
  return { ok: true };
}
function verifyBuildBeforeTag(workDir, version) {
  if (!version) {
    return {
      ok: false,
      reason: "Cannot read version from package.json. Run pnpm build before tagging."
    };
  }
  if (isMonorepo(workDir)) {
    const pkgs = listWorkspacePackages(workDir);
    if (pkgs.length === 0) {
      return verifyPackageBuilt(workDir);
    }
    for (const pkg of pkgs) {
      const r = verifyPackageBuilt(pkg);
      if (!r.ok)
        return r;
    }
    return { ok: true };
  }
  return verifyPackageBuilt(workDir);
}
function checkGitCommand(command, cwd) {
  const trimmed = command.trim();
  if (!trimmed.startsWith("git ") && !trimmed.startsWith("git	")) {
    return { allow: true };
  }
  if (/^git\s+reset\s+--hard/.test(trimmed)) {
    return {
      allow: false,
      reason: "Destructive git command blocked by the gramatr git gate. Ask the user to confirm they want this operation. If they confirm, they can run the command directly by typing `! " + trimmed + "` in the prompt."
    };
  }
  if (/^git\s+push\b/.test(trimmed)) {
    const pushesToProtected = /^git\s+push\b.*\b(main|master)\b/.test(trimmed) || /^git\s+push\b.*\S+:(main|master)\b/.test(trimmed);
    if (pushesToProtected) {
      return {
        allow: false,
        reason: "Use a PR to push to main. Direct pushes to main/master are not allowed."
      };
    }
  }
  if (/git\s+tag\b/.test(trimmed)) {
    const workDir = cwd || process.cwd();
    if (!(0, import_node_fs.existsSync)((0, import_node_path.join)(workDir, "Cargo.toml"))) {
      let version;
      try {
        const pkg = JSON.parse((0, import_node_fs.readFileSync)((0, import_node_path.join)(workDir, "package.json"), "utf8"));
        version = pkg.version;
      } catch {
        return {
          allow: false,
          reason: "Run pnpm build and build-all-targets before tagging. Could not verify build artifacts."
        };
      }
      if (!version) {
        return {
          allow: false,
          reason: "Cannot read version from package.json. Run pnpm build before tagging."
        };
      }
      const result = verifyBuildBeforeTag(workDir, version);
      if (!result.ok) {
        return { allow: false, reason: result.reason };
      }
    }
  }
  return { allow: true };
}
async function runGitGateHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
    return 0;
  }
  try {
    const input = JSON.parse(raw);
    if (!input.tool_name || input.tool_name !== "Bash") {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
      return 0;
    }
    const command = input.tool_input?.command || "";
    if (!command) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
      return 0;
    }
    const result = checkGitCommand(command);
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(result.allow, result.reason)));
  } catch {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
  }
  return 0;
}

// dist/bin/git-gate.js
if (process.env.GRAMATR_GIT_GATE_NO_AUTOSTART !== "1") {
  runGitGateHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
