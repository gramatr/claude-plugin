# grāmatr for Claude Code

Real-time intelligent context engineering layer that sits between you and every AI tool you use.

Every prompt is pre-classified and loaded with an intelligence contract — behavioral directives, quality criteria, and relevant context from past work — before the model responds. What that gets you:

- **System-prompt collapse** — a structured contract replaces the tens of thousands of tokens of behavioral enforcement you'd otherwise hand-maintain
- **Semantic retrieval** — past decisions, preferences, and project state pulled in automatically
- **Consistent behavior** — the same directives and quality gates on every prompt, every session, every tool; each output gated with a recorded PASS/FAIL. Your AI behaves the same on session 200 as on session 1.

The result: less re-explaining, less drift, more shipped — consistent, auditable AI across every session, tool, and teammate.

## Install

```
/plugin marketplace add gramatr/claude-plugin
/plugin install gramatr@gramatr-claude-plugin
```

OAuth is handled automatically by Claude Code's connector flow.

## Learn more

https://gramatr.com

## Version

0.20.82
