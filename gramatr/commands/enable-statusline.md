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
  if (s.statusLine.args) {
    console.log('NOTE: this block uses the unsupported command+args split — it will be normalized to the single-command form below.');
  }
} else {
  console.log('STATUS: no statusLine currently set — will add it.');
}
"`

**2. Apply the merge-write**

Always run the write below. It is idempotent: it installs — or normalizes an
existing/broken block to — the single canonical form. Claude Code's `statusLine`
config runs `command` as ONE shell string and has NO `args` array (that split is
a hooks-only schema). A block shaped `{ command: 'node', args: [...] }` makes
Claude Code run bare `node`, which reads the render payload on stdin, fails, and
renders nothing — the exact "statusline disappeared after enable" bug. The
correct form is a single command string, matching the `statusline` verb in
`/gramatr:gramatr`:

!`node -e "
const fs = require('fs');
const path = require('path');
const p = path.join(process.env.HOME, '.claude', 'settings.json');
let s = {};
if (fs.existsSync(p)) { try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) {} }
s.statusLine = {
  type: 'command',
  command: 'node \"\${CLAUDE_PLUGIN_ROOT}/bin/statusline.js\"'
};
fs.mkdirSync(path.dirname(p), { recursive: true });
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
console.log('OK: statusLine registered in', p);
console.log('Restart Claude Code for the statusline to appear.');
"`

Report the result to the user. If it was already present in the correct form,
tell them and offer to run `/gramatr:disable-statusline` to remove it.
