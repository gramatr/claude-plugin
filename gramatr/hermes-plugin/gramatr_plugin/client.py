"""Native Python REST client for grāmatr's ``POST /api/v1/route`` endpoint.

Unit 3 of the Hermes integration (gramatr/gramatr#6850; design:
``docs/scope/hermes-agent-integration-2026-10-18.md``) needs a live per-turn
``route_request`` on the hot path (every LLM call in a Hermes session). Per the
scope doc's Design Question 1 resolution, grāmatr already exposes
``POST /api/v1/route`` as an authenticated REST endpoint independent of MCP
(`packages/gateway/src/auth/middleware/authenticate-request.ts:54`,
`packages/mcp-server/src/routes/api-v1.ts:715`), so this is a plain HTTP POST —
no Node binary, no MCP client.

**Stdlib only.** This module imports nothing outside the Python standard
library (`urllib`, `json`, `os`, `logging`, `socket`). That matches Unit 1/2's
zero-third-party-dependency posture and sidesteps the scope-doc addendum's
"``register()`` may run before third-party deps are importable" risk: there is
no third-party dep to race.

Auth scheme (verified against this repo's own non-MCP REST callers):
``Authorization: Bearer <token>`` where the token is ``GRAMATR_API_KEY`` if set,
else ``GRAMATR_TOKEN`` — the exact precedence `packages/mcp/src/server/auth.ts`
(``getToken``, lines 95-103) and `packages/mcp/src/bin/plugin-proxy.ts:113` use.
The REST base is derived from ``GRAMATR_URL`` (default
``https://api.gramatr.com/mcp``) by stripping the trailing ``/mcp`` segment,
mirroring ``ups-route.ts``'s ``remoteUrl.replace(/\\/mcp$/, '')``.
"""

from __future__ import annotations

import json
import logging
import os
import socket
import urllib.error
import urllib.request
from typing import Any, Final

__all__ = [
    "DEFAULT_MCP_URL",
    "RouteClient",
    "RouteClientError",
    "resolve_rest_base",
    "resolve_token",
]

logger = logging.getLogger("gramatr.hermes.client")

DEFAULT_MCP_URL: Final[str] = "https://api.gramatr.com/mcp"

# Hot-path budget: the model is waiting on this call, so keep it short. A hung
# server must never wedge a Hermes turn.
_DEFAULT_TIMEOUT_SECONDS: Final[float] = 3.0

# At most ONE retry (two attempts total), and only for transient failures
# (network error / timeout / 5xx). A 4xx is terminal — a bad key, a gating
# refusal (403), or a malformed request will not succeed on retry, and retrying
# it only adds latency to a turn that is already going to degrade.
_MAX_RETRIES: Final[int] = 1

# Poisoned env literals that shell exports produce (`jq -r .token` on a missing
# field yields the string "null"); treat them as absent, same as
# ``sanitizeEnvToken`` does on the TS side.
_POISONED_TOKEN_LITERALS: Final[frozenset[str]] = frozenset({"null", "undefined", ""})


class RouteClientError(Exception):
    """A ``route_request`` call did not produce a usable packet.

    Raised for every non-success outcome — non-2xx HTTP status (including a
    gating 403), network error, timeout, or a malformed/wrong-shaped response
    body — so the single call site (the ``pre_llm_call`` handler) can degrade
    on one exception type. ``status_code`` is populated for HTTP failures and
    ``None`` for transport/parse failures.
    """

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class _RetryableError(Exception):
    """Internal: a transient failure worth exactly one retry (never escapes)."""


def _sanitize_token(raw: str | None) -> str:
    token = (raw or "").strip()
    return "" if token.lower() in _POISONED_TOKEN_LITERALS else token


def resolve_token(env: dict[str, str] | None = None) -> str:
    """Resolve the bearer token from the environment.

    ``GRAMATR_API_KEY`` takes precedence over ``GRAMATR_TOKEN`` — the exact
    order `server/auth.ts`'s ``getToken`` uses. Returns ``""`` when neither is
    set to a usable value; the caller decides whether to skip the call.
    """
    source = os.environ if env is None else env
    return _sanitize_token(source.get("GRAMATR_API_KEY")) or _sanitize_token(
        source.get("GRAMATR_TOKEN")
    )


