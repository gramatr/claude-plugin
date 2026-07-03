---
description: Enable the grāmatr statusline in Claude Code — opt-in safe merge-write to ~/.claude/settings.json.
allowed-tools: Bash
---

# /gramatr:enable-statusline

Adds the grāmatr statusline to Claude Code. Performs a safe **read-modify-write**:
only the `statusLine` key is touched. No other settings are affected.

## Steps

**1. Check current settings**

!`node -e "
const fs = require('fs');
const path = require('path');
const p = path.join(process.env.HOME, '.claude', 'settings.json');
let s = {};
if (fs.existsSync(p)) { try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) { console.error('WARN: could not parse', p, e.message); } }
if (s.statusLine) {
  console.log('STATUS: statusLine already registered:');
  console.log(JSON.stringify(s.statusLine, null, 2));
} else {
  console.log('STATUS: no statusLine currently set — will add it.');
}
"`

**2. Apply the merge-write**

If the step above shows `no statusLine currently set`, run the write:

!`node -e "
const fs = require('fs');
const path = require('path');
const p = path.join(process.env.HOME, '.claude', 'settings.json');
let s = {};
if (fs.existsSync(p)) { try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) {} }
s.statusLine = {
  type: 'command',
  command: 'node',
  args: ['\${CLAUDE_PLUGIN_ROOT}/bin/statusline.js'],
  timeout: 5000
};
fs.mkdirSync(path.dirname(p), { recursive: true });
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
console.log('OK: statusLine registered in', p);
console.log('Restart Claude Code for the statusline to appear.');
"`

Report the result to the user. If already registered, tell them and offer to run
`/gramatr:disable-statusline` to remove it, or confirm it is already correct.
