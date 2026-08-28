#!/usr/bin/env node
"use strict";

// dist/hooks/bash-output-scan.js
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_child_process = require("node:child_process");

// dist/hooks/generated/hook-timeouts.js
var HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;

// dist/hooks/lib/secret-patterns.js
function secretPatternDefs() {
  return [
    // ── High confidence — provider-shaped / structurally unambiguous ──
    {
      name: "jwt",
      confidence: "high",
      // Core: redactJWT (log-sanitizer.ts:62-68)
      build: () => /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
    },
    {
      name: "pem_private_key",
      confidence: "high",
      // New shape (not in core) — PEM private-key block header/footer.
      build: () => /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g
    },
    {
      name: "openai_key",
      confidence: "high",
      // Core: redactAPIKeys `sk-` branch (log-sanitizer.ts:83, /gi)
      build: () => /sk-[A-Za-z0-9]{20,}/gi
    },
    {
      name: "gramatr_key",
      confidence: "high",
      // Core: redactAPIKeys gramatr branch (log-sanitizer.ts:84, /gi)
      build: () => /(?:aios|gmtr|gramatr)_sk_[A-Za-z0-9_-]{20,}/gi
    },
    {
      name: "google_api_key",
      confidence: "high",
      // Core: redactAPIKeys `AIza` branch (log-sanitizer.ts:85, /gi)
      build: () => /AIza[A-Za-z0-9_-]{35}/gi
    },
    {
      name: "bearer_token",
      confidence: "high",
      // Core: redactAPIKeys bearer branch (log-sanitizer.ts:82)
      build: () => /bearer\s+[A-Za-z0-9_-]{20,}/gi
    },
    {
      name: "api_key_assignment",
      confidence: "high",
      // Core: redactAPIKeys api_key branch (log-sanitizer.ts:81)
      build: () => /api[_-]?key[=:]\s*['"]?[A-Za-z0-9_-]{20,}['"]/gi
    },
    {
      name: "credentialed_connection_string",
      confidence: "high",
      // Core: sanitizeDatabaseURLs / sanitizePasswordsInURLs (log-sanitizer.ts:142,157)
      build: () => /\w+:\/\/[^:/\s]+:[^\s]+@[a-zA-Z0-9][a-zA-Z0-9._-]*(?::[0-9]+)?(?:\/[^\s]*)?/g
    },
    // ── High confidence — provider-prefixed key formats (new shapes, not in
    // core; reviewer-found gap — these are structurally unambiguous the same
    // way sk-/AIza/gmtr_sk_ are, and previously matched NOTHING, not even the
    // medium bare_high_entropy catch-all, since most are shorter than its
    // 32/40-char thresholds) ──
    {
      name: "aws_access_key_id",
      confidence: "high",
      build: () => /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g
    },
    {
      name: "github_token",
      confidence: "high",
      build: () => /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/g
    },
    {
      name: "slack_token",
      confidence: "high",
      build: () => /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g
    },
    {
      name: "stripe_key",
      confidence: "high",
      build: () => /\b[rs]k_(?:live|test)_[A-Za-z0-9]{24,}\b/g
    },
    {
      name: "npm_token",
      confidence: "high",
      build: () => /\bnpm_[A-Za-z0-9]{36}\b/g
    },
    // ── Medium confidence — flag only, never auto-redact (false-positive prone) ──
    {
      name: "generic_secret_assignment",
      confidence: "medium",
      build: () => /(?:password|passwd|pwd|secret|token)[=:]\s*['"]?[^\s'"]{8,}['"]?/gi
    },
    {
      name: "bare_high_entropy",
      confidence: "medium",
      // 32-64 char hex, or a >=40 char base64-ish run. Linear-time, no backtracking.
      build: () => /\b[A-Fa-f0-9]{32,64}\b|\b[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/=])/g
    }
  ];
}

