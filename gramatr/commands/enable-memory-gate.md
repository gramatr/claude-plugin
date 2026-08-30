---
description: Re-enable grāmatr's memory-gate hard-deny on Claude Code's native auto-memory files after a prior /gramatr:disable-memory-gate — restores the default behavior.
allowed-tools: Bash
---

# /gramatr:enable-memory-gate

Re-enables grāmatr's memory-gate hard-deny (epic #5419, following #4707) after
a prior `/gramatr:disable-memory-gate`. This restores the DEFAULT behavior —
Write/Edit to Claude Code's native auto-memory files
(`~/.claude/projects/*/memory/*.md`, including `MEMORY.md`) is blocked again,
redirecting toward grāmatr's own knowledge graph.

Clears `memoryGate.disabled` in `~/.gramatr.json`. No restart is required:
the next Write/Edit to an auto-memory path is evaluated against the cleared
flag immediately.

## Steps

**1. Check current state**

!`node -e "
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
"`

**2. Clear the opt-out flag**

If the step above shows the opt-out is set, clear it:

!`node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.memoryGate = { ...(g.memoryGate || {}), disabled: false };
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n');
console.log('OK: memoryGate.disabled=false written to', gramatrPath);
console.log('Claude Code native auto-memory writes are hard-denied again (the default).');
"`

Report the result to the user.
