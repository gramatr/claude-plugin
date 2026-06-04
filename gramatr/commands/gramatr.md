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
- `/gramatr handoff show` → verb is `handoff`, sub-arg is `show`
- `/gramatr status` → verb is `status`
- `/gramatr whoami` → verb is `whoami`
- `/gramatr project list` → verb is `project`, sub-arg is `list`
- `/gramatr project fix gramatr/gramatr` → verb is `project`, sub-arg is `fix gramatr/gramatr`
- `/gramatr reflect the Wave 2 verbs` → verb is `reflect`, sub-arg is `the Wave 2 verbs`
- `/gramatr feedback bad wrong effort` → verb is `feedback`, sub-arg is `bad wrong effort`
- `/gramatr recall handoff hardening` → verb is `recall`, sub-arg is `handoff hardening`

Normalize the verb to lowercase before matching.

## Step 2 — Dispatch

Match the verb and follow its branch literally. Do not improvise.

### `help` (or empty)

Print this verb table verbatim, then stop:

```
/gramatr help                    → this table
/gramatr whoami                  → who am I + server/project/scopes
/gramatr status                  → project pin, drift, version, session health
/gramatr update                  → plugin-vs-server version check + update step
/gramatr init                    → first-run: pin project + name + statusline
/gramatr handoff save|load|show  → session continuity (show = render, no resume)
/gramatr project [list|fix]      → pin repo / list projects / rehome drifted ones
/gramatr statusline              → toggle the statusLine
/gramatr reflect [topic]         → save a LEARN-phase reflection (Q1/Q2/Q3)
/gramatr feedback good|bad [why] → rate this turn's classification
/gramatr recall <query>          → semantic search across your grāmatr memory
```

### `whoami`

Answers "who am I to grāmatr right now?" — identity, roles, memberships,
scopes, and the server you're talking to. Read-only.

