---
description: Authenticate with grāmatr via device flow — starts the flow, shows the code, then completes it.
allowed-tools: mcp__plugin_gramatr_gramatr__gramatr_authenticate
---

# /gramatr:authenticate

Discoverable entry point into the RFC 8628 device-flow login. `/gramatr:login`
is an identical alias — both invoke this same flow.

The underlying `gramatr_authenticate` MCP tool is bounded to one network
round-trip per call (#5189 — it used to block silently for up to 15 minutes;
never let it regress to that): the first call starts the flow and returns a
code + URL immediately; each subsequent call polls once and reports
pending/approved/failed.

Note on the browser side (confirmed live, #5197): the `app.gramatr.com/device`
page has NO separate value to paste back — it authorizes and says "Device
authorized. Return to your terminal; grāmatr will finish sign-in
automatically." There is nothing to relay from the browser back into this
command; completion is pure polling.

## Step 1 — Start the flow

Call `mcp__plugin_gramatr_gramatr__gramatr_authenticate` with no arguments.

The result's `content[0].text` is a JSON string containing `status`,
`user_code`, and `verification_uri_complete` (present when `status` is
`"pending"`). Parse it.

If `status` is already `"approved"` (a token was already valid — the call
returned success immediately with no pending state), tell the user they're
already authenticated and stop here.

## Step 2 — Show the code, send them to authorize, then poll

Present clearly to the user:

- The verification URL (`verification_uri_complete`) as a clickable link
- The code (`user_code`) in a prominent, unmistakable format

Tell them to open the link (or visit `app.gramatr.com/device` and enter the
code) and authorize there, then let you know once they've done that. Do not
ask them to retype the code back — #5193 tried a pre-browser type-back
confirmation step here and it was real friction for no real benefit: the
command already generated what's on screen, so retyping it doesn't add a
security boundary, and the browser page (per the note above) has nothing to
relay back either. Removed in #5197 — do not reintroduce without a
concrete, user-requested reason.

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
