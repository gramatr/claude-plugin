---
description: Enable or disable grāmatr's automatic native OTel telemetry (#4718/#5297). `on` clears the opt-out so SessionStart resumes writing the OTEL_* block; `off` removes the OTEL_*/CLAUDE_CODE_ENABLE_TELEMETRY keys from ~/.claude/settings.json AND the [otel]/[analytics] tables from ~/.codex/config.toml and sets a persistent opt-out. No argument presents both.
argument-hint: [on|off]
allowed-tools: Bash
---

# /gramatr:telemetry

Toggles the automatic client → grāmatr collector telemetry wiring (issues #4718 /
#5301, epics #4717 / #5297). This replaces the former separate
`/gramatr:enable-telemetry` and `/gramatr:disable-telemetry` commands with one
on|off command (slash-command-cleanup, 2026-10-20) — one documented flow instead
of two copies, matching the `statusline [on|off]` pattern.

If the user passed `on`, `enable`, or `activate` as the argument, jump straight to
**Activate**. If `off`, `disable`, or `deactivate`, jump to **Deactivate**.
Otherwise present both options and let the user choose — do not guess.

## Activate (re-enable telemetry)

Re-enables the wiring after a prior deactivate. This is normally automatic
(issue #4718, part of epic #4717) — this path exists only to reverse an explicit
opt-out. It clears `telemetry.disabled` in `~/.gramatr.json`. It does **not**
write the `OTEL_*` `env` block itself — that happens automatically on the next
`SessionStart` (the same mechanism that writes it for every user by default),
once a fresh `.gramatr/.telemetry-token` is available.

**1. Check current state**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
if (g.telemetry && g.telemetry.disabled === true) {
  console.log('STATUS: telemetry is currently disabled — will clear the opt-out flag.');
} else {
  console.log('STATUS: telemetry is not disabled — nothing to do.');
}
"
```

**2. Clear the opt-out flag**

If the step above shows telemetry is disabled, clear it:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.telemetry = { ...(g.telemetry || {}), disabled: false };
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n');
console.log('OK: telemetry.disabled=false written to', gramatrPath);
console.log('The OTEL_* block in ~/.claude/settings.json will be written on the next SessionStart.');
"
```

Report the result to the user. Restarting Claude Code (a fresh SessionStart) is
what actually re-populates `~/.claude/settings.json`'s `env` block.

## Deactivate (disable telemetry)

Disables the automatic client → grāmatr collector telemetry wiring. Performs
three things:

1. A safe **read-modify-write** on `~/.claude/settings.json`: only the six
   `CLAUDE_CODE_ENABLE_TELEMETRY` / `OTEL_*` keys inside `env`, plus the top-level
   `otelHeadersHelper` key (#5905), are removed. No other settings, and no other
   `env` entries, are touched. Removing `OTEL_EXPORTER_OTLP_HEADERS` here also
   clears the plaintext bearer that pre-#5905 releases left in that file.
2. A safe **removal** of the grāmatr-owned `[otel]` / `[analytics]` tables from
   `~/.codex/config.toml` (Codex CLI's native OTel config, epic #5297). Every other
   table/key in that file is preserved. This is a no-op on machines that never ran
   Codex (no file, or no grāmatr tables) — so it is always safe to run.
3. Sets `telemetry.disabled: true` in `~/.gramatr.json` (written 0600, #5905) — a
   persistent opt-out flag.
   Without this, the next `SessionStart` would silently re-add the config on its next
   launch (the whole point of #4718/#5297 is that it's automatic).

**1. Check current state**

```bash
node -e "
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
// #5905 — otelHeadersHelper is the top-level key that names the bin supplying the
// OTLP Authorization header at emit time. It replaced the plaintext bearer that
// used to sit in env.OTEL_EXPORTER_OTLP_HEADERS, so disable must clear it too.
console.log('STATUS: otelHeadersHelper currently', s.otelHeadersHelper ? 'SET' : 'not set');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
console.log('STATUS: opt-out flag currently', g.telemetry && g.telemetry.disabled === true ? 'SET' : 'not set');
"
```

**2. Apply the disable**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(process.env.HOME, '.claude', 'settings.json');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');

let s = {};
if (fs.existsSync(settingsPath)) { try { s = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch(e) {} }
const otelKeys = ['CLAUDE_CODE_ENABLE_TELEMETRY','OTEL_METRICS_EXPORTER','OTEL_EXPORTER_OTLP_PROTOCOL','OTEL_EXPORTER_OTLP_ENDPOINT','OTEL_EXPORTER_OTLP_HEADERS','OTEL_RESOURCE_ATTRIBUTES'];
if (s.env) { for (const k of otelKeys) delete s.env[k]; }
delete s.otelHeadersHelper;
fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');

let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.telemetry = { ...(g.telemetry || {}), disabled: true };
// #5905 — ~/.gramatr.json is a credential file (its schema carries \`token\`, and
// it held the identity cache). Every writer sets 0600 on create AND chmods, since
// the mode option does nothing to a path that already exists — which is exactly
// how this file ended up 0664 on an operator machine.
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n', { mode: 0o600 });
try { fs.chmodSync(gramatrPath, 0o600); } catch (e) {}

console.log('OK: OTel keys and otelHeadersHelper removed from', settingsPath);
console.log('OK: telemetry.disabled=true written to', gramatrPath);
console.log('Restart Claude Code for the removal to take effect.');
"
```

**3. Remove Codex CLI's native OTel config (epic #5297)**

Removes the grāmatr-owned `[otel]` / `[analytics]` tables from `~/.codex/config.toml`
via the bundled bin (uses a real TOML parser so unrelated tables/comments are never
corrupted). Only removes tables grāmatr itself confirmed writing (tracked via an
ownership marker in `~/.gramatr/`) — never touches `[otel]`/`[analytics]` you
configured yourself independently of grāmatr, even if present. No-op success on
machines without a Codex config, without those tables, or without the marker.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/disable-telemetry-codex.js"
```

Report the result to the user. Mention `/gramatr:telemetry on` re-enables it.
