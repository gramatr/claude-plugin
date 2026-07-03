---
description: Disable the grāmatr statusline — removes the statusLine key from ~/.claude/settings.json without touching any other settings.
allowed-tools: Bash
---

# /gramatr:disable-statusline

Removes the grāmatr statusline from Claude Code. Performs a safe **read-modify-write**:
only the `statusLine` key is removed. No other settings are affected.

## Steps

**1. Check current settings**

!`node -e "
const fs = require('fs');
const path = require('path');
const p = path.join(process.env.HOME, '.claude', 'settings.json');
let s = {};
if (fs.existsSync(p)) { try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) {} }
if (!s.statusLine) {
  console.log('STATUS: statusLine is not set — nothing to remove.');
} else {
  console.log('STATUS: will remove statusLine:', JSON.stringify(s.statusLine));
}
"`

**2. Remove the key**

If the step above shows a statusLine entry, remove it:

!`node -e "
const fs = require('fs');
const path = require('path');
const p = path.join(process.env.HOME, '.claude', 'settings.json');
let s = {};
if (fs.existsSync(p)) { try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) {} }
delete s.statusLine;
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
console.log('OK: statusLine removed from', p);
console.log('Restart Claude Code for the change to take effect.');
"`

Report the result to the user.
