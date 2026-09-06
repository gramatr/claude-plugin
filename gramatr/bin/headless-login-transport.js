#!/usr/bin/env node
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// dist/config-runtime.js
function sanitizeEnvToken(raw) {
  if (!raw)
    return "";
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined")
    return "";
  return raw;
}
function getGramatrUrlFromEnv() {
  const url = process.env.GRAMATR_URL;
  return url && url.length > 0 ? url : null;
}
function getGramatrDirFromEnv() {
  const dir = process.env.GRAMATR_DIR;
  return dir && dir.length > 0 ? dir : null;
}
function getHomeDir() {
  const home = process.env.HOME;
  if (home && home.length > 0)
    return home;
  const userProfile = process.env.USERPROFILE;
  if (userProfile && userProfile.length > 0)
    return userProfile;
  return "";
}
function isHeadlessContext(env = process.env) {
  if (env.GRAMATR_HEADLESS === "true" || env.GRAMATR_HEADLESS === "1")
    return true;
  if (env.SSH_CLIENT || env.SSH_TTY || env.SSH_CONNECTION)
    return true;
  if (env.WSL_INTEROP || env.WSL_DISTRO_NAME)
    return true;
  if (env.REMOTE_CONTAINERS || env.DEVCONTAINER)
    return true;
  if (env.CODESPACES)
    return true;
  if (env.GITPOD_WORKSPACE_URL)
    return true;
  if (process.platform === "linux" && !env.DISPLAY && !env.WAYLAND_DISPLAY)
    return true;
  return false;
}
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// ../proof-crypto/dist/index.js
var init_dist = __esm({
  "../proof-crypto/dist/index.js"() {
    "use strict";
  }
});

// dist/hooks/lib/dpop-key.js
var init_dpop_key = __esm({
  "dist/hooks/lib/dpop-key.js"() {
    "use strict";
    init_dist();
  }
});

// dist/hooks/lib/session-rest-token.js
var SESSION_TOKEN_EXPIRY_SKEW_MS;
var init_session_rest_token = __esm({
  "dist/hooks/lib/session-rest-token.js"() {
    "use strict";
    init_dpop_key();
    SESSION_TOKEN_EXPIRY_SKEW_MS = 30 * 1e3;
  }
});

// dist/hooks/lib/mint-credential-store.js
var init_mint_credential_store = __esm({
  "dist/hooks/lib/mint-credential-store.js"() {
    "use strict";
    init_config_runtime();
  }
});

// dist/hooks/lib/device-key.js
var init_device_key = __esm({
  "dist/hooks/lib/device-key.js"() {
    "use strict";
    init_dist();
  }
});

// dist/hooks/lib/device-key-store.js
var init_device_key_store = __esm({
  "dist/hooks/lib/device-key-store.js"() {
    "use strict";
    init_config_runtime();
    init_device_key();
  }
});

// dist/bin/headless-login-transport.js
var headless_login_transport_exports = {};
__export(headless_login_transport_exports, {
  main: () => main
});
module.exports = __toCommonJS(headless_login_transport_exports);
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
init_config_runtime();

// dist/hooks/lib/bootstrap-recovery.js
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
init_config_runtime();

// dist/hooks/lib/gramatr-hook-utils.js
var import_fs = require("fs");
var import_path = require("path");
init_config_runtime();

// dist/hooks/lib/hook-state.js
var import_node_sqlite = require("node:sqlite");
init_config_runtime();

// dist/hooks/lib/gramatr-hook-utils.js
var HOME = getHomeDir();
function resolveMcpUrl() {
  try {
    const configPath = (0, import_path.join)(HOME, ".gramatr.json");
    const config = JSON.parse((0, import_fs.readFileSync)(configPath, "utf8"));
    if (config.server_url)
      return config.server_url;
  } catch {
  }
  try {
    const gmtrDir = getGramatrDirFromEnv() || (0, import_path.join)(HOME, ".gramatr");
    const settingsPath = (0, import_path.join)(gmtrDir, "settings.json");
    const settings = JSON.parse((0, import_fs.readFileSync)(settingsPath, "utf8"));
    if (settings.auth?.server_url)
      return settings.auth.server_url;
  } catch {
  }
  const envUrl = getGramatrUrlFromEnv();
  if (envUrl)
    return envUrl;
  return "https://api.gramatr.com/mcp";
}

// dist/hooks/lib/bootstrap-recovery.js
init_session_rest_token();

// dist/user-config.js
init_config_runtime();

// dist/hooks/lib/bootstrap-client.js
init_session_rest_token();
init_mint_credential_store();
init_device_key_store();

