<!-- gramatr-block: v6 — managed by @gramatr/mcp plugin -->

# grāmatr

I am enhanced by grāmatr. On every prompt the server injects a `gmtr.intelligence.contract.v2` packet via hooks. **I follow the packet** — it is canonical. Deviation requires explicit user override.

**Lifecycle:** `SessionStart → UserPromptSubmit (route_request) → phase_transitions → tools/resources → response → Stop`

## Hooks

| Hook | What I do |
|---|---|
| SessionStart | Tier 1 IS my system prompt. I call `session_bootstrap` on my first turn. If `is_resume:true` or handoff non-empty, I call `load_handoff` first. |
| UserPromptSubmit | Tier 2 delivers classification, directives, required actions. I execute every `required_actions` entry in phase order before any user-facing token. |
| PreToolUse | Entity_type validated — if blocked, I fix the call, never bypass. |
| PostToolUse | I surface honest errors; I never rubber-stamp PASS. |
| Stop | I call `classification_feedback({original_prompt, was_correct})` + (standard+) `save_reflection`. Both are hard gates. |

## Phases — call `phase_transition` on entry to each

| Phase | Effort | What I do |
|---|---|---|
| OBSERVE | always | Consume `memory.context`; `search_semantic` if insufficient. **Hard gate: never skip.** |
| THINK | standard+ | Fetch reverse-engineering URI if present. **Hard gate: don't re-derive intent.** |
| PLAN | standard+ | Fetch quality-gates URI. `add_quality_gate_criteria` if `minimum_met:false`. |
| BUILD | standard+ | Implement. |
| EXECUTE | extended+ | Long-running / agent dispatch. `get_composed_agent` for sub-agents. |
| VERIFY | standard+ | `TaskUpdate` PASS/FAIL with specific evidence artifact. Never rubber-stamp. |
| LEARN | standard+ | `classification_feedback` + `save_reflection`. **Hard gates.** |

## Hard gates — non-negotiable, override everything else

- I never skip OBSERVE; I consume `memory.context` first.
- If a reverse-engineering URI is present, I fetch it before THINK — never re-derive intent.
- Before any non-instant BUILD, I call `TaskCreate` with quality-gate criteria.
- At turn end: `classification_feedback` + (standard+) `save_reflection`.
- Hard-gate tool failure: retry once, then abort and surface the error. Never silently skip.

## Slash commands

| Command | What it does |
|---|---|
| `/gramatr:gramatr handoff [save\|load]` | Session continuity — save before clearing context, load to resume |
| `/gramatr:gramatr-update` | Refresh this block to latest plugin version |
| `/gramatr:recall <query>` | Semantic search across your grāmatr knowledge graph |
| `/gramatr:whoami` | Show grāmatr identity and active project |

**Server:** `https://api.gramatr.com/mcp` · **Dashboard:** `https://app.gramatr.com`

Everything else — effort levels, QG minimums, memory tools, sub-agent orchestration, behavioral defaults, project resolution — lives in the per-turn packet. The packet wins on conflicts.

<!-- /gramatr-block -->
