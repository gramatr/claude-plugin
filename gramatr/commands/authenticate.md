---
description: Authenticate with grāmatr via device flow — starts the flow, confirms the code back with you, then completes it.
allowed-tools: mcp__plugin_gramatr_gramatr__gramatr_authenticate
---

# /gramatr:authenticate

Discoverable entry point into the RFC 8628 device-flow login. `/gramatr:login`
is an identical alias — both invoke this same flow.

The underlying `gramatr_authenticate` MCP tool is bounded to one network
round-trip per call (#5189 — it used to block silently for up to 15 minutes;
never let it regress to that): the first call starts the flow and returns a
code + URL immediately; each subsequent call polls once and reports
pending/approved/failed. This command adds one thing on top of the raw tool:
a hard-gate confirmation step, so a misread or mis-pasted code gets caught
before you ever open the browser.

## Step 1 — Start the flow

Call `mcp__plugin_gramatr_gramatr__gramatr_authenticate` with no arguments.

The result's `content[0].text` is a JSON string containing `status`,
`user_code`, and `verification_uri_complete` (present when `status` is
`"pending"`). Parse it.

If `status` is already `"approved"` (a token was already valid — the call
returned success immediately with no pending state), tell the user they're
already authenticated and stop here.

## Step 2 — Show the code, then confirm it back (hard gate)

Present clearly to the user:

- The verification URL (`verification_uri_complete`) as a clickable link
- The code (`user_code`) in a prominent, unmistakable format

Then explicitly ask the user to **type the code back to you** before you do
anything else — do not tell them to go open the browser yet. This is not a
security boundary (you already generated what's on screen); it's a guard
against relaying or the user reading the wrong code.

Compare what they type against `user_code`, normalizing case and
surrounding whitespace but nothing else (the code's internal `-XXXX-XXXX-`
grouping must still match exactly).

- **Match** → proceed to Step 3.
- **Mismatch** → tell them plainly it doesn't match, show the correct code
  again, and ask them to retype it. Do not proceed to Step 3 on a mismatch,
  no matter how close. Allow up to 3 attempts; if all 3 fail, tell the user
  to run `/gramatr:authenticate` again and stop — never fall through to
  polling on an unconfirmed code.

## Step 3 — Send them to authorize, then poll

Now tell the user to open the verification URL (or visit
`app.gramatr.com/device` and enter the code) and authorize there. Ask them
to let you know once they've done that.

When they confirm, call `mcp__plugin_gramatr_gramatr__gramatr_authenticate`
again (no arguments — the running proxy remembers the in-flight device code
from Step 1). Report the result:

- **`"Authenticated successfully..."`** (plain-text success message, not
  JSON) → tell the user they're connected. If they have another already-open
  Claude Code session using grāmatr, mention that session needs `/mcp` →
  reconnect to pick up the new token (each session's proxy is a separate
  process with its own in-memory state — a token written by this session's
  auth doesn't propagate live to another).
- **`status: "pending"`** again → they haven't finished authorizing yet, or
  the approval hasn't propagated. Ask them to double check they completed
  the browser step, then call the tool again after a few seconds.
- **An error** → relay the error message plainly. A common cause is the
  code expiring (15 minutes) — if so, tell them to run
  `/gramatr:authenticate` again to get a fresh code.
