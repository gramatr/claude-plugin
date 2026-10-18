---
description: Migration tool — detects and removes a stale <!-- gramatr-block --> section from CLAUDE.md, now that the SessionStart hook (session-contract.ts) delivers the Tier 1 contract live. Shows a diff and requires explicit user confirmation before writing.
---

# /gramatr-update

You remove the legacy `<!-- gramatr-block: vN -->` section from CLAUDE.md.
That section used to be a persistent, versioned floor of grāmatr operational
knowledge, hand-copied in and refreshed by this very command. It is now
superseded (#6826): a `SessionStart` hook (`session-contract.ts`) delivers the
same Tier 1 contract fresh via `hookSpecificOutput.additionalContext` on every
session — startup, resume, `/clear`, `/compact`, and fork — so there is
nothing left to keep in sync by hand. This command's only job now is to clean
up installs that still carry the old static section.

Everything outside the markers is user-owned and must be preserved
byte-for-byte.

## Step 1 — Locate candidate files

Check both locations and note which exist:

- Project: `${CLAUDE_PROJECT_DIR:-$PWD}/CLAUDE.md`
- Global: `~/.claude/CLAUDE.md`

For each existing file, scan for the marker regex
`<!--\s*gramatr-block:\s*v(\d+)\b` to discover whether a block is present (and
its version). Use the Read tool — do not shell out to `cat`/`grep`.

## Step 2 — Nothing found

If neither file has a `<!-- gramatr-block -->` section: say so in one line
("No legacy gramatr-block found — nothing to clean up.") and stop. Do not
write anything.

## Step 3 — Choose which file(s) to update

- If only one of the two files has a block: target that file.
- If both files have a block: ask the user explicitly — "Remove the legacy
  block from project CLAUDE.md, global ~/.claude/CLAUDE.md, or both?" — and
  honor their answer.

Never assume. The user owns these files.

## Step 4 — Show the diff

For each target file, compute the removal: delete everything from
`<!-- gramatr-block: vN -->` through the matching `<!-- /gramatr-block -->`
marker, inclusive. If removing the block leaves a run of blank lines where it
sat, collapse it to at most one blank line — do not otherwise touch
surrounding content.

Render the diff in unified format so the user can verify only the marked
section is removed and nothing else is touched.

## Step 5 — Require explicit confirmation

Ask: "Remove this block? (yes / no)". Wait for a direct yes/no. Anything
ambiguous — abort with a one-line explanation; do not proceed.

## Step 6 — Write

On confirmation, write each chosen file using the Write tool, with the block
removed exactly as shown in the diff. After each write, confirm with one
line: `Removed legacy gramatr-block from <path> — Tier 1 now arrives via the
SessionStart hook.`

## Notes

- This command never auto-runs. Nothing currently detects a stale block and
  prompts you to run it — if you're reading this, you (or an assistant
  following #6826's cleanup) invoked it deliberately.
- This command no longer installs or refreshes a block under any
  circumstance. If both CLAUDE.md files are already clean, Step 2 is the only
  possible outcome.
