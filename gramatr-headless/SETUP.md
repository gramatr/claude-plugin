<!--
SETUP.md — first-install setup instructions for Claude (the AI agent).

This file is read by Claude after the grāmatr Claude Code plugin is installed.
It walks the agent through OAuth authentication, identity verification, and
one-time onboarding so a new user can ship work on turn 1.

Convention: Anthropic's plugin docs do not (as of 2026-05-26) specify a
canonical SETUP.md filename. We ship this at the plugin root following the
emerging community pattern — a short, task-oriented setup brief addressed to
the agent. The closest official reference is the Skills authoring guide:
https://code.claude.com/docs/en/skills (skills are model-invoked instructions;
SETUP.md is a one-shot first-run analog).

Source of truth: packages/mcp/SETUP.md (edit here — copied into
dist/marketplace/claude-plugin/SETUP.md by build-marketplace.mjs).
-->

# grāmatr — first-install setup

You are reading this because the grāmatr plugin was just installed. Your job is
to **walk the user through getting started** — not to silently self-execute a
checklist. Run each step, then narrate the outcome to the user in plain language
(who they're signed in as, which project the session homed to, whether the
statusline is live). Stop at the first step that fails and surface the failure
plainly — do not skip ahead.

## 1. Check authentication

Call the `gramatr_whoami` MCP tool. Two outcomes:

- Returns a user identity → authenticated. Skip to step 3.
- Returns an auth error (401, "not authenticated", missing token) → run step 2.

## 2. Authenticate via OAuth

In an interactive terminal (TTY):

```
gramatr login
```

In a headless context — SSH, WSL, CI, container, devcontainer:

```
gramatr login --device-code
```

The device-code flow prints a verification URL plus a `XXXX-XXXX-XXXX-XXXX`
user code. The user opens the URL, confirms the code, and the CLI completes
the exchange. Auto-detection switches to device flow on most headless
environments, so plain `gramatr login` usually does the right thing — surface
`--device-code` only if the browser flow stalls.

After login completes, re-run `gramatr_whoami` to confirm.

## 3. Bootstrap the session — mandatory, turn 1

Call the `session_bootstrap` MCP tool with `cwd` set to the current working
directory on your **first user-facing turn** — always, not optionally. This
resolves the grāmatr project, opens a session, and primes the memory/classifier
pipeline. The hook chain also fires it on `UserPromptSubmit`; calling it
explicitly is a safe no-op that guarantees a session_id and a homed project even
if a hook envelope is missing. Do not respond to the user before bootstrap has
returned a homing outcome.

### Assert the homing outcome

`session_bootstrap` homes the session to **exactly one** project — it never
silently inherits a stale or phantom recent project. Read the response and tell
the user which of the three branches fired:

- **Git repo detected** (`source: "git_remote"` / `"project_file"`) → the
  session is bound to the project resolved from the repo's remote. Confirm the
  project name to the user. If the response carries `project_resolution_needed`
  (a citable remote that the server could not resolve), call `resolve_project`
  with `action: "resolve"` and the slug, then confirm.
- **No project context** (`source: "scratch"`, no citable git remote) → the
  session is homed to the **scratch** catch-all project. Tell the user, and note
  that the binding is overridable — they can name a real project at any time.
- **Ambiguous / user-named** → if the user names a project, or the response
  asks for resolution, call `resolve_project` with `action: "search"` (or
  `"resolve"` with a known slug), present the matches, and confirm before
  proceeding. Persist the confirmed choice.

Never proceed on a silently inherited recent project. When in doubt, ask.

### Verify the session is registered

After bootstrap, confirm `.gramatr/runtime.json` (legacy: `.gramatr/session.json`)
exists in the project directory and carries the active session. This file is what
the statusline REST chain reads — if it is missing, the statusline bar will never
render. If it is absent after a successful bootstrap, surface that to the user
rather than proceeding silently; do not pretend the session is live.

## 4. Onboard the user

This is a conversation with the user, not a silent capture. Walk them through it.

### Ask what they'd like to be called

If `gramatr_whoami` returned `display_name: null` (it commonly is, even for the
account owner), **ask the user what they'd like grāmatr to call them** and
persist their answer as `display_name`. Persist it via the `onboard_user` MCP
tool and the `~/.gramatr.json` identity cache (the same user block
`session_bootstrap` writes there) so the name survives across sessions. Do not
guess a name from the email — ask.

### Capture profile / voice / craft

Call the `onboard_user` MCP tool with `action: "check"`. The response reports
which profile/voice/craft entities are missing. For each missing piece, ask
the user the relevant question in conversation, then call `onboard_user`
again with the matching capture action (`capture_profile`, `capture_voice`,
`capture_craft`) and the user's answer. Do not invent answers — ask.

### Walk a brand-new user through the basics

If the user is new to grāmatr, walk them through how it works rather than
assuming they know. A server-delivered onboarding resource (a "How to Use
grāmatr" walkthrough) will be available — when present, `ReadMcpResource` it and
guide the user through its steps (ask their name, confirm project homing, confirm
the statusline is live) instead of improvising. Until that resource is exposed,
cover those three basics inline.

## 5. Health check

If anything in steps 1–4 fails:

- **`gramatr_whoami` returns auth error after `gramatr login`** → token did not
  persist. Run `gramatr login --status` to inspect; `gramatr logout && gramatr
  login` to reset.
- **`route_request` errors with "not connected" or 5xx** → the MCP server is
  unreachable. Continue working without the packet (follow the 7-phase
  algorithm by hand) and tell the user the classifier is degraded.
- **`session_bootstrap` returns `project_resolution_needed: true`** → call
  `resolve_project` with `action: "list"`, show the user their projects, then
  call `resolve_project` with `action: "resolve"` and the chosen slug.
- **Server reports a newer client version** → tell the user to update. The
  version-cue hook surfaces this automatically, but if you see an upgrade cue
  (e.g. `gramatr update available: vX → vY`) in any tool response or the
  statusline, relay it: **`To upgrade: npm i -g @gramatr/mcp@latest`**.
- **Anything else** → point the user at https://gramatr.com/support and
  include the failing tool name + raw error in your message.

## 6. Discover agents and skills

Pre-composed agents and skills are server-delivered, not bundled in the
plugin. To find them, call MCP `resources/list` and look for:

- `gramatr://schema/agents/builtin` — static builtin agent catalog (no DB hit).
- `gramatr://agents` — the user's full composed-agent list (builtins + private).
- `gramatr://agents/{uuid}` — individual agent definition.
- `gramatr://skills` — server skill catalog.

Materialize an agent by calling the `get_composed_agent` MCP tool with the
agent's identifier. Do not look for `agents/*.md` or `skills/*/SKILL.md`
files inside the plugin — there are none, by design.

## 7. Confirm and hand off

When steps 1–4 succeed, tell the user in plain language: who they're signed in
as (and the name they chose), which project the session homed to, and that the
statusline is live (`.gramatr/runtime.json` present). They can prompt normally
from here — every turn ships with the v2 intelligence packet automatically.
