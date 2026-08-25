---
description: Alias for /gramatr:authenticate — device-flow login.
allowed-tools: Skill
---

# /gramatr:login

Alias for `/gramatr:authenticate` — same flow, same steps, kept as a single
implementation rather than duplicated (this is the login command people
reach for by habit; `authenticate` is the more precise name).

**Namespacing matters here more than usual.** Bare `/login` is Claude Code's
own built-in — it re-authenticates the user's Anthropic account, not
grāmatr, and running it can disrupt an already-connected grāmatr session
(it does not touch grāmatr's own credentials directly, but the account
re-auth it triggers can leave a live grāmatr MCP connection in a degraded
state until the user reconnects via `/mcp`). This command only ever invokes
as `/gramatr:login` once the plugin is installed — the bare `/login` form
always means Claude Code's own login, never this. Always teach and print the
namespaced `/gramatr:login` form in any user-facing text; never suggest the
bare form.

Invoke the `gramatr:authenticate` skill now (pass along any arguments this
command received) and follow its instructions exactly. Do not re-implement
any of its steps here.
