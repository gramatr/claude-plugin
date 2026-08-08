---
description: Re-enable the automatic Claude Code native OTel telemetry (#4718) after a prior /gramatr:disable-telemetry — clears the opt-out flag so SessionStart resumes writing the OTEL_* block.
allowed-tools: Bash
---

# /gramatr:enable-telemetry

Re-enables the automatic Claude Code → grāmatr collector telemetry wiring after a
prior `/gramatr:disable-telemetry`. This is normally automatic (issue #4718, part of
epic #4717) — this command exists only to reverse an explicit opt-out.

Clears `telemetry.disabled` in `~/.gramatr.json`. It does **not** write the
`OTEL_*` `env` block itself — that happens automatically on the next `SessionStart`
(same mechanism that writes it for every user by default), once a fresh
`.gramatr/.telemetry-token` is available.

## Steps

**1. Check current state**

!`node -e "
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
"`

**2. Clear the opt-out flag**

If the step above shows telemetry is disabled, clear it:

!`node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.telemetry = { ...(g.telemetry || {}), disabled: false };
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n');
console.log('OK: telemetry.disabled=false written to', gramatrPath);
console.log('The OTEL_* block in ~/.claude/settings.json will be written on the next SessionStart.');
"`

Report the result to the user. Restarting Claude Code (a fresh SessionStart) is
what actually re-populates `~/.claude/settings.json`'s `env` block.