// dist/hooks/lib/bootstrap-recovery.js
function findUsableMcpOAuthEntry(remoteUrl) {
  try {
    const credFile = (0, import_node_path.resolve)(getHomeDir(), ".claude", ".credentials.json");
    const creds = JSON.parse((0, import_node_fs.readFileSync)(credFile, "utf8"));
    const mcpOAuth = creds.mcpOAuth;
    if (mcpOAuth) {
      for (const entry of Object.values(mcpOAuth)) {
        if (entry.serverUrl === remoteUrl && entry.accessToken && (!entry.expiresAt || Date.now() < Number(entry.expiresAt))) {
          return {
            accessToken: entry.accessToken,
            expiresAt: entry.expiresAt ? Number(entry.expiresAt) : null
          };
        }
      }
    }
  } catch {
  }
  return null;
}
function resolveClientBearerToken(remoteUrl) {
  const envApiKey = process.env.GRAMATR_API_KEY ?? "";
  const envToken = process.env.GRAMATR_TOKEN ?? "";
  const env = sanitizeEnvToken(envApiKey) || sanitizeEnvToken(envToken);
  if (env)
    return env;
  const pluginDataDir = process.env.CLAUDE_PLUGIN_DATA ?? "";
  if (pluginDataDir) {
    try {
      const cfg = JSON.parse((0, import_node_fs.readFileSync)((0, import_node_path.join)(pluginDataDir, "token.json"), "utf8"));
      if (typeof cfg.token === "string" && cfg.token)
        return cfg.token;
    } catch {
    }
  }
  const entry = findUsableMcpOAuthEntry(remoteUrl);
  if (entry)
    return entry.accessToken;
  return "";
}

// dist/hooks/lib/mcp-transport-switch.js
var GRAMATR_MCP_SERVER_KEY = "gramatr";
var GRAMATR_PROXY_BIN_ARG = "${CLAUDE_PLUGIN_ROOT}/bin/gramatr-proxy.js";
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isStdioDeviceFlowEntry(entry) {
  return isPlainObject(entry) && typeof entry.command === "string" && entry.command.length > 0;
}
function buildStdioDeviceFlowEntry(remoteUrl) {
  return {
    command: "node",
    args: [GRAMATR_PROXY_BIN_ARG],
    env: { GRAMATR_URL: remoteUrl }
  };
}
function decideTransportSwitch(params) {
  const { headless, hasToken, mcpJson, remoteUrl } = params;
  if (!headless)
    return { shouldWrite: false, reason: "not_headless" };
  if (hasToken)
    return { shouldWrite: false, reason: "token_present" };
  if (!isPlainObject(mcpJson)) {
    return { shouldWrite: false, reason: "malformed_mcp_json" };
  }
  const servers = mcpJson.mcpServers;
  if (!isPlainObject(servers)) {
    return { shouldWrite: false, reason: "no_mcp_servers_block" };
  }
  const current = servers[GRAMATR_MCP_SERVER_KEY];
  if (current === void 0) {
    return { shouldWrite: false, reason: "no_gramatr_entry" };
  }
  if (isStdioDeviceFlowEntry(current)) {
    return { shouldWrite: false, reason: "already_stdio_device_flow" };
  }
  const next = {
    ...mcpJson,
    mcpServers: {
      ...servers,
      [GRAMATR_MCP_SERVER_KEY]: buildStdioDeviceFlowEntry(remoteUrl)
    }
  };
  return { shouldWrite: true, next, reason: "switched_to_device_flow" };
}

// dist/bin/headless-login-transport.js
function warn(reason, extra) {
  process.stderr.write(JSON.stringify({ level: "warn", operation: "headless_login_transport", reason, ...extra }) + "\n");
}
async function main() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? "";
  if (!pluginRoot) {
    warn("no_plugin_root");
    return;
  }
  const headless = isHeadlessContext(process.env);
  if (!headless) {
    return;
  }
  const remoteUrl = resolveMcpUrl();
  const hasToken = Boolean(resolveClientBearerToken(remoteUrl));
  const mcpJsonPath = (0, import_node_path2.join)(pluginRoot, ".mcp.json");
  let mcpJson;
  try {
    mcpJson = JSON.parse((0, import_node_fs2.readFileSync)(mcpJsonPath, "utf8"));
  } catch {
    warn("mcp_json_unreadable", { path: mcpJsonPath });
    return;
  }
  const decision = decideTransportSwitch({ headless, hasToken, mcpJson, remoteUrl });
  if (!decision.shouldWrite || !decision.next) {
    warn(decision.reason);
    return;
  }
  try {
    const tmp = `${mcpJsonPath}.tmp.${process.pid}`;
    (0, import_node_fs2.writeFileSync)(tmp, JSON.stringify(decision.next, null, 2) + "\n", "utf8");
    (0, import_node_fs2.renameSync)(tmp, mcpJsonPath);
  } catch (err) {
    warn("write_failed", { error: err instanceof Error ? err.message : String(err) });
    return;
  }
  process.stderr.write("gr\u0101matr: detected a headless/SSH session with no auth token yet \u2014 switched to the device-code login flow (no local browser redirect required). Restart Claude Code (or start a new session) to open the short device-login URL and code; this only needs to happen once for this environment.\n");
}
if (process.env.GRAMATR_HEADLESS_LOGIN_TRANSPORT_NO_AUTOSTART !== "1") {
  main().catch(() => {
    process.exit(0);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
