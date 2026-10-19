"""grāmatr plugin for Hermes Agent (Nous Research).

Tier 1 (``on_session_start``): delivers grāmatr's static per-build contract —
the same decision-routing guidance Claude Code and Cursor get — composed from
build-time generated constants and injected via ``ctx.inject_message()``. This
touches **no network**: the contract text is generated from
``contracts/methodology/instruction-blocks.yaml`` into
``gramatr_plugin/generated/instruction_blocks.py`` by ``pnpm generate:contracts``
(the same pass that produces the TypeScript platforms' sub-block constants).

Tier 2 (``pre_llm_call``, Unit 3): makes a live, authenticated
``POST /api/v1/route`` call per LLM call via :mod:`gramatr_plugin.client` (stdlib
only) and returns the rendered ``gmtr.intelligence.contract.v2`` packet to Hermes
by **returning** ``{"context": ...}`` from the handler — NOT via
``ctx.inject_message()``. This return-value injection shape is the scope doc
addendum's code-verified correction for ``pre_llm_call`` specifically (observed
against the real ``raven_approval`` production plugin), superseding the original
Unit 3 description. The call degrades to a no-op (returns ``{}``, never raises)
on any failure — a Hermes turn proceeds normally even if grāmatr is unreachable.

Every other hook remains a log-only no-op.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Protocol

from .client import RouteClient, RouteClientError
from .generated.instruction_blocks import (
    CLASSIFICATION_SUMMARY,
    CONTRACT_RULES,
    EFFORT_PHASES,
    FEEDBACK_RULES,
    MEMORY_RULES,
    QUALITY_GATE_REQUIREMENT,
    REQUIRED_FIELDS,
    SUBAGENT_RULES,
)

__all__ = ["HERMES_TIER1_CONTRACT", "LIFECYCLE_HOOKS", "register"]

logger = logging.getLogger("gramatr.hermes")

HookHandler = Callable[..., object]

# Hermes-specific framing for the Tier 1 contract. Deliberately NOT copied from
# Cursor's ``cursor-session-contract.ts`` wording — that text names Cursor's own
# ``sessionStart`` hook and mechanics. The sub-blocks below it ARE the shared,
# generated contract content, identical across every platform.
_HERMES_FRAMING = """# grāmatr (Hermes Agent)

This guidance is delivered fresh at the start of every Hermes session by the
grāmatr plugin's `on_session_start` hook. It is generated from grāmatr's single
contract source at build time — not a static file in your project — so it
cannot fall out of date between grāmatr releases."""

# Per-turn routing is still manual on Hermes: live per-turn `route_request`
# delivery over the gateway is Unit 3 (and is gated on the user's own
# `allow_gateway_injection` opt-in). Until then, the agent self-routes.
_HERMES_PER_TURN_ROUTING = """**Per-turn routing (manual for now — live per-turn delivery arrives in a later grāmatr unit):**

Before responding to any non-trivial request, call grāmatr's `route_request`
with the user's prompt and treat the response as a `gmtr.intelligence.contract.v2`
packet:
- `orchestration.agents.agent_defs[0]` — pass VERBATIM as sub-agent system prompts;
  do not rewrite or paraphrase
- `process.phase_template` — effort-gated phase sequence to follow
- `directives.hard_gates` — constraints that take precedence over other guidance
- `directives.behavioral_directives` — per-turn behavioral instructions
- `enrichment.data.reasoning.quality_gate_criteria` — Quality Gate criteria

