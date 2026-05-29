---
description: Dispatch verbs — status, update, handoff save|load, project, statusline, help. Single entry point for grāmatr client-side actions.
---

# /gramatr

Single entry point for grāmatr client-side actions. Dispatches on the first
argument. If no argument is provided, behaves like `/gramatr help`.

## Step 1 — Read the verb

Take the first whitespace-delimited token from the slash command arguments
(the same `$ARGUMENTS`-style variable used by other grāmatr slash commands).
Everything after the verb is forwarded as the sub-argument.

Examples:

- `/gramatr` → verb is empty → show help
- `/gramatr help` → verb is `help` → show help
- `/gramatr handoff save` → verb is `handoff`, sub-arg is `save`
- `/gramatr status` → verb is `status` (placeholder)

Normalize the verb to lowercase before matching.

## Step 2 — Dispatch

Match the verb and follow its branch literally. Do not improvise.

### `help` (or empty)

Print this verb table verbatim, then stop:

```
/gramatr help                    → this table
/gramatr status                  → drift check (Phase 4 placeholder)
/gramatr update                  → fetch latest prompt + update steps (Phase 4 placeholder)
/gramatr handoff save|load       → session continuity
/gramatr project                 → pin repo to a grāmatr project
/gramatr statusline              → toggle the statusLine
```

Note: `status` and `update` are placeholders pending Phase 4 of #3128.

### `status`

Print one paragraph, then stop:

> Phase 4 of #3128 will implement drift detection for the grāmatr block in
> `CLAUDE.md`, the statusLine wiring, and the `.gramatr/project.json`
> mapping. Until that lands, run `/gramatr project` if this repo is not yet
> pinned to a grāmatr project, `/gramatr statusline` if the status bar is
> missing, and `/gramatr update` to refresh the bundled block.

Do not call any tools. Do not invent a status check.

### `update`

Print one paragraph, then stop:

> Phase 4 of #3128 will surface update notifications and a one-shot
> refresh path. Until that lands, run `/gramatr-update` to refresh the
> bundled grāmatr block in `CLAUDE.md`, and check the project README
> (`packages/mcp/README.md`) for manual upgrade steps for the published
> npm package.

Do not call any tools. Do not invent an update flow.

### `handoff`

You handle session continuity for the current project. Pick mode, resolve
`project_id`, then call the matching MCP tool.

#### Mode selection

- If the user passed a sub-argument, honor it verbatim: `save` → SAVE,
  `load` → LOAD. No auto-detect.
- Otherwise, auto-detect from this conversation:
  - **SAVE mode** if there has been substantial work this session —
    multiple turns of real activity, code changes, commits/PRs opened,
    decisions made, files modified.
  - **LOAD mode** if the conversation is fresh — first few turns, no
    significant prior work in this session (typical right after a
    session start or a `/clear`).
- If genuinely ambiguous, ask the user: "save or load?" — do not guess.

#### Resolve `project_id` (both modes; UUID, never a slug)

Try in order, stop at the first that yields a UUID:

1. Read `.gramatr/project.json` in the repo root → `project_id`.
2. Read `.gramatr/git-context.json` (written by SessionStart) → `project_id`.
3. Read `gramatr_project_id` from the latest `gmtr.intelligence.contract.v2`
   packet for this turn.

If none yield a UUID, tell the user to run `/gramatr project` first
and stop. Do not pass a slug or placeholder.

#### SAVE mode

Compose all 5 sections below from this conversation. Be specific — the
next session reads this verbatim.

- **`where_we_are`** — current branch, latest commit, server/test status,
  what just happened in this session.
- **`what_shipped`** — numbered list of commits, PRs, deploys, tags that
  landed this session. Include PR/issue numbers.
- **`whats_next`** — priority-ordered list of next actions with issue
  numbers. Top item is what the next session picks up first.
- **`key_context`** — non-obvious facts the next agent MUST know that
  are not in code or git history (decisions made in conversation,
  constraints, blocked dependencies).
- **`dont_forget`** — recurring rules, gotchas, or hazards the agent
  has been violating or is at risk of violating.

Call the MCP tool `save_handoff` with `project_id` + all 5 sections.
Include `platform: "claude-code"` and, if known, `branch` and
`session_id`. Confirm with one line naming the project and the top
`whats_next` item.

#### LOAD mode

Call the MCP tool `load_handoff` with `project_id`.

If a handoff was returned, render it as markdown with these headings,
preserving the saved prose verbatim:

```
## Where we are
<where_we_are>

## What shipped
<what_shipped>

## What's next
<whats_next>

## Key context
<key_context>

## Don't forget
<dont_forget>
```

If the tool returns no handoff (none yet saved for this project), say so
plainly: "No handoff found for this project — this looks like a fresh
start." Do not error, retry, or fabricate sections.

