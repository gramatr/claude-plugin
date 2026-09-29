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

// dist/bin/otel-headers.js
var otel_headers_exports = {};
__export(otel_headers_exports, {
  findTelemetryTokenFile: () => findTelemetryTokenFile,
  resolveOtelHeaders: () => resolveOtelHeaders
});
module.exports = __toCommonJS(otel_headers_exports);
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var GRAMATR_DIR = ".gramatr";
var TELEMETRY_TOKEN_FILE = ".telemetry-token";
function findTelemetryTokenFile(startDir) {
  let dir = startDir;
  for (; ; ) {
    const candidate = (0, import_node_path.join)(dir, GRAMATR_DIR, TELEMETRY_TOKEN_FILE);
    if ((0, import_node_fs.existsSync)(candidate))
      return candidate;
    const parent = (0, import_node_path.dirname)(dir);
    if (parent === dir || dir === (0, import_node_path.parse)(dir).root)
      return null;
    dir = parent;
  }
}
function resolveOtelHeaders(startDir) {
  try {
    const path = findTelemetryTokenFile(startDir);
    if (!path)
      return {};
    const parsed = JSON.parse((0, import_node_fs.readFileSync)(path, "utf8"));
    const token = parsed?.token;
    if (typeof token !== "string" || token.length === 0)
      return {};
    const expiresAt = parsed?.expires_at;
    if (typeof expiresAt === "string") {
      const ms = Date.parse(expiresAt);
      if (Number.isFinite(ms) && ms <= Date.now())
        return {};
    }
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}
if (process.env["GRAMATR_OTEL_HEADERS_NO_AUTOSTART"] !== "1" && !process.env["VITEST"]) {
  process.stdout.write(JSON.stringify(resolveOtelHeaders(process.cwd())) + "\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findTelemetryTokenFile,
  resolveOtelHeaders
});
