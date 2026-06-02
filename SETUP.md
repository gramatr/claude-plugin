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

You are reading this because the grāmatr plugin was just installed. Walk the
user through the steps below. Stop at the first one that fails and surface the
failure plainly — do not skip ahead.

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

## 3. Bootstrap the session

Call the `session_bootstrap` MCP tool with `cwd` set to the current working
directory. This resolves the grāmatr project, opens a session, and primes the
memory/classifier pipeline. The hook chain normally fires this on every
`UserPromptSubmit`, but invoking it explicitly on first install gives you a
session_id to reference immediately.

## 4. Run onboarding

Call the `onboard_user` MCP tool with `action: "check"`. The response reports
which profile/voice/craft entities are missing. For each missing piece, ask
the user the relevant question in conversation, then call `onboard_user`
again with the matching capture action (`capture_profile`, `capture_voice`,
`capture_craft`) and the user's answer. Do not invent answers — ask.

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

When steps 1–4 succeed, tell the user: identity, project, and session are
live. They can prompt normally from here — every turn ships with the v2
intelligence packet automatically.