Skip for instant/greeting requests. Degrade cleanly if grāmatr is unavailable."""


def _compose_tier1_contract() -> str:
    """Compose the Hermes Tier 1 contract from the generated sub-blocks.

    Mirrors the composition shape of ``CURSOR_TIER1_CONTRACT`` in
    ``cursor-session-contract.ts``: a short platform-specific framing header,
    the shared generated instruction sub-blocks joined by blank lines, then the
    per-turn routing note. The sub-block VALUES are byte-identical to the TS
    platforms' — same ``instruction-blocks.yaml`` source, different render.
    """
    sections = (
        _HERMES_FRAMING,
        CONTRACT_RULES,
        MEMORY_RULES,
        REQUIRED_FIELDS,
        EFFORT_PHASES,
        QUALITY_GATE_REQUIREMENT,
        CLASSIFICATION_SUMMARY,
        FEEDBACK_RULES,
        SUBAGENT_RULES,
        _HERMES_PER_TURN_ROUTING,
    )
    return "\n\n".join(sections)


# Composed once at import time — Tier 1 is static per build, so there is no
# reason to recompose it on every session start.
HERMES_TIER1_CONTRACT: str = _compose_tier1_contract()

# The Hermes hooks grāmatr participates in, from
# ``hermes_cli.plugins.VALID_HOOKS`` (see issue gramatr/gramatr#6850):
# five session-lifecycle hooks followed by four directive/control hooks.
LIFECYCLE_HOOKS: tuple[str, ...] = (
    "on_session_start",
    "on_session_end",
    "on_session_finalize",
    "on_session_reset",
    "on_session_delete",
    "pre_tool_call",
    "pre_llm_call",
    "pre_verify",
    "pre_gateway_dispatch",
)


class PluginContext(Protocol):
    """Structural interface for the ctx Hermes passes to ``register``.

    Only the surface this unit needs is declared. Hermes's concrete context
    exposes more; we depend on the registration + injection seam alone.
    """

    def register_hook(self, name: str, handler: HookHandler) -> None: ...

    def inject_message(self, message: str) -> object: ...


def _make_noop_handler(hook_name: str) -> HookHandler:
    """Build a log-only handler for ``hook_name`` with no side effects."""

    def _handler(*args: object, **kwargs: object) -> None:
        logger.info("hermes hook fired", extra={"hook": hook_name})

    _handler.__name__ = f"gramatr_{hook_name}"
    return _handler


def _make_session_start_handler(ctx: PluginContext) -> HookHandler:
    """Build the ``on_session_start`` handler that injects Tier 1 content.

    The handler closes over ``ctx`` (captured at ``register`` time) so it can
    call :meth:`PluginContext.inject_message` when Hermes fires the hook.
    """

    def _handler(*args: object, **kwargs: object) -> None:
        logger.info("hermes hook fired", extra={"hook": "on_session_start"})
        # UNVERIFIED call shape: ``ctx.inject_message()`` is what issue #6850's
        # body documents as Hermes's context-injection mechanism in GENERAL.
        # raven's code-verified corrections (addendum to the scope doc) only
        # confirmed the return-a-dict injection shape for ``pre_llm_call`` /
        # ``pre_tool_call`` / ``pre_gateway_dispatch`` / ``post_tool_call`` —
        # NOT for ``on_session_start``, which no observed real plugin uses. A
        # future unit/session MUST confirm this exact shape against a live
        # Hermes install before relying on it (scope doc open question 2 stays
        # open for ``on_session_*``). Tolerant by design: Tier 1 injection must
        # never raise out of session start and block a new Hermes conversation.
        try:
            ctx.inject_message(HERMES_TIER1_CONTRACT)
        except Exception:  # noqa: BLE001 — degrade, never fail the session
            logger.exception(
                "gramatr tier1 injection failed", extra={"hook": "on_session_start"}
            )

    _handler.__name__ = "gramatr_on_session_start"
    return _handler


# Field names the Hermes ``pre_llm_call`` payload may carry the user's prompt
# under. raven's code-verified tests observed ``user_message``; the others are
# defensive fallbacks since the exact Hermes-side payload shape beyond what
# raven observed is not independently confirmed by us. Ordered by confidence.
_PROMPT_KEYS: tuple[str, ...] = ("user_message", "prompt", "message", "text")

# Module-level once-flag so a persistently-unreachable grāmatr degrades QUIETLY
# — one WARNING, then DEBUG — instead of spamming a line on every turn.
_route_degraded_logged = False


def _build_route_client() -> RouteClient:
    """Construct a per-turn :class:`RouteClient` (reads env fresh each call).

    Isolated as a seam so tests can substitute a client; constructing one is a
    couple of env reads with no I/O, so doing it per turn also means a rotated
    ``GRAMATR_TOKEN`` is picked up on the next turn with no restart.
    """
    return RouteClient()


def _extract_prompt(kwargs: dict[str, Any]) -> str:
    """Best-effort extraction of the user's prompt text from the hook kwargs.

    Permissive by design (``.get``): returns the first non-empty string found
    under :data:`_PROMPT_KEYS`, else ``""``. The handler treats ``""`` as "no
    usable text" and skips the call rather than routing an empty prompt (which
    the server 400s anyway).
    """
    for key in _PROMPT_KEYS:
        value = kwargs.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def _format_packet(packet: dict[str, Any]) -> str:
    """Render the ``POST /api/v1/route`` response into the context string.

    The server already renders the actionable ``gmtr.intelligence.contract.v2``
    packet into ``hookSpecificOutput.additionalContext`` (api-v1.ts:864) — the
    same bytes every other grāmatr client injects — so the most faithful,
    most-actionable rendering is to pass that string through verbatim. Returns
    ``""`` when the response carries no usable context (e.g. a bare ``{}`` from
    the server), which the caller maps to a no-op.
    """
    hook_output = packet.get("hookSpecificOutput")
    if isinstance(hook_output, dict):
        context = hook_output.get("additionalContext")
        if isinstance(context, str) and context.strip():
            return context
    return ""


def _log_route_degraded_once(detail: str) -> None:
    global _route_degraded_logged
    if not _route_degraded_logged:
        _route_degraded_logged = True
        logger.warning(
            "gramatr route_request unavailable; per-turn context skipped "
            "(logged once, suppressed thereafter)",
            extra={"hook": "pre_llm_call", "detail": detail},
        )
    else:
        logger.debug(
            "gramatr route_request still unavailable; per-turn context skipped",
            extra={"hook": "pre_llm_call", "detail": detail},
        )


def _make_pre_llm_call_handler() -> HookHandler:
    """Build the Tier 2 ``pre_llm_call`` handler.

    Returns ``{"context": <rendered packet>}`` on a successful live route, and a
    plain ``{}`` (no ``context`` key) on every failure path — missing/unshaped
    payload, missing auth token, non-2xx (incl. a 403 gating refusal), network
    error, timeout, or a malformed response. The handler makes **exactly one**
    client call per invocation (the client owns its single built-in retry) and
    **never raises** — a Hermes turn must proceed even if grāmatr is entirely
    unreachable.
    """

    def _handler(*args: object, **kwargs: object) -> dict[str, Any]:
        logger.debug("hermes hook fired", extra={"hook": "pre_llm_call"})
        prompt = _extract_prompt(kwargs)
        if not prompt:
            # No usable text (or an unexpected payload shape) — never crash;
            # just decline to route this turn.
            return {}

        try:
            client = _build_route_client()
            if not client.has_token:
                # No credential on this host — routing would only 401 every
                # turn. Degrade quietly without making a doomed call.
                _log_route_degraded_once("no GRAMATR_API_KEY / GRAMATR_TOKEN set")
                return {}
            packet = client.route(prompt)
        except RouteClientError as exc:
            # Non-2xx (incl. 403 gating), network error, timeout, malformed body.
            _log_route_degraded_once(str(exc))
            return {}
        except Exception as exc:  # noqa: BLE001 — a turn must never fail here
            _log_route_degraded_once(f"unexpected: {exc!r}")
            return {}

        context = _format_packet(packet)
        if not context:
            return {}
        return {"context": context}

    _handler.__name__ = "gramatr_pre_llm_call"
    return _handler


def register(ctx: PluginContext) -> None:
    """Entry point Hermes calls to wire grāmatr's hooks.

    ``on_session_start`` delivers the Tier 1 contract (Unit 2); ``pre_llm_call``
    delivers live Tier 2 ``route_request`` context (Unit 3). Every other hook in
    :data:`LIFECYCLE_HOOKS` stays a log-only no-op until its own unit.
    """
    for hook_name in LIFECYCLE_HOOKS:
        if hook_name == "on_session_start":
            ctx.register_hook(hook_name, _make_session_start_handler(ctx))
        elif hook_name == "pre_llm_call":
            ctx.register_hook(hook_name, _make_pre_llm_call_handler())
        else:
            ctx.register_hook(hook_name, _make_noop_handler(hook_name))

    logger.info("gramatr hermes plugin registered", extra={"hooks": len(LIFECYCLE_HOOKS)})