// dist/hooks/bash-output-scan.js
var REDACTION_PLACEHOLDER = "[REDACTED_BY_GRAMATR]";
var SOC2_REPO = "gramatr/soc2-coordination";
var SOC2_FLOW_NAMESPACE = "soc2";
var SOC2_FLOW_ID = "infra-control-verified";
var SOC2_WEBHOOK_KEY_SECRET_NAME = "kestra-webhook-key-infra-control-verified";
var EXTERNAL_CALL_TIMEOUT_MS = 3e3;
var KNOWN_SECRET_EXPOSING_COMMAND_PATTERNS = [
  /\bbws\s+secret\s+(?:list|get)\b/i,
  // #274 — the secret-manager list command prints full values by default
  /\bmc\s+alias\s+list\b/i,
  //            #313 — the object-store client prints plaintext secret keys
  /remote(?:Secure)?\s*\(/i
  //           #274 — analytics-db credential-in-query-args pattern
];
function resolveScanMode(env = process.env) {
  const raw = (env.GRAMATR_BASH_SCAN_MODE || "").trim().toLowerCase();
  if (raw === "enforce" || raw === "off" || raw === "shadow")
    return raw;
  return "shadow";
}
function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.resume();
  });
}
function extractResponseText(response) {
  if (!response)
    return "";
  if (typeof response === "string")
    return response;
  if (Array.isArray(response)) {
    return response.map((b) => b && typeof b.text === "string" ? b.text : "").join("\n");
  }
  const parts = [];
  if (typeof response.stdout === "string")
    parts.push(response.stdout);
  if (typeof response.stderr === "string")
    parts.push(response.stderr);
  return parts.join("\n");
}
function isKnownSecretExposingCommand(command) {
  if (!command)
    return false;
  return KNOWN_SECRET_EXPOSING_COMMAND_PATTERNS.some((r) => r.test(command));
}
function fingerprint(value) {
  return (0, import_node_crypto.createHash)("sha256").update(value).digest("hex").slice(0, 12);
}
function classifyOutput(text, escalate) {
  const high = /* @__PURE__ */ new Map();
  const medium = /* @__PURE__ */ new Map();
  if (!text)
    return { high: [], medium: [] };
  for (const def of secretPatternDefs()) {
    const re = def.build();
    for (const m of text.matchAll(re)) {
      const value = m[0];
      if (!value)
        continue;
      const confidence = def.confidence === "high" || escalate ? "high" : "medium";
      const hit = {
        name: def.name,
        confidence,
        value,
        fingerprint: fingerprint(value)
      };
      const bucket = confidence === "high" ? high : medium;
      if (confidence === "high")
        medium.delete(value);
      if (!(confidence === "medium" && high.has(value)))
        bucket.set(value, hit);
    }
  }
  const highValues = [...high.keys()];
  for (const [value] of medium) {
    if (highValues.some((hv) => value.includes(hv)))
      medium.delete(value);
  }
  return { high: [...high.values()], medium: [...medium.values()] };
}
function redactValuesFromText(content, hits) {
  let out = content;
  for (const hit of hits) {
    out = out.split(hit.value).join(REDACTION_PLACEHOLDER);
  }
  return out;
}
function buildSoc2AuditInput(hits, ctx) {
  return {
    criterion_ids: ["CC6.1", "CC7.2"],
    control_name: "credential_leak_detected",
    actor: "claude-code-posttooluse-hook",
    // Resource is the pattern identities + fingerprints — never the values.
    resource: hits.map((h) => `${h.name}:${h.fingerprint}`).join(","),
    action: "detected_quarantined",
    outcome: "fail",
    metadata: {
      pattern_matched: hits.map((h) => h.name),
      fingerprints: hits.map((h) => h.fingerprint),
      session_id: ctx.sessionId,
      project_id: ctx.projectId,
      tool: "Bash",
      command_redacted: ctx.commandRedacted,
      rotated: false,
      first_seen: ctx.firstSeen,
      exposure_surface: ctx.exposureSurface,
      scan_mode: ctx.shadow ? "shadow" : "enforce"
    }
  };
}
function buildGithubIssueInput(hits, ctx) {
  const identities = hits.map((h) => `- \`${h.name}\` (fingerprint \`${h.fingerprint}\`)`).join("\n");
  const title = `Credential leak detected in Bash output \u2014 ${hits.map((h) => h.name).join(", ")} (rotate)`;
  const body = [
    "## What happened",
    "",
    "gr\u0101matr's PostToolUse `bash-output-scan` hook matched a high-confidence",
    "secret pattern in the stdout/stderr of a Bash command. The value had",
    "already entered the model context for that turn (PostToolUse cannot prevent",
    "that); it was flagged and quarantined from downstream persistence",
    "(transcript/handoff/memory rewritten to a placeholder) and logged here for",
    "rotation. **The raw value is intentionally NOT included in this issue.**",
    "",
    "## Exposures (identity only)",
    "",
    identities,
    "",
    "## Mechanism",
    "",
    `- Exposure surface: ${ctx.exposureSurface}`,
    `- Command (secrets redacted): \`${ctx.commandRedacted}\``,
    `- Session: ${ctx.sessionId}`,
    `- First seen: ${ctx.firstSeen}`,
    "",
    "## Remediation",
    "",
    "- `rotated: false`",
    "",
    "Rotate the affected credential(s), then flip `rotated: true` and close this",
    "issue once mass-remediation confirms rotation (per the #313/#274 convention)."
  ].join("\n");
  return { repo: SOC2_REPO, title, body };
}
function buildHighConfidenceContext(hits, shadow) {
  const names = [...new Set(hits.map((h) => h.name))].join(", ");
  const persistenceLine = shadow ? "This value was detected and logged for the SOC2 shadow-mode audit trail." : "This value has been flagged and quarantined from downstream persistence (transcript/handoff/memory) and queued for credential rotation.";
  return [
    `gr\u0101matr bash-output-scan: the previous Bash command's output matched a high-confidence secret pattern (${names}).`,
    "This turn's context ALREADY contains that material and it cannot be un-seen \u2014",
    "do NOT repeat, summarize, echo, or persist the matched value anywhere.",
    persistenceLine,
    "If it was a live credential, tell the user to rotate it immediately."
  ].join(" ");
}
function buildMediumConfidenceContext(hits) {
  const names = [...new Set(hits.map((h) => h.name))].join(", ");
  return [
    `gr\u0101matr bash-output-scan: the previous Bash command's output contained a medium-confidence secret-shaped string (${names}).`,
    "It was NOT auto-redacted (could be a UUID/hash/fixture). Treat it as potentially sensitive:",
    "avoid repeating or persisting it, and confirm with the user whether it is a real credential."
  ].join(" ");
}
function defaultLog(record) {
  try {
    process.stderr.write(JSON.stringify({ source: "bash-output-scan", ...record }) + "\n");
  } catch {
  }
}
async function defaultTriggerFlow(input) {
  const base = (process.env.GRAMATR_SOC2_WEBHOOK_BASE || "").trim().replace(/\/+$/, "");
  const key = (process.env.GRAMATR_SOC2_WEBHOOK_KEY || "").trim();
  if (!base || !key) {
    defaultLog({
      operation: "soc2_trigger_flow_skipped",
      reason: base ? "no_webhook_key" : "no_webhook_base",
      webhook_key_secret_name: SOC2_WEBHOOK_KEY_SECRET_NAME
    });
    return;
  }
  const url = `${base}/${SOC2_FLOW_NAMESPACE}/${SOC2_FLOW_ID}/${key}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: input }),
    signal: AbortSignal.timeout(EXTERNAL_CALL_TIMEOUT_MS)
  });
}
function defaultCreateGithubIssue(input) {
  return new Promise((resolve, reject) => {
    const child = (0, import_node_child_process.execFile)("gh", ["issue", "create", "--repo", input.repo, "--title", input.title, "--body", input.body], { timeout: EXTERNAL_CALL_TIMEOUT_MS }, (err) => err ? reject(err) : resolve());
    child.on("error", reject);
  });
}
function defaultDeps(mode) {
  return {
    triggerFlow: defaultTriggerFlow,
    createGithubIssue: defaultCreateGithubIssue,
    readTranscript: (path) => (0, import_node_fs.readFileSync)(path, "utf-8"),
    writeTranscript: (path, content) => (0, import_node_fs.writeFileSync)(path, content, "utf-8"),
    log: defaultLog,
    now: () => (/* @__PURE__ */ new Date()).toISOString(),
    mode
  };
}
var PASSTHROUGH = {
  continue: true,
  hookSpecificOutput: { hookEventName: "PostToolUse" }
};
async function handleBashOutputScan(input, deps) {
  if (deps.mode === "off")
    return PASSTHROUGH;
  if (input.tool_name !== "Bash")
    return PASSTHROUGH;
  const command = input.tool_input?.command ?? "";
  const output = extractResponseText(input.tool_response);
  const escalate = isKnownSecretExposingCommand(command);
  const { high, medium } = classifyOutput(output, escalate);
  if (high.length === 0 && medium.length === 0)
    return PASSTHROUGH;
  const shadow = deps.mode === "shadow";
  const firstSeen = deps.now();
  const sessionId = input.session_id ?? "unknown";
  const projectId = input.cwd ?? "unknown";
  const commandRedacted = redactValuesFromText(command, [...high, ...medium]);
  const exposureSurface = escalate ? "known_secret_exposing_command" : "bash_stdout_stderr";
  if (high.length > 0) {
    if (!shadow) {
      const path = input.transcript_path;
      if (path) {
        try {
          const content = deps.readTranscript(path);
          const rewritten = redactValuesFromText(content, high);
          if (rewritten !== content)
            deps.writeTranscript(path, rewritten);
        } catch (err) {
          deps.log({
            operation: "transcript_rewrite_failed",
            error: err instanceof Error ? err.message : String(err)
          });
        }
      } else {
        deps.log({ operation: "transcript_rewrite_skipped", reason: "no_transcript_path" });
      }
    }
    const auditInput = buildSoc2AuditInput(high, {
      sessionId,
      projectId,
      commandRedacted,
      firstSeen,
      exposureSurface,
      shadow
    });
    try {
      await deps.triggerFlow(auditInput);
    } catch (err) {
      deps.log({
        operation: "soc2_trigger_flow_failed",
        error: err instanceof Error ? err.message : String(err),
        // Local fallback record so the incident is not lost if the webhook is down.
        audit: auditInput
      });
    }
    if (!shadow) {
      try {
        await deps.createGithubIssue(buildGithubIssueInput(high, { sessionId, commandRedacted, firstSeen, exposureSurface }));
      } catch (err) {
        deps.log({
          operation: "soc2_github_issue_failed",
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    deps.log({
      operation: "credential_leak_detected",
      confidence: "high",
      pattern_matched: high.map((h) => h.name),
      fingerprints: high.map((h) => h.fingerprint),
      session_id: sessionId,
      scan_mode: deps.mode,
      transcript_rewritten: !shadow && Boolean(input.transcript_path),
      exposure_surface: exposureSurface,
      timestamp: firstSeen
    });
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: buildHighConfidenceContext(high, shadow)
      }
    };
  }
  deps.log({
    operation: "credential_leak_flagged",
    confidence: "medium",
    pattern_matched: medium.map((h) => h.name),
    session_id: sessionId,
    scan_mode: deps.mode,
    timestamp: firstSeen
  });
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      // In shadow mode nothing is surfaced to the model for the medium tier
      // (open question 3 deferred until shadow data lands).
      ...shadow ? {} : { additionalContext: buildMediumConfidenceContext(medium) }
    }
  };
}
async function runBashOutputScanHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify(PASSTHROUGH));
    return 0;
  }
  try {
    const input = JSON.parse(raw);
    if (input.hook_event_name && input.hook_event_name !== "PostToolUse") {
      process.stdout.write(JSON.stringify(PASSTHROUGH));
      return 0;
    }
    const mode = resolveScanMode();
    const output = await handleBashOutputScan(input, defaultDeps(mode));
    process.stdout.write(JSON.stringify(output));
  } catch {
    process.stdout.write(JSON.stringify(PASSTHROUGH));
  }
  return 0;
}

// dist/bin/bash-output-scan.js
if (process.env.GRAMATR_BASH_OUTPUT_SCAN_NO_AUTOSTART !== "1") {
  runBashOutputScanHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
