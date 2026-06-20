---
description: Clear the context window but keep the thread alive — atomic save → clear → rehydrate from grāmatr turn-native resources, with the contract re-applied. Use this instead of /compact or a bare /clear whenever the window is filling but the work is not done.
argument-hint: (no arguments)
---

# /continue

**Goal:** clear the context window, preserve the thread + rules. One button for
the `save → /clear → rehydrate` dance that CLAUDE.md otherwise tells you to do by
hand instead of `/compact`. After `/continue` you have a clean window, the same
work thread in context, and the grāmatr contract re-applied.

**When to invoke:** the user types `/continue` (or `/clear --continue`) when the
context window is filling but the work is not done — mid-session, no good stopping
point. It is the *intended* continuation flow, not a failure-mode patch. Prefer it
over `/compact` (lossy) and over a bare `/clear` (drops the thread).

**Behavioral test (what success looks like):** after `/continue` completes, the
window is fresh (the bulk of the prior transcript is gone), AND you hold (a) the
project's recent turns or turn-summaries, (b) the 5-section handoff, and (c) the
grāmatr Tier-1 contract — so you can answer "what were we doing?" and resume the
top `whats_next` item without the user re-explaining. If after `/continue` you
cannot name the active work and the next step, the rehydrate leg failed — say so,
do not fabricate.

This command runs entirely client-side: it orchestrates resource reads and a
synthesis you (the foundation model) perform. The server only serves raw turn
data and the saved handoff via `ReadMcpResource` / `load_handoff` — there is no
server-side `continue` mode.

---

## Step 1 — SAVE (seal anything in-flight before the window is cleared)

The turn store is the source of truth and the SessionEnd/Stop hooks seal turns
server-side, so a saved blob is usually current. But `/continue` clears the
window, so anything decided in *this* conversation that is not yet reflected in a
turn or handoff would be lost. Protect against that:

1. Resolve `project_id` (UUID, never a slug). The committed pin is authoritative.
   Read, stopping at the first that yields a UUID:
   1. `.gramatr/project.json` → `project_id` (the **pin**; wins when present).
   2. `.gramatr/git-context.json` → `project_id`.
   3. `gramatr_project_id` from this turn's `gmtr.intelligence.contract.v2` packet.

   If none yield a UUID, tell the user to run `/gramatr:gramatr project` first and
   STOP — do not clear a window you cannot rehydrate.

2. If this session did substantial work that is NOT already captured (decisions
   made in conversation, files changed, PRs opened, constraints agreed) compose a
   5-section handoff and call `save_handoff` with `project_id` + all five
   sections (`where_we_are`, `what_shipped`, `whats_next`, `key_context`,
   `dont_forget`), `platform: "claude-code"`, and `branch` / `session_id` if
   known — the same shape `/gramatr:gramatr handoff save` writes. Lead
   `where_we_are` with the single most important current fact (its first sentence
   becomes the statusline checkpoint), never a timestamp.

   If the session was light (a few turns, nothing decided that the turn store
   would not already hold), skip the explicit save — the turn store already has it.

3. Confirm in one line what was sealed (or that nothing needed sealing), e.g.
   "Sealed handoff for `<slug>` — top next: <item>. Clearing now." Then proceed to
   Step 2. **Never clear before this save leg has either written or deliberately
   skipped — losing unsaved in-flight work is the one unacceptable outcome.**

## Step 2 — CLEAR (drop the context window)

`/clear` is destructive and cannot be self-invoked by you mid-turn. Tell the user
exactly what to type and that rehydrate follows automatically on the next turn:

> Context sealed. Type `/clear` now — then send any message (or just `/continue`
> again) and I will rehydrate the thread automatically.

If the harness invoked `/continue` as a post-`/clear` continuation (the window is
already fresh and there is no in-session work to seal), skip straight to Step 3.

## Step 3 — REHYDRATE (rebuild the thread from turn-native resources)

Run this leg whenever the window is fresh (right after `/clear`, on resume, or in
a new session). Use the `project_id` resolved in Step 1.

1. **Cheap scan first.** Call
   `ReadMcpResource("gramatr://project/recent-turn-summaries/<project_id>?n=5")`.
   This returns summaries only (no prompt/response blobs) — low-token "what
   happened?".

2. **Full-context fallback.** If the summaries resource returned **fewer than 3
   turns**, also call
   `ReadMcpResource("gramatr://project/recent-turns/<project_id>?n=10")` for the
   full prompt+response turns. (Project-scoped, not session-scoped: after `/clear`
   or in a new session the `session_id` has changed, so the project resource is
   the only path back to the prior thread.)

3. **Load the saved handoff.** Call `load_handoff` with `project_id`. If it
   returns a handoff, treat its 5 sections as the authoritative summary of where
   the work stands; reconcile against the turns from steps 1–2 (turns are newer if
   they post-date the handoff).

4. **Re-emit the Tier-1 contract.** The grāmatr behavioral contract (identity,
   hard gates, always-on directives) is injected fresh by the SessionStart /
   UserPromptSubmit hooks on the next turn — you do not synthesize it. Confirm it
   is in force by following the packet for the rehydrate turn. If this session is
   a `is_resume` or carries a non-empty `handoff` block in Tier 1, `load_handoff`
   in step 3 already covered it.

5. **Render a short resume brief** from the rehydrated material:

   ```
   Thread restored — <slug> (<N> turns)
     Where we are: <one line from handoff where_we_are / latest movement>
     Next:         <top whats_next item>
   ```

   Then ask whether to proceed with that next item or pick something else. Do not
   start work without confirmation.

## Failure modes (handle these explicitly — do not paper over them)

- **Resources return empty (no prior turns AND no handoff):** this is a fresh
  project, not an error. Say plainly: "Nothing to restore — fresh start for
  `<slug>`." Do not retry, do not fabricate sections, do not invent prior work.
  All resource reads are RLS-scoped to the authenticated user (server-side, via
  `userId` on every query — #3929), so an empty result means there are simply no
  turns for **this** user's project — never a cross-tenant visibility signal, and
  never a reason to widen scope or retry against another project.
- **A resource is unreachable / errors:** fall back to `load_handoff` alone and
  render the brief from the saved handoff. If `load_handoff` also fails, surface
  the honest error ("Could not reach grāmatr to rehydrate: <error>") and tell the
  user the window is clear but the thread could not be restored — never claim a
  restore that did not happen.
- **No `project_id` resolves:** handled in Step 1 — stop before clearing.
- **Unsaved in-flight work:** handled in Step 1 — save (or deliberately skip)
  before Step 2 clears. Losing it silently is the failure this command exists to
  prevent.

## Notes

- This is the consumer of the turn-native continuity resources (#3924 / #3929):
  `gramatr://project/recent-turn-summaries/<project_id>` (cheap scan) →
  `gramatr://project/recent-turns/<project_id>` (full fallback when <3) →
  `load_handoff` (5-section blob) → Tier-1 re-applied by the hooks.
- Under the installed plugin this invokes as `/gramatr:continue` (the bare
  `/continue` does not invoke once the plugin is namespaced) — teach the
  namespaced form in any user-facing hint.
- `/continue` REPLACES the CLAUDE.md "never `/compact`" dance: instead of the
  manual `save → /clear → load`, this command is the atomic, deterministic flow.
- The statusline file (`.gramatr/statusline.txt`) is NOT an agent concern here —
  it is fetched over REST by `bin/statusline.js` per render; agent-side writes to
  it are an anti-pattern. This command never touches it.
