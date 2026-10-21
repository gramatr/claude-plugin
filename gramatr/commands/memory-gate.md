---
description: Enable or disable grāmatr's memory-gate hard-deny on Claude Code's native auto-memory files (epic #5419). `on` restores the default hard-deny; `off` opts out so native auto-memory writes are allowed again. No argument presents both.
argument-hint: [on|off]
allowed-tools: Bash
---

# /gramatr:memory-gate

Toggles grāmatr's memory-gate hard-deny (epic #5419, following #4707) on
Write/Edit to Claude Code's native auto-memory files
(`~/.claude/projects/*/memory/*.md`, including `MEMORY.md`). This replaces the
former separate `/gramatr:enable-memory-gate` and `/gramatr:disable-memory-gate`
commands with one on|off command (slash-command-cleanup, 2026-10-20) — one
documented flow instead of two copies, matching the `statusline [on|off]` pattern.

By default, grāmatr's PreToolUse hook blocks those writes outright and redirects
toward grāmatr's own knowledge graph — a deliberate, durable-across-sessions
memory store. No restart is required for either direction: the next Write/Edit to
an auto-memory path is evaluated against the current flag immediately.

If the user passed `on`, `enable`, or `activate` as the argument, jump straight to
**Activate**. If `off`, `disable`, or `deactivate`, jump to **Deactivate**.
Otherwise present both options and let the user choose — do not guess.

## Activate (restore the hard-deny — the default)

Re-enables grāmatr's memory-gate hard-deny after a prior deactivate. This restores
the DEFAULT behavior — Write/Edit to Claude Code's native auto-memory files is
blocked again, redirecting toward grāmatr's own knowledge graph. Clears
`memoryGate.disabled` in `~/.gramatr.json`.

**1. Check current state**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
if (g.memoryGate && g.memoryGate.disabled === true) {
  console.log('STATUS: memory-gate opt-out is currently set — will clear it and restore the hard-deny.');
} else {
  console.log('STATUS: memory-gate opt-out is not set — the hard-deny is already in effect, nothing to do.');
}
"
```

**2. Clear the opt-out flag**

If the step above shows the opt-out is set, clear it:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.memoryGate = { ...(g.memoryGate || {}), disabled: false };
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n');
console.log('OK: memoryGate.disabled=false written to', gramatrPath);
console.log('Claude Code native auto-memory writes are hard-denied again (the default).');
"
```

Report the result to the user.

## Deactivate (opt out — allow native auto-memory writes)

Opts out of grāmatr's memory-gate hard-deny. This restores Claude Code's native
local-file memory feature for users who want it to keep working, whether alongside
grāmatr's KG or instead of it. grāmatr's own knowledge graph is still the
recommended durable memory store; this only restores the native feature. Sets
`memoryGate.disabled: true` in `~/.gramatr.json` — a persistent opt-out flag the
hook checks before denying.

**1. Check current state**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
console.log('STATUS: memory-gate opt-out currently', g.memoryGate && g.memoryGate.disabled === true ? 'SET (native auto-memory writes allowed)' : 'not set (native auto-memory writes are hard-denied — the default)');
"
```

**2. Apply the opt-out**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.memoryGate = { ...(g.memoryGate || {}), disabled: true };
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n');
console.log('OK: memoryGate.disabled=true written to', gramatrPath);
console.log('Claude Code native auto-memory writes will no longer be blocked.');
"
```

Report the result to the user. Mention `/gramatr:memory-gate on` restores the
default hard-deny behavior.
