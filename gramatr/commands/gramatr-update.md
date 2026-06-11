---
description: Install or refresh the versioned grāmatr block in CLAUDE.md. Shows a diff and requires explicit user confirmation before writing.
---

# /gramatr-update

You install or refresh the `<!-- gramatr-block: vN -->` section in CLAUDE.md.
The block is a persistent floor of grāmatr operational knowledge — versioned,
plugin-owned, and replaced only between its markers. Everything outside the
markers is user-owned and must be preserved byte-for-byte.

## Step 1 — Locate candidate files

Check both locations and note which exist:

- Project: `${CLAUDE_PROJECT_DIR:-$PWD}/CLAUDE.md`
- Global: `~/.claude/CLAUDE.md`

For each existing file, scan for the marker regex
`<!--\s*gramatr-block:\s*v(\d+)\b` to discover the installed version (if any).
Use the Read tool — do not shell out to `cat`/`grep`.

## Step 2 — Read the bundled block

Read the bundled v6 block from the plugin install. It ships at:

- `${CLAUDE_PLUGIN_ROOT}/blocks/gramatr-block-v6.md` (when running inside the
  Claude Code plugin), OR
- `<repo-root>/packages/mcp/blocks/gramatr-block-v6.md` (when developing
  against the source tree).

The file content begins with `<!-- gramatr-block: v6 — managed by @gramatr/mcp plugin -->`
and ends with `<!-- /gramatr-block -->`. Use it verbatim — do not paraphrase
or "improve" the content. The block was carefully drafted with a v2 → v3 → v4 → v5 → v6
changelog and is the single source of truth.

## Step 3 — Choose which file(s) to update

- If only one of the two files exists with content: target that file.
- If both files exist with content: ask the user explicitly — "Update project
  CLAUDE.md, global ~/.claude/CLAUDE.md, or both?" — and honor their answer.
- If neither exists: ask the user where to install (project recommended for
  project-scoped work; global if they want the floor on every project).

Never assume. The user owns these files.

## Step 4 — Show the diff

For each target file, compute what would change:

- If the file has `<!-- gramatr-block: vN -->` and `<!-- /gramatr-block -->`
  markers: the diff replaces everything between (and including) those markers
  with the bundled v6 block.
- If the markers are absent: the diff appends a blank line plus the v6 block
  to the end of the file (or creates the file with the block as its only
  content, if the file does not yet exist).

Render the diff in unified format so the user can verify the change is
contained between markers and nothing outside is touched.

## Step 5 — Require explicit confirmation

Ask: "Apply this update? (yes / no)". Wait for a direct yes/no. Anything
ambiguous — abort with a one-line explanation; do not proceed.

## Step 6 — Write

On confirmation, write each chosen file using the Write tool. Preserve every
byte outside the markers. After each write, confirm with one line:
`Updated <path> → gramatr-block v6`.

If the file did not exist, create it. If the markers were absent, append
(blank line + block) to the end.

## Notes

- This command never auto-runs. SessionStart only detects state and tells the
  user to run `/gramatr-update` if action is needed.
- The block version bumps in lockstep with the bundled file
  (`packages/mcp/blocks/gramatr-block-vN.md`) and the `GRAMATR_BLOCK_VERSION`
  constant in `packages/mcp/src/hooks/lib/gramatr-block.ts`. They must stay
  aligned — the detection logic and this command both read the same constant.
- Do not modify content between the markers by hand. Bump the version and
  ship a new bundled file instead.