After rendering, ask the user whether to proceed with the top item from
`whats_next` or pick something else. Do not start work without
confirmation.

### `project`

Links the current git repository to a grāmatr project by writing
`.gramatr/project.json`. Once this file is committed, every machine that
clones the repo will resolve to the same grāmatr project — no dir-hash
ambiguity, no cross-machine drift.

#### What this does

1. Reads the git remote (`origin`) to derive a stable project slug.
2. Calls `mcp__plugin_gramatr_gramatr__resolve_project` to resolve or
   create the project in grāmatr.
3. Writes `.gramatr/project.json` with `project_id`, `slug`, and
   `git_remote`.
4. Tells you to commit the file so all machines share the same mapping.

#### Steps

Run these in order:

##### Step 1 — Get the git remote

```bash
git remote get-url origin
```

Copy the output. If this is not a git repo or there is no `origin` remote,
you can still proceed by choosing a slug manually in Step 2.

##### Step 2 — Resolve the project

Call `mcp__plugin_gramatr_gramatr__resolve_project` with:

```json
{
  "action": "resolve",
  "git_remote": "<output from Step 1>",
  "create_if_missing": true
}
```

The response will include `project_id` and `slug`. If `is_new: true`,
a fresh project was created. If `is_new: false`, you are now linked to
the existing project (and its full history).

##### Step 3 — Write .gramatr/project.json

```bash
mkdir -p .gramatr
```

Then ask me to write `.gramatr/project.json` with:

```json
{
  "project_id": "<project_id from Step 2>",
  "slug": "<slug from Step 2>",
  "git_remote": "<git remote from Step 1>"
}
```

##### Step 4 — Commit the file

```bash
git add .gramatr/project.json
git commit -m "chore: add .gramatr/project.json for unambiguous grāmatr project resolution"
```

Committing this file means every developer who clones this repo — and
every machine you work from — will resolve to the same grāmatr project
without any manual configuration.

##### Step 5 — Verify

Restart Claude Code (or start a new session in this directory). The
SessionStart hook will now read `.gramatr/project.json` and pass
`project_id` directly to `session_bootstrap`, bypassing the dir-hash
fallback entirely.

#### Notes

- `.gramatr/project.json` is safe to commit — it contains only a UUID,
  a slug, and a git remote URL. No tokens or secrets.
- If your repo is private and you do not want the remote URL in source
  control, omit `git_remote` from the file; the hook will fall back to
  reading it from git at session start.
- To change which project this repo maps to, update `project_id` in the
  file and restart Claude Code.

### `statusline`

Installs or removes the grāmatr statusLine entry in `~/.claude/settings.json`.

The Claude Code plugin system does not automatically merge `statusLine` from
plugin-owned settings files into user settings — this verb does it explicitly.

If the user passed `on` or `activate` as a sub-argument, jump straight to
Activate. If `off` or `deactivate`, jump to Deactivate. Otherwise present
both options and let the user choose.

#### Activate (install statusLine)

Run the following, then restart Claude Code:

```bash
node -e "
const fs = require('fs');
const path = require('os').homedir() + '/.claude/settings.json';
const s = JSON.parse(fs.readFileSync(path, 'utf8'));
s.statusLine = { type: 'command', command: 'node \"\${CLAUDE_PLUGIN_ROOT}/bin/statusline.js\"' };
fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
console.log('statusLine activated');
"
```

#### Deactivate (remove statusLine)

Run the following, then restart Claude Code:

```bash
node -e "
const fs = require('fs');
const path = require('os').homedir() + '/.claude/settings.json';
const s = JSON.parse(fs.readFileSync(path, 'utf8'));
delete s.statusLine;
fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
console.log('statusLine removed');
"
```

#### Verify

After restarting Claude Code, the grāmatr status bar should appear at the
bottom of the UI showing project context, version, and session info.

If the bar is blank, the current project may not yet have a
`.gramatr/session.json` (written by the UserPromptSubmit hook on the first
prompt). The bundled `bin/statusline.js` reads `session_id` from that file and
fetches `GET /api/v1/statusline/:session_id` on each render — no agent writes
are involved.

### unknown verb

Print one line, then stop:

> Unknown verb `<verb>`. Run `/gramatr help` to see the verb table.

Do not guess what the user meant. Do not call any tools.

## Notes

- Phase 2 of #3128 migrated `/handoff`, `/gramatr-setup-project`, and
  `/gramatr-statusline` into this verb shell; those legacy commands have
  been removed. `/gramatr-cleanup` was retired in #3127 with no replacement
  verb (legacy-only artifact). `/gramatr-update` remains as a separate
  command pending Phase 4 of #3128.
- Phase 3 adds the per-platform system-prompt contract and
  `get_system_prompt` tool. Phase 4 implements `status` and `update`.