Call `mcp__plugin_gramatr_gramatr__gramatr_whoami` with no arguments. The
response has two halves: `caller` (the authenticated grāmatr user) and
`server` (the MCP endpoint you're connected to).

Render one clean block from the response, then stop:

```
grāmatr identity
  user        <caller.email> (<caller.user_id>)
  name        <caller.display_name or "—">
  roles       <caller.system_roles joined by ", " or "none">
  orgs        <each caller.org_memberships as "<org_slug>:<role>", or "none">
  teams       <each caller.team_memberships as "<team_slug>:<role>", or "none">
  scopes      <caller.scopes_granted joined by ", " or "none">
  server      <server.name> v<server.version> (<server.client_detected>)
```

Do not add fields the tool did not return. Do not write or mutate anything.

### `status`

A read-only composite of where this session stands: identity, project pin,
resolution drift, plugin-vs-server version, and session/statusline health.
It MAY call `gramatr_whoami` and read files under `.gramatr/`, but MUST NOT
write or mutate anything.

Gather, in order:

1. **Identity / server** — call
   `mcp__plugin_gramatr_gramatr__gramatr_whoami` (no args). Keep
   `caller.email`, `server.version`, and `server.client_detected`.
2. **Project pin** — read `.gramatr/project.json` (`project_id`, `slug`) and
   `.gramatr/git-context.json` (`remote_url`, `project_id`). If
   `.gramatr/project.json` is missing, the repo is NOT pinned.
3. **Resolution drift** — read `gramatr_project_id` from this turn's
   `gmtr.intelligence.contract.v2` packet. Compare it to the pin's
   `project_id`. If they differ, flag drift.
4. **Version skew** — read the installed plugin version from
   `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` → `version` (the
   plugin package.json carries the same value). Compare to
   `server.version` from Step 1: equal → match, plugin lower → behind,
   plugin higher → ahead.
5. **Session / statusline health** — read `.gramatr/session.json`; a real
   `session_id` is healthy, the literal `test-session` placeholder is NOT
   (known gap #3187). Read `~/.claude/settings.json`; report whether a
   `statusLine` entry is present.
6. **Block drift** — read `block_drift` and `block_drift_checked` from
   `.gramatr/git-context.json`. The SessionStart hook computed these locally
   (sha256 of the normalized grāmatr block in `CLAUDE.md` vs the canonical
   block bundled in the plugin) and persisted them — do NOT recompute. If
   `block_drift_checked` is false or the fields are absent, the block was
   missing or there was no canonical baseline → report "n/a". If
   `block_drift_checked` is true and `block_drift` is false → "current". If
   `block_drift` is true → the in-repo block has drifted from canonical.

Render a short labeled report, then stop:

```
grāmatr status
  identity    <caller.email> · server v<server.version> · client <server.client_detected>
  project     <slug> (<project_id>)        — or "not pinned (run /gramatr project)"
  remote      <git-context.remote_url>
  drift       none   — or "DRIFT: pin <project_id> ≠ packet <gramatr_project_id>"
  version     plugin v<plugin> vs server v<server>: <match|behind|ahead>
  session     <session_id>                 — or "placeholder test-session (#3187)"
  statusline  installed   — or "not installed (run /gramatr statusline)"
  block       current   — or "n/a" — or "DRIFTED: run /gramatr:gramatr-update"
```

If drift is flagged, add one line: suggest `/gramatr project` to re-pin, and
note this can also be the known per-turn resolution gap (the SessionStart
pin is canonical; the packet may lag).

If the `block` line reports DRIFTED, add one line pointing the user at
`/gramatr:gramatr-update` to restore the canonical grāmatr block in
`CLAUDE.md` (the block carries the current version marker but its body was
edited away from canonical).

### `update`

Read-only plugin-vs-server version check. No mutation.

1. Read the installed plugin version from
   `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` → `version`.
2. Call `mcp__plugin_gramatr_gramatr__gramatr_whoami` (no args) → keep
   `server.version`.
3. Compare:
   - plugin **behind** server → tell the user to update: open `/plugin`,
     update grāmatr, then run `/reload-plugins`. Name the server version
     they would move toward.
   - plugin **matches** server → say "Plugin vNNN is current with the
     server." (substitute the real version).
   - plugin **ahead** of server → note the plugin is ahead of the live
     server version; usually transient around a release.

Then stop. To refresh the bundled grāmatr block in `CLAUDE.md` (a separate
concern from the plugin binary), point the user at `/gramatr-update`.

### `init`

First-run composite: pin this repo to a grāmatr project, capture a display
name, and offer the statusLine. Compose the existing `project` and
`statusline` mechanics — do not duplicate their bash. Ask before writing or
committing anything.

Run in order:

1. **Derive the remote.**

   ```bash
   git remote get-url origin
   ```

2. **Resolve the project.** Call
   `mcp__plugin_gramatr_gramatr__resolve_project` with:

   ```json
   {
     "action": "resolve",
     "git_remote": "<output from Step 1>",
     "create_if_missing": true
   }
   ```

   Keep `project_id` and `slug` from the response (`is_new: true` means a
   fresh project was created).

3. **Confirm, then pin.** Show the user the resolved `slug` + `project_id`
   and ask them to confirm. On confirmation, follow the `project` verb's
   Step 3/Step 4 exactly: `mkdir -p .gramatr`, write
   `.gramatr/project.json` with `{ project_id, slug, git_remote }`, then
   show the `git add .gramatr/project.json` + commit command. Do NOT
   auto-commit without confirmation — match the `project` verb.

4. **Capture a display name.** If `gramatr_whoami.caller.display_name` is
   empty or null, offer to set it. On the user's OK, call
   `mcp__plugin_gramatr_gramatr__onboard_user` with `{ display_name }`.

5. **Offer the statusLine.** Point the user at the `statusline` verb's
   Activate steps (do not inline the snippet here) and run it if they want
   the status bar.

End by telling the user to restart Claude Code (or start a new session in
this directory) so the SessionStart hook reads the new pin and passes
`project_id` straight to `session_bootstrap`.

### `handoff`

You handle session continuity for the current project. Pick mode, resolve
`project_id`, then call the matching MCP tool.

#### Mode selection

- If the user passed a sub-argument, honor it verbatim: `save` → SAVE,
  `load` → LOAD, `show` → SHOW. No auto-detect.
- Otherwise, auto-detect from this conversation:
  - **SAVE mode** if there has been substantial work this session —
    multiple turns of real activity, code changes, commits/PRs opened,
    decisions made, files modified.
  - **LOAD mode** if the conversation is fresh — first few turns, no
    significant prior work in this session (typical right after a
    session start or a `/clear`).
- If genuinely ambiguous, ask the user: "save or load?" — do not guess.

#### Resolve `project_id` (all modes; UUID, never a slug)

The committed `.gramatr/project.json` pin is ALWAYS authoritative. Resolve in
this order, stopping at the first that yields a UUID — but always note which
source won, because the mismatch guard below depends on it:

1. Read `.gramatr/project.json` in the repo root → `project_id` (+ `slug`).
   This is the **pin** and it wins whenever it is present.
2. Read `.gramatr/git-context.json` (written by SessionStart) → `project_id`.
3. Read `gramatr_project_id` from the latest `gmtr.intelligence.contract.v2`
   packet for this turn.

If none yield a UUID, tell the user to run `/gramatr project` first
and stop. Do not pass a slug or placeholder.

#### Pin-vs-resolved mismatch guard (run before any save/load/show)

After resolving, ALSO read `gramatr_project_id` from this turn's
`gmtr.intelligence.contract.v2` packet and compare it to the **pin's**
`project_id` (the value from `.gramatr/project.json`).

- If there is no committed pin, skip this guard — there is nothing to defend.
- If the pin and the packet `gramatr_project_id` are equal, proceed silently.
- If they DIFFER, do NOT silently load, save, or show. Surface this prompt and
  WAIT for the user's choice — never auto-pick:

  > Handoff is keyed to the committed project `<pin-slug>` (`<pin-id>`), but
  > this session resolved to `<packet-id>`. Load/save against the pin
  > (recommended), the resolved id, or cancel?

  Use the pin's `project_id` only on "pin", the packet's `gramatr_project_id`
  only on "resolved", and abort the verb on "cancel". Never load or save the
  wrong project.

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
start." Do not error, retry, or fabricate sections. Then add one hint:

> If this project was recently rehomed or drifted, the handoff may live
> under a pre-rehome `project_id` — run `/gramatr project fix` to reunite it.

After rendering, ask the user whether to proceed with the top item from
`whats_next` or pick something else. Do not start work without
confirmation.

#### SHOW mode

Read-only. Renders the latest saved handoff WITHOUT offering to resume —
the difference from LOAD is that SHOW never asks "proceed with the top item?"
and never starts work.

Call the MCP tool `load_handoff` with `project_id` (the same read-only tool
LOAD uses). If a handoff was returned, render it with the identical five
headings LOAD uses (`## Where we are`, `## What shipped`, `## What's next`,
`## Key context`, `## Don't forget`), preserving the saved prose verbatim.

If the tool returns no handoff, say plainly: "No handoff found for this
project." and add the same rehome hint as LOAD:

> If this project was recently rehomed or drifted, the handoff may live
> under a pre-rehome `project_id` — run `/gramatr project fix` to reunite it.

Then STOP. Do not ask to resume, do not propose next actions, do not start
work.

### `project`

Dispatches on the sub-argument:

- `list` → **PROJECT LIST** (read-only inventory of your projects).
- `fix [target]` → **PROJECT FIX** (rehome drifted/dir-hash/slug-variant
  projects into a canonical one).
- anything else (or empty) → **PROJECT PIN** (the default below) — link this
  repo to a grāmatr project by writing `.gramatr/project.json`.

#### PROJECT LIST (`/gramatr project list`)

Read-only. Renders your projects, most-recently-active first.

Call `mcp__plugin_gramatr_gramatr__resolve_project` with:

```json
{ "action": "list", "limit": 50 }
```

`action: "list"` returns projects sorted by `last_active`, paginated (the
envelope carries `total`, `has_more`, `next_offset` — pass `next_offset` back
as `offset` to page through more than the limit). For each project render one
line, most-recent first:

```
<slug> · <project_id> · <last_active>
```

If the envelope reports `has_more: true`, note how many remain and that
`/gramatr project list` can be re-run to page further. Do not mutate anything.

(Note: there is also a typed `list_projects` tool, but it is gated to the
internal surface; `resolve_project action:"list"` is the public,
marketplace-reachable equivalent and returns the same slug/id/last_active
data.)

#### PROJECT FIX (`/gramatr project fix [target]`)

Wraps the `rehome_project` tool to reunite drifted / dir-hash / slug-variant
projects into a single canonical project. NEVER auto-applies — always plans
with `dry_run:true` first and waits for the user to confirm.

1. **Resolve the canonical target.**
   - If the user passed a target after `fix` (a slug like `owner/repo`, a git
     remote URL, or a UUID), use it verbatim.
   - Otherwise resolve the current repo's canonical: prefer the committed
     `.gramatr/project.json` `slug`/`project_id`; fall back to
     `git remote get-url origin`. The `rehome_project` tool accepts a slug,
     a git_remote, or a UUID as `target`, so pass whichever you resolved.

2. **Collect the sources (optional).** If the user named explicit source
   project ids, pass them as `source_project_ids`. If they did not, omit the
   field and let the tool's dry-run report which sources it would merge.

3. **Plan first (mandatory).** Call `rehome_project` with `dry_run:true`:

   ```json
   {
     "target": "<resolved slug | git_remote | uuid>",
     "source_project_ids": ["<uuid>", "..."],
     "dry_run": true
   }
   ```

   Show the user the resolved canonical target plus the exact source projects
   that WOULD be merged. Do not omit any source from the plan.

4. **Confirm, then apply.** Require an explicit confirmation. Only on the
   user's OK, re-call `rehome_project` with the same `target` /
   `source_project_ids` and `dry_run:false`. Never skip the dry-run, never
   auto-apply, never widen the source set beyond what the user saw in the plan.

Guardrails are enforced server-side (owned-by-caller only; never the default
project; never a dir-hash/scratch as the target; source ≠ target) — surface
any rejection verbatim rather than retrying around it.

#### PROJECT PIN (default)

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
fetches `GET /api/v1/statusline` (token-authenticated when `.gramatr/.session` exists, legacy `/:session_id` fallback otherwise) on each render — no agent writes
are involved.

### `reflect`

Saves a LEARN-phase reflection so the meta-learning flywheel sees this
session. The sub-argument is the topic; if empty, use `"this session"`.

Compose Q1/Q2/Q3 from what actually happened this session — do not invent:

- **Q1 (Self)** — what you would have done differently.
- **Q2 (Algorithm)** — what a smarter routing algorithm would have done.
- **Q3 (AI)** — what a fundamentally smarter AI would have done.

Call the MCP tool `save_reflection` with:

```json
{
  "task_description": "<topic, 8-12 words>",
  "effort_level": "<this turn's effort_level from the packet, e.g. standard>",
  "reflection_q1": "<Q1>",
  "reflection_q2": "<Q2>",
  "reflection_q3": "<Q3>",
  "criteria_count": 0,
  "criteria_passed": 0,
  "criteria_failed": 0,
  "client_type": "claude-code"
}
```

`task_description`, `effort_level`, the three `reflection_q*`, and the three
`criteria_*` counts are required by the tool. Use the real Quality-Gate counts
from this turn when you have them; otherwise pass `0`. If a `project_id`
resolved (per the handoff resolution order), include it for provenance.
Confirm with one line naming the topic, then stop.

### `feedback`

Records classification feedback for THIS turn — the training signal that tunes
the router. The sub-argument starts with `good` or `bad`; everything after is
an optional reason.

- `good` → `was_correct: true`.
- `bad` → `was_correct: false`.
- If the first token is neither, ask the user "good or bad?" and stop.

Set `original_prompt` to the LAST user prompt verbatim (the prompt this turn's
classification was made against — required for LoRA training). Put any reason
text into `quality_notes`.

Call the MCP tool `classification_feedback` with:

```json
{
  "timestamp": "<ISO timestamp of this turn>",
  "was_correct": true,
  "original_prompt": "<the last user prompt, verbatim>",
  "quality_notes": "<reason text, if any>",
  "client_type": "claude-code"
}
```

(`was_correct` is a real boolean, not a string. Set it from good/bad.)
On `bad`, if the reason maps cleanly to a known reason code (e.g. "wrong
effort" → `wrong_effort`, "wrong intent" → `wrong_intent`), also pass
`feedback_reason_codes: ["..."]`. Confirm with one line, then stop.

### `recall`

Semantic search across your grāmatr memory. The sub-argument is the query; if
empty, ask the user what to recall and stop. Read-only.

Call the MCP tool `search_semantic` with:

```json
{ "query": "<sub-argument>", "limit": 10 }
```

If a `project_id` resolved (per the handoff resolution order), include it to
scope the search to this project. Render the top matches, one line each:

```
<name> · <entity_type> · <short snippet of the match>
```

If there are no matches, say "No matches for `<query>`." Do not mutate
anything.

### unknown verb

Print one line, then stop:

> Unknown verb `<verb>`. Run `/gramatr help` to see the verb table.

Do not guess what the user meant. Do not call any tools.

## Notes

- Phase 2 of #3128 migrated `/handoff`, `/gramatr-setup-project`, and
  `/gramatr-statusline` into this verb shell; those legacy commands have
  been removed. `/gramatr-cleanup` was retired in #3127 with no replacement
  verb (legacy-only artifact). `/gramatr-update` remains a separate command
  for refreshing the bundled grāmatr block in `CLAUDE.md`.
- Phase 3 shipped the per-platform system-prompt contract as static MCP
  resources (`gramatr://system-prompt/<platform>` + `…/active`) and the
  `get_system_prompt` tool, which now exists for clients that call tools
  rather than read resources. The v1 verb wave (#3288) makes `whoami`,
  `status`, `update`, and `init` real; Wave 2 (#3288) adds `handoff show`,
  `project list`, `project fix`, `reflect`, `feedback`, and `recall`, and
  hardens `handoff` with the committed-pin-vs-resolved mismatch guard. Phase 4
  (#3128) adds local grāmatr-block content-drift detection: the SessionStart
  hook hashes the normalized block in `CLAUDE.md` against the bundled canonical
  and surfaces the result through the `status` verb's `block` line.
- `project fix` wraps the temporary public `rehome_project` tool (#3219/#3198)
  and always plans with `dry_run:true` before applying — it never auto-merges.
