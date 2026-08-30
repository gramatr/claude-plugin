---
description: Allow Claude Code's native auto-memory files to be written again — opts out of grāmatr's memory-gate hard-deny. grāmatr's own knowledge graph is still the recommended durable memory store; this only restores the native feature for users who want it alongside or instead of grāmatr's KG.
allowed-tools: Bash
---

# /gramatr:disable-memory-gate

Opts out of grāmatr's memory-gate hard-deny (epic #5419, following #4707) on
Write/Edit to Claude Code's native auto-memory files
(`~/.claude/projects/*/memory/*.md`, including `MEMORY.md`). By default,
grāmatr's PreToolUse hook blocks those writes outright and redirects toward
grāmatr's own knowledge graph — a deliberate, durable-across-sessions memory
store. This command restores Claude Code's native local-file memory feature
for users who want it to keep working, whether alongside grāmatr's KG or
instead of it.

Sets `memoryGate.disabled: true` in `~/.gramatr.json` — a persistent opt-out
flag the hook checks before denying. No restart is required: the next
Write/Edit to an auto-memory path is evaluated against the new flag
immediately.

## Steps

**1. Check current state**

!`node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
console.log('STATUS: memory-gate opt-out currently', g.memoryGate && g.memoryGate.disabled === true ? 'SET (native auto-memory writes allowed)' : 'not set (native auto-memory writes are hard-denied — the default)');
"`

**2. Apply the opt-out**

!`node -e "
const fs = require('fs');
const path = require('path');
const gramatrPath = path.join(process.env.HOME, '.gramatr.json');
let g = {};
if (fs.existsSync(gramatrPath)) { try { g = JSON.parse(fs.readFileSync(gramatrPath, 'utf8')); } catch(e) {} }
g.memoryGate = { ...(g.memoryGate || {}), disabled: true };
fs.writeFileSync(gramatrPath, JSON.stringify(g, null, 2) + '\n');
console.log('OK: memoryGate.disabled=true written to', gramatrPath);
console.log('Claude Code native auto-memory writes will no longer be blocked.');
"`

Report the result to the user. Mention `/gramatr:enable-memory-gate` restores
the default hard-deny behavior.
