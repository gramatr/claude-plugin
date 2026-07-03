# grāmatr Claude Code Plugin

> Real-time intelligent context engineering, in Claude Code.

## Install in 30 seconds

Inside any Claude Code session, run:

```
/plugin marketplace add gramatr/claude-plugin
/plugin install gramatr@gramatr-claude-plugin
```

Restart Claude Code when prompted. OAuth sign-in is handled automatically by Claude Code's connector flow on first use — no API keys, no config files to edit.

That's it. Every prompt from now on is pre-classified, loaded with relevant context from past sessions, and gated with quality criteria before the model responds.

## What this gets you

- **System-prompt collapse** — a structured contract replaces the tens of thousands of tokens of behavioral enforcement you'd otherwise hand-maintain
- **Semantic retrieval** — past decisions, preferences, and project state pulled in automatically
- **Consistent behavior** — the same directives and quality gates on every prompt, every session, every tool; each output gated with a recorded PASS/FAIL. Your AI behaves the same on session 200 as on session 1.

The result: less re-explaining, less drift, more shipped — consistent, auditable AI across every session, tool, and teammate.

## What this repo is

A hermetic mirror of the grāmatr Claude Code plugin, regenerated on every release from [github.com/gramatr/gramatr](https://github.com/gramatr/gramatr). Source of truth is the monorepo; this repo exists so `/plugin marketplace add gramatr/claude-plugin` resolves cleanly without dragging in the npm postinstall path.

## Learn more

https://gramatr.com

## Version

0.28.1