def resolve_rest_base(env: dict[str, str] | None = None) -> str:
    """Resolve the REST API base (no trailing slash, no ``/mcp`` suffix).

    ``GRAMATR_URL`` carries the MCP URL (e.g. ``https://api.gramatr.com/mcp``);
    the REST endpoints live at the same host without the ``/mcp`` segment, so we
    strip it — mirroring ``ups-route.ts``.
    """
    source = os.environ if env is None else env
    raw = (source.get("GRAMATR_URL") or DEFAULT_MCP_URL).strip() or DEFAULT_MCP_URL
    base = raw.rstrip("/")
    if base.endswith("/mcp"):
        base = base[: -len("/mcp")]
    return base.rstrip("/")


class RouteClient:
    """Thin, single-purpose client for ``POST /api/v1/route``.

    Reads auth + base URL from the environment at construction so a rotated
    token is picked up on the next construction (the ``pre_llm_call`` handler
    builds a fresh client per turn — construction is a couple of env reads, no
    I/O). ``timeout`` and ``max_retries`` are injectable for tests; defaults are
    hot-path-safe.
    """

    def __init__(
        self,
        *,
        token: str | None = None,
        rest_base: str | None = None,
        timeout: float = _DEFAULT_TIMEOUT_SECONDS,
        max_retries: int = _MAX_RETRIES,
        client_type: str = "hermes",
    ) -> None:
        self._token = token if token is not None else resolve_token()
        self._rest_base = rest_base if rest_base is not None else resolve_rest_base()
        self._timeout = timeout
        self._max_retries = max_retries
        self._client_type = client_type

    @property
    def has_token(self) -> bool:
        """Whether a usable bearer token is available for the call."""
        return bool(self._token)

    @property
    def url(self) -> str:
        return f"{self._rest_base}/api/v1/route"

    def route(self, prompt: str) -> dict[str, Any]:
        """Classify ``prompt`` and return the parsed response envelope.

        The returned dict is the server's ``POST /api/v1/route`` body:
        ``{"hookSpecificOutput": {"hookEventName", "additionalContext"},
        "turn_id"}`` (`api-v1.ts:864`).

        Makes at most ``max_retries + 1`` HTTP calls — one on the happy path, a
        single additional retry only on a transient failure. Raises
        :class:`RouteClientError` on any non-success outcome; never returns a
        partial/empty result.
        """
        attempt = 0
        while True:
            attempt += 1
            try:
                return self._post(prompt)
            except _RetryableError as exc:
                if attempt <= self._max_retries:
                    logger.debug(
                        "route_request transient failure; retrying once",
                        extra={"attempt": attempt, "detail": str(exc)},
                    )
                    continue
                raise RouteClientError(str(exc)) from exc

    def _post(self, prompt: str) -> dict[str, Any]:
        """One HTTP attempt. Raises ``_RetryableError`` for transient faults and
        :class:`RouteClientError` for terminal ones."""
        # Identity (user_id / project_id / session_id) is derived server-side
        # from the token envelope and MUST NOT be sent (api-v1.ts
        # rejectIdentityMismatch). Send only the prompt + client metadata.
        body = json.dumps(
            {"prompt": prompt, "client_type": self._client_type}
        ).encode("utf-8")
        request = urllib.request.Request(self.url, data=body, method="POST")
        request.add_header("Content-Type", "application/json")
        if self._token:
            # Token bytes are never logged (same discipline as ups-route.ts).
            request.add_header("Authorization", f"Bearer {self._token}")

        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                raw = response.read()
        except urllib.error.HTTPError as exc:
            if 500 <= exc.code < 600:
                raise _RetryableError(f"HTTP {exc.code}") from exc
            # 4xx (incl. 403 gating refusal, 401 bad/absent auth) — terminal.
            raise RouteClientError(f"HTTP {exc.code}", status_code=exc.code) from exc
        except urllib.error.URLError as exc:
            # DNS/connection/reset/timeout-wrapped-as-URLError — transient.
            raise _RetryableError(f"network error: {exc.reason}") from exc
        except (TimeoutError, socket.timeout) as exc:  # bare socket timeout
            raise _RetryableError("timeout") from exc

        # Parse OUTSIDE the network try-block: a malformed body is terminal
        # (retrying a well-delivered-but-garbage response just burns latency).
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise RouteClientError("malformed JSON response") from exc

        # Shape guard (scope doc F-3d class): a list/scalar/None where an object
        # is expected is rejected, not coerced.
        if not isinstance(parsed, dict):
            raise RouteClientError("response was not a JSON object")
        return parsed
