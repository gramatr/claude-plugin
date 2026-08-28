---
description: Disable grāmatr's automatic native OTel telemetry — removes the OTEL_*/CLAUDE_CODE_ENABLE_TELEMETRY keys from ~/.claude/settings.json AND the [otel]/[analytics] tables from ~/.codex/config.toml, and sets a persistent opt-out flag so SessionStart never re-adds them.
allowed-tools: Bash
---

# /gramatr:disable-telemetry

Disables the automatic client → grāmatr collector telemetry wiring (issues #4718 /
#5301, part of epic #4717 and epic #5297). Performs three things:

1. A safe **read-modify-write** on `~/.claude/settings.json`: only the six
   `CLAUDE_CODE_ENABLE_TELEMETRY` / `OTEL_*` keys inside `env` are removed. No other
   settings, and no other `env` entries, are touched.
2. A safe **removal** of the grāmatr-owned `[otel]` / `[analytics]` tables from
   `~/.codex/config.toml` (Codex CLI's native OTel config, epic #5297). Every other
   table/key in that file is preserved. This is a no-op on machines that never ran
   Codex (no file, or no grāmatr tables) — so it is always safe to run.
3. Sets `telemetry.disabled: true` in `~/.gramatr.json` — a persistent opt-out flag.
   Without this, the next `SessionStart` would silently re-add the config on its next
   launch (the whole point of #4718/#5297 is that it's automatic).

## Steps

**1. Check current state**

!`node -e "
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(process.env.HOME, '.claude', 'settings.json');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let s = {};
if (fs.existsSync(settingsPath)) { try { s = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch(e) { console.error('WARN: could not parse', settingsPath, e.message); } }
const otelKeys = ['CLAUDE_CODE_ENABLE_TELEMETRY','OTEL_METRICS_EXPORTER','OTEL_EXPORTER_OTLP_PROTOCOL','OTEL_EXPORTER_OTLP_ENDPOINT','OTEL_EXPORTER_OTLP_HEADERS','OTEL_RESOURCE_ATTRIBUTES'];
const present = otelKeys.filter((k) => s.env && Object.prototype.hasOwnProperty.call(s.env, k));
if (present.length) {
  console.log('STATUS: OTel keys currently set:', present.join(', '));
} else {
  console.log('STATUS: no OTel keys currently set in settings.json.');
}
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
console.log('STATUS: opt-out flag currently', g.telemetry && g.telemetry.disabled === true ? 'SET' : 'not set');
"`

**2. Apply the disable**

!`node -e "
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(process.env.HOME, '.claude', 'settings.json');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');

let s = {};
if (fs.existsSync(settingsPath)) { try { s = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch(e) {} }
const otelKeys = ['CLAUDE_CODE_ENABLE_TELEMETRY','OTEL_METRICS_EXPORTER','OTEL_EXPORTER_OTLP_PROTOCOL','OTEL_EXPORTER_OTLP_ENDPOINT','OTEL_EXPORTER_OTLP_HEADERS','OTEL_RESOURCE_ATTRIBUTES'];
if (s.env) { for (const k of otelKeys) delete s.env[k]; }
fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');

let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.telemetry = { ...(g.telemetry || {}), disabled: true };
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n');

console.log('OK: OTel keys removed from', settingsPath);
console.log('OK: telemetry.disabled=true written to', gramatrPath);
console.log('Restart Claude Code for the removal to take effect.');
"`

**3. Remove Codex CLI's native OTel config (epic #5297)**

Removes the grāmatr-owned `[otel]` / `[analytics]` tables from `~/.codex/config.toml`
via the bundled bin (uses a real TOML parser so unrelated tables/comments are never
corrupted). Only removes tables grāmatr itself confirmed writing (tracked via an
ownership marker in `~/.gramatr/`) — never touches `[otel]`/`[analytics]` you
configured yourself independently of grāmatr, even if present. No-op success on
machines without a Codex config, without those tables, or without the marker.

!`node "${CLAUDE_PLUGIN_ROOT}/bin/disable-telemetry-codex.js"`

Report the result to the user. Mention `/gramatr:enable-telemetry` re-enables it.
